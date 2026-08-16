const fs = require('fs');
fs.cpSync('demo-app-v2', '../demo-app-v2-standalone', { recursive: true });
console.log('Copied');
