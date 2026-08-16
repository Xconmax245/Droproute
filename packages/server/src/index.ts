import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '../../../.env') });

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { z } from 'zod';
import * as crypto from 'crypto';

// ─── Env validation ───────────────────────────────────────────────────────────

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENROUTER_API_KEY: z.string().min(1),
  SERVER_PORT: z.coerce.number().default(8787),
  SERVER_PUBLIC_URL: z.string().url().default('http://localhost:8787'),
});

const env = envSchema.parse(process.env);

// ─── Clients ─────────────────────────────────────────────────────────────────

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const openrouter = new OpenAI({
  apiKey: env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://droproute.dev',
    'X-Title': 'DropRoute',
  },
});

// ─── Fastify setup ────────────────────────────────────────────────────────────

const app = Fastify({ logger: true });

app.register(cors, { origin: true });

// ─── SSE: in-memory event bus ─────────────────────────────────────────────────

const sseClients = new Map<string, Set<ReturnType<typeof createSseClient>>>();

function createSseClient(reply: any) {
  return { reply, id: crypto.randomUUID() };
}

function broadcastEvent(appId: string, payload: unknown) {
  const clients = sseClients.get(appId);
  if (!clients) return;
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of clients) {
    try {
      client.reply.raw.write(data);
    } catch {
      clients.delete(client);
    }
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// POST /api/links — create a referral link
const createLinkBody = z.object({
  appId: z.string().uuid(),
  source: z.string().min(1),
  campaign: z.string().optional(),
});

app.post('/api/links', async (request, reply) => {
  const result = createLinkBody.safeParse(request.body);
  if (!result.success) {
    return reply.status(400).send({ error: 'Invalid request body', details: result.error.flatten() });
  }
  const { appId, source, campaign } = result.data;

  const code = crypto.randomBytes(5).toString('hex'); // 10-char code
  const url = `${env.SERVER_PUBLIC_URL}/r/${code}`;

  const { error } = await supabase.from('referral_links').insert({
    code,
    app_id: appId,
    source,
    campaign: campaign ?? null,
  });

  if (error) {
    app.log.error(error);
    return reply.status(500).send({ error: 'Database error' });
  }

  return reply.send({ code, url });
});

// GET /r/:code — resolve link, log click, redirect to app
app.get('/r/:code', async (request, reply) => {
  const { code } = request.params as { code: string };

  const { data: link, error } = await supabase
    .from('referral_links')
    .select('app_id, source, campaign')
    .eq('code', code)
    .single();

  if (error || !link) {
    return reply.status(404).send(`
      <!DOCTYPE html>
      <html><head><title>DropRoute — Link not found</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:60px">
        <h1>Link not found</h1>
        <p>This referral link has expired or doesn't exist.</p>
      </body></html>
    `);
  }

  // Fetch the app scheme
  const { data: appRow } = await supabase
    .from('apps')
    .select('scheme')
    .eq('id', link.app_id)
    .single();

  // Log the click as an event
  await supabase.from('events').insert({
    app_id: link.app_id,
    referral_code: code,
    event_name: 'link_click',
    metadata: { source: link.source, campaign: link.campaign },
  });

  broadcastEvent(link.app_id, {
    event_name: 'link_click',
    source: link.source,
    code,
    created_at: new Date().toISOString(),
  });

  const deepLink = `exp://172.20.10.3:8081/--/?ref=${code}&source=${encodeURIComponent(link.source)}${link.campaign ? `&campaign=${encodeURIComponent(link.campaign)}` : ''}`;

  // Serve a fallback page that tries to open the app then falls back gracefully
  const fallbackHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Opening app...</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, sans-serif; text-align: center; padding: 60px 24px; background: #fafaf9; color: #171A17; }
    h1 { font-size: 24px; font-weight: 700; }
    p { color: #5B615C; }
    .badge { display: inline-block; background: #dcfce7; color: #22c55e; padding: 4px 12px; border-radius: 999px; font-size: 13px; font-weight: 600; }
  </style>
  <script>
    window.location.href = ${JSON.stringify(deepLink)};
    setTimeout(() => {
      document.getElementById('fallback').style.display = 'block';
    }, 2000);
  </script>
</head>
<body>
  <span class="badge">droproute</span>
  <h1>Opening the app...</h1>
  <p>If the app doesn't open automatically, make sure it's installed on your device.</p>
  <div id="fallback" style="display:none">
    <p>Couldn't open the app automatically. <a href="${deepLink}">Tap here to try again</a>.</p>
  </div>
</body>
</html>`;

  return reply.type('text/html').redirect(deepLink);
});

// POST /api/events — record an attribution event from the injected SDK
const eventBody = z.object({
  code: z.string().nullable().optional(),
  eventName: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

app.post('/api/events', async (request, reply) => {
  const result = eventBody.safeParse(request.body);
  if (!result.success) {
    return reply.status(400).send({ error: 'Invalid request body', details: result.error.flatten() });
  }
  const { code, eventName, metadata } = result.data;

  let appId: string | null = null;

  if (code) {
    const { data: link } = await supabase
      .from('referral_links')
      .select('app_id')
      .eq('code', code)
      .single();
    appId = link?.app_id ?? null;
  }

  if (!appId) {
    // Try to get the default app (for unlinked events like cold opens)
    const { data: apps } = await supabase.from('apps').select('id').limit(1);
    appId = apps?.[0]?.id ?? null;
  }

  if (!appId) {
    return reply.status(404).send({ error: 'No app found. Has the app been registered?' });
  }

  const { error } = await supabase.from('events').insert({
    app_id: appId,
    referral_code: code ?? null,
    event_name: eventName,
    metadata: metadata ?? null,
  });

  if (error) {
    app.log.error(error);
    return reply.status(500).send({ error: 'Database error' });
  }

  broadcastEvent(appId, {
    event_name: eventName,
    source: (metadata as any)?.source ?? null,
    code: code ?? null,
    created_at: new Date().toISOString(),
  });

  return reply.send({ ok: true });
});

// GET /api/scores?appId= — activation score table per source
app.get('/api/scores', async (request, reply) => {
  const { appId } = request.query as { appId?: string };
  if (!appId) return reply.status(400).send({ error: 'appId query param required' });

  // Get all referral links for this app
  const { data: links } = await supabase
    .from('referral_links')
    .select('code, source')
    .eq('app_id', appId);

  if (!links || links.length === 0) {
    return reply.send({ scores: [] });
  }

  const codes = links.map((l) => l.code);

  // Get all events for these codes
  const { data: events } = await supabase
    .from('events')
    .select('referral_code, event_name')
    .in('referral_code', codes);

  const eventsByCode: Record<string, Set<string>> = {};
  for (const e of events ?? []) {
    if (!e.referral_code) continue;
    if (!eventsByCode[e.referral_code]) {
      eventsByCode[e.referral_code] = new Set();
    }
    eventsByCode[e.referral_code].add(e.event_name);
  }

  // Group by source
  const sourceMap: Record<string, { codes: Set<string>; activatedCodes: Set<string> }> = {};
  for (const link of links) {
    if (!sourceMap[link.source]) {
      sourceMap[link.source] = { codes: new Set(), activatedCodes: new Set() };
    }
    sourceMap[link.source].codes.add(link.code);

    const eventsForCode = eventsByCode[link.code];
    if (eventsForCode) {
      // Installation = any app_open event for this code
      const hasAppOpen = eventsForCode.has('app_open');
      // Activation = completed_onboarding event
      const hasActivation = eventsForCode.has('completed_onboarding');
      if (hasActivation) {
        sourceMap[link.source].activatedCodes.add(link.code);
      }
    }
  }

  const scores = Object.entries(sourceMap).map(([source, data]) => {
    // installs = codes with an app_open event
    const installCodes = new Set(
      [...data.codes].filter((c) => eventsByCode[c]?.has('app_open'))
    );
    const installs = installCodes.size;
    const activations = data.activatedCodes.size;
    const activation_rate = installs === 0 ? null : activations / installs;

    return { source, installs, activations, activation_rate };
  });

  // Sort by activation_rate descending (nulls last)
  scores.sort((a, b) => {
    if (a.activation_rate === null && b.activation_rate === null) return 0;
    if (a.activation_rate === null) return 1;
    if (b.activation_rate === null) return -1;
    return b.activation_rate - a.activation_rate;
  });

  return reply.send({ scores });
});

// POST /api/recommendation?appId= — AI recommendation (§5.2)
const MIN_EVENTS_FOR_RECOMMENDATION = 5;

app.post('/api/recommendation', async (request, reply) => {
  const { appId } = request.query as { appId?: string };
  if (!appId) return reply.status(400).send({ error: 'appId query param required' });

  // Get scores
  const scoresRes = await fetch(`${env.SERVER_PUBLIC_URL}/api/scores?appId=${appId}`);
  const { scores } = (await scoresRes.json()) as { scores: any[] };

  const totalEvents = scores.reduce((acc: number, s: any) => acc + s.installs + s.activations, 0);

  if (totalEvents < MIN_EVENTS_FOR_RECOMMENDATION) {
    return reply.send({
      text: `Not enough data yet (${totalEvents} events recorded, need at least ${MIN_EVENTS_FOR_RECOMMENDATION}). Trigger more referral events and try again.`,
      generatedFrom: null,
    });
  }

  const prompt = `You are an attribution analyst. Here is the current activation data for a mobile app referral program:

${scores.map((s: any) => `- Source: ${s.source} | Installs: ${s.installs} | Activations: ${s.activations} | Activation rate: ${s.activation_rate !== null ? (s.activation_rate * 100).toFixed(1) + '%' : 'n/a'}`).join('\n')}

In 1-2 short, specific sentences, compare the sources using the actual numbers above and suggest one concrete change (such as making a specific variant the default for a specific source). Do not fabricate data. Do not mention yourself. Be direct.`;

  let text: string;
  try {
    const completion = await openrouter.chat.completions.create({
      model: 'anthropic/claude-opus-4-5',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    });
    text = completion.choices[0]?.message?.content ?? '';
  } catch (err: any) {
    app.log.error(err);
    return reply.status(500).send({ error: 'AI recommendation failed' });
  }

  return reply.send({
    text,
    generatedFrom: 'live data',
    model: 'anthropic/claude-opus-4-5 via OpenRouter',
    dataSnapshot: scores,
  });
});

// GET /api/stream?appId= — SSE live event feed
app.get('/api/stream', async (request, reply) => {
  const { appId } = request.query as { appId?: string };
  if (!appId) return reply.status(400).send({ error: 'appId query param required' });

  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  reply.raw.write('data: {"type":"connected"}\n\n');

  const client = createSseClient(reply);
  if (!sseClients.has(appId)) {
    sseClients.set(appId, new Set());
  }
  sseClients.get(appId)!.add(client);

  // Heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => {
    try {
      reply.raw.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 30000);

  request.raw.on('close', () => {
    clearInterval(heartbeat);
    sseClients.get(appId)?.delete(client);
  });

  // Keep the handler open
  await new Promise<void>((resolve) => {
    request.raw.on('close', resolve);
  });
});

// GET /api/apps — list all apps (for dashboard app selector)
app.get('/api/apps', async (_request, reply) => {
  const { data, error } = await supabase.from('apps').select('id, name, scheme, created_at').order('created_at');
  if (error) return reply.status(500).send({ error: 'Database error' });
  return reply.send({ apps: data });
});

// POST /api/apps — register a new app
const createAppBody = z.object({
  name: z.string().min(1),
  scheme: z.string().min(1),
});

app.post('/api/apps', async (request, reply) => {
  const result = createAppBody.safeParse(request.body);
  if (!result.success) {
    return reply.status(400).send({ error: 'Invalid body', details: result.error.flatten() });
  }
  const { data, error } = await supabase
    .from('apps')
    .insert(result.data)
    .select()
    .single();
  if (error) return reply.status(500).send({ error: 'Database error' });
  return reply.status(201).send(data);
});

// ─── Start ────────────────────────────────────────────────────────────────────

const start = async () => {
  try {
    await app.listen({ port: env.SERVER_PORT, host: '0.0.0.0' });
    console.log(`\nDropRoute server running on port ${env.SERVER_PORT}`);
    console.log(`Public URL: ${env.SERVER_PUBLIC_URL}\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
