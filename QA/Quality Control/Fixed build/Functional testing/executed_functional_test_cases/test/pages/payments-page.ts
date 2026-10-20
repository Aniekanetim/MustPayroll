import { expect } from '@playwright/test';
import { PayrollPage } from './payroll-page';

export class PaymentsPage extends PayrollPage {
  async capture() {
    await expect(this.page.getByRole('heading', { name: 'Payments', exact: true })).toBeVisible();
    const heading = await this.page.getByRole('heading', { name: /^\d+ payment records?$/ }).innerText();
    const rows = this.page.getByRole('region', { name: 'Payment records', exact: true }).locator('tbody tr');
    const records = [];
    for (const row of await rows.all()) {
      const cells = row.getByRole('cell');
      const href = await row.getByRole('link', { name: /^View receipt for / }).getAttribute('href');
      records.push({ employee: await cells.nth(0).locator('strong').innerText(),
        payPeriodStartsAt: await cells.nth(1).innerText(), amount: await cells.nth(3).innerText(), paymentStatus: await cells.nth(4).locator('.badge').innerText(), notification: await cells.nth(5).innerText(),
        reference: href!.split('/').pop()! });
    }
    return { heading, records, empty: await this.page.getByRole('heading', { name: 'No payments recorded', exact: true }).isVisible() };
  }
  async receipt(reference: string) {
    await this.page.getByRole('link', { name: new RegExp(`^View receipt for .*, ${reference}$`) }).click();
    await this.ready();
    await expect(this.page.getByRole('heading', { name: 'Payment receipt', exact: true })).toBeVisible();
    const detail = (label: string) => this.page.locator('dl.detail-list').getByText(label, { exact: true }).locator('..').locator('dd');
    const earningRows = [];
    for (const row of await this.page.getByRole('region', { name: 'Earnings included in payment' }).locator('tbody tr').all()) {
      const cells = row.getByRole('cell');
      earningRows.push({ id: await cells.nth(0).locator('code').innerText(), amount: await cells.nth(1).innerText(), approval: await cells.nth(2).innerText() });
    }
    return { amount: await this.page.getByRole('heading', { level: 2 }).innerText(), earningRows,
      reference: await detail('Reference').innerText(), bank: await detail('Bank').innerText(),
      notification: await detail('Notification').innerText() };
  }
}
