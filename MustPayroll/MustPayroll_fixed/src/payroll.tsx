import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
export type Employee = { employeeId: string; name: string; role: string; department: string; bank: string; accountEnding: string };
export type Earning = { earningId: string; employeeId: string; description: string; earnedAt: string; amountCents: number; approvalStatus: string };
export type Payment = { paymentId: string; employeeId: string; employeeName: string; payPeriodStartsAt: string; amountCents: number; bank: string; accountEnding: string; createdAt: string; earningIds: string[] };
export type Notification = { notificationId: string; paymentId: string; employeeId: string; employeeName: string; payPeriodStartsAt: string; deliveryStatus: string; deliveryAttemptCount: number; lastDeliveryError: string | null };
export type NoticeDetail = { employeeName: string; paymentId?: string; amountCents: number; notification: string };
export function isPayDate(value: string) {
  const instant = new Date(`${value}T09:00:00.000Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(instant.getTime()) && instant.getUTCDay() === 2 && instant.toISOString().slice(0, 10) === value;
}
export type PayrollState = { payrollDatasetId: string; companyName: string; currency: string; payPeriod: { start: string; end: string; scheduledPayRunAt: string }; employees: Employee[]; earnings: Earning[];
  employeePayrollSummaries: { employeeId: string; approvedTotalCents: number; recordedPaymentTotalCents: number; earningIds: string[]; paymentCount: number }[]; payments: Payment[]; notifications: Notification[];
  payRuns: { payPeriodStartsAt: string; payPeriodEndsAt: string; scheduledPayRunAt: string; approvedTotalCents: number; createdAt: string }[]; isPayPeriodLocked: boolean; approvedTotalCents: number; recordedPaymentTotalCents: number; pendingApprovalCount: number; pendingNotificationCount: number };
export const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(cents / 100);
export function includedEarnings(payment: Payment, earnings: Earning[]) {
  return earnings.filter(earning => (payment.earningIds ?? []).includes(earning.earningId));
}
export const date = (value: string) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const time = (value: string) => new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
export const periodLabel = (start: string, end: string) => `${date(start)}, ${time(start)} UTC → ${date(end)}, ${time(end)} UTC`;
export function parseUsdAmountToCents(value: string) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error('Enter a positive amount with up to two decimal places.');
  const [dollars, fractionalDigits = ''] = value.split('.'); const cents = Number(dollars) * 100 + Number(fractionalDigits.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 100000000) throw new Error('Enter an amount from $0.01 to $1,000,000.00.');
  return cents;
}
async function request(path: string, data?: unknown): Promise<PayrollState> {
  const response = await fetch(path, data === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const body = await response.json(); if (!response.ok) throw new Error(body.error ?? 'Unable to load payroll. Try again.'); return body;
}
type Context = { data: PayrollState | null; busy: boolean; error: string; notice: string; noticeTitle: string; noticeIssue: string; noticeTone: 'success' | 'warning'; noticeDetails: NoticeDetail[]; toastOpen: boolean; dismissToast: () => void; payDate: string; setPayDate: (v: string) => void; reload: () => Promise<void>; act: (action: string, body?: unknown, message?: string) => Promise<boolean> };
const PayrollContext = createContext<Context | null>(null);
// Preserve saved records when upgrading browser storage and old review links.
export function restorePayrollDatasetId() {
  const params = new URLSearchParams(location.search);
  const storageKey = 'mustpayroll.payrollDatasetId.usd.v1';
  const legacyStorageKey = 'mustpayroll.workspace.usd.v1';
  const payrollDatasetId = params.get('payrollDatasetId') ?? params.get('workspace')
    ?? sessionStorage.getItem(storageKey) ?? sessionStorage.getItem(legacyStorageKey)
    ?? localStorage.getItem(storageKey) ?? localStorage.getItem(legacyStorageKey) ?? '';
  if (payrollDatasetId) {
    sessionStorage.setItem(storageKey, payrollDatasetId);
    localStorage.setItem(storageKey, payrollDatasetId);
    sessionStorage.removeItem(legacyStorageKey);
    localStorage.removeItem(legacyStorageKey);
  }
  if (params.has('workspace')) {
    params.delete('workspace');
    params.set('payrollDatasetId', payrollDatasetId);
    history.replaceState(history.state, '', `${location.pathname}?${params}${location.hash}`);
  }
  return payrollDatasetId;
}

export function PayrollProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PayrollState | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [noticeTone, setNoticeTone] = useState<'success' | 'warning'>('success');
  const [noticeTitle, setNoticeTitle] = useState(''), [noticeIssue, setNoticeIssue] = useState('');
  const [noticeDetails, setNoticeDetails] = useState<NoticeDetail[]>([]), [toastOpen, setToastOpen] = useState(true);
  const [payrollDatasetId, setPayrollDatasetId] = useState(restorePayrollDatasetId);
  const [payDate, updatePayDate] = useState(() => {
    const saved = sessionStorage.getItem(`mustpayroll.usd.payDate.${payrollDatasetId}`);
    return saved && isPayDate(saved) ? saved : '2026-10-13';
  });
  function setPayDate(value: string) {
    if (!isPayDate(value)) { setError('Choose a Tuesday pay date. Past and future Tuesdays are supported.'); return; }
    sessionStorage.setItem(`mustpayroll.usd.payDate.${payrollDatasetId}`, value);
    updatePayDate(value);
  }
  const scheduledPayRunAt = `${payDate}T09:00:00.000Z`;
  async function reload() {
    setError(''); setToastOpen(true);
    try { if (payrollDatasetId) setData(await request(`/api/payroll-datasets/${payrollDatasetId}?scheduledPayRunAt=${encodeURIComponent(scheduledPayRunAt)}`)); }
    catch (error) { setError((error as Error).message); }
  }
  useEffect(() => {
    let active = true; setError(''); setNotice(''); setNoticeTitle(''); setNoticeIssue(''); setNoticeDetails([]); setToastOpen(true); setData(null);
    (async () => {
      try {
        if (!payrollDatasetId) {
          const value = await request('/api/payroll-datasets', { testDataPreset: 'standardPayroll' });
          if (active) { sessionStorage.setItem('mustpayroll.payrollDatasetId.usd.v1', value.payrollDatasetId); localStorage.setItem('mustpayroll.payrollDatasetId.usd.v1', value.payrollDatasetId); setPayrollDatasetId(value.payrollDatasetId); }
        } else {
          const value = await request(`/api/payroll-datasets/${payrollDatasetId}?scheduledPayRunAt=${encodeURIComponent(scheduledPayRunAt)}`);
          if (active) { sessionStorage.setItem('mustpayroll.payrollDatasetId.usd.v1', payrollDatasetId); localStorage.setItem('mustpayroll.payrollDatasetId.usd.v1', payrollDatasetId); setData(value); }
        }
      } catch (error) { if (active) setError((error as Error).message); }
    })(); return () => { active = false; };
  }, [payrollDatasetId, scheduledPayRunAt]);
  async function act(action: string, body: unknown = {}, message = '') {
    if (busy) return false; setBusy(true); setError(''); setNotice(''); setNoticeTitle(''); setNoticeIssue(''); setNoticeDetails([]); setToastOpen(true);
    try {
      await request(`/api/payroll-datasets/${payrollDatasetId}/${action}`, body);
      const next = await request(`/api/payroll-datasets/${payrollDatasetId}?scheduledPayRunAt=${encodeURIComponent(scheduledPayRunAt)}`);
      setData(next);
      if (action === 'pay-runs') {
        const payments = next.payments.filter(payment => payment.payPeriodStartsAt === next.payPeriod.start);
        const notifications = next.notifications.filter(notification => notification.payPeriodStartsAt === next.payPeriod.start);
        const sent = notifications.filter(notification => notification.deliveryStatus === 'sent').length;
        const pending = notifications.filter(notification => notification.deliveryStatus === 'pending').length;
        const incomplete = next.recordedPaymentTotalCents < next.approvedTotalCents;
        const details: NoticeDetail[] = [];
        for (const entry of next.employeePayrollSummaries) {
          const recorded = payments.filter(payment => payment.employeeId === entry.employeeId);
          if (!recorded.length) details.push({ employeeName: next.employees.find(employee => employee.employeeId === entry.employeeId)?.name ?? entry.employeeId, amountCents: entry.approvedTotalCents, notification: 'not applicable' });
          for (const payment of recorded) details.push({ employeeName: payment.employeeName, paymentId: payment.paymentId, amountCents: payment.amountCents, notification: notifications.find(notification => notification.paymentId === payment.paymentId)?.deliveryStatus ?? 'not available' });
        }
        setNoticeDetails(details);
        setNoticeTone(incomplete || pending ? 'warning' : 'success');
        const previousIds = new Set(data?.payments.map(payment => payment.paymentId));
        const added = payments.filter(payment => !previousIds.has(payment.paymentId)).length;
        setNoticeTitle(added ? `${added} payment${added === 1 ? '' : 's'} recorded successfully` : payments.length ? 'Existing payments preserved' : 'No payments recorded');
        setNotice(`${payments.length ? 'Payments recorded.' : 'No payments recorded.'} ${money(next.recordedPaymentTotalCents)} across ${payments.length} payment record${payments.length === 1 ? '' : 's'}. Employee notifications: ${sent} sent, ${pending} pending.`);
        const issues: string[] = [];
        if (incomplete) issues.push('Some approved earnings remain unpaid. Retry the original pay run to recover outstanding payments.');
        if (pending) issues.push(`${pending} employee notification${pending === 1 ? ' remains' : 's remain'} pending; recorded payments are unchanged.`);
        setNoticeIssue(issues.join(' '));
      } else if (action === 'notifications/retry-pending') {
        setNoticeTone(next.pendingNotificationCount ? 'warning' : 'success');
        setNotice(`Notification recovery finished: ${next.notifications.filter(notification => notification.deliveryStatus === 'sent').length} sent, ${next.pendingNotificationCount} pending across all pay weeks. Recorded payments are unchanged.`);
      } else { setNoticeTone('success'); setNotice(message); }
      return true;
    } catch (error) { setError((error as Error).message); return false; } finally { setBusy(false); }
  }
  return <PayrollContext.Provider value={{ data, busy, error, notice, noticeTitle, noticeIssue, noticeTone, noticeDetails, toastOpen, dismissToast: () => setToastOpen(false), payDate, setPayDate, reload, act }}>{children}</PayrollContext.Provider>;
}
export function usePayroll() { return useContext(PayrollContext)!; }
export function download(name: string, contents: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([contents], { type })); const downloadLink = document.createElement('a'); downloadLink.href = url; downloadLink.download = name; downloadLink.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csvCell(value: string | number) {
  const text = typeof value === 'string' && /^[=+\-@\t\r]/.test(value) ? `'${value}` : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}
