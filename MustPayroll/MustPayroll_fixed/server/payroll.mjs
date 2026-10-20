import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { paymentPolicy } from './payment-policy.mjs';

export const BUILD_VARIANT = paymentPolicy.buildVariant;
export const DEFAULT_SCHEDULED_PAY_RUN_AT = '2026-10-13T09:00:00.000Z';

export class InputError extends Error {
  constructor(message, httpStatus = 400) { super(message); this.httpStatus = httpStatus; }
}

export function toUtcTimestamp(inputTimestamp) {
  if (typeof inputTimestamp !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(inputTimestamp)) {
    throw new InputError('Use a timestamp with Z or an explicit UTC offset.');
  }
  const [year, month, day] = inputTimestamp.slice(0, 10).split('-').map(Number);
  const [hour, minute, second] = inputTimestamp.slice(11, 19).split(':').map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (hour > 23 || minute > 59 || second > 59 || calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day || !Number.isFinite(Date.parse(inputTimestamp))) {
    throw new InputError('Use a valid calendar date and time.');
  }
  return new Date(inputTimestamp).toISOString();
}

export function getPayPeriod(inputPayRunAt) {
  const scheduledPayRunAt = toUtcTimestamp(inputPayRunAt);
  const payRunDateTime = new Date(scheduledPayRunAt);
  if (payRunDateTime.getUTCDay() !== 2 || payRunDateTime.getUTCHours() !== 9 || payRunDateTime.getUTCMinutes() || payRunDateTime.getUTCSeconds() || payRunDateTime.getUTCMilliseconds()) {
    throw new InputError('Use the original Tuesday 09:00 UTC pay date, including on retries.');
  }
  const closingMondayTimestamp = Date.UTC(payRunDateTime.getUTCFullYear(), payRunDateTime.getUTCMonth(), payRunDateTime.getUTCDate() - 1);
  return { scheduledPayRunAt, start: new Date(closingMondayTimestamp - 604800000).toISOString(), end: new Date(closingMondayTimestamp).toISOString() };
}

const DEFAULT_EMPLOYEES = [
  { employeeId: 'emp-001', name: 'Amara Okafor', role: 'Product designer', department: 'Design', bank: 'Meridian Bank', accountEnding: '4821' },
  { employeeId: 'emp-002', name: 'Daniel Mensah', role: 'Software engineer', department: 'Engineering', bank: 'Union Coast Bank', accountEnding: '3068' },
  { employeeId: 'emp-003', name: 'Zara Bello', role: 'Operations associate', department: 'Operations', bank: 'Meridian Bank', accountEnding: '7290' },
];
export const ONE_APPROVED_EARNING = { earningId: 'earn-001', employeeId: 'emp-001', description: 'Weekly project earnings', earnedAt: '2026-10-08T12:00:00Z', amountCents: 150000, approvalStatus: 'approved' };
const STANDARD_PAYROLL_EARNINGS = [
  { ...ONE_APPROVED_EARNING, amountCents: 120000 },
  { earningId: 'earn-002', employeeId: 'emp-001', description: 'Approved delivery bonus', earnedAt: '2026-10-09T15:00:00Z', amountCents: 30000, approvalStatus: 'approved' },
  { earningId: 'earn-003', employeeId: 'emp-002', description: 'Weekly project earnings', earnedAt: '2026-10-09T12:00:00Z', amountCents: 200000, approvalStatus: 'approved' },
  { earningId: 'earn-004', employeeId: 'emp-003', description: 'Weekly project earnings', earnedAt: '2026-10-10T12:00:00Z', amountCents: 85000, approvalStatus: 'approved' },
  { earningId: 'earn-005', employeeId: 'emp-003', description: 'Next period project earnings', earnedAt: '2026-10-12T08:00:00Z', amountCents: 85000, approvalStatus: 'pending' },
];
const PAY_PERIOD_BOUNDARY_EARNINGS = [
  { ...ONE_APPROVED_EARNING, earningId: 'atOpeningBoundary', earnedAt: '2026-10-05T00:00:00Z', amountCents: 10000 },
  { ...ONE_APPROVED_EARNING, earningId: 'beforeOpeningBoundary', earnedAt: '2026-10-05T00:30:00+01:00', amountCents: 20000 },
  { ...ONE_APPROVED_EARNING, earningId: 'justBeforeClosingBoundary', earnedAt: '2026-10-11T23:59:59Z', amountCents: 30000 },
  { ...ONE_APPROVED_EARNING, earningId: 'atExcludedClosingBoundary', earnedAt: '2026-10-12T00:00:00Z', amountCents: 40000 },
];
const TEST_DATA_PRESETS = {
  standardPayroll: STANDARD_PAYROLL_EARNINGS,
  oneApprovedEarning: [ONE_APPROVED_EARNING],
  payPeriodBoundaryEarnings: PAY_PERIOD_BOUNDARY_EARNINGS,
  employeesOnly: [],
};

