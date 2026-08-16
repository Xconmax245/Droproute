import type { PreconditionResult } from './preconditions';
import * as path from 'path';
import * as fs from 'fs';
import {
  Project,
  SyntaxKind,
  SourceFile,
  FunctionDeclaration,
  ArrowFunction,
  FunctionExpression,
  VariableDeclaration,
  IndentationText,
} from 'ts-morph';
import { getAttributionSdkSource } from './templates/attribution';

export type { PreconditionResult };

export interface InjectionPlan {
  /** Absolute path to the root layout file */
  rootLayoutPath: string;
  /** Absolute path to the first screen */
  firstScreenPath: string;
  /** Whether the first screen already has conditional rendering */
  hasExistingConditional: boolean;
  /** Human-readable rationale (from AI or from local heuristic fallback) */
  rationale: string;
}

export interface InjectionChange {
  /** Relative path from targetDir */
  relativePath: string;
  /** Original file content (before injection) */
  originalContent: string;
  /** New file content (after injection) */
  newContent: string;
}

export interface InjectionResult {
  changes: InjectionChange[];
  linesAdded: number;
  filesChanged: string[];
}

/**
 * Locates the root layout file in the /app directory.
 * Expo Router root layout convention: app/_layout.tsx (or .ts/.js/.jsx)
 */
