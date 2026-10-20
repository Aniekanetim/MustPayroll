// CORRECTED IMPLEMENTATION: committed payment identity determines completion.
export const paymentPolicy = {
  buildVariant: 'fixed',
  deliverNotificationsAfterPayRun: true,
  selectPayableEarnings(earnings) { return earnings.filter(earning => earning.approvalStatus === 'approved'); },
  hasCompletedPayment(service, payrollDatasetId, payPeriodStartsAt, employeeId) {
    return service.db.prepare('SELECT 1 FROM payments WHERE payroll_dataset_id=? AND period_start=? AND employee_id=?').get(payrollDatasetId, payPeriodStartsAt, employeeId);
  },
  saveEmployeePayment(service, { payrollDatasetId, employeePayRunEntry, paymentId, savePaymentRecord, saveNotificationRecord }) {
    try {
      service.withTransaction(() => {
        savePaymentRecord();
        saveNotificationRecord();
      });
      service.recordAuditEvent(payrollDatasetId, 'payment_committed', employeePayRunEntry.employee_id, { paymentId, amountCents: employeePayRunEntry.amount_minor });
    } catch (error) {
      service.recordAuditEvent(payrollDatasetId, 'payment_rolled_back', employeePayRunEntry.employee_id, { reason: error.message });
    }
  },
};
