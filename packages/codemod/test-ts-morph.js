const { Project } = require('ts-morph');
console.log('1. Creating Project');
const project = new Project({ useInMemoryFileSystem: true });
console.log('2. Created Project');
const fs = require('fs');
const path = require('path');
const firstScreenPath = path.resolve('demo-app-v2/app/index.tsx');
console.log('3. Reading file');
const content = fs.readFileSync(firstScreenPath, 'utf-8');
console.log('4. Adding to project');
const sf = project.createSourceFile(firstScreenPath, content);
console.log('5. Getting descendants');
const ternaries = sf.getDescendantsOfKind(224); // ConditionalExpression
console.log('6. Done');
process.exit(0);
