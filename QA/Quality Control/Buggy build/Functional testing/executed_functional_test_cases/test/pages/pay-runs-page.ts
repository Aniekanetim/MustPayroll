import { expect } from '@playwright/test';
import { PayrollPage } from './payroll-page';

export class PayRunsPage extends PayrollPage {
  get reviewButton() { return this.page.getByRole('button', { name: 'Pay on Tuesday 09:00 UTC', exact: true }); }
  get retryButton() { return this.page.getByRole('button', { name: 'Retry pay run', exact: true }); }
  get confirmation() { return this.page.getByRole('dialog'); }
  get processButton() { return this.confirmation.getByRole('button', { name: 'Pay on Tuesday 09:00 UTC', exact: true }); }
  override async open() { await super.open('/pay-runs'); }
  async expectPeriod(label: string) {
    await expect(this.page.locator('.run-summary .period-range')).toHaveText(label);
    await expect(this.page.locator('.run-summary .period-boundary-note')).toHaveText('Start included · End excluded');
  }
  async reviewPayroll() { await this.reviewButton.click(); }
  async confirmPayroll() { await this.submit(() => this.processButton.click(), 'pay-runs'); }
  async reviewRetry() { await this.retryButton.click(); }
  async confirmRetry() {
    await this.submit(() => this.confirmation.getByRole('button', { name: 'Retry pay run', exact: true }).click(), 'pay-runs');
  }
  async processPayroll() { await this.reviewPayroll(); await this.confirmPayroll(); }
  async retryPayroll() { await this.reviewRetry(); await this.confirmRetry(); }
  async selectDate(value: string) {
    const responsePromise = this.page.waitForResponse(response =>
      new URL(response.url()).pathname === `/api/payroll-datasets/${this.payrollDatasetId}` &&
      new URL(response.url()).searchParams.get('scheduledPayRunAt') === `${value}T09:00:00.000Z`);
    await this.page.getByLabel('Pay date', { exact: true }).fill(value);
    expect((await responsePromise).ok()).toBeTruthy();
    await this.ready();
    await expect(this.page.getByLabel('Pay date', { exact: true })).toHaveValue(value);
  }
  async capture() {
    await expect(this.page.getByRole('heading', { name: 'Pay runs', exact: true })).toBeVisible();
    const rows = this.page.getByRole('region', { name: 'Payroll breakdown' }).locator('tbody tr');
    const employeePayrollSummaries = [];
    for (const row of await rows.all()) {
      const cells = row.getByRole('cell');
      employeePayrollSummaries.push({ employee: await cells.nth(0).getByRole('link').innerText(),
        earnings: await cells.nth(1).innerText(), approved: await cells.nth(2).innerText(),
        recorded: await cells.nth(3).innerText(), status: await cells.nth(4).innerText() });
    }
    return { payDate: await this.page.getByLabel('Pay date', { exact: true }).inputValue(),
      period: await this.page.locator('.run-summary .period-range').innerText(),
      approved: await this.metric('Approved pay').innerText(), recorded: await this.metric('Recorded pay').innerText(),
      unpaid: await this.metric('Unpaid amount').innerText(), employeePayrollSummaries,
      alerts: await this.page.getByRole('alert').allTextContents() };
  }
}
