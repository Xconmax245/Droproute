require('dotenv').config();
const appId = '123e9265-0bd1-47ab-a096-5348c7a1b0f0';
const supabaseUrl = 'https://snfnlezvsikvgbfpbybb.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function updateScheme() {
  const res = await fetch(`${supabaseUrl}/rest/v1/apps?id=eq.${appId}`, {
    method: 'PATCH',
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ scheme: 'exp://172.20.10.3:8081/--' })
  });
  if (res.ok) console.log('✓ Scheme updated for local Expo Go testing');
  else console.error('✖ Failed', await res.text());
}

updateScheme();
