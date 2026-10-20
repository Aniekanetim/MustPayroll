import { expect, type Page } from '@playwright/test';
import { uiTest as test, createPayrollDataset, simulateNextFailure, capturePayrollState, readPayrollState } from '../../helpers';
import { PayRunsPage } from '../../pages/pay-runs-page';
import { EarningsPage } from '../../pages/earnings-page';
import { PaymentsPage } from '../../pages/payments-page';
import { NotificationsPage } from '../../pages/notifications-page';

// Read what the operator sees before asserting, so failing builds retain their actual UI outcome.
async function inspectJourney(page: Page, payRuns: PayRunsPage) {
  const payRun = await payRuns.capture();
  const payments = new PaymentsPage(page, payRuns.payrollDatasetId);
  await payRuns.navigate('Payments');
  const paymentList = await payments.capture(), receipts = [];
  for (const payment of paymentList.records) {
    receipts.push(await payments.receipt(payment.reference));
    await payments.navigate('Payments');
  }
  await payments.navigate('Notifications');
  const notifications = await new NotificationsPage(page, payRuns.payrollDatasetId).capture();
  await payRuns.navigate('Pay runs');
  return { payRun, payments: paymentList, receipts, notifications };
}

function expectPayments(ui: Awaited<ReturnType<typeof inspectJourney>>, expected: { employee: string; amount: string }[]) {
  expect(ui.payments.heading).toBe(`${expected.length} payment ${expected.length === 1 ? 'record' : 'records'}`);
  expect(ui.payments.records.map(({ employee, amount }) => ({ employee, amount })).sort((left, right) => left.employee.localeCompare(right.employee)))
    .toEqual([...expected].sort((left, right) => left.employee.localeCompare(right.employee)));
  expect(ui.receipts.map(({ reference, amount }) => ({ reference, amount })).sort((left, right) => left.reference.localeCompare(right.reference)))
    .toEqual(ui.payments.records.map(({ reference, amount }) => ({ reference, amount })).sort((left, right) => left.reference.localeCompare(right.reference)));
  const destinations: Record<string, string> = { 'Amara Okafor': 'Meridian Bank · •••• 4821', 'Daniel Mensah': 'Union Coast Bank · •••• 3068', 'Zara Bello': 'Meridian Bank · •••• 7290' };
  for (const payment of ui.payments.records) {
    expect(payment.paymentStatus).toBe('Paid');
    const receipt = ui.receipts.find(receipt => receipt.reference === payment.reference)!;
    expect(receipt.bank).toBe(destinations[payment.employee]);
    expect(receipt.earningRows.length).toBeGreaterThan(0);
    for (const earning of receipt.earningRows) expect(earning.approval).toBe('Approved');
  }
}
const AMARA = { employee: 'Amara Okafor', amount: '$1,500.00' };

