const http = require('http');

async function testPipeline() {
  const appId = '123e9265-0bd1-47ab-a096-5348c7a1b0f0';
  const SERVER_URL = 'http://localhost:8787';
  
  console.log('1. Generating a referral link...');
  const linkRes = await fetch(`${SERVER_URL}/api/links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId, source: 'hackonvibe', campaign: 'live-demo' })
  });
  
  const linkData = await linkRes.json();
  if (!linkRes.ok) throw new Error('Link generation failed: ' + JSON.stringify(linkData));
  
  console.log(`✓ Link generated: ${linkData.url}`);
  
  const code = linkData.code;
  console.log(`✓ Code extracted: ${code}`);
  
  console.log('\n2. Simulating a real user opening the link (sending app_open event)...');
  const eventRes = await fetch(`${SERVER_URL}/api/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appId,
      code,
      eventName: 'app_open',
      metadata: { source: 'hackonvibe', campaign: 'live-demo', is_e2e_test: true }
    })
  });
  
  const eventData = await eventRes.json();
  if (!eventRes.ok) throw new Error('Event reporting failed: ' + JSON.stringify(eventData));
  
  console.log(`✓ Event successfully reported to DropRoute server.`);
  
  console.log('\n3. Verifying the event exists in the database...');
  // We can query the Supabase REST API directly to verify
  const supabaseUrl = 'https://snfnlezvsikvgbfpbybb.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const dbRes = await fetch(`${supabaseUrl}/rest/v1/events?referral_code=eq.${code}&select=*`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  
  const dbRows = await dbRes.json();
  if (dbRows.length > 0) {
    console.log(`✅ SUCCESS! Found ${dbRows.length} row(s) in the database for code ${code}:`);
    console.log(dbRows[0]);
  } else {
    console.log('❌ FAILED: Event not found in the database.');
  }
}

testPipeline().catch(console.error);
