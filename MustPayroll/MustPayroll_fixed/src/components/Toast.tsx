import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, CircleAlert, X } from 'lucide-react';
import { money, usePayroll } from '../payroll';

export function Toast() {
  const { error, notice, noticeTitle, noticeIssue, noticeTone, noticeDetails, toastOpen, dismissToast } = usePayroll();
  const previousFocus = useRef<HTMLElement | null>(null);
  const message = error || notice;
  const tone = error ? 'danger' : noticeTone;
  const paymentRecorded = !error && noticeDetails.some(detail => detail.paymentId);
  useEffect(() => {
    if (message && toastOpen) previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, [message, toastOpen]);
  function dismiss() {
    dismissToast();
    const target = previousFocus.current;
    if (target?.isConnected && !target.matches(':disabled') && !target.closest('.toast')) target.focus({ preventScroll: true });
    else document.getElementById('page-title')?.focus({ preventScroll: true });
  }
  return <div className="toast-layer">
    <div className="sr-only" role="status" aria-atomic="true">{toastOpen && !error ? `${noticeTitle} ${notice}` : ''}</div>
    {message && toastOpen && <section className={`toast ${paymentRecorded ? 'success' : tone}`} aria-label="Payroll notification" key={message}>
      <div className="toast-header">
        {paymentRecorded || tone === 'success' ? <CheckCircle2 size={21} aria-hidden="true" /> : <CircleAlert size={21} aria-hidden="true" />}
        <strong className="toast-title">{error ? 'Action failed' : noticeTitle || (tone === 'warning' ? 'Needs attention' : 'Completed')}</strong>
        <button type="button" className="toast-close" aria-label="Dismiss notification" onClick={dismiss}><X size={20} aria-hidden="true" /></button>
      </div>
      <p className="toast-message" role={error ? 'alert' : undefined}>{message}</p>
      {!error && noticeIssue && <div className="toast-issue"><strong>Outstanding work</strong><p>{noticeIssue}</p></div>}
      {paymentRecorded && <Link className="text-link" to="/payments">View recorded payments</Link>}
      {!error && noticeDetails.length > 0 && <details className="toast-details">
        <summary>View employee payment statuses ({noticeDetails.length})</summary>
        <ul>{noticeDetails.map((detail, index) => <li key={detail.paymentId ?? `unpaid-${index}`}>
          <div className="toast-payment"><strong>{detail.employeeName}</strong><strong className="money">{money(detail.amountCents)}</strong></div>
          <p>{detail.paymentId ? 'Payment: Paid' : 'Payment not recorded'} <span aria-hidden="true">·</span> Notification: <strong>{detail.notification.charAt(0).toUpperCase() + detail.notification.slice(1)}</strong></p>
          {detail.paymentId && <Link className="text-link toast-reference" to={`/payments/${detail.paymentId}`} aria-label={`Open payment receipt for ${detail.employeeName}, ${detail.paymentId}`}>{detail.paymentId}</Link>}
        </li>)}</ul>
      </details>}
    </section>}
  </div>;
}