test('TC01 | Simulated Tuesday pays approved earnings and excludes unapproved earnings', async ({ page, request, observe }) => {
  const payrollDataset = await createPayrollDataset(request, 'employeesOnly'), earnings = new EarningsPage(page, payrollDataset.payrollDatasetId), payRuns = new PayRunsPage(page, payrollDataset.payrollDatasetId);
  await earnings.open();
  const inputs = [
    { employeeId: 'emp-001', employee: 'Amara Okafor', description: 'Weekly project earnings', amount: '1200.00', earnedAt: '2026-10-08T12:00' },
    { employeeId: 'emp-001', employee: 'Amara Okafor', description: 'Approved delivery bonus', amount: '300.00', earnedAt: '2026-10-09T15:00' },
    { employeeId: 'emp-002', employee: 'Daniel Mensah', description: 'Weekly project earnings', amount: '2000.00', earnedAt: '2026-10-09T12:00' },
    { employeeId: 'emp-003', employee: 'Zara Bello', description: 'Weekly project earnings', amount: '850.00', earnedAt: '2026-10-10T12:00' },
    { employeeId: 'emp-003', employee: 'Zara Bello', description: 'Next period project earnings', amount: '850.00', earnedAt: '2026-10-12T08:00' },
    { employeeId: 'emp-001', employee: 'Amara Okafor', description: 'Unapproved bonus', amount: '500.00', earnedAt: '2026-10-09T16:00' },
    { employeeId: 'emp-001', employee: 'Amara Okafor', description: 'Rejected claim', amount: '250.00', earnedAt: '2026-10-08T12:00' },
  ];
  for (const input of inputs) await earnings.record(input);
  await earnings.reject('Rejected claim', 'Amara Okafor');
  await earnings.navigate('Pay runs');
  await expect(payRuns.reviewButton).toBeEnabled();
  await expect(page.getByText('5 pending approvals in this period', { exact: true })).toBeVisible();
  await payRuns.navigate('Earnings');
  for (const input of inputs.slice(0, 4)) await earnings.approve(input.description, input.employee);
  const uiEarnings = await earnings.capture();
  expect(uiEarnings.filter(earningRecord => earningRecord.status === 'Approved')).toHaveLength(4);
  expect(uiEarnings.filter(earningRecord => earningRecord.status === 'Pending')).toHaveLength(2);
  expect(uiEarnings.filter(earningRecord => earningRecord.status === 'Rejected')).toHaveLength(1);
  await earnings.navigate('Pay runs');
  await expect(payRuns.metric('Approved pay')).toHaveText('$4,350.00');
  await expect(payRuns.reviewButton).toBeEnabled();
  await expect(page.getByText('1 pending approval in this period', { exact: true })).toBeVisible();
  await payRuns.processPayroll();
  const uiAfter = await inspectJourney(page, payRuns), result = await readPayrollState(request, payrollDataset.payrollDatasetId);
  const rejected = result.earnings.find((earning: any) => earning.description === 'Rejected claim');
  expect(result.auditEvents.filter((event: any) => event.eventType === 'earning_rejected').map((event: any) => event.details)).toEqual([{ earningId: rejected.earningId }]);
  const simulation = result.auditEvents.find((event: any) => event.eventType === 'pay_run_started')?.details;
  observe({ after: capturePayrollState(result), uiAfter, uiEarnings, simulation });
  await payRuns.navigate('Overview');
  const uiOverview = { approved: await payRuns.metric('Approved payroll').innerText(), recorded: await payRuns.metric('Payments recorded').innerText(), pendingApprovalCount: await payRuns.metric('Pending approvals').innerText() };
  observe({ uiOverview });
  await payRuns.navigate('Pay runs');
  expect(simulation).toEqual({ scheduledPayRunAt: '2026-10-13T09:00:00.000Z', simulatedProcessingAt: '2026-10-13T09:00:00.000Z' });
  await expect(payRuns.metric('Recorded pay')).toHaveText('$4,350.00');
  expect(uiAfter.payRun.employeePayrollSummaries.map(({ employee, approved, recorded, earnings }) => ({ employee, approved, recorded, earnings }))).toEqual([
    { employee: 'Amara Okafor', approved: '$1,500.00', recorded: '$1,500.00', earnings: '2 records' },
    { employee: 'Daniel Mensah', approved: '$2,000.00', recorded: '$2,000.00', earnings: '1 record' },
    { employee: 'Zara Bello', approved: '$850.00', recorded: '$850.00', earnings: '1 record' },
  ]);
  expectPayments(uiAfter, [AMARA, { employee: 'Daniel Mensah', amount: '$2,000.00' }, { employee: 'Zara Bello', amount: '$850.00' }]);
  expect(result.approvedTotalCents).toBe(435000); expect(result.recordedPaymentTotalCents).toBe(435000); expect(result.payments).toHaveLength(3);
  expect(uiOverview).toEqual({ approved: '$4,350.00', recorded: '$4,350.00', pendingApprovalCount: '1' });

});

