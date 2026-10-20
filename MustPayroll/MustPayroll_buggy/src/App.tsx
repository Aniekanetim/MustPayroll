import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { NavLink, Link, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Building2, CalendarDays, Check, CheckCircle2, Download, FileCheck2, LayoutDashboard, Mail, ReceiptText, Settings2, UserPlus, Users, Wallet } from 'lucide-react';
import { PayrollProvider, usePayroll, isPayDate, money, date, time, periodLabel, parseUsdAmountToCents, download, csvCell, includedEarnings, type Payment } from './payroll';
import { ConfirmDialog } from './components/ConfirmDialog';
import { Toast } from './components/Toast';

const navigation = [
  { to: '/overview', label: 'Overview', icon: LayoutDashboard }, { to: '/employees', label: 'Employees', icon: Users },
  { to: '/earnings', label: 'Earnings', icon: FileCheck2 }, { to: '/pay-runs', label: 'Pay runs', icon: CalendarDays },
  { to: '/payments', label: 'Payments', icon: Wallet }, { to: '/notifications', label: 'Notifications', icon: Mail },
  { to: '/settings', label: 'Settings', icon: Settings2 },
];
function Header({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <header className="page-header"><div><p className="eyebrow">Payroll operations</p><h1 id="page-title" tabIndex={-1}>{title}</h1><p className="page-description">{description}</p></div>{action && <div className="header-actions">{action}</div>}</header>;
}
function Badge({ state }: { state: string }) {
  return <span className={`badge ${['paid', 'sent', 'approved', 'ready'].includes(state) ? 'positive' : state === 'rejected' ? 'negative' : 'waiting'}`}><span aria-hidden="true" />{state.charAt(0).toUpperCase() + state.slice(1)}</span>;
}
function Empty({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="empty"><ReceiptText size={28} aria-hidden="true" /><h3>{title}</h3><p>{description}</p>{action}</div>;
}
function Panel({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return <section className="panel"><div className="panel-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>{children}</section>;
}
function Metrics({ items }: { items: { label: string; value: string; note: string }[] }) {
  return <dl className="metrics">{items.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd><p>{item.note}</p></div>)}</dl>;
}
function PayDate() {
  const { payDate, setPayDate, busy } = usePayroll();
  const [error, setError] = useState('');
  return <div className="pay-date"><label htmlFor="pay-date">Pay date</label><input id="pay-date" type="date" value={payDate} disabled={busy} aria-invalid={Boolean(error)} aria-describedby={error ? 'pay-date-hint pay-date-error' : 'pay-date-hint'} onChange={event => {
    if (!isPayDate(event.target.value)) { setError('Choose a Tuesday. Past and future weeks are available.'); return; }
    setError(''); setPayDate(event.target.value);
  }} /><small id="pay-date-hint">Any Tuesday · 09:00 UTC</small>{error && <p id="pay-date-error" className="field-error" role="alert">{error}</p>}</div>;
}
const periodBoundaryNote = 'Start included · End excluded';
function PeriodRange({ start, end }: { start: string; end: string }) {
  return <><span className="period-range">{periodLabel(start, end)}</span><span className="period-boundary-note">{periodBoundaryNote}</span></>;
}
function EmployeeName({ employeeId }: { employeeId: string }) {
  const employee = usePayroll().data!.employees.find(employee => employee.employeeId === employeeId)!;
  return <div className="person"><span className="avatar" aria-hidden="true">{employee.name.split(' ').map(namePart => namePart[0]).join('')}</span><div><Link className="strong-link" to={`/employees/${employeeId}`}>{employee.name}</Link><span className="secondary">{employee.role}</span></div></div>;
}
function Entries() {
  const { data } = usePayroll(); if (!data) return null;
  if (!data.employeePayrollSummaries.length) return <Empty title="No approved earnings in this period" description="Record earnings and approve them before running payroll." action={<Link className="btn-secondary" to="/earnings">Review earnings</Link>} />;
  return <><div className="table-wrap desktop-payroll" tabIndex={0} role="region" aria-label="Payroll breakdown"><table><caption className="sr-only">Expected and recorded payments by employee</caption><thead><tr><th scope="col">Employee</th><th scope="col">Approved earnings</th><th scope="col" className="numeric">Approved pay</th><th scope="col" className="numeric">Recorded pay</th><th scope="col">Payment status</th></tr></thead><tbody>{data.employeePayrollSummaries.map(entry => <tr key={entry.employeeId}><td><EmployeeName employeeId={entry.employeeId} /></td><td>{entry.earningIds.length} {entry.earningIds.length === 1 ? 'record' : 'records'}</td><td className="numeric">{money(entry.approvedTotalCents)}</td><td className="numeric">{money(entry.recordedPaymentTotalCents)}</td><td><Badge state={entry.paymentCount > 0 ? 'paid' : 'unpaid'} /></td></tr>)}</tbody></table></div><ul className="mobile-payroll">{data.employeePayrollSummaries.map(entry => <li key={entry.employeeId}><EmployeeName employeeId={entry.employeeId} /><dl className="mobile-amounts"><div><dt>Approved pay</dt><dd>{money(entry.approvedTotalCents)}</dd></div><div><dt>Recorded pay</dt><dd>{money(entry.recordedPaymentTotalCents)}</dd></div></dl><Badge state={entry.paymentCount > 0 ? 'paid' : 'unpaid'} /></li>)}</ul></>;
}
function Overview() {
  const { data } = usePayroll(); if (!data) return null;
  const approvedEmployees = data.employeePayrollSummaries.filter(entry => entry.approvedTotalCents > 0).length;
  return <><Header title="Payroll overview" description="Review approved earnings, recorded payments and pending notifications." action={<Link className="btn-primary" to="/pay-runs">Review pay run <ArrowRight size={16} aria-hidden="true" /></Link>} />
    <div className="period-bar"><div><CalendarDays size={20} aria-hidden="true" /><div><strong><PeriodRange start={data.payPeriod.start} end={data.payPeriod.end} /></strong><span className="secondary">Pay date: {date(data.payPeriod.scheduledPayRunAt)} · 09:00 UTC</span></div></div><PayDate /></div>
    <Metrics items={[{ label: 'Approved payroll', value: money(data.approvedTotalCents), note: `${approvedEmployees} employee${approvedEmployees === 1 ? '' : 's'} in this period` }, { label: 'Payments recorded', value: money(data.recordedPaymentTotalCents), note: 'For the selected pay period' }, { label: 'Pending approvals', value: String(data.pendingApprovalCount), note: 'Excluded from approved pay' }, { label: 'Pending notifications', value: String(data.pendingNotificationCount), note: 'Across all pay periods' }]} />
    {data.pendingNotificationCount > 0 && <div className="callout warning"><Mail size={20} aria-hidden="true" /><div><strong>Payment notifications are pending</strong><p>{data.pendingNotificationCount} payment {data.pendingNotificationCount === 1 ? 'notification needs' : 'notifications need'} delivery. Review pending delivery in Notifications. Existing payments must remain unchanged.</p><Link className="text-link" to="/notifications">Review pending notifications <ArrowRight size={15} aria-hidden="true" /></Link></div></div>}
    <Panel title="This period’s payroll" description="Approved earnings are combined into one payment per employee." action={<Link className="text-link" to="/pay-runs">View pay run <ArrowRight size={16} aria-hidden="true" /></Link>}><Entries /></Panel>
    <div className="two-columns overview-guidance"><Panel title="Before you process" description="Review the earnings and approvals before recording payments."><ol className="steps"><li><span>1</span><div><strong>Review earnings</strong><p>Check the employee, amount and earning date.</p></div></li><li><span>2</span><div><strong>Approve earnings</strong><p>Approve earnings that are ready. Pending and rejected records stay unpaid.</p></div></li><li><span>3</span><div><strong>Confirm and process</strong><p>Review totals, then record payments and send notifications.</p></div></li></ol></Panel><Panel title="Payroll policy" description="Weekly project earnings in US dollars. Model the selected Tuesday at 09:00 UTC without waiting for that date.">
      <dl className="detail-list payroll-policy">
        <div><dt>Earning period</dt><dd>Monday 00:00 UTC (included) to the following Monday 00:00 UTC (excluded).</dd></div>
        <div><dt>Pay date</dt><dd>Following Tuesday, 09:00 UTC.</dd></div>
        <div><dt>Calculation</dt><dd>Count each approved earning once and combine into one payment per employee and period.</dd></div>
        <div><dt>Recovery</dt><dd>Preserve existing payments; retry outstanding work only.</dd></div>
        <div><dt>Notifications</dt><dd>Send after payment succeeds. Failed delivery keeps the payment unchanged.</dd></div>
        <div><dt>Adjustments</dt><dd>Record in a later open period.</dd></div>
      </dl>
    </Panel></div>
  </>;
}
function Employees() {
  const { data, act, busy } = usePayroll(), [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', role: '', department: '', bank: '', accountEnding: '' });
  const addButton = useRef<HTMLButtonElement>(null);
  if (!data) return null;
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (await act('employees', form, 'Employee added. You can now record their earnings.')) {
      setForm({ name: '', role: '', department: '', bank: '', accountEnding: '' });
      setShowForm(false); addButton.current?.focus();
    }
  }
  return <><Header title="Employees" description="Add employees and review payment destinations before processing payroll." action={<button ref={addButton} className="btn-primary" aria-expanded={showForm} aria-controls="add-employee-form" onClick={() => setShowForm(true)}><UserPlus size={17} aria-hidden="true" />Add employee</button>} />
    {showForm && <Panel title="New employee" description="Enter the employee details and the last four account digits."><form id="add-employee-form" className="form-body" onSubmit={submit}>
      <label>Full name<input required maxLength={80} autoComplete="name" autoFocus value={form.name} onChange={inputEvent => setForm({ ...form, name: inputEvent.target.value })} /></label>
      <label>Role<input required maxLength={80} autoComplete="organization-title" value={form.role} onChange={inputEvent => setForm({ ...form, role: inputEvent.target.value })} /></label>
      <label>Department<input required maxLength={80} value={form.department} onChange={inputEvent => setForm({ ...form, department: inputEvent.target.value })} /></label>
      <label>Bank<input required maxLength={80} value={form.bank} onChange={inputEvent => setForm({ ...form, bank: inputEvent.target.value })} /></label>
      <div className="form-field"><label htmlFor="new-account-ending">Account ending</label><input id="new-account-ending" required inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4} aria-describedby="account-ending-hint" value={form.accountEnding} onChange={inputEvent => setForm({ ...form, accountEnding: inputEvent.target.value })} /><small id="account-ending-hint">Last four digits only.</small></div>
      <div className="form-actions employee-form-actions"><button className="btn-secondary" type="button" onClick={() => { setShowForm(false); addButton.current?.focus(); }}>Cancel</button><button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save employee'}</button></div>
    </form></Panel>}
    <Panel title={`${data.employees.length} employees`} description="Payment records retain the destination used when they were created."><div className="employee-grid">{data.employees.map(employee => <Link className="employee-card" to={`/employees/${employee.employeeId}`} key={employee.employeeId}><span className="avatar large" aria-hidden="true">{employee.name.split(' ').map(namePart => namePart[0]).join('')}</span><div><h2>{employee.name}</h2><p>{employee.role}</p><span className="secondary">{employee.department}</span></div><ArrowRight size={18} aria-hidden="true" /></Link>)}</div></Panel></>;
}
function EmployeeDetail() {
  const { employeeId } = useParams(), { data } = usePayroll(); if (!data) return null;
  const employee = data.employees.find(employee => employee.employeeId === employeeId);
  if (!employee) return <><Header title="Employee not found" description="Choose an employee from the directory." /><Link className="btn-secondary" to="/employees">View employees</Link></>;
  const earnings = data.earnings.filter(employee => employee.employeeId === employeeId), payments = data.payments.filter(payment => payment.employeeId === employeeId);
  return <><Link className="back-link" to="/employees"><ArrowLeft size={16} aria-hidden="true" />Employees</Link><Header title={employee.name} description={`${employee.role} · ${employee.department}`} action={<Link className="btn-primary" to={`/earnings?employee=${employeeId}`}>Record earnings</Link>} /><div className="two-columns"><Panel title="Payment destination"><dl className="detail-list"><div><dt>Bank</dt><dd>{employee.bank}</dd></div><div><dt>Account ending</dt><dd>•••• {employee.accountEnding}</dd></div><div><dt>Currency</dt><dd>USD · US dollars</dd></div><div><dt>Destination status</dt><dd><Badge state="ready" /></dd></div></dl></Panel><Panel title="Earnings and payment history"><Metrics items={[{ label: 'Earning records', value: String(earnings.length), note: 'Across all periods' }, { label: 'Payments recorded', value: money(payments.reduce((sum, payment) => sum + payment.amountCents, 0)), note: `${payments.length} payment ${payments.length === 1 ? 'record' : 'records'}` }]} /></Panel></div><Panel title="Recent payments"><PaymentsTable payments={payments} /></Panel></>;
}
function Earnings() {
  const { data, act, busy } = usePayroll(); const params = new URLSearchParams(useLocation().search);
  const [form, setForm] = useState({ employeeId: params.get('employee') ?? 'emp-001', description: '', amount: '', earnedAt: data ? new Date(Date.parse(data.payPeriod.start) + 3 * 86400000 + 12 * 3600000).toISOString().slice(0, 16) : '2026-10-08T12:00', status: 'pending' });
  const [error, setError] = useState(''), [filter, setFilter] = useState('all'), [rejectId, setRejectId] = useState<string | null>(null); if (!data) return null;
  const rejection = data.earnings.find(earning => earning.earningId === rejectId);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    try {
      const ok = await act('earnings', { earnings: [{ earningId: `earn-${crypto.randomUUID()}`, employeeId: form.employeeId, description: form.description, amountCents: parseUsdAmountToCents(form.amount), earnedAt: `${form.earnedAt}:00Z`, approvalStatus: form.status }] }, 'Earnings recorded. Review pending approvals before running payroll.');
      if (ok) setForm({ ...form, description: '', amount: '' });
    } catch (error) { setError((error as Error).message); }
  }
  const earnings = data.earnings.filter(earning => filter === 'all' || earning.approvalStatus === filter);
  return <><Header title="Earnings" description="Record each employee’s earnings, then approve or reject pending records before payroll." /><div className="earnings-layout"><Panel title="Record earnings" description="The earning date determines the pay period. Enter when the work was earned."><form className="form-body" onSubmit={submit}>
    <label>Employee<select value={form.employeeId} onChange={inputEvent => setForm({ ...form, employeeId: inputEvent.target.value })}>{data.employees.map(employee => <option key={employee.employeeId} value={employee.employeeId}>{employee.name}</option>)}</select></label>
    <label>Description<input required maxLength={160} value={form.description} placeholder="Weekly project earnings" onChange={inputEvent => setForm({ ...form, description: inputEvent.target.value })} /></label>
    <label>Amount (USD)<input required inputMode="decimal" value={form.amount} placeholder="1500.00" aria-describedby="amount-hint" onChange={inputEvent => setForm({ ...form, amount: inputEvent.target.value })} /><small id="amount-hint">$0.01 to $1,000,000.00 per earning record.</small></label>
    <label>Earning date and time (UTC)<input type="datetime-local" required value={form.earnedAt} onChange={inputEvent => setForm({ ...form, earnedAt: inputEvent.target.value })} /></label>
    <label>Approval status<select value={form.status} onChange={inputEvent => setForm({ ...form, status: inputEvent.target.value })}><option value="pending">Pending approval</option><option value="approved">Approved</option></select></label>
    {error && <p role="alert" className="field-error">{error}</p>}<button className="btn-primary" disabled={busy}>{busy ? 'Recording…' : 'Record earnings'}</button><p className="form-note">Past and future weeks accept earnings. A processed week is locked; reset it in Settings to repeat the cycle, or record an adjustment in a later open period.</p>
  </form></Panel><Panel title="Earning records" description="Dates are shown in UTC." action={<label className="filter-label">Status<select value={filter} onChange={inputEvent => setFilter(inputEvent.target.value)}><option value="all">All statuses</option><option value="approved">Approved</option><option value="pending">Pending</option><option value="rejected">Rejected</option></select></label>}>
    {earnings.length ? <ul className="record-list">{earnings.map(earning => <li key={earning.earningId}><div><EmployeeName employeeId={earning.employeeId} /><strong className="record-title">{earning.description}</strong><span className="secondary">{date(earning.earnedAt)} · {time(earning.earnedAt)} UTC</span><code>{earning.earningId}</code></div><div className="record-end"><strong className="money">{money(earning.amountCents)}</strong><Badge state={earning.approvalStatus} />{earning.approvalStatus === 'pending' && (data.payRuns.some(run => earning.earnedAt >= run.payPeriodStartsAt && earning.earnedAt < run.payPeriodEndsAt) ? <span className="secondary">Pay period locked</span> : <>
        <button className="btn-secondary compact" disabled={busy} onClick={() => void act(`earnings/${earning.earningId}/approve`, {}, 'Earnings approved.')} aria-label={`Approve earnings: ${earning.description} for ${data.employees.find(person => person.employeeId === earning.employeeId)?.name}`}>Approve earnings</button>
        <button className="btn-secondary compact" disabled={busy} onClick={() => setRejectId(earning.earningId)} aria-label={`Reject earnings: ${earning.description} for ${data.employees.find(person => person.employeeId === earning.employeeId)?.name}`}>Reject earnings</button>
      </>)}</div></li>)}</ul> : <Empty title="No matching earnings" description="Choose another status or record earnings using the form." />}
  </Panel></div><ConfirmDialog open={Boolean(rejection)} title="Reject these earnings?" description={rejection ? `${rejection.description} for ${data.employees.find(person => person.employeeId === rejection.employeeId)?.name}: ${money(rejection.amountCents)}. Rejected earnings are excluded from approved payroll. This decision cannot be changed.` : ''} confirmLabel="Reject earnings" onCancel={() => setRejectId(null)} onConfirm={() => { if (rejectId) { const earningId = rejectId; setRejectId(null); void act(`earnings/${earningId}/reject`, {}, 'Earnings rejected.'); } }} /></>;
}
function PayRuns() {
  const { data, payDate, setPayDate, act, busy } = usePayroll(), [confirm, setConfirm] = useState(false); if (!data) return null;
  const approvedEmployees = data.employeePayrollSummaries.filter(entry => entry.approvedTotalCents > 0).length;
  const remaining = Math.max(0, data.approvedTotalCents - data.recordedPaymentTotalCents);
  const hasEarnings = data.earnings.some(earning => earning.earnedAt >= data.payPeriod.start && earning.earnedAt < data.payPeriod.end);
  return <><Header title="Pay runs" description="Review the period and employee totals before processing payroll." action={<PayDate />} />
    <ol className="journey" aria-label="Payroll steps"><li className={!data.approvedTotalCents ? "current" : "done"}>{data.approvedTotalCents > 0 && <Check size={15} aria-hidden="true" />}Review earnings</li><li className={data.isPayPeriodLocked ? "done" : data.approvedTotalCents ? "current" : ""}>Confirm payroll</li><li className={data.isPayPeriodLocked ? "current" : ""}>Review payments</li></ol>
    <div className="run-summary"><div><p className="eyebrow">Selected pay period</p><h2><PeriodRange start={data.payPeriod.start} end={data.payPeriod.end} /></h2><p>Pay date: {date(data.payPeriod.scheduledPayRunAt)} · 09:00 UTC</p><p className="policy-note">Processing simulates this pay date at Tuesday 09:00 UTC, regardless of the current date. Recorded timestamps show when the action was actually run.</p></div><Badge state={data.isPayPeriodLocked ? remaining > 0 ? 'incomplete' : 'paid' : 'review'} /></div>
    <Metrics items={[{ label: 'Approved pay', value: money(data.approvedTotalCents), note: `${approvedEmployees} employee${approvedEmployees === 1 ? '' : 's'} with approved earnings` }, { label: 'Recorded pay', value: money(data.recordedPaymentTotalCents), note: 'Payments recorded for this period' }, { label: 'Unpaid amount', value: money(remaining), note: 'For this period' }]} />

    {data.isPayPeriodLocked && remaining > 0 && <div className="callout warning"><strong>Some payments remain unrecorded.</strong><p>Retry the original pay run to record unpaid amounts. Keep existing payment references unchanged.</p></div>}
    {data.pendingApprovalCount > 0 && <div className="callout warning"><strong>{data.pendingApprovalCount} pending {data.pendingApprovalCount === 1 ? 'approval' : 'approvals'} in this period</strong><p>Review earnings awaiting approval. After processing, late approvals require an adjustment in a later open period. <Link className="text-link" to="/earnings">Review earnings</Link></p></div>}
    <Panel title="Employee breakdown" description="Each employee’s approved earnings form one payment for this period."><Entries /><div className="panel-footer"><p>{data.isPayPeriodLocked ? 'Approved totals are locked. A retry must preserve existing payments.' : 'Processing locks this period. Corrections must be recorded in a later open period.'}</p><button className="btn-primary" disabled={busy || !hasEarnings} onClick={() => setConfirm(true)}>{busy ? 'Processing…' : data.isPayPeriodLocked ? 'Retry pay run' : 'Pay on Tuesday 09:00 UTC'}<ArrowRight size={16} aria-hidden="true" /></button></div></Panel>
    {data.payments.some(payment => payment.payPeriodStartsAt === data.payPeriod.start) && <Panel title="Recorded payments for this period" description="Payments recorded for the selected pay period."><PaymentsTable compact payments={data.payments.filter(payment => payment.payPeriodStartsAt === data.payPeriod.start)} /></Panel>}<Panel title="Pay run history" description="Open a processed period to review its payment records.">{data.payRuns.length ? <ul className="history-list">{data.payRuns.map(payRun => <li key={payRun.payPeriodStartsAt}><div><strong><PeriodRange start={payRun.payPeriodStartsAt} end={payRun.payPeriodEndsAt} /></strong><span className="secondary">Pay date: {date(payRun.scheduledPayRunAt)}</span></div><strong className="money">{money(payRun.approvedTotalCents)}</strong><button className="btn-secondary compact" disabled={busy} onClick={() => { setPayDate(payRun.scheduledPayRunAt.slice(0, 10)); window.scrollTo({ top: 0 }); }}>Review period</button></li>)}</ul> : <Empty title="No pay runs yet" description="Review the employee breakdown and process the first pay run." />}</Panel>
    <ConfirmDialog open={confirm} title={data.isPayPeriodLocked ? 'Retry this pay run?' : 'Pay this Tuesday’s payroll?'} description={`Approved pay is ${money(data.approvedTotalCents)} for ${approvedEmployees} employee${approvedEmployees === 1 ? '' : 's'}. This action simulates ${date(`${payDate}T09:00:00Z`)} at 09:00 UTC without waiting for that date. Pending and rejected earnings must remain unpaid. ${data.isPayPeriodLocked ? 'Retry only the outstanding work; existing payments must remain unchanged.' : 'Processing locks this period. Later adjustments belong in a new open period.'}`} confirmLabel={data.isPayPeriodLocked ? 'Retry pay run' : 'Pay on Tuesday 09:00 UTC'} onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); void act('pay-runs', { scheduledPayRunAt: data.payPeriod.scheduledPayRunAt, simulatedProcessingAt: data.payPeriod.scheduledPayRunAt }, 'Pay run finished. Review payment records and notification status.'); }} />
  </>;
}
function PaymentsTable({ payments, compact = false }: { payments: Payment[]; compact?: boolean }) {
  const { data } = usePayroll();
  if (!payments.length) return <Empty title="No payments recorded" description="Payments appear after an approved pay run is processed." action={<Link className="btn-secondary" to="/pay-runs">Review pay run</Link>} />;
  return <div className="table-wrap" tabIndex={0} role="region" aria-label="Payment records"><table><caption className="sr-only">Recorded employee payments</caption>
    <thead><tr><th scope="col">Employee</th>{!compact && <><th scope="col">Pay period starts</th><th scope="col">Recorded</th></>}<th scope="col" className="numeric">Amount</th><th scope="col">Payment status</th><th scope="col">Notification</th><th scope="col">Receipt</th></tr></thead>
    <tbody>{payments.map(payment => <tr key={payment.paymentId}>
      <td><strong>{payment.employeeName}</strong><span className="secondary">{payment.bank} · •••• {payment.accountEnding}</span></td>
      {!compact && <><td>{date(payment.payPeriodStartsAt)}</td><td>{date(payment.createdAt)}<span className="secondary">{time(payment.createdAt)} UTC</span></td></>}<td className="numeric money">{money(payment.amountCents)}</td>
      <td><Badge state="paid" /></td>
      <td><Badge state={data?.notifications.find(notification => notification.paymentId === payment.paymentId)?.deliveryStatus ?? 'not available'} /></td>
      <td><Link className="text-link" to={`/payments/${payment.paymentId}`} aria-label={`View receipt for ${payment.employeeName}, ${payment.paymentId}`}>View receipt <ArrowRight size={15} aria-hidden="true" /></Link><code className="payment-reference">{payment.paymentId}</code></td>
    </tr>)}</tbody></table></div>;
}
function Payments() {
  const { data } = usePayroll(), [employee, setEmployee] = useState('all'); if (!data) return null;
  const payments = data.payments.filter(payment => employee === 'all' || payment.employeeId === employee);
  function exportPayments() { download('mustpayroll-payments.csv', [['Reference', 'Employee', 'Period start (UTC)', 'Amount (USD)', 'Bank', 'Account ending', 'Recorded (UTC)'], ...payments.map(payment => [payment.paymentId, payment.employeeName, payment.payPeriodStartsAt, (payment.amountCents / 100).toFixed(2), payment.bank, payment.accountEnding, payment.createdAt])].map(row => row.map(csvCell).join(',')).join('\r\n'), 'text/csv'); }
  return <><Header title="Payments" description="Review recorded payments by employee and period, then open a receipt for the details." action={<button className="btn-secondary" onClick={exportPayments}><Download size={17} aria-hidden="true" />Export payments</button>} /><Panel title={`${payments.length} payment ${payments.length === 1 ? 'record' : 'records'}`} action={<label className="filter-label">Employee<select value={employee} onChange={inputEvent => setEmployee(inputEvent.target.value)}><option value="all">All employees</option>{data.employees.map(employee => <option key={employee.employeeId} value={employee.employeeId}>{employee.name}</option>)}</select></label>}><PaymentsTable payments={payments} /></Panel></>;
}
function IncludedEarnings({ payment }: { payment: Payment }) {
  const { data } = usePayroll();
  const earnings = includedEarnings(payment, data!.earnings);
  return <section className="receipt-earnings" aria-label="Earnings included in payment"><h3>Included earnings</h3><p>Breakdown of the earnings included in this payment.</p>
    {earnings.length ? <div className="table-wrap" tabIndex={0}><table><caption className="sr-only">Earnings included in this payment</caption><thead><tr><th scope="col">Earning</th><th scope="col" className="numeric">Amount</th><th scope="col">Approval status</th></tr></thead>
      <tbody>{earnings.map(earning => <tr key={earning.earningId}><td><strong>{earning.description}</strong><code className="payment-reference">{earning.earningId}</code></td><td className="numeric money">{money(earning.amountCents)}</td><td><Badge state={earning.approvalStatus} /></td></tr>)}</tbody></table></div> : <p>Earning details unavailable.</p>}
  </section>;
}
function Receipt() {
  const { paymentId } = useParams(), { data } = usePayroll(), [copied, setCopied] = useState(''); if (!data) return null;
  const payment = data.payments.find(payment => payment.paymentId === paymentId), notification = data.notifications.find(notification => notification.paymentId === paymentId);
  if (!payment) return <><Header title="Payment not found" description="Open a receipt from the payment records." /><Link className="btn-secondary" to="/payments">View payments</Link></>;
  const text = `MustPayroll payment receipt\nReference: ${payment.paymentId}\nEmployee: ${payment.employeeName}\nAmount: ${money(payment.amountCents)}\nPay period starts: ${date(payment.payPeriodStartsAt)}\nBank: ${payment.bank}\nAccount ending: ${payment.accountEnding}\nRecorded: ${payment.createdAt}\nPayment: Recorded\nNotification: ${notification?.deliveryStatus ?? 'Unavailable'}\n`;
  return <><Link className="back-link" to="/payments"><ArrowLeft size={16} aria-hidden="true" />Payments</Link><Header title="Payment receipt" description="This receipt records the payment. Notification delivery has its own status." /><section className="receipt"><CheckCircle2 size={36} className="receipt-icon" aria-hidden="true" /><p className="eyebrow">Payment recorded</p><h2 className="receipt-amount">{money(payment.amountCents)}</h2><p>{payment.employeeName}</p><dl className="detail-list"><div><dt>Reference</dt><dd className="reference">{payment.paymentId}</dd></div><div><dt>Pay period starts</dt><dd>{date(payment.payPeriodStartsAt)}</dd></div><div><dt>Bank</dt><dd>{payment.bank} · •••• {payment.accountEnding}</dd></div><div><dt>Recorded</dt><dd>{date(payment.createdAt)} · {time(payment.createdAt)} UTC</dd></div><div><dt>Notification</dt><dd><Badge state={notification?.deliveryStatus ?? 'not available'} /></dd></div></dl><IncludedEarnings payment={payment} /><div className="form-actions"><button className="btn-secondary" onClick={() => { void navigator.clipboard.writeText(payment.paymentId).then(() => setCopied('Reference copied.')).catch(() => setCopied('Copy unavailable. Download the receipt to keep the reference.')); }}>Copy reference</button><button className="btn-primary" onClick={() => download(`mustpayroll-receipt-${payment.paymentId}.txt`, text)}><Download size={16} aria-hidden="true" />Download receipt</button></div><p role="status">{copied}</p></section></>;
}
function Notifications() {
  const { data, busy, act } = usePayroll(); if (!data) return null;
  return <><Header title="Notifications" description="Review delivery errors, then retry pending notifications. Existing payments must remain unchanged." action={<button className="btn-primary" disabled={busy || data.pendingNotificationCount === 0} onClick={() => void act('notifications/retry-pending', {}, 'Notification recovery finished. Review delivery status; recorded payments are unchanged.')}><Mail size={17} aria-hidden="true" />{busy ? 'Retrying…' : 'Retry pending notifications'}</button>} /><Metrics items={[{ label: 'Pending delivery', value: String(data.pendingNotificationCount), note: 'Payments remain recorded' }, { label: 'Sent', value: String(data.notifications.filter(notification => notification.deliveryStatus === 'sent').length), note: 'Accepted by the notification service' }]} /><Panel title="Delivery history" description="Each notification belongs to a recorded payment. Review any delivery error before retrying.">{data.notifications.length ? <ul className="record-list">{data.notifications.map(notification => <li key={notification.notificationId}><div><strong>{notification.employeeName}</strong><span className="secondary">Pay period starts {date(notification.payPeriodStartsAt)} · {notification.deliveryAttemptCount} delivery {notification.deliveryAttemptCount === 1 ? 'attempt' : 'attempts'}</span>{notification.lastDeliveryError && <p className="delivery-error">{notification.lastDeliveryError}</p>}<Link className="text-link" to={`/payments/${notification.paymentId}`}>View payment receipt <ArrowRight size={15} aria-hidden="true" /></Link></div><Badge state={notification.deliveryStatus} /></li>)}</ul> : <Empty title="No notifications yet" description="Process an approved pay run to create payment notifications." action={<Link className="btn-secondary" to="/pay-runs">Review pay run</Link>} />}</Panel></>;
}
function Settings() {
  const { data, act, busy } = usePayroll(), [confirm, setConfirm] = useState(false);
  if (!data) return null;
  const earnings = data.earnings.filter(earning => earning.earnedAt >= data.payPeriod.start && earning.earnedAt < data.payPeriod.end);
  const payments = data.payments.filter(payment => payment.payPeriodStartsAt === data.payPeriod.start);
  const notifications = data.notifications.filter(notification => notification.payPeriodStartsAt === data.payPeriod.start);
  const hasRecords = earnings.length > 0 || payments.length > 0 || notifications.length > 0 || data.isPayPeriodLocked;
  return <><Header title="Settings" description="Select a pay week and reset its records to restart the payroll cycle." action={<PayDate />} />
    <div className="run-summary"><div><p className="eyebrow">Selected pay week</p><h2><PeriodRange start={data.payPeriod.start} end={data.payPeriod.end} /></h2><p>Pay date: {date(data.payPeriod.scheduledPayRunAt)} · 09:00 UTC</p><p className="policy-note">Past and future pay weeks are available. Passing the calendar date does not close a week.</p></div><Badge state={data.isPayPeriodLocked ? 'processed' : 'open'} /></div>
    <Metrics items={[{ label: 'Earning records', value: String(earnings.length), note: 'For the selected pay week' }, { label: 'Payment records', value: String(payments.length), note: 'For the selected pay week' }, { label: 'Notification records', value: String(notifications.length), note: 'For the selected pay week' }]} />
    <Panel title="Reset selected pay week" description="Remove this week’s earnings, payments, notifications and saved pay run. This action cannot be undone.">
      <div className="settings-body"><p>Employees and other pay weeks are kept. Resetting reopens this week so you can record earnings and process payroll again. An audit entry records the reset.</p>
      <button className="btn-primary btn-danger" disabled={busy || !hasRecords} onClick={() => setConfirm(true)}>Reset selected pay week</button>{!hasRecords && <p className="secondary">No records to reset for this pay week.</p>}</div>
    </Panel>
    <ConfirmDialog open={confirm} danger title="Reset this pay week?" description={`Remove ${earnings.length} earning record${earnings.length === 1 ? '' : 's'}, ${payments.length} payment record${payments.length === 1 ? '' : 's'}, ${notifications.length} notification record${notifications.length === 1 ? '' : 's'} and the saved run for ${periodLabel(data.payPeriod.start, data.payPeriod.end)} (${periodBoundaryNote.toLowerCase()}; pay date ${date(data.payPeriod.scheduledPayRunAt)}, 09:00 UTC). Employees and other pay weeks will be kept. This cannot be undone.`} confirmLabel="Reset pay week" onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); void act('pay-periods/reset', { scheduledPayRunAt: data.payPeriod.scheduledPayRunAt }, 'Selected pay week reset. Its earnings, payments, notifications and saved run have been removed. You can record earnings and process it again.'); }} />
  </>;
}
function Shell() {
  const { data, busy, error, reload } = usePayroll(), location = useLocation(), previous = useRef(location.pathname);
  useEffect(() => { document.title = `MustPayroll | ${navigation.find(navigationItem => location.pathname.startsWith(navigationItem.to))?.label ?? 'Payroll'}`; if (previous.current !== location.pathname) document.getElementById('page-title')?.focus(); previous.current = location.pathname; }, [location.pathname, data]);
  return <div className="app-shell"><a className="skip-link" href="#main-content">Skip to content</a><aside className="sidebar"><NavLink className="brand" to="/overview" aria-label="MustPayroll home"><Building2 size={26} strokeWidth={1.8} aria-hidden="true" /><span>MustPayroll</span></NavLink><p className="nav-caption">PAYROLL</p><nav aria-label="Payroll">{navigation.map(({ to, label, icon: Icon }) => <NavLink className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} key={to} to={to}><Icon size={19} strokeWidth={1.7} aria-hidden="true" /><span>{label}</span>{to === '/notifications' && Boolean(data?.pendingNotificationCount) && <span className="nav-count">{data!.pendingNotificationCount}</span>}</NavLink>)}</nav><div className="sidebar-footer"><span className="company-mark" aria-hidden="true">N</span><div><strong>Northstar Studio</strong><span>Payroll operations</span></div></div></aside><div className="main-shell"><div className="topbar"><span>Northstar Studio <span className="topbar-separator">/</span> Payroll</span><span className="topbar-meta">USD <span aria-hidden="true">·</span> UTC</span></div><Toast /><main id="main-content" className="main" tabIndex={-1} aria-busy={busy}>{error && <div className="callout danger" role="alert"><p>{error}</p><button className="btn-secondary compact" onClick={() => void reload()}>Refresh payroll</button></div>}{!data ? <div className="loading"><h1 id="page-title">{error ? 'Payroll unavailable' : 'Loading payroll…'}</h1><p>{error ? 'Open a valid payroll link, then select Refresh payroll.' : 'Loading employees, earnings and payment records.'}</p></div> : <Routes><Route path="/" element={<Navigate to="/overview" replace />} /><Route path="/overview" element={<Overview />} /><Route path="/employees" element={<Employees />} /><Route path="/employees/:employeeId" element={<EmployeeDetail />} /><Route path="/earnings" element={<Earnings />} /><Route path="/pay-runs" element={<PayRuns />} /><Route path="/payments" element={<Payments />} /><Route path="/payments/:paymentId" element={<Receipt />} /><Route path="/notifications" element={<Notifications />} /><Route path="/settings" element={<Settings />} /><Route path="*" element={<Navigate to="/overview" replace />} /></Routes>}</main></div></div>;
}
export default function App() { return <PayrollProvider><Shell /></PayrollProvider>; }
