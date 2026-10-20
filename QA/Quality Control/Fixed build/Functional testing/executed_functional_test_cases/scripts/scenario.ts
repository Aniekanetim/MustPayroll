import { expectedBuildVariant } from './build.ts';

// This execution project prepares records only in its own separately running application.
const args = process.argv.slice(2);
const value = (flag: string, fallback: string) => {
  const index = args.indexOf(flag);
  if (index < 0) return fallback;
  const selectedValue = args[index + 1];
  if (!selectedValue || selectedValue.startsWith('--')) throw new Error(`Supply a value for ${flag}.`);
  return selectedValue;
};
const selected = expectedBuildVariant(), testDataPreset = value('--test-data-preset', 'oneApprovedEarning');
for (let index = 0; index < args.length; index += 2) {
  if (args[index] !== '--test-data-preset') throw new Error('Use only --test-data-preset; this project already selects its application build.');
}
const port = selected === 'faulty' ? 4175 : 4176;
const url = new URL(process.env.MUSTPAYROLL_URL ?? `http://127.0.0.1:${port}`);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.protocol !== 'http:') throw new Error('Test-data preparation is restricted to the local MustPayroll service.');

async function post(path: string, data: Record<string, unknown>): Promise<{ payrollDatasetId: string; error?: string }> {
  const response = await fetch(new URL(path, url), {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error);
  return body;
}
const health = await fetch(new URL('/api/health', url)).then(response => response.json());
if (health.build.variant !== selected) throw new Error('The requested build is not running at this URL.');
const payrollDataset = await post('/api/payroll-datasets', { testDataPreset });
console.log(`MustPayroll ${selected === 'faulty' ? 'buggy' : 'fixed'} example\nPayroll dataset ID: ${payrollDataset.payrollDatasetId}\nBuild: ${health.build.id}\n\nPay run: ${new URL(`/pay-runs?payrollDatasetId=${payrollDataset.payrollDatasetId}`, url)}\nOverview: ${new URL(`/overview?payrollDatasetId=${payrollDataset.payrollDatasetId}`, url)}\n\nNext: open the pay-run URL, review the approved total, process payroll and inspect Payments and Notifications.\nThen retry the same pay run and compare payment references, count, amount and notification records. No fault setup or network disconnection is needed.`);
