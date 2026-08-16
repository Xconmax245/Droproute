const fs = require('fs');
fs.cpSync('demo-app/assets', 'demo-app-v2/assets', { recursive: true });
console.log('Copied assets');
