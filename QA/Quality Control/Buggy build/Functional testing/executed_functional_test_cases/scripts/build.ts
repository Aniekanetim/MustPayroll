import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export type Variant = 'faulty' | 'fixed';
export interface BuildManifest {
  id: string;
  variant: Variant;
  defaultPort: number;
  sourceFingerprint: string;
  runtimeSha256: string;
  sourceSha256: Record<string, string>;
  fileSha256: Record<string, string>;
}

export const executionDirectory = fileURLToPath(new URL('../', import.meta.url));
export const applicationDirectory = resolve(executionDirectory, '../../../../../MustPayroll/MustPayroll_buggy');
export const manifestPath = resolve(applicationDirectory, 'build-manifest.json');
export function expectedBuildVariant(): Variant { return 'faulty'; }

export async function readBuildManifest(): Promise<BuildManifest> {
  const manifest: BuildManifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  assert.equal(manifest.variant, expectedBuildVariant(), 'This QC project must use its own application build.');
  return manifest;
}

async function buildApplication() {
  const npmCli = process.env.npm_execpath;
  assert.ok(npmCli, 'Run npm run build:app from this execution project.');
  const child = spawn(process.execPath, [npmCli, 'run', 'build'], { cwd: applicationDirectory, stdio: 'inherit' });
  const code = await new Promise<number | null>((done, reject) => {
    child.on('error', reject);
    child.on('close', done);
  });
  assert.equal(code, 0, 'Application build failed. Install its dependencies with npm ci.');
  const manifest = await readBuildManifest();
  console.log(`Built MustPayroll buggy: ${manifest.id}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await buildApplication();