test('TC02 | Following Monday midnight belongs to the next period', async ({ page, request, observe }) => {
  const payrollDataset = await createPayrollDataset(request, 'payPeriodBoundaryEarnings'), payRuns = new PayRunsPage(page, payrollDataset.payrollDatasetId);
  await payRuns.open(); await expect(payRuns.metric('Approved pay')).toHaveText('$400.00');
  await payRuns.expectPeriod('5 Oct 2026, 00:00 UTC → 12 Oct 2026, 00:00 UTC');
  await payRuns.processPayroll();
  const first = await readPayrollState(request, payrollDataset.payrollDatasetId), uiFirst = await inspectJourney(page, payRuns);
  observe({ first: capturePayrollState(first), uiFirst });
  await expect(payRuns.metric('Recorded pay')).toHaveText('$400.00');
  expect(uiFirst.receipts[0].earningRows.map(earning => earning.amount).sort()).toEqual(['$100.00', '$300.00']);
  expect(first.employeePayrollSummaries[0].earningIds.sort()).toEqual(['atOpeningBoundary', 'justBeforeClosingBoundary']);
  await payRuns.selectDate('2026-10-20');
  await payRuns.expectPeriod('12 Oct 2026, 00:00 UTC → 19 Oct 2026, 00:00 UTC');
  await expect(payRuns.metric('Approved pay')).toHaveText('$400.00');
  await expect(payRuns.metric('Recorded pay')).toHaveText('$0.00');
  await payRuns.processPayroll();
  const result = await readPayrollState(request, payrollDataset.payrollDatasetId, '2026-10-20T09:00:00.000Z'), uiAfter = await inspectJourney(page, payRuns);
  observe({ after: capturePayrollState(result), uiAfter });
  await expect(payRuns.metric('Recorded pay')).toHaveText('$400.00');
  const nextPayment = uiAfter.payments.records.find(payment => payment.payPeriodStartsAt === '12 Oct 2026')!;
  const nextReceipt = uiAfter.receipts.find(receipt => receipt.reference === nextPayment.reference)!;
  expect(nextReceipt.earningRows.map(earning => earning.amount)).toEqual(['$400.00']);
  expect(result.employeePayrollSummaries[0].earningIds).toEqual(['atExcludedClosingBoundary']); expect(result.recordedPaymentTotalCents).toBe(40000);
  expectPayments(uiFirst, [{ employee: 'Amara Okafor', amount: '$400.00' }]);
  expectPayments(uiAfter, [{ employee: 'Amara Okafor', amount: '$400.00' }, { employee: 'Amara Okafor', amount: '$400.00' }]);
  expect(uiAfter.payments.records.map(payment => payment.payPeriodStartsAt).sort()).toEqual(['12 Oct 2026', '5 Oct 2026']);
  expect(await page.locator('.history-list .period-range').allTextContents()).toEqual([
    '12 Oct 2026, 00:00 UTC → 19 Oct 2026, 00:00 UTC',
    '5 Oct 2026, 00:00 UTC → 12 Oct 2026, 00:00 UTC',
  ]);
  const futurePeriods = [];
  for (const [payDate, label] of [
    ['2026-11-03', '26 Oct 2026, 00:00 UTC → 2 Nov 2026, 00:00 UTC'],
    ['2027-01-05', '28 Dec 2026, 00:00 UTC → 4 Jan 2027, 00:00 UTC'],
    ['2028-03-07', '28 Feb 2028, 00:00 UTC → 6 Mar 2028, 00:00 UTC'],
  ]) {
    await payRuns.selectDate(payDate);
    await payRuns.expectPeriod(label);
    await payRuns.navigate('Overview');
    await expect(page.locator('.period-bar .period-range')).toHaveText(label);
    await expect(page.locator('.period-bar .period-boundary-note')).toHaveText('Start included · End excluded');
    await payRuns.navigate('Settings');
    await expect(page.locator('.run-summary .period-range')).toHaveText(label);
    await expect(page.locator('.run-summary .period-boundary-note')).toHaveText('Start included · End excluded');
    futurePeriods.push({ payDate, period: await page.locator('.run-summary .period-range').innerText() });
    await payRuns.navigate('Pay runs');
  }
  observe({ futurePeriods });
});

