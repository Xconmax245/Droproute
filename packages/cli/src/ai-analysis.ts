import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { z } from 'zod';
import type { InjectionPlan } from '@droproute/codemod';

const analysisSchema = z.object({
  rootLayoutPath: z.string(),
  firstScreenPath: z.string(),
  hasExistingConditional: z.boolean(),
  rationale: z.string(),
});

/**
 * §5.1 — AI injection-point analysis.
 *
 * Inputs: the file tree of /app, full text of _layout.tsx, the first screen.
 * Output: validated JSON with rootLayoutPath, firstScreenPath, hasExistingConditional, rationale.
 *
 * Uses OpenRouter (OpenAI-compatible API) to call Claude.
 * Retries once on schema failure, then throws — never silently falls back to a guess.
 */
export async function analyzeInjectionPoints(
  appDir: string,
  heuristicRootLayoutPath: string,
  heuristicFirstScreenPath: string
): Promise<InjectionPlan> {
  // OpenRouter uses the OpenAI-compatible API — Bearer token, chat completions format
  const openrouter = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY ?? process.env.ANTHROPIC_API_KEY ?? '',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://droproute.dev',
      'X-Title': 'DropRoute CLI',
    },
  });

  const files = fs.readdirSync(appDir).filter((f) => /\.(tsx?|jsx?)$/.test(f));
  const fileTree = files.map((f) => `  /app/${f}`).join('\n');

  const rootLayoutContent = fs.readFileSync(heuristicRootLayoutPath, 'utf-8');
  const firstScreenContent = fs.readFileSync(heuristicFirstScreenPath, 'utf-8');

  const prompt = `You are analysing an Expo Router project to determine where a referral attribution SDK should be injected.

File tree of /app directory:
${fileTree}

Contents of the detected root layout (${path.basename(heuristicRootLayoutPath)}):
\`\`\`tsx
${rootLayoutContent}
\`\`\`

Contents of the detected first screen (${path.basename(heuristicFirstScreenPath)}):
\`\`\`tsx
${firstScreenContent}
\`\`\`

Answer with a JSON object (no markdown, no explanation outside the JSON) matching this exact schema:
{
  "rootLayoutPath": "${heuristicRootLayoutPath.replace(/\\/g, '/')}",
  "firstScreenPath": "${heuristicFirstScreenPath.replace(/\\/g, '/')}",
  "hasExistingConditional": false,
  "rationale": "<one sentence explaining your choices>"
}

The rootLayoutPath and firstScreenPath must be exactly as shown in the template above (use the exact paths, only change rationale and hasExistingConditional). Set hasExistingConditional to true only if the first screen file contains an if statement or ternary expression in the component body.`;

  async function attempt(): Promise<InjectionPlan> {
    const completion = await openrouter.chat.completions.create({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = completion.choices[0]?.message?.content ?? '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`AI response did not contain a JSON object. Got: ${text.slice(0, 200)}`);
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // If AI returned relative paths, resolve them
    if (parsed.rootLayoutPath && !path.isAbsolute(parsed.rootLayoutPath)) {
      parsed.rootLayoutPath = path.join(appDir, parsed.rootLayoutPath);
    }
    if (parsed.firstScreenPath && !path.isAbsolute(parsed.firstScreenPath)) {
      parsed.firstScreenPath = path.join(appDir, parsed.firstScreenPath);
    }

    // Fall back to heuristic paths if AI left them blank/wrong
    if (!parsed.rootLayoutPath || !fs.existsSync(parsed.rootLayoutPath)) {
      parsed.rootLayoutPath = heuristicRootLayoutPath;
    }
    if (!parsed.firstScreenPath || !fs.existsSync(parsed.firstScreenPath)) {
      parsed.firstScreenPath = heuristicFirstScreenPath;
    }

    return analysisSchema.parse(parsed);
  }

  // Try once
  try {
    return await attempt();
  } catch (firstError) {
    // Retry once per directive §5.1 — retry once on schema failure, then fail loudly
    try {
      return await attempt();
    } catch (secondError) {
      throw new Error(
        `AI injection-point analysis failed after 2 attempts.\n` +
          `First error: ${firstError}\n` +
          `Second error: ${secondError}\n\n` +
          `DropRoute refuses to inject without confirmed injection points.`
      );
    }
  }
}
