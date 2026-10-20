import { spawn } from 'node:child_process';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { paymentPolicy } from '../server/payment-policy.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const sha = value => createHash('sha256').update(value).digest('hex');
async function files(folder) {
  const result = [];
  for (const entry of await readdir(resolve(root, folder), { withFileTypes: true })) {
    const path = `${folder}/${entry.name}`;
    result.push(...(entry.isDirectory() ? await files(path) : [path]));
  }
  return result;
}
async function run(args) {
  const child = spawn(process.execPath, args, { cwd: root, stdio: 'inherit' });
  const code = await new Promise((done, reject) => { child.on('error', reject); child.on('close', done); });
  if (code !== 0) throw new Error(`Application build failed (${code}). Run npm ci in this application folder first.`);
}
const inputs = [...await files('src'), ...await files('server'), ...await files('scripts'), 'index.html', 'vite.config.ts', 'tsconfig.json', 'package.json', 'package-lock.json', 'README.md', 'LICENSE'].filter(file => file !== 'server/build-info.mjs').sort();
const sourceSha256 = {};
for (const file of inputs) sourceSha256[file] = sha(await readFile(file));
const sourceFingerprint = sha(JSON.stringify(sourceSha256));
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const variant = paymentPolicy.buildVariant;
const info = { id: `mustpayroll-${version}-${variant}-${sourceFingerprint.slice(0, 12)}`, variant, defaultPort: variant === 'faulty' ? 4175 : 4176, sourceSha256: sourceFingerprint };
await writeFile('server/build-info.mjs', `export const BUILD_INFO = ${JSON.stringify(info, null, 2)};\n`);
await run(['node_modules/typescript/bin/tsc', '--noEmit']);
await run(['node_modules/vite/bin/vite.js', 'build']);
const fileSha256 = {};
for (const file of [...inputs, 'server/build-info.mjs', ...await files('dist')].sort()) fileSha256[file] = sha(await readFile(file));
const manifest = { ...info, generatedAt: new Date().toISOString(), sourceFingerprint, sourceSha256, runtimeSha256: sha(JSON.stringify(fileSha256)), fileSha256 };
await writeFile('build-manifest.json', JSON.stringify(manifest, null, 2)+'\n');
console.log(`Built ${info.id} independently in ${relative(process.cwd(), root) || '.'}.`);
