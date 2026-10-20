import { expect } from '@playwright/test';
import { PayrollPage } from './payroll-page';

export class EarningsPage extends PayrollPage {
  get records() {
    return this.page.locator('section.panel').filter({ has: this.page.getByRole('heading', { name: 'Earning records', exact: true }) }).locator('ul.record-list > li');
  }
  override async open() { await super.open('/earnings'); }
  async record(input: { employeeId: string; description: string; amount: string; earnedAt: string }) {
    await this.page.getByRole('combobox', { name: 'Employee', exact: true }).selectOption(input.employeeId);
    await this.page.getByLabel('Description', { exact: true }).fill(input.description);
    await this.page.getByRole('textbox', { name: /^Amount \(USD\)/ }).fill(input.amount);
    await this.page.getByLabel('Earning date and time (UTC)', { exact: true }).fill(input.earnedAt);
    await this.page.getByRole('combobox', { name: 'Approval status', exact: true }).selectOption('pending');
    await this.submit(() => this.page.getByRole('button', { name: 'Record earnings', exact: true }).click(), 'earnings');
    await expect(this.status).toContainText('Earnings recorded.');
  }
  async approve(description: string, employee: string) {
    const record = this.records.filter({ has: this.page.getByText(description, { exact: true }) })
      .filter({ has: this.page.getByRole('link', { name: employee, exact: true }) });
    const earningId = await record.locator('code').innerText();
    await this.submit(() => record.getByRole('button', { name: `Approve earnings: ${description} for ${employee}`, exact: true }).click(), `earnings/${earningId}/approve`);
    await expect(record.locator('.badge')).toHaveText('Approved');
  }
  async reject(description: string, employee: string) {
    const record = this.records.filter({ has: this.page.getByText(description, { exact: true }) })
      .filter({ has: this.page.getByRole('link', { name: employee, exact: true }) });
    const earningId = await record.locator('code').innerText();
    const amount = await record.locator('strong.money').innerText();
    const button = record.getByRole('button', { name: `Reject earnings: ${description} for ${employee}`, exact: true });
    await button.click();
    const dialog = this.page.getByRole('dialog', { name: 'Reject these earnings?' });
    await expect(dialog).toContainText(`${description} for ${employee}: ${amount}`);
    await dialog.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(button).toBeFocused();
    await expect(record.locator('.badge')).toHaveText('Pending');
    await button.click();
    await this.submit(() => dialog.getByRole('button', { name: 'Reject earnings', exact: true }).click(), `earnings/${earningId}/reject`);
    await expect(this.status).toContainText('Earnings rejected.');
    await expect(record.locator('.badge')).toHaveText('Rejected');
    await expect(record.getByRole('button')).toHaveCount(0);
  }
  async capture() {
    await expect(this.page.getByRole('heading', { name: 'Earnings', exact: true })).toBeVisible();
    const records = [];
    for (const record of await this.records.all()) records.push({
      earningId: await record.locator('code').innerText(), employee: await record.getByRole('link').innerText(),
      amount: await record.locator('strong.money').innerText(), status: await record.locator('.badge').innerText(),
      earnedAt: await record.locator('span.secondary').last().innerText(),
    });
    return records;
  }
}
