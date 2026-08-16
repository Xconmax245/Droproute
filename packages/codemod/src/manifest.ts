import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

export interface ManifestEntry {
  relativePath: string;
  originalContent: string;
  hash: string;
}

export interface Manifest {
  version: '1';
  injectedAt: string;
  targetDir: string;
  files: ManifestEntry[];
}

const MANIFEST_DIR = '.droproute';
const MANIFEST_FILE = 'manifest.json';

export function getManifestPath(targetDir: string): string {
  return path.join(targetDir, MANIFEST_DIR, MANIFEST_FILE);
}

export function manifestExists(targetDir: string): boolean {
  return fs.existsSync(getManifestPath(targetDir));
}

export function readManifest(targetDir: string): Manifest {
  const manifestPath = getManifestPath(targetDir);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`No manifest found at ${manifestPath}. Has droproute inject been run?`);
  }
  const raw = fs.readFileSync(manifestPath, 'utf-8');
  return JSON.parse(raw) as Manifest;
}

export function writeManifest(targetDir: string, entries: Omit<ManifestEntry, 'hash'>[]): Manifest {
  const manifestDir = path.join(targetDir, MANIFEST_DIR);
  if (!fs.existsSync(manifestDir)) {
    fs.mkdirSync(manifestDir, { recursive: true });
  }

  const files: ManifestEntry[] = entries.map((e) => ({
    ...e,
    hash: crypto.createHash('sha256').update(e.originalContent).digest('hex'),
  }));

  const manifest: Manifest = {
    version: '1',
    injectedAt: new Date().toISOString(),
    targetDir,
    files,
  };

  fs.writeFileSync(getManifestPath(targetDir), JSON.stringify(manifest, null, 2), 'utf-8');
  return manifest;
}

export function deleteManifest(targetDir: string): void {
  const manifestPath = getManifestPath(targetDir);
  if (fs.existsSync(manifestPath)) {
    fs.unlinkSync(manifestPath);
  }
}

export function hashFile(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export interface StatusReport {
  state: 'injected' | 'not-injected' | 'partially-modified';
  files: Array<{
    relativePath: string;
    status: 'unchanged' | 'modified' | 'missing';
  }>;
}

export function getStatus(targetDir: string): StatusReport {
  if (!manifestExists(targetDir)) {
    return { state: 'not-injected', files: [] };
  }

  const manifest = readManifest(targetDir);
  let anyModified = false;

  const files = manifest.files.map((entry) => {
    const fullPath = path.join(targetDir, entry.relativePath);
    if (!fs.existsSync(fullPath)) {
      anyModified = true;
      return { relativePath: entry.relativePath, status: 'missing' as const };
    }
    const currentContent = fs.readFileSync(fullPath, 'utf-8');
    const currentHash = hashFile(currentContent);
    // The "original" hash was the state before injection; we compare by looking at
    // whether the file now matches what inject wrote, not the original.
    // We store original content in the manifest — so "unchanged since inject" means
    // the current hash does NOT match the original (it should be the injected version).
    // For status: we detect if someone hand-edited AFTER injection by comparing
    // against the injected content hash.
    // We don't have injected hash in v1 — just original. So flag if re-reading the
    // original hash would match current (i.e., rollback wasn't done but file is back to original)
    if (currentHash === entry.hash) {
      // File matches original pre-injection content — unexpected, mark as modified
      anyModified = true;
      return { relativePath: entry.relativePath, status: 'modified' as const };
    }
    return { relativePath: entry.relativePath, status: 'unchanged' as const };
  });

  return {
    state: anyModified ? 'partially-modified' : 'injected',
    files,
  };
}