test('TC05 | Failed payment creates no notification and can be retried', async ({ page, request, observe }) => {
  const payrollDataset = await createPayrollDataset(request); await simulateNextFailure(request, payrollDataset.payrollDatasetId, 'paymentRecording'); const payRuns = new PayRunsPage(page, payrollDataset.payrollDatasetId);
  await payRuns.open(); await payRuns.processPayroll();
  const first = await readPayrollState(request, payrollDataset.payrollDatasetId), uiFirst = await inspectJourney(page, payRuns);
  observe({ first: capturePayrollState(first), uiFirst });
  await expect(payRuns.metric('Recorded pay')).toHaveText('$0.00');
  await expect(payRuns.metric('Unpaid amount')).toHaveText('$1,500.00');
  await expect(page.getByText('Some payments remain unrecorded.', { exact: true })).toBeVisible();
  expect(uiFirst.payments.empty).toBeTruthy(); expect(uiFirst.notifications.empty).toBeTruthy();
  expect(first.payments).toHaveLength(0); expect(first.notifications).toHaveLength(0); expect(first.notificationAcceptanceReceiptCount).toBe(0);
  await payRuns.retryPayroll();
  const result = await readPayrollState(request, payrollDataset.payrollDatasetId), uiAfter = await inspectJourney(page, payRuns);
  observe({ after: capturePayrollState(result), uiAfter });
  await expect(payRuns.metric('Recorded pay')).toHaveText('$1,500.00'); expectPayments(uiAfter, [AMARA]);
  expect(result.recordedPaymentTotalCents).toBe(150000); expect(result.payments).toHaveLength(1);
});

test('TC06 | Delivery failure preserves payment and recoverable notification work', async ({ page, request, observe }) => {
  const payrollDataset = await createPayrollDataset(request); await simulateNextFailure(request, payrollDataset.payrollDatasetId); const payRuns = new PayRunsPage(page, payrollDataset.payrollDatasetId);
  await payRuns.open(); await payRuns.processPayroll();
  const result = await readPayrollState(request, payrollDataset.payrollDatasetId), uiAfter = await inspectJourney(page, payRuns);
  observe({ after: capturePayrollState(result), uiAfter });
  await expect(payRuns.metric('Recorded pay')).toHaveText('$1,500.00'); expectPayments(uiAfter, [AMARA]);
  expect(uiAfter.receipts[0].notification).toBe('Pending'); expect(uiAfter.notifications.pending).toBe('1');
  expect(uiAfter.notifications.sent).toBe('0'); expect(uiAfter.notifications.records[0].state).toBe('Pending');
  expect(uiAfter.notifications.records[0].paymentId).toBe(uiAfter.receipts[0].reference);
  expect(uiAfter.notifications.records[0].error).toEqual(['Notification delivery unavailable. Retry the notification.']);
  expect(result.recordedPaymentTotalCents).toBe(150000); expect(result.pendingNotificationCount).toBe(1); expect(result.notificationAcceptanceReceiptCount).toBe(0);
  expect(result.auditEvents.some((auditEvent: any) => auditEvent.eventType === 'payment_committed')).toBeTruthy();
  expect(result.auditEvents.some((auditEvent: any) => auditEvent.eventType === 'notification_attempted')).toBeTruthy();
  expect(result.auditEvents.findIndex((auditEvent: any) => auditEvent.eventType === 'payment_committed')).toBeLessThan(result.auditEvents.findIndex((auditEvent: any) => auditEvent.eventType === 'notification_attempted'));
});

