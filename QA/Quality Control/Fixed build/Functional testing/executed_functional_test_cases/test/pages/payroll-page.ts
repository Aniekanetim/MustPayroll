import { expect, type Page } from '@playwright/test';

export class PayrollPage {
  constructor(readonly page: Page, readonly payrollDatasetId: string) {}
  get status() { return this.page.getByRole('status'); }
  async open(route = '/overview') {
    await this.page.goto(`${route}?payrollDatasetId=${encodeURIComponent(this.payrollDatasetId)}`);
    await this.ready();
  }
  async ready() {
    await expect(this.page.getByRole('main')).toHaveAttribute('aria-busy', 'false');
    await expect(this.page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(this.page.getByText('Loading payroll…', { exact: true })).toHaveCount(0);
  }
  async navigate(name: string) {
    await this.page.getByRole('navigation', { name: 'Payroll' })
      .getByRole('link', { name: new RegExp(`^${name}(?: \\d+)?$`) }).click();
    await this.ready();
  }
  metric(label: string) {
    return this.page.locator('dl.metrics').getByText(label, { exact: true }).locator('..').locator('dd');
  }
  async submit(action: () => Promise<void>, endpoint: string) {
    const responsePromise = this.page.waitForResponse(response =>
      new URL(response.url()).pathname === `/api/payroll-datasets/${this.payrollDatasetId}/${endpoint}` &&
      response.request().method() === 'POST');
    await action();
    const response = await responsePromise;
    expect(response.ok(), await response.text()).toBeTruthy();
    await this.ready();
  }
}
