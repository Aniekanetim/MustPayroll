import { test as base, expect, type APIRequestContext } from '@playwright/test';

export const uiTest = base.extend<{ observe: (values: Record<string, unknown>) => void }>({
  observe: async ({ page }, use, info) => {
    const observation: Record<string, unknown> = {};
    const browserRequests: { path: string; body: unknown }[] = [];
    page.on('request', request => {
      const path = new URL(request.url()).pathname;
      if (request.method() === 'POST' && path.startsWith('/api/payroll-datasets/')) browserRequests.push({ path, body: request.postDataJSON() });
    });
    await use(values => Object.assign(observation, values));
    observation.channel = 'ui';
    observation.browserRequests = browserRequests;
    await info.attach('case-observation', { body: JSON.stringify(observation), contentType: 'application/json' });
  },
});

// Keep the fields used in the written result without duplicating complete test datasets.
export function capturePayrollState(state: Record<string, any>) {
  return {
    payrollDatasetId: state.payrollDatasetId, currency: state.currency, approvedTotalCents: state.approvedTotalCents, recordedPaymentTotalCents: state.recordedPaymentTotalCents,
    pendingNotificationCount: state.pendingNotificationCount, notificationAcceptanceReceiptCount: state.notificationAcceptanceReceiptCount,
    earnings: state.earnings.map((earning: any) => ({ earningId: earning.earningId, amountCents: earning.amountCents, approvalStatus: earning.approvalStatus })),
    earningIdsInPeriod: state.employeePayrollSummaries.flatMap((summary: any) => summary.earningIds).sort(),
    payments: state.payments.map((payment: any) => ({ paymentId: payment.paymentId, employeeId: payment.employeeId, employeeName: payment.employeeName, amountCents: payment.amountCents, payPeriodStartsAt: payment.payPeriodStartsAt })),
    notifications: state.notifications.map((notification: any) => ({ notificationId: notification.notificationId, paymentId: notification.paymentId, deliveryStatus: notification.deliveryStatus })),
    auditEvents: state.auditEvents.map((auditEvent: any) => auditEvent.eventType),
  };
}
export const SCHEDULED_PAY_RUN_AT = '2026-10-13T09:00:00.000Z';
export const createEarningInput = (overrides: Record<string, unknown> = {}) => ({ earningId: 'earn-001', employeeId: 'emp-001', description: 'Weekly project earnings', earnedAt: '2026-10-08T12:00:00Z', amountCents: 150000, approvalStatus: 'approved', ...overrides });
export async function createPayrollDataset(request: APIRequestContext, testDataPreset = 'oneApprovedEarning') {
  const response = await request.post('/api/payroll-datasets', { data: { testDataPreset } }); expect(response.status()).toBe(201); return response.json();
}
export async function sendPayrollDatasetRequest(request: APIRequestContext, payrollDatasetId: string, action: string, data: unknown = {}) {
  const response = await request.post(`/api/payroll-datasets/${payrollDatasetId}/${action}`, { data }); expect(response.ok(), await response.text()).toBeTruthy(); return response.json();
}
export async function readPayrollState(request: APIRequestContext, payrollDatasetId: string, scheduledPayRunAt = SCHEDULED_PAY_RUN_AT) {
  const response = await request.get(`/api/payroll-datasets/${payrollDatasetId}?scheduledPayRunAt=${encodeURIComponent(scheduledPayRunAt)}`);
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
}
export const simulateNextFailure = (request: APIRequestContext, payrollDatasetId: string, failureType = 'notificationDelivery') => sendPayrollDatasetRequest(request, payrollDatasetId, 'test-controls/next-failure', { failureType });