test('TC07 | Retrying a processed pay run preserves its payment and notification identity', async ({ page, request, observe }, info) => {
  const health = await (await request.get('/api/health')).json();
  await info.attach('served-build', { body: JSON.stringify(health), contentType: 'application/json' });
  const payrollDataset = await createPayrollDataset(request); const payRuns = new PayRunsPage(page, payrollDataset.payrollDatasetId);
  await payRuns.open(); await payRuns.processPayroll();
  const first = await readPayrollState(request, payrollDataset.payrollDatasetId), uiFirst = await inspectJourney(page, payRuns);
  await info.attach('first-attempt', { body: JSON.stringify(first, null, 2), contentType: 'application/json' });
  observe({ first: capturePayrollState(first), uiFirst });
  await expect(payRuns.metric('Recorded pay')).toHaveText('$1,500.00');
  expect(first.payments).toHaveLength(1);
  expect(uiFirst.payments.records).toHaveLength(1);
  expect(uiFirst.receipts[0].reference).toBe(first.payments[0].paymentId);
  await payRuns.retryPayroll();
  const result = await readPayrollState(request, payrollDataset.payrollDatasetId), uiAfter = await inspectJourney(page, payRuns);
  await info.attach('observed-payroll-dataset', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
  observe({ after: capturePayrollState(result), uiAfter, paymentsUnchanged: JSON.stringify(first.payments) === JSON.stringify(result.payments), notificationIdUnchanged: first.notifications[0] ? first.notifications[0].notificationId === result.notifications[0]?.notificationId : null });
  await expect(payRuns.metric('Recorded pay'), 'One approved employee-period payment must remain $1,500.00 after recovery.').toHaveText('$1,500.00');
  expectPayments(uiAfter, [AMARA]); expect(uiAfter.payRun.employeePayrollSummaries[0].status).toBe('Paid');
  expect(uiAfter.payRun.alerts).toEqual([]); expect(uiAfter.notifications.pending).toBe('0'); expect(uiAfter.notifications.sent).toBe('1');
  expect(uiAfter.receipts[0]).toEqual({ ...uiFirst.receipts[0], notification: 'Sent' });
  expect(uiAfter.notifications.records[0].paymentId).toBe(first.payments[0].paymentId);
  expect(result.recordedPaymentTotalCents).toBe(150000); expect(result.payments).toHaveLength(1); expect(result.pendingNotificationCount).toBe(0);
  expect(result.payments, 'Recovery must preserve the original payment, not replace it.').toEqual(first.payments);
  expect(result.notifications[0].notificationId).toBe(first.notifications[0].notificationId);
});

test('TC08 | Processing saves notification work for every recorded payment', async ({ page, request, observe }) => {
  const payrollDataset = await createPayrollDataset(request); const payRuns = new PayRunsPage(page, payrollDataset.payrollDatasetId);
  await payRuns.open(); await payRuns.processPayroll();
  const result = await readPayrollState(request, payrollDataset.payrollDatasetId), uiAfter = await inspectJourney(page, payRuns);
  observe({ after: capturePayrollState(result), uiAfter });
  await expect(payRuns.metric('Recorded pay')).toHaveText('$1,500.00');
  expect(uiAfter.notifications.records, 'Every recorded payment must have a visible notification-history entry.').toHaveLength(1);
  expectPayments(uiAfter, [AMARA]);
  expect(uiAfter.receipts[0].notification).toBe('Sent');
  expect(uiAfter.notifications.records[0].paymentId).toBe(uiAfter.receipts[0].reference);
  expect(uiAfter.notifications.pending).toBe('0'); expect(uiAfter.notifications.sent).toBe('1');
  expect(uiAfter.notifications.retryPendingEnabled).toBeFalsy();
  expect(result.payments).toHaveLength(1);
  expect(result.auditEvents.some((event: any) => event.eventType === 'failure_armed')).toBeFalsy();
  expect(result.notifications).toHaveLength(1);
  expect(result.notifications[0].paymentId).toBe(result.payments[0].paymentId);
  expect(result.auditEvents.findIndex((event: any) => event.eventType === 'payment_committed')).toBeLessThan(result.auditEvents.findIndex((event: any) => event.eventType === 'notification_attempted'));
});
