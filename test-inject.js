const codemod = require('./packages/codemod/dist/index.js');
const path = require('path');
const targetDir = path.resolve('demo-app-v2');
const plan = {
  rootLayoutPath: path.join(targetDir, 'app', '_layout.tsx'),
  firstScreenPath: path.join(targetDir, 'app', 'index.tsx'),
  hasExistingConditional: false,
  rationale: 'manual'
};
console.log('Running injection...');
try {
  const result = codemod.runInjection(plan, targetDir, 'http://localhost:8787', false);
  console.log('Success!', result.filesChanged);
} catch (e) {
  console.error('Error!', e);
}
process.exit(0);
