import { expect } from '@playwright/test';
import { PayrollPage } from './payroll-page';

export class NotificationsPage extends PayrollPage {
  async capture() {
    await expect(this.page.getByRole('heading', { name: 'Notifications', exact: true })).toBeVisible();
    const records = [];
    for (const row of await this.page.locator('ul.record-list > li').all()) {
      const href = await row.getByRole('link', { name: 'View payment receipt', exact: true }).getAttribute('href');
      records.push({ employee: await row.locator('strong').innerText(),
        state: await row.locator('.badge').innerText(), paymentId: href!.split('/').pop()!,
        error: await row.locator('.delivery-error').allTextContents() });
    }
    return { retryPendingEnabled: await this.page.getByRole('button', { name: 'Retry pending notifications', exact: true }).isEnabled(), pending: await this.metric('Pending delivery').innerText(), sent: await this.metric('Sent').innerText(),
      records, empty: await this.page.getByRole('heading', { name: 'No notifications yet', exact: true }).isVisible() };
  }
}
