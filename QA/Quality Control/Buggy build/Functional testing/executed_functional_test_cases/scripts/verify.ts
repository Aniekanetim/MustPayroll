import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { chromium } from '@playwright/test';
import type { JSONReport, JSONReportSpec, JSONReportSuite } from '@playwright/test/reporter';
import { applicationDirectory, executionDirectory, manifestPath, readBuildManifest, type BuildManifest } from './build.ts';

interface SavedState {
  currency: string;
  approvedTotalCents: number;
  recordedPaymentTotalCents: number;
  pendingNotificationCount: number;
  payments: { paymentId: string }[];
  notifications: { notificationId: string }[];
  earnings: { earningId: string; amountCents: number; approvalStatus: string }[];
  earningIdsInPeriod: string[];
}
interface Screen {
  payRun: { recorded: string };
  payments: { records: { reference: string }[] };
  receipts: unknown[];
  notifications: { pending: string };
}
interface Observation {
  channel: 'ui';
  first?: SavedState;
  after?: SavedState;
  uiFirst?: Screen;
  uiAfter?: Screen;
  browserRequests?: { path: string; body: { scheduledPayRunAt: string; simulatedProcessingAt: string } }[];
}

const root = resolve(executionDirectory, '../../../../..');
const npmCli = process.env.npm_execpath;
assert.ok(npmCli, 'Run this through npm run verify.');
const clean = (value: string) => value.replace(/\u001b\[[0-9;]*m/g, '').split(root).join('<project>').split(root.replaceAll('\\', '/')).join('<project>');
function scrub(value: unknown): unknown {
  if (typeof value === 'string') return clean(value);
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, scrub(item)]));
  return value;
}
const sha = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');