export function findRootLayout(appDir: string): string | null {
  const candidates = ['_layout.tsx', '_layout.ts', '_layout.jsx', '_layout.js'];
  for (const c of candidates) {
    const p = path.join(appDir, c);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * Locates the first screen in the /app directory.
 * Convention: index.tsx is the default entry. Fall back to other non-layout files.
 */
export function findFirstScreen(appDir: string): string | null {
  const preferred = ['index.tsx', 'index.ts', 'index.jsx', 'index.js'];
  for (const c of preferred) {
    const p = path.join(appDir, c);
    if (fs.existsSync(p)) return p;
  }
  // Fallback: first non-layout file
  const files = fs.readdirSync(appDir).filter((f) => {
    return /\.(tsx?|jsx?)$/.test(f) && !f.startsWith('_');
  });
  if (files.length > 0) return path.join(appDir, files[0]);
  return null;
}

/**
 * Checks if a source file has existing conditional rendering logic
 * (ternary or if statement inside a JSX-returning component).
 */
export function detectExistingConditional(sourceFile: SourceFile): boolean {
  // Look for ternary expressions or if statements in the return statement
  const ternaries = sourceFile.getDescendantsOfKind(SyntaxKind.ConditionalExpression);
  const ifStatements = sourceFile.getDescendantsOfKind(SyntaxKind.IfStatement);
  return ternaries.length > 0 || ifStatements.length > 0;
}

/**
 * Gets the body of the default-exported component function.
 * Handles: function declarations, arrow functions assigned to const, etc.
 */
function getComponentBody(
  sourceFile: SourceFile
): { body: ReturnType<FunctionDeclaration['getBody']>; node: FunctionDeclaration | ArrowFunction | FunctionExpression } | null {
  // Try default-exported function declaration
  const defaultExport = sourceFile.getDefaultExportSymbol();
  if (defaultExport) {
    const decls = defaultExport.getDeclarations();
    for (const decl of decls) {
      if (decl.getKind() === SyntaxKind.FunctionDeclaration) {
        const fn = decl as FunctionDeclaration;
        const body = fn.getBody();
        if (body) return { body, node: fn };
      }
      if (decl.getKind() === SyntaxKind.ExportAssignment) {
        // export default ArrowFunction
        const expr = (decl as any).getExpression();
        if (expr && expr.getKind() === SyntaxKind.ArrowFunction) {
          const fn = expr as ArrowFunction;
          const body = fn.getBody();
          if (body) return { body, node: fn };
        }
      }
    }
  }

  // Fallback: find any exported arrow function variable
  const varDecls = sourceFile.getVariableDeclarations();
  for (const varDecl of varDecls) {
    const init = varDecl.getInitializer();
    if (!init) continue;
    const kind = init.getKind();
    if (kind === SyntaxKind.ArrowFunction || kind === SyntaxKind.FunctionExpression) {
      const fn = init as ArrowFunction | FunctionExpression;
      const body = fn.getBody();
      if (body) return { body, node: fn };
    }
  }

  return null;
}

/**
 * Patch the root layout (_layout.tsx):
 * 1. Add import for attribution SDK
 * 2. Add useEffect importing React if needed
 * 3. Insert captureReferral() + reportEvent('app_open') in the component body
 */
function patchRootLayout(
  project: Project,
  rootLayoutPath: string,
  targetDir: string
): void {
  const sourceFile = project.addSourceFileAtPath(rootLayoutPath);

  // 1. Add React import if not present (needed for useEffect)
  const reactImport = sourceFile.getImportDeclaration(
    (i) => i.getModuleSpecifierValue() === 'react'
  );
  if (!reactImport) {
    sourceFile.insertImportDeclaration(0, {
      defaultImport: 'React',
      namedImports: ['useEffect'],
      moduleSpecifier: 'react',
    });
  } else {
    // Ensure useEffect is in named imports
    const named = reactImport.getNamedImports();
    const hasUseEffect = named.some((n) => n.getName() === 'useEffect');
    if (!hasUseEffect) {
      reactImport.addNamedImport('useEffect');
    }
  }

  // 2. Add attribution SDK import
  const attributionImportPath = '../lib/droproute/attribution';
  const existingAttributionImport = sourceFile.getImportDeclaration(
    (i) => i.getModuleSpecifierValue() === attributionImportPath
  );
  if (!existingAttributionImport) {
    // Insert after last existing import
    const imports = sourceFile.getImportDeclarations();
    const insertIndex = imports.length;
    sourceFile.insertImportDeclaration(insertIndex, {
      namedImports: ['captureReferral', 'reportEvent'],
      moduleSpecifier: attributionImportPath,
    });
  }

  // 3. Insert useEffect into the component body
  const componentResult = getComponentBody(sourceFile);
  if (!componentResult) {
    throw new Error(
      `Could not locate a default-exported component function in ${rootLayoutPath}.\n` +
        `Merging attribution into this file is not safely possible — please check the file structure.`
    );
  }

  const bodyNode = componentResult.body;
  if (!bodyNode || bodyNode.getKind() !== SyntaxKind.Block) {
    throw new Error(
      `The root layout component's body is not a block statement (it may be a concise arrow function).\n` +
        `Cannot safely insert useEffect. File: ${rootLayoutPath}`
    );
  }

  const block = bodyNode.asKindOrThrow(SyntaxKind.Block);
  const statements = block.getStatements();

  // Check if attribution useEffect already injected
  const alreadyInjected = statements.some(
    (s) => s.getText().includes('captureReferral') || s.getText().includes('reportEvent')
  );

  if (!alreadyInjected) {
    // Insert useEffect as the first statement in the component
    block.insertStatements(
      0,
      `useEffect(() => {
    captureReferral().then(() => {
      reportEvent('app_open');
    });
  }, []);`
    );
  }

  sourceFile.saveSync();
}

/**
 * Patch the first screen (index.tsx):
 * 1. Add import for useDropRouteVariant
 * 2. Insert variant call near top of component
 * 3. Add conditional rendering branch for headline/CTA
 */
function patchFirstScreen(
  project: Project,
  firstScreenPath: string,
  hasExistingConditional: boolean
): void {
  const sourceFile = project.addSourceFileAtPath(firstScreenPath);

  // 1. Add attribution SDK import
  const attributionImportPath = '../lib/droproute/attribution';
  const existingAttributionImport = sourceFile.getImportDeclaration(
    (i) => i.getModuleSpecifierValue() === attributionImportPath
  );
  if (!existingAttributionImport) {
    const imports = sourceFile.getImportDeclarations();
    sourceFile.insertImportDeclaration(imports.length, {
      namedImports: ['useDropRouteVariant'],
      moduleSpecifier: attributionImportPath,
    });
  }

  // 2. Find the component body and insert variant logic
  const componentResult = getComponentBody(sourceFile);
  if (!componentResult) {
    throw new Error(
      `Could not locate a default-exported component function in ${firstScreenPath}.\n` +
        `Cannot safely insert variant routing. If the file has complex existing logic, resolve it manually.`
    );
  }

  const bodyNode = componentResult.body;
  if (!bodyNode || bodyNode.getKind() !== SyntaxKind.Block) {
    throw new Error(
      `The first screen component has a concise arrow body (no block). Cannot safely insert variant logic.\n` +
        `File: ${firstScreenPath}`
    );
  }

  const block = bodyNode.asKindOrThrow(SyntaxKind.Block);
  const statements = block.getStatements();

  const alreadyInjected = statements.some((s) => s.getText().includes('useDropRouteVariant'));

  if (!alreadyInjected) {
    if (hasExistingConditional) {
      // Warn but don't corrupt — instruct user instead
      throw new Error(
        `The first screen (${firstScreenPath}) already contains conditional rendering logic.\n` +
          `DropRoute cannot safely merge variant routing into complex existing conditionals.\n` +
          `Please manually add: const { headline, cta } = useDropRouteVariant();\n` +
          `and use it in your conditional rendering.`
      );
    }

    // Insert variant const near the top (before first return statement)
    const returnIdx = statements.findIndex((s) => s.getKind() === SyntaxKind.ReturnStatement);
    const insertAt = returnIdx > 0 ? returnIdx : 0;

    block.insertStatements(
      insertAt,
      `// DropRoute: onboarding variant routing
  const { headline: _droprouteHeadline, cta: _droprouteCta } = useDropRouteVariant();`
    );
  }

  // 3. Fix AST JSX Text Nodes natively via ts-morph
  const jsxElements = sourceFile.getDescendantsOfKind(SyntaxKind.JsxElement);
  
  let headlineReplaced = false;
  let ctaReplaced = false;

  for (const jsxElem of jsxElements) {
    const opening = jsxElem.getOpeningElement();
    if (opening.getTagNameNode().getText() === 'Text') {
      const children = jsxElem.getJsxChildren();
      for (const child of children) {
        if (child.getKind() === SyntaxKind.JsxText) {
          const text = child.getText();
          if (text.includes('Welcome to the app') && !headlineReplaced) {
            child.replaceWithText('{_droprouteHeadline}');
            headlineReplaced = true;
          } else if (text.includes('Get Started') && !ctaReplaced) {
            child.replaceWithText('{_droprouteCta}');
            ctaReplaced = true;
          }
        }
      }
    }
  }

  sourceFile.saveSync();
}

/**
 * Patch app.json to ensure a URL scheme is set for deep linking.
 */
function patchAppJson(targetDir: string): { changed: boolean; originalContent: string; newContent: string } {
  const appJsonPath = path.join(targetDir, 'app.json');
  const originalContent = fs.readFileSync(appJsonPath, 'utf-8');
  const appJson = JSON.parse(originalContent);

  let changed = false;
  if (!appJson.expo?.scheme) {
    const appName: string = appJson.expo?.name ?? 'myapp';
    const scheme = appName.toLowerCase().replace(/[^a-z0-9]/g, '');
    appJson.expo = appJson.expo ?? {};
    appJson.expo.scheme = scheme;
    changed = true;
  }

  const newContent = JSON.stringify(appJson, null, 2);
  if (changed) {
    fs.writeFileSync(appJsonPath, newContent, 'utf-8');
  }

  return { changed, originalContent, newContent };
}

/**
 * Patch package.json to add expo-linking if not present.
 */
function patchPackageJson(targetDir: string): { changed: boolean; originalContent: string; newContent: string } {
  const pkgPath = path.join(targetDir, 'package.json');
  const originalContent = fs.readFileSync(pkgPath, 'utf-8');
  const pkg = JSON.parse(originalContent);

  let changed = false;
  if (!pkg.dependencies?.['expo-linking']) {
    pkg.dependencies = pkg.dependencies ?? {};
    pkg.dependencies['expo-linking'] = 'latest';
    changed = true;
  }

  const newContent = JSON.stringify(pkg, null, 2);
  if (changed) {
    fs.writeFileSync(pkgPath, newContent, 'utf-8');
  }

  return { changed, originalContent, newContent };
}

/**
 * Main injection entry point.
 *
 * @param plan - The injection plan (from AI or heuristic fallback)
 * @param targetDir - Absolute path to the Expo project root
 * @param serverUrl - The DropRoute server URL to embed in the SDK
 * @param dryRun - If true, compute changes but do NOT write anything to disk
 */
export function runInjection(
  plan: InjectionPlan,
  targetDir: string,
  serverUrl: string,
  dryRun: boolean
): InjectionResult {
  // Default variant map — AI's recommendation is fed in as structured data in §5.1
  // For the base codemod without AI, we use a sensible default mapping.
  const variantMap: Record<string, string> = {
    twitter: 'a',
    instagram: 'a',
    facebook: 'b',
    tiktok: 'b',
    youtube: 'b',
    email: 'a',
    newsletter: 'a',
  };

  // -- Compute the attribution SDK content --
  const sdkContent = getAttributionSdkSource(serverUrl, variantMap);
  const sdkRelativePath = 'lib/droproute/attribution.ts';
  const sdkAbsolutePath = path.join(targetDir, sdkRelativePath);
  const sdkOriginalContent = fs.existsSync(sdkAbsolutePath)
    ? fs.readFileSync(sdkAbsolutePath, 'utf-8')
    : '';

  const changes: InjectionChange[] = [];

  // 1. Attribution SDK file
  changes.push({
    relativePath: sdkRelativePath,
    originalContent: sdkOriginalContent,
    newContent: sdkContent,
  });

  // 2. Root layout — compute changes using an in-memory ts-morph project
  {
    const rootContent = fs.readFileSync(plan.rootLayoutPath, 'utf-8');
    const project = new Project({
      useInMemoryFileSystem: dryRun,
      manipulationSettings: {
        indentationText: IndentationText.TwoSpaces,
        useTrailingCommas: true,
      },
    });

    if (dryRun) {
      // For dry-run: add all files to in-memory FS so ts-morph can resolve imports
      project.createSourceFile(plan.rootLayoutPath, rootContent);
    }

    const tempProject = new Project({
      useInMemoryFileSystem: true,
      manipulationSettings: {
        indentationText: IndentationText.TwoSpaces,
        useTrailingCommas: true,
      },
    });
    tempProject.createSourceFile(plan.rootLayoutPath, rootContent);

    patchRootLayout(tempProject, plan.rootLayoutPath, targetDir);

    const patched = tempProject.getSourceFileOrThrow(plan.rootLayoutPath);
    const newContent = patched.getFullText();

    changes.push({
      relativePath: path.relative(targetDir, plan.rootLayoutPath),
      originalContent: rootContent,
      newContent,
    });
  }

  // 3. First screen
  {
    const screenContent = fs.readFileSync(plan.firstScreenPath, 'utf-8');
    const tempProject = new Project({
      useInMemoryFileSystem: true,
      manipulationSettings: {
        indentationText: IndentationText.TwoSpaces,
        useTrailingCommas: true,
      },
    });
    tempProject.createSourceFile(plan.firstScreenPath, screenContent);

    patchFirstScreen(tempProject, plan.firstScreenPath, plan.hasExistingConditional);

    const patched = tempProject.getSourceFileOrThrow(plan.firstScreenPath);
    const newContent = patched.getFullText();

    changes.push({
      relativePath: path.relative(targetDir, plan.firstScreenPath),
      originalContent: screenContent,
      newContent,
    });
  }

  // 4. app.json
  {
    const appJsonPath = path.join(targetDir, 'app.json');
    const originalContent = fs.readFileSync(appJsonPath, 'utf-8');
    const appJson = JSON.parse(originalContent);
    let newContent = originalContent;

    if (!appJson.expo?.scheme) {
      const appName: string = appJson.expo?.name ?? 'myapp';
      const scheme = appName.toLowerCase().replace(/[^a-z0-9]/g, '');
      appJson.expo = appJson.expo ?? {};
      appJson.expo.scheme = scheme;
      newContent = JSON.stringify(appJson, null, 2);
    }

    if (newContent !== originalContent) {
      changes.push({
        relativePath: 'app.json',
        originalContent,
        newContent,
      });
    }
  }

  // 5. package.json
  {
    const pkgPath = path.join(targetDir, 'package.json');
    const originalContent = fs.readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(originalContent);
    let newContent = originalContent;

    if (!pkg.dependencies?.['expo-linking']) {
      pkg.dependencies = pkg.dependencies ?? {};
      pkg.dependencies['expo-linking'] = 'latest';
      newContent = JSON.stringify(pkg, null, 2);
    }

    if (newContent !== originalContent) {
      changes.push({
        relativePath: 'package.json',
        originalContent,
        newContent,
      });
    }
  }

  // -- If not a dry run, write all changes to disk --
  if (!dryRun) {
    for (const change of changes) {
      const fullPath = path.join(targetDir, change.relativePath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, change.newContent, 'utf-8');
    }
  }

  const linesAdded = changes.reduce((acc, c) => {
    const addedLines = c.newContent.split('\n').length - c.originalContent.split('\n').length;
    return acc + Math.max(0, addedLines);
  }, 0);

  return {
    changes,
    linesAdded,
    filesChanged: changes.map((c) => c.relativePath),
  };
}
