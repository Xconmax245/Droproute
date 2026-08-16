const codemod = require('./packages/codemod/dist/index.js');
const path = require('path');
const targetDir = path.resolve('../demo-app-v2-standalone');
const plan = {
  rootLayoutPath: path.join(targetDir, 'app', '_layout.tsx'),
  firstScreenPath: path.join(targetDir, 'app', 'index.tsx'),
  hasExistingConditional: false,
  rationale: 'manual'
};

console.log('Running injection on', targetDir);
try {
  const result = codemod.runInjection(plan, targetDir, 'http://localhost:8787', false);
  console.log('Injected files:', result.filesChanged);
} catch (e) {
  console.error('Injection failed:', e);
}