async function run(name: string, args: string[], extra: Record<string, string> = {}, logFile?: string) {
  console.log(`\n${name}`);
  const child = spawn(process.execPath, args, { cwd: executionDirectory, env: { ...process.env, ...extra }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  for (const stream of [child.stdout, child.stderr]) stream.on('data', (data: Buffer) => {
    output += data.toString();
    process.stdout.write(data);
  });
  const code = await new Promise<number | null>((done, reject) => {
    child.on('error', reject);
    child.on('close', done);
  });
  if (logFile) await writeFile(logFile, clean(output));
  return code;
}
function specs(suite: JSONReportSuite): JSONReportSpec[] {
  return [...suite.specs, ...(suite.suites ?? []).flatMap(specs)];
}
async function readAttachment<T>(spec: JSONReportSpec, name: string): Promise<T> {
  const item = spec.tests.flatMap(test => test.results).flatMap(result => result.attachments).find(attachment => attachment.name === name);
  assert.ok(item, `Missing evidence: ${name}`);
  assert.ok(item.body || item.path, `Empty evidence: ${name}`);
  const bytes = item.body ? Buffer.from(item.body, 'base64') : await readFile(item.path!);
  return JSON.parse(bytes.toString());
}
async function verifyBuild(build: BuildManifest) {
  const current = await readBuildManifest();
  assert.deepEqual(current, build, 'Application identity changed during verification.');
  assert.equal(sha(JSON.stringify(build.fileSha256)), build.runtimeSha256);
  for (const [file, hash] of Object.entries({ ...build.sourceSha256, ...build.fileSha256 })) {
    assert.equal(sha(await readFile(resolve(applicationDirectory, file))), hash, `Application changed: ${file}`);
  }
}

const npmBuildArgs = [npmCli, 'run', 'build:app'];
assert.equal(await run('build', npmBuildArgs), 0, 'Build failed.');
const build = await readBuildManifest();
const variant = build.variant;
const expectedIds = ['TC01', 'TC02', 'TC05', 'TC06', 'TC07', 'TC08'];
const testFiles = ['test/helpers.ts', 'test/specs/ui/payroll-ui.spec.ts', 'test/pages/payroll-page.ts',
  'test/pages/pay-runs-page.ts', 'test/pages/earnings-page.ts', 'test/pages/payments-page.ts',
  'test/pages/notifications-page.ts', 'playwright.config.ts', '../functional-test-suite.md'];
const sourceFiles = [...new Set(['package.json', 'package-lock.json', 'tsconfig.json',
  'scripts/build.ts', 'scripts/scenario.ts', 'scripts/verify.ts', ...testFiles])].sort();
const qaSourceSha256: Record<string, string> = {};
for (const file of sourceFiles) qaSourceSha256[file] = sha(await readFile(resolve(executionDirectory, file)));
const testSuiteSha256 = sha(JSON.stringify(Object.fromEntries(testFiles.map(file => [file, qaSourceSha256[file]]))));
const qaSourceFingerprint = sha(JSON.stringify(qaSourceSha256));
const browser = await chromium.launch({ channel: 'chromium' });
const environment = { node: process.version, platform: process.platform, architecture: process.arch, chromium: browser.version() };
await browser.close();
await verifyBuild(build);
const diagnosticsDirectory = resolve(executionDirectory, 'data/playwright');
const reportPath = resolve(diagnosticsDirectory, 'report.json');
await mkdir(diagnosticsDirectory, { recursive: true });
const startedAt = new Date().toISOString();
const exitCode = await run(`${variant}-run`, ['node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.config.ts'],
  {}, resolve(diagnosticsDirectory, 'console.log'));
const finishedAt = new Date().toISOString();
const report: JSONReport = JSON.parse(await readFile(reportPath, 'utf8'));
const all = report.suites.flatMap(specs);
assert.deepEqual(all.map(spec => spec.title.split(' | ')[0]).sort(), expectedIds, 'This project must execute the six UI cases once. TC03 and TC04 are separate manual Postman checks.');
assert.equal(report.errors.length, 0, 'Unexpected runner error.');
const failed = all.filter(spec => spec.tests.some(test => test.results.some(result => result.status !== 'passed')))
  .map(spec => spec.title.split(' | ')[0]).sort();
assert.deepEqual(failed, variant === 'faulty' ? ['TC01', 'TC06', 'TC07', 'TC08'] : [], 'Unexpected failure set; inspect actual results.');
assert.equal(exitCode, variant === 'faulty' ? 1 : 0);
const observations = new Map<string, Observation>();
for (const spec of all) {
  assert.equal(spec.tests.length, 1, 'Each case must execute once per build.');
  const results = spec.tests[0].results;
  assert.equal(results.length, 1, 'No retries may disguise a result.');
  assert.ok(['passed', 'failed'].includes(results[0].status ?? ''), 'Timeouts/skips are not business-defect evidence.');
  const observation = await readAttachment<Observation>(spec, 'case-observation');
  const caseId = spec.title.split(' | ')[0];
  assert.equal(observation.channel, 'ui', `Wrong suite: ${caseId}`);
  assert.equal(spec.tests[0].projectName, 'ui-functional');
  const runs = observation.browserRequests!.filter(request => request.path.endsWith('/pay-runs')).map(request => request.body);
  assert.ok(runs.length, `No browser payroll action: ${caseId}`);
  for (const request of runs) {
    assert.equal(request.simulatedProcessingAt, request.scheduledPayRunAt, 'Processing must explicitly model the selected pay instant.');
    const instant = new Date(request.simulatedProcessingAt!);
    assert.equal(instant.getUTCDay(), 2);
    assert.equal(instant.toISOString().slice(11), '09:00:00.000Z');
  }
  assert.ok(observation.uiAfter ?? observation.uiFirst, `No screen observations: ${caseId}`);
  for (const [uiKey, recordKey] of [['uiFirst', 'first'], ['uiAfter', 'after']] as const) {
    const ui = observation[uiKey];
    if (!ui) continue;
    const records = observation[recordKey];
    assert.ok(records, `No saved-record checkpoint for ${uiKey}: ${spec.title}`);
    assert.equal(records.currency, 'USD', `Wrong payroll currency: ${spec.title}`);
    assert.equal(Number(ui.payRun.recorded.replace(/[^0-9.]/g, '')) * 100, records.recordedPaymentTotalCents, `UI and ledger differ: ${spec.title}`);
    assert.deepEqual(ui.payments.records.map(payment => payment.reference).sort(), records.payments.map(payment => payment.paymentId).sort(), `UI payment references differ: ${spec.title}`);
    assert.equal(ui.receipts.length, records.payments.length, `Receipts not opened: ${spec.title}`);
    assert.equal(Number(ui.notifications.pending), records.pendingNotificationCount, `UI delivery count differs: ${spec.title}`);
  }
  observations.set(spec.title.split(' | ')[0], observation);
}
const approval = observations.get('TC01')?.after;
assert.ok(approval, 'Missing approval-exclusion observation.');
assert.equal(approval.approvedTotalCents, 435000);
assert.equal(approval.recordedPaymentTotalCents, variant === 'faulty' ? 510000 : 435000);
assert.equal(approval.earnings.filter(earning => earning.approvalStatus === 'pending').length, 2);
assert.equal(approval.earnings.filter(earning => earning.approvalStatus === 'rejected').length, 1);
const regression = all.find(spec => spec.title.startsWith('TC07 |'))!;
const state = await readAttachment<SavedState>(regression, 'observed-payroll-dataset');
const first = await readAttachment<SavedState>(regression, 'first-attempt');
assert.equal(state.recordedPaymentTotalCents, variant === 'faulty' ? 300000 : 150000);
assert.equal(state.payments.length, variant === 'faulty' ? 2 : 1);
assert.equal(state.pendingNotificationCount, 0);
assert.equal(first.notifications.length, variant === 'faulty' ? 0 : 1);
assert.equal(state.notifications.length, variant === 'faulty' ? 0 : 1);
if (variant === 'faulty') {
  const error = regression.tests[0].results[0].error?.message ?? '';
  assert.ok(error.includes('1,500.00') && error.includes('3,000.00'), 'TC07 must fail on the business amount.');
}
const notificationWork = observations.get('TC08')?.after;
assert.ok(notificationWork, 'Missing ordinary-processing notification observation.');
assert.equal(notificationWork.recordedPaymentTotalCents, 150000);
assert.equal(notificationWork.payments.length, 1);
assert.equal(notificationWork.notifications.length, variant === 'faulty' ? 0 : 1);
const servedBuild = await readAttachment<{ build: { id: string; sourceSha256: string } }>(regression, 'served-build');
assert.equal(servedBuild.build.id, build.id);
assert.equal(servedBuild.build.sourceSha256, build.sourceFingerprint);
report.config.metadata = {
  ...report.config.metadata, application: 'MustPayroll', buildId: build.id,
  sourceFingerprint: build.sourceFingerprint, testSuiteSha256: testSuiteSha256,
  servedBuild, environment, coverage: 'Six UI functional cases in Chromium using POM. Technical data setup and supporting saved-record checks corroborate browser actions. TC03 and TC04 are separate manual Postman cases and are not executed by this command.',
  command: 'npm run verify', startedAt, finishedAt, exitCode, qaSourceFingerprint, qaSourceSha256,
  manifestPath: clean(manifestPath),
};
// Embed diagnostics so the saved report does not depend on ignored local files.
for (const spec of all) for (const test of spec.tests) for (const result of test.results) {
  for (const attachment of result.attachments) if (attachment.path) {
    attachment.body = Buffer.from(clean(await readFile(attachment.path, 'utf8'))).toString('base64');
    delete attachment.path;
  }
}
await writeFile(reportPath, JSON.stringify(scrub(report), null, 2) + '\n');
await verifyBuild(build);

for (const [file, hash] of Object.entries(qaSourceSha256)) {
  assert.equal(sha(await readFile(resolve(executionDirectory, file))), hash, `QA source changed while testing: ${file}`);
}
console.log(`\nMustPayroll ${variant === 'faulty' ? 'buggy' : 'fixed'} UI verification complete: ${variant === 'faulty' ? '2 passed / 4 failed (TC01, TC06, TC07, TC08)' : '6 passed / 0 failed'}.`);
console.log('TC03 and TC04 are separate manual Postman checks; this command does not execute them.');
console.log('Review the actual run before updating functional-testing-results.md. Diagnostics remain in ignored data/playwright.');
