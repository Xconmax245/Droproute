import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

export interface PreconditionResult {
  ok: boolean;
  error?: string;
  expoDir?: string;
  appDir?: string;
}

/**
 * Validates that the target directory is an Expo Router project
 * with a clean git working tree.
 */
export function checkPreconditions(targetDir: string): PreconditionResult {
  const resolvedDir = path.resolve(targetDir);

  // 1. Check directory exists
  if (!fs.existsSync(resolvedDir)) {
    return { ok: false, error: `Directory does not exist: ${resolvedDir}` };
  }

  // 2. Check for Expo project (app.json or app.config.ts with expo key)
  const appJsonPath = path.join(resolvedDir, 'app.json');
  const appConfigPath = path.join(resolvedDir, 'app.config.ts');
  const appConfigJsPath = path.join(resolvedDir, 'app.config.js');

  let isExpo = false;
  let expoDir = resolvedDir;

  if (fs.existsSync(appJsonPath)) {
    try {
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
      if (appJson.expo) {
        isExpo = true;
      }
    } catch {
      return { ok: false, error: `app.json exists but could not be parsed as JSON.` };
    }
  } else if (fs.existsSync(appConfigPath) || fs.existsSync(appConfigJsPath)) {
    // app.config.ts/js exists — assume it's an Expo project (can't safely eval it)
    isExpo = true;
  }

  if (!isExpo) {
    return {
      ok: false,
      error: `No Expo project detected in ${resolvedDir}.\nExpected app.json with an "expo" key, or app.config.ts/js.`,
    };
  }

  // 3. Check for Expo Router: /app directory with route files
  const appRouterDir = path.join(resolvedDir, 'app');
  if (!fs.existsSync(appRouterDir) || !fs.statSync(appRouterDir).isDirectory()) {
    return {
      ok: false,
      error: `Expo Router not detected: no /app directory found in ${resolvedDir}.\nDropRoute only supports Expo Router (file-based routing). React Navigation is out of scope.`,
    };
  }

  // Check /app contains at least one .tsx or .ts route file
  const routeFiles = fs.readdirSync(appRouterDir).filter((f) => /\.(tsx?|jsx?)$/.test(f));
  if (routeFiles.length === 0) {
    return {
      ok: false,
      error: `The /app directory exists but contains no route files (.tsx/.ts). Is this a fresh Expo Router project?`,
    };
  }

  // 4. Check git repository and clean working tree
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: resolvedDir,
      stdio: 'pipe',
    });
  } catch {
    return {
      ok: false,
      error: `${resolvedDir} is not a git repository.\nDropRoute requires git so that rollback is safe and auditable.\nRun: git init && git add -A && git commit -m "initial"`,
    };
  }

  try {
    const status = execSync('git status --porcelain', {
      cwd: resolvedDir,
      stdio: 'pipe',
    })
      .toString()
      .trim();

    if (status.length > 0) {
      return {
        ok: false,
        error: `Git working tree is not clean.\nDropRoute refuses to inject into a dirty tree to keep rollback honest.\nPlease commit or stash your changes first:\n\n${status}`,
      };
    }
  } catch {
    return {
      ok: false,
      error: `Could not run git status in ${resolvedDir}.`,
    };
  }

  return { ok: true, expoDir: resolvedDir, appDir: appRouterDir };
}
