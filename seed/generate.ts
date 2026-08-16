import 'dotenv/config';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load from repo root .env
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Judge Mode seed data generator.
 *
 * Inserts a clearly synthetic burst of referral_links and events
 * across 4 sources with deliberately different activation rates,
 * so the leaderboard and AI recommendation have meaningful signal.
 *
 * ALWAYS run against the demo Supabase project only.
 * Never automatic — must be triggered explicitly via `pnpm seed:judge-mode`.
 */
async function seed() {
  console.log('\n🌱  DropRoute Judge Mode seed\n');
  console.log('⚠️  This inserts synthetic demo data. Only run against the demo Supabase project.\n');

  // 1. Get or create the demo app
  let { data: apps } = await supabase.from('apps').select('id, name').limit(1);

  let appId: string;
  if (apps && apps.length > 0) {
    appId = apps[0].id;
    console.log(`✓ Using existing app: ${apps[0].name} (${appId})`);
  } else {
    const { data: newApp, error } = await supabase
      .from('apps')
      .insert({ name: 'demo-app', scheme: 'demo-app' })
      .select()
      .single();
    if (error || !newApp) {
      console.error('✖ Failed to create app:', error?.message);
      process.exit(1);
    }
    appId = newApp.id;
    console.log(`✓ Created app: demo-app (${appId})`);
  }

  // 2. Define sources with target activation profiles
  const sources = [
    { source: 'twitter', totalLinks: 40, appOpenRate: 0.85, activationRate: 0.70 },
    { source: 'instagram', totalLinks: 35, appOpenRate: 0.75, activationRate: 0.45 },
    { source: 'facebook', totalLinks: 30, appOpenRate: 0.55, activationRate: 0.20 },
    { source: 'email', totalLinks: 20, appOpenRate: 0.90, activationRate: 0.60 },
  ];

  for (const config of sources) {
    console.log(`\n  Seeding source: ${config.source}`);

    const links: string[] = [];

    // Create referral links
    for (let i = 0; i < config.totalLinks; i++) {
      const code = `seed_${config.source}_${i.toString().padStart(3, '0')}`;
      await supabase.from('referral_links').upsert({
        code,
        app_id: appId,
        source: config.source,
        campaign: 'judge-mode-seed',
      });
      links.push(code);
    }

    // Simulate events
    const openCount = Math.round(config.totalLinks * config.appOpenRate);
    const activationCount = Math.round(openCount * config.activationRate);

    const eventsToInsert: any[] = [];

    for (let i = 0; i < openCount; i++) {
      const code = links[i];
      // link_click
      eventsToInsert.push({
        app_id: appId,
        referral_code: code,
        event_name: 'link_click',
        metadata: { source: config.source, campaign: 'judge-mode-seed', seeded: true },
        created_at: randomTimestamp(72),
      });
      // app_open
      eventsToInsert.push({
        app_id: appId,
        referral_code: code,
        event_name: 'app_open',
        metadata: { source: config.source, campaign: 'judge-mode-seed', seeded: true },
        created_at: randomTimestamp(48),
      });
    }

    for (let i = 0; i < activationCount; i++) {
      const code = links[i];
      eventsToInsert.push({
        app_id: appId,
        referral_code: code,
        event_name: 'completed_onboarding',
        metadata: { source: config.source, campaign: 'judge-mode-seed', seeded: true },
        created_at: randomTimestamp(24),
      });
    }

    // Batch insert in chunks of 50
    for (let i = 0; i < eventsToInsert.length; i += 50) {
      const chunk = eventsToInsert.slice(i, i + 50);
      const { error } = await supabase.from('events').insert(chunk);
      if (error) {
        console.error(`  ✖ Error inserting events chunk:`, error.message);
      }
    }

    const actualActivationRate = openCount > 0 ? (activationCount / openCount * 100).toFixed(1) : '0';
    console.log(`  ✓ ${config.totalLinks} links · ${openCount} installs · ${activationCount} activations (${actualActivationRate}% rate)`);
  }

  console.log('\n✅  Judge Mode seed complete.');
  console.log('   Toggle "Judge Mode" on the dashboard to see the data.\n');
}

function randomTimestamp(maxHoursAgo: number): string {
  const msAgo = Math.random() * maxHoursAgo * 60 * 60 * 1000;
  return new Date(Date.now() - msAgo).toISOString();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
