// CONTROLLED PRE-FIX IMPLEMENTATION: payment is saved without notification work.
export const paymentPolicy = {
  buildVariant: 'faulty',
  deliverNotificationsAfterPayRun: false,
  // PAY-002: due-date selection omits the approval check.
  selectPayableEarnings(earnings) { return earnings; },
  hasCompletedPayment(service, payrollDatasetId, payPeriodStartsAt, employeeId) {
    // Defect: delivery completion is used instead of committed payment identity.
    return service.db.prepare("SELECT 1 FROM notifications n JOIN payments p ON p.id=n.payment_id WHERE p.payroll_dataset_id=? AND p.period_start=? AND p.employee_id=? AND n.state='sent'").get(payrollDatasetId, payPeriodStartsAt, employeeId);
  },
  saveEmployeePayment(service, { payrollDatasetId, employeePayRunEntry, paymentId, savePaymentRecord }) {
    // Defect: the successful payment path omits the notification-work insert.
    savePaymentRecord();
    service.recordAuditEvent(payrollDatasetId, 'payment_committed', employeePayRunEntry.employee_id, { paymentId, amountCents: employeePayRunEntry.amount_minor });
  },
};