// Present saved audit details using the current API vocabulary without rewriting history.
function readAuditDetails(storedDetails) {
  const details = JSON.parse(storedDetails);
  for (const [legacyName, readableName] of Object.entries({ amountMinor: 'amountCents', scheduledFor: 'scheduledPayRunAt', simulatedAt: 'simulatedProcessingAt', periodStart: 'payPeriodStartsAt', periodEnd: 'payPeriodEndsAt', messageId: 'notificationId', kind: 'failureType' })) {
    if (Object.hasOwn(details, legacyName)) { details[readableName] = details[legacyName]; delete details[legacyName]; }
  }
  if (details.failureType === 'notification') details.failureType = 'notificationDelivery';
  if (details.failureType === 'payout') details.failureType = 'paymentRecording';
  return details;
}

// Rename the legacy data-isolation schema without replacing any saved records.
function migrateLegacyPayrollDatasetSchema(db) {
  const legacyTable = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='workspaces'").get();
  if (!legacyTable) return;
  const currentTable = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='payroll_datasets'").get();
  if (currentTable) throw new Error('Both legacy and current payroll dataset tables exist. Preserve the database and resolve the schema conflict before starting.');
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec('ALTER TABLE workspaces RENAME TO payroll_datasets');
    for (const table of ['employees', 'earnings', 'pay_runs', 'run_entries', 'payments', 'provider_receipts', 'events']) {
      db.exec(`ALTER TABLE ${table} RENAME COLUMN workspace_id TO payroll_dataset_id`);
    }
    if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Payroll data migration found an invalid record relationship.');
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export class PayrollService {
  constructor(databasePath) {
    this.db = new DatabaseSync(databasePath);
    this.db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    migrateLegacyPayrollDatasetSchema(this.db);
    this.db.exec(`CREATE TABLE IF NOT EXISTS payroll_datasets (id TEXT PRIMARY KEY, behavior TEXT NOT NULL, created_at TEXT NOT NULL,
        notification_fault INTEGER DEFAULT 0, payout_fault INTEGER DEFAULT 0);
      CREATE TABLE IF NOT EXISTS employees (payroll_dataset_id TEXT REFERENCES payroll_datasets(id), id TEXT, name TEXT, role TEXT, department TEXT, bank TEXT, account_ending TEXT, PRIMARY KEY(payroll_dataset_id,id));
      CREATE TABLE IF NOT EXISTS earnings (payroll_dataset_id TEXT REFERENCES payroll_datasets(id), id TEXT, employee_id TEXT, description TEXT, earned_at TEXT, amount_minor INTEGER CHECK(amount_minor > 0), status TEXT, PRIMARY KEY(payroll_dataset_id,id));
      CREATE TABLE IF NOT EXISTS pay_runs (payroll_dataset_id TEXT REFERENCES payroll_datasets(id), period_start TEXT, period_end TEXT, scheduled_for TEXT, created_at TEXT, PRIMARY KEY(payroll_dataset_id,period_start));
      CREATE TABLE IF NOT EXISTS run_entries (payroll_dataset_id TEXT, period_start TEXT, employee_id TEXT, amount_minor INTEGER, earning_ids TEXT, PRIMARY KEY(payroll_dataset_id,period_start,employee_id));
      CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, payroll_dataset_id TEXT REFERENCES payroll_datasets(id), period_start TEXT, employee_id TEXT, amount_minor INTEGER CHECK(amount_minor > 0), behavior TEXT, employee_name TEXT, bank TEXT, account_ending TEXT, created_at TEXT);
      CREATE UNIQUE INDEX IF NOT EXISTS one_fixed_payment ON payments(payroll_dataset_id,period_start,employee_id) WHERE behavior='fixed';
      CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, payment_id TEXT UNIQUE REFERENCES payments(id), state TEXT DEFAULT 'pending', attempts INTEGER DEFAULT 0, last_error TEXT);
      CREATE TABLE IF NOT EXISTS provider_receipts (payroll_dataset_id TEXT, period_start TEXT, employee_id TEXT, accepted_at TEXT, PRIMARY KEY(payroll_dataset_id,period_start,employee_id));
      CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, payroll_dataset_id TEXT, event TEXT, employee_id TEXT, detail TEXT, created_at TEXT);`);
    this.db.exec('PRAGMA user_version = 3;');
  }
  close() { this.db.close(); }

  getPayrollDataset(payrollDatasetId) {
    const payrollDataset = this.db.prepare('SELECT * FROM payroll_datasets WHERE id=?').get(payrollDatasetId);
    if (!payrollDataset) throw new InputError('Payroll records not found. Reopen the application using a valid payroll link.', 404);
    if (payrollDataset.behavior !== BUILD_VARIANT) throw new InputError('These payroll records belong to the other build. Open them in the matching application.', 409);
    return payrollDataset;
  }

  withTransaction(operation) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = operation(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }

  recordAuditEvent(payrollDatasetId, eventType, employeeId = null, details = {}) {
    this.db.prepare('INSERT INTO events(payroll_dataset_id,event,employee_id,detail,created_at) VALUES(?,?,?,?,?)')
      .run(payrollDatasetId, eventType, employeeId, JSON.stringify(details), new Date().toISOString());
  }

  createPayrollDataset({ buildVariant = BUILD_VARIANT, testDataPreset = 'standardPayroll' } = {}) {
    if (buildVariant !== BUILD_VARIANT) throw new InputError('This build has a fixed implementation. Use the other build for that behavior.');
    if (!Object.hasOwn(TEST_DATA_PRESETS, testDataPreset)) throw new InputError('Choose standardPayroll, oneApprovedEarning, payPeriodBoundaryEarnings or employeesOnly as the testDataPreset.');
    const payrollDatasetId = randomUUID();
    this.withTransaction(() => {
      this.db.prepare('INSERT INTO payroll_datasets(id,behavior,created_at) VALUES(?,?,?)').run(payrollDatasetId, buildVariant, new Date().toISOString());
      for (const employee of DEFAULT_EMPLOYEES) {
        this.db.prepare('INSERT INTO employees VALUES(?,?,?,?,?,?,?)').run(payrollDatasetId, employee.employeeId, employee.name, employee.role, employee.department, employee.bank, employee.accountEnding);
      }
    });
    this.recordEarnings(payrollDatasetId, TEST_DATA_PRESETS[testDataPreset]);
    return this.getPayrollState(payrollDatasetId);
  }

  addEmployee(payrollDatasetId, input) {
    this.getPayrollDataset(payrollDatasetId);
    const employee = {};
    for (const field of ['name', 'role', 'department', 'bank']) {
      const value = typeof input[field] === 'string' ? input[field].trim() : '';
      if (!value || value.length > 80) throw new InputError('Enter an employee name, role, department and bank using 1–80 characters each.');
      employee[field] = value;
    }
    if (typeof input.accountEnding !== 'string' || !/^\d{4}$/.test(input.accountEnding)) throw new InputError('Enter the last four account digits only.');
    const employeeId = `emp-${randomUUID()}`;
    this.withTransaction(() => {
      this.db.prepare('INSERT INTO employees VALUES(?,?,?,?,?,?,?)').run(payrollDatasetId, employeeId, employee.name, employee.role, employee.department, employee.bank, input.accountEnding);
      this.recordAuditEvent(payrollDatasetId, 'employee_added', employeeId);
    });
    return this.getPayrollState(payrollDatasetId);
  }

  resetPayPeriod(payrollDatasetId, scheduledPayRunAt) {
    this.getPayrollDataset(payrollDatasetId);
    const payPeriod = getPayPeriod(scheduledPayRunAt);
    this.withTransaction(() => {
      const removed = {
        earnings: this.db.prepare('SELECT COUNT(*) AS count FROM earnings WHERE payroll_dataset_id=? AND earned_at>=? AND earned_at<?').get(payrollDatasetId, payPeriod.start, payPeriod.end).count,
        payments: this.db.prepare('SELECT COUNT(*) AS count FROM payments WHERE payroll_dataset_id=? AND period_start=?').get(payrollDatasetId, payPeriod.start).count,
      };
      this.db.prepare('DELETE FROM notifications WHERE payment_id IN (SELECT id FROM payments WHERE payroll_dataset_id=? AND period_start=?)').run(payrollDatasetId, payPeriod.start);
      for (const table of ['provider_receipts', 'payments', 'run_entries', 'pay_runs']) {
        this.db.prepare(`DELETE FROM ${table} WHERE payroll_dataset_id=? AND period_start=?`).run(payrollDatasetId, payPeriod.start);
      }
      this.db.prepare('DELETE FROM earnings WHERE payroll_dataset_id=? AND earned_at>=? AND earned_at<?').run(payrollDatasetId, payPeriod.start, payPeriod.end);
      this.recordAuditEvent(payrollDatasetId, 'pay_period_reset', null, { scheduledPayRunAt: payPeriod.scheduledPayRunAt, payPeriodStartsAt: payPeriod.start, payPeriodEndsAt: payPeriod.end, removed });
    });
    return this.getPayrollState(payrollDatasetId, payPeriod.scheduledPayRunAt);
  }

  recordEarnings(payrollDatasetId, earningInputs) {
    this.getPayrollDataset(payrollDatasetId);
    if (!Array.isArray(earningInputs) || earningInputs.length > 256) throw new InputError('Send an earnings array containing no more than 256 records.');
    this.withTransaction(() => {
      for (const earningInput of earningInputs) {
        if (!earningInput || !['earningId', 'employeeId'].every(field => typeof earningInput[field] === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(earningInput[field]))) throw new InputError('Earning and employee IDs must use 1–64 letters, numbers, underscores or hyphens.');
        if (!this.db.prepare('SELECT 1 FROM employees WHERE payroll_dataset_id=? AND id=?').get(payrollDatasetId, earningInput.employeeId)) throw new InputError('Select an employee from the loaded payroll records.');
        if (!Number.isSafeInteger(earningInput.amountCents) || earningInput.amountCents <= 0 || earningInput.amountCents > 100000000) throw new InputError('Enter an amount from $0.01 to $1,000,000.00, in whole cents.');
        const earnedAt = toUtcTimestamp(earningInput.earnedAt);
        const approvalStatus = earningInput.approvalStatus ?? 'pending';
        if (!['approved', 'pending', 'rejected'].includes(approvalStatus)) throw new InputError('Use approved, pending or rejected earnings.');
        const description = typeof earningInput.description === 'string' ? earningInput.description.trim().slice(0, 160) : '';
        if (!description) throw new InputError('Describe the earnings.');
        const existingEarning = this.db.prepare('SELECT * FROM earnings WHERE payroll_dataset_id=? AND id=?').get(payrollDatasetId, earningInput.earningId);
        if (existingEarning) {
          if (existingEarning.employee_id !== earningInput.employeeId || existingEarning.earned_at !== earnedAt || existingEarning.amount_minor !== earningInput.amountCents || existingEarning.status !== approvalStatus || existingEarning.description !== description) throw new InputError('An existing earning ID cannot change. Import the original record or use a new ID.', 409);
          continue;
        }
        if (this.db.prepare('SELECT 1 FROM pay_runs WHERE payroll_dataset_id=? AND period_start<=? AND period_end>?').get(payrollDatasetId, earnedAt, earnedAt)) throw new InputError('This pay period is locked. Record adjustments in a later open period.', 409);
        this.db.prepare('INSERT INTO earnings VALUES(?,?,?,?,?,?,?)').run(payrollDatasetId, earningInput.earningId, earningInput.employeeId, description, earnedAt, earningInput.amountCents, approvalStatus);
      }
    });
    this.recordAuditEvent(payrollDatasetId, 'earnings_recorded', null, { count: earningInputs.length });
    return this.getPayrollState(payrollDatasetId);
  }

  approveEarning(payrollDatasetId, earningId) { return this.reviewEarning(payrollDatasetId, earningId, 'approved'); }
  rejectEarning(payrollDatasetId, earningId) { return this.reviewEarning(payrollDatasetId, earningId, 'rejected'); }
  reviewEarning(payrollDatasetId, earningId, approvalStatus) {
    this.getPayrollDataset(payrollDatasetId);
    const earning = this.db.prepare('SELECT * FROM earnings WHERE payroll_dataset_id=? AND id=?').get(payrollDatasetId, earningId);
    if (!earning) throw new InputError('Earning not found. Select an existing earning.', 404);
    if (earning.status === approvalStatus) return this.getPayrollState(payrollDatasetId);
    if (earning.status !== 'pending') throw new InputError(`Only pending earnings can be ${approvalStatus}.`, 409);
    if (this.db.prepare('SELECT 1 FROM pay_runs WHERE payroll_dataset_id=? AND period_start<=? AND period_end>?').get(payrollDatasetId, earning.earned_at, earning.earned_at)) throw new InputError('This pay period is locked. Record adjustments in a later open period.', 409);
    this.withTransaction(() => {
      this.db.prepare('UPDATE earnings SET status=? WHERE payroll_dataset_id=? AND id=?').run(approvalStatus, payrollDatasetId, earningId);
      this.recordAuditEvent(payrollDatasetId, `earning_${approvalStatus}`, earning.employee_id, { earningId });
    });
    return this.getPayrollState(payrollDatasetId);
  }

  simulateNextFailure(payrollDatasetId, failureType) {
    this.getPayrollDataset(payrollDatasetId);
    const failureColumn = { notificationDelivery: 'notification_fault', paymentRecording: 'payout_fault' }[failureType];
    if (!failureColumn) throw new InputError('Choose notificationDelivery or paymentRecording as the failureType.');
    this.db.prepare(`UPDATE payroll_datasets SET ${failureColumn}=1 WHERE id=?`).run(payrollDatasetId);
    this.recordAuditEvent(payrollDatasetId, 'failure_armed', null, { failureType });
    return this.getPayrollState(payrollDatasetId);
  }

  consumeOneTimeFailure(payrollDatasetId, failureColumn) {
    return this.db.prepare(`UPDATE payroll_datasets SET ${failureColumn}=${failureColumn}-1 WHERE id=? AND ${failureColumn}>0`).run(payrollDatasetId).changes > 0;
  }

  deliverNotification(payrollDatasetId, notificationId) {
    const notification = this.db.prepare('SELECT n.*,p.employee_id,p.period_start FROM notifications n JOIN payments p ON n.payment_id=p.id WHERE n.id=? AND p.payroll_dataset_id=?').get(notificationId, payrollDatasetId);
    if (!notification || notification.state === 'sent') return;
    this.recordAuditEvent(payrollDatasetId, 'notification_attempted', notification.employee_id);
    let deliveryError = null;
    if (this.consumeOneTimeFailure(payrollDatasetId, 'notification_fault')) deliveryError = 'Notification delivery unavailable. Retry the notification.';
    else this.db.prepare('INSERT OR IGNORE INTO provider_receipts VALUES(?,?,?,?)').run(payrollDatasetId, notification.period_start, notification.employee_id, new Date().toISOString());
    this.db.prepare('UPDATE notifications SET attempts=attempts+1,state=?,last_error=? WHERE id=?').run(deliveryError ? 'pending' : 'sent', deliveryError, notificationId);
    this.recordAuditEvent(payrollDatasetId, deliveryError ? 'notification_failed' : 'notification_sent', notification.employee_id, { notificationId, error: deliveryError });
  }

  retryPendingNotifications(payrollDatasetId) {
    this.getPayrollDataset(payrollDatasetId);
    const pendingNotifications = this.db.prepare("SELECT n.id FROM notifications n JOIN payments p ON p.id=n.payment_id WHERE p.payroll_dataset_id=? AND n.state='pending' ORDER BY p.created_at,n.id").all(payrollDatasetId);
    for (const notification of pendingNotifications) this.deliverNotification(payrollDatasetId, notification.id);
    return this.getPayrollState(payrollDatasetId);
  }

  processPayRun(payrollDatasetId, scheduledPayRunAt = DEFAULT_SCHEDULED_PAY_RUN_AT, simulatedProcessingAt) {
    const payrollDataset = this.getPayrollDataset(payrollDatasetId);
    const payPeriod = getPayPeriod(scheduledPayRunAt);
    if (simulatedProcessingAt !== payPeriod.scheduledPayRunAt) throw new InputError('Set the simulated time to the selected Tuesday 09:00 UTC pay date.');
    if (!this.db.prepare('SELECT 1 FROM pay_runs WHERE payroll_dataset_id=? AND period_start=?').get(payrollDatasetId, payPeriod.start)) {
      const periodEarnings = this.getPayrollState(payrollDatasetId, scheduledPayRunAt).earnings.filter(earning => earning.earnedAt >= payPeriod.start && earning.earnedAt < payPeriod.end);
      const payableEarnings = paymentPolicy.selectPayableEarnings(periodEarnings);
      if (!payableEarnings.length) throw new InputError('No approved earnings in this period. Approve earnings before running payroll.', 409);
      this.withTransaction(() => {
        this.db.prepare('INSERT INTO pay_runs VALUES(?,?,?,?,?)').run(payrollDatasetId, payPeriod.start, payPeriod.end, payPeriod.scheduledPayRunAt, new Date().toISOString());
        for (const employeeId of new Set(payableEarnings.map(earning => earning.employeeId))) {
          const employeeEarnings = payableEarnings.filter(earning => earning.employeeId === employeeId);
          this.db.prepare('INSERT INTO run_entries VALUES(?,?,?,?,?)').run(payrollDatasetId, payPeriod.start, employeeId, employeeEarnings.reduce((total, earning) => total + earning.amountCents, 0), JSON.stringify(employeeEarnings.map(earning => earning.earningId)));
        }
      });
    }
    this.recordAuditEvent(payrollDatasetId, 'pay_run_started', null, { scheduledPayRunAt: payPeriod.scheduledPayRunAt, simulatedProcessingAt });
    const employeePayRunEntries = this.db.prepare('SELECT r.*,e.name,e.bank,e.account_ending FROM run_entries r JOIN employees e ON e.payroll_dataset_id=r.payroll_dataset_id AND e.id=r.employee_id WHERE r.payroll_dataset_id=? AND r.period_start=? ORDER BY r.employee_id').all(payrollDatasetId, payPeriod.start);
    for (const employeePayRunEntry of employeePayRunEntries) {
      if (paymentPolicy.hasCompletedPayment(this, payrollDatasetId, payPeriod.start, employeePayRunEntry.employee_id)) continue;
      if (this.consumeOneTimeFailure(payrollDatasetId, 'payout_fault')) { this.recordAuditEvent(payrollDatasetId, 'payment_failed', employeePayRunEntry.employee_id, { reason: 'Payment was not recorded. Retry the pay run.' }); continue; }
      const paymentId = randomUUID(), notificationId = randomUUID();
      const savePaymentRecord = () => this.db.prepare('INSERT INTO payments VALUES(?,?,?,?,?,?,?,?,?,?)').run(paymentId, payrollDatasetId, payPeriod.start, employeePayRunEntry.employee_id, employeePayRunEntry.amount_minor, payrollDataset.behavior, employeePayRunEntry.name, employeePayRunEntry.bank, employeePayRunEntry.account_ending, new Date().toISOString());
      const saveNotificationRecord = () => this.db.prepare('INSERT INTO notifications(id,payment_id) VALUES(?,?)').run(notificationId, paymentId);
      paymentPolicy.saveEmployeePayment(this, { payrollDatasetId, employeePayRunEntry, paymentId, savePaymentRecord, saveNotificationRecord });
    }
    if (paymentPolicy.deliverNotificationsAfterPayRun) this.retryPendingNotifications(payrollDatasetId);
    this.recordAuditEvent(payrollDatasetId, 'pay_run_finished', null, { scheduledPayRunAt: payPeriod.scheduledPayRunAt });
    return this.getPayrollState(payrollDatasetId, scheduledPayRunAt);
  }

  getPayrollState(payrollDatasetId, scheduledPayRunAt = DEFAULT_SCHEDULED_PAY_RUN_AT) {
    this.getPayrollDataset(payrollDatasetId);
    const payPeriod = getPayPeriod(scheduledPayRunAt);
    const employees = this.db.prepare('SELECT * FROM employees WHERE payroll_dataset_id=? ORDER BY id').all(payrollDatasetId).map(employee => ({ employeeId: employee.id, name: employee.name, role: employee.role, department: employee.department, bank: employee.bank, accountEnding: employee.account_ending }));
    const earnings = this.db.prepare('SELECT * FROM earnings WHERE payroll_dataset_id=? ORDER BY earned_at DESC,id').all(payrollDatasetId).map(earning => ({ earningId: earning.id, employeeId: earning.employee_id, description: earning.description, earnedAt: earning.earned_at, amountCents: earning.amount_minor, approvalStatus: earning.status }));
    const savedPayRunEntries = this.db.prepare('SELECT period_start,employee_id,earning_ids FROM run_entries WHERE payroll_dataset_id=?').all(payrollDatasetId);
    const payments = this.db.prepare('SELECT * FROM payments WHERE payroll_dataset_id=? ORDER BY created_at DESC,id').all(payrollDatasetId).map(payment => ({ paymentId: payment.id, employeeId: payment.employee_id, employeeName: payment.employee_name, payPeriodStartsAt: payment.period_start, amountCents: payment.amount_minor, bank: payment.bank, accountEnding: payment.account_ending, createdAt: payment.created_at,
      earningIds: JSON.parse(savedPayRunEntries.find(payRunEntry => payRunEntry.period_start === payment.period_start && payRunEntry.employee_id === payment.employee_id)?.earning_ids ?? '[]') }));
    const notifications = this.db.prepare('SELECT n.*,p.employee_id,p.period_start,p.employee_name FROM notifications n JOIN payments p ON p.id=n.payment_id WHERE p.payroll_dataset_id=? ORDER BY p.created_at DESC,n.id').all(payrollDatasetId).map(notification => ({ notificationId: notification.id, paymentId: notification.payment_id, employeeId: notification.employee_id, employeeName: notification.employee_name, payPeriodStartsAt: notification.period_start, deliveryStatus: notification.state, deliveryAttemptCount: notification.attempts, lastDeliveryError: notification.last_error }));
    const payRuns = this.db.prepare('SELECT * FROM pay_runs WHERE payroll_dataset_id=? ORDER BY scheduled_for DESC').all(payrollDatasetId).map(payRun => ({ payPeriodStartsAt: payRun.period_start, payPeriodEndsAt: payRun.period_end, scheduledPayRunAt: payRun.scheduled_for, createdAt: payRun.created_at, approvedTotalCents: this.db.prepare('SELECT COALESCE(SUM(amount_minor),0) AS total FROM run_entries WHERE payroll_dataset_id=? AND period_start=?').get(payrollDatasetId, payRun.period_start).total }));
    const approvedPeriodEarnings = earnings.filter(earning => earning.approvalStatus === 'approved' && earning.earnedAt >= payPeriod.start && earning.earnedAt < payPeriod.end);
    const employeePayrollSummaries = employees.map(employee => {
      const employeeEarnings = approvedPeriodEarnings.filter(earning => earning.employeeId === employee.employeeId);
      const employeePayments = payments.filter(payment => payment.employeeId === employee.employeeId && payment.payPeriodStartsAt === payPeriod.start);
      return { employeeId: employee.employeeId, approvedTotalCents: employeeEarnings.reduce((total, earning) => total + earning.amountCents, 0), recordedPaymentTotalCents: employeePayments.reduce((total, payment) => total + payment.amountCents, 0), earningIds: employeeEarnings.map(earning => earning.earningId), paymentCount: employeePayments.length };
    }).filter(summary => summary.approvedTotalCents > 0 || summary.recordedPaymentTotalCents > 0);
    return {
      payrollDatasetId, companyName: 'Northstar Studio', currency: 'USD', payPeriod, employees, earnings, employeePayrollSummaries, payments, notifications, payRuns,
      isPayPeriodLocked: payRuns.some(payRun => payRun.payPeriodStartsAt === payPeriod.start),
      approvedTotalCents: employeePayrollSummaries.reduce((total, summary) => total + summary.approvedTotalCents, 0),
      recordedPaymentTotalCents: employeePayrollSummaries.reduce((total, summary) => total + summary.recordedPaymentTotalCents, 0),
      pendingApprovalCount: earnings.filter(earning => earning.approvalStatus === 'pending' && earning.earnedAt >= payPeriod.start && earning.earnedAt < payPeriod.end).length,
      pendingNotificationCount: notifications.filter(notification => notification.deliveryStatus === 'pending').length,
      notificationAcceptanceReceiptCount: this.db.prepare('SELECT COUNT(*) AS count FROM provider_receipts WHERE payroll_dataset_id=?').get(payrollDatasetId).count,
      auditEvents: this.db.prepare('SELECT event AS eventType,employee_id AS employeeId,detail,created_at FROM events WHERE payroll_dataset_id=? ORDER BY id').all(payrollDatasetId).map(auditEvent => ({ eventType: auditEvent.eventType, employeeId: auditEvent.employeeId, details: readAuditDetails(auditEvent.detail), createdAt: auditEvent.created_at })),
    };
  }
}
