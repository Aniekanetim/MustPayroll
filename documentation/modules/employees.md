# Employees

**Routes:** `/employees` and `/employees/:employeeId`

**Purpose:** Identify the employee, inspect their destination and connect them to earnings and payments.

MustPayroll uses this directory before earnings entry and payment review. Each build keeps its own employee and payroll records. The directory controls work the same way in buggy and fixed; adding a person in one does not add them to the other.

## What the screens show

The directory lists seeded and newly added employees with name, role and department. An employee card opens their detail page, showing bank, masked account ending and USD currency. Destination status is displayed as Ready for stored destinations; it is not a live bank-account verification.

The detail page shows the employee's earning-record count and total recorded payments across all periods. Its payment table opens individual receipts. These totals do not follow the pay-date selection on Overview.

## User interaction

### Add an employee

1. Select **Add employee** in Employees.
2. Enter name, role, department, bank and exactly four account-ending digits.
3. Select **Save employee** to add the person, or **Cancel** to close without saving.
4. After saving, confirm that the person is available in the directory and earning form.

### Review an employee

1. Open the relevant employee card and confirm their identity, bank and masked account ending.
2. Select **Record earnings** to open Earnings with that person preselected.
3. Enter earnings there, or select **Employees** above the detail heading to return to the directory.
4. For an earlier payment, select **View receipt** from the employee's payment history.

## Connections and effects

Opening a detail page changes no payroll records. The Record earnings link supplies the employee selection to the form; it does not create an earning or filter the full earning list. An earning belongs to this employee through its employee ID.

When processing creates a payment, the employee's name, bank and account ending are copied into the saved payment. The receipt therefore describes the destination used for that payment.

## Limits and unavailable records

Existing employee details remain view-only; termination, bank-detail changes and external account verification are not available. Ready should not be interpreted as evidence that an external bank accepted a transfer.

An unknown employee route shows **Employee not found**, with **View employees** to return to the directory. A valid employee with no payments shows **No payments recorded**, with **Review pay run** as the next action.

## Requirements and verification

[EMP-01](../PRD.md#emp-01) defines this relationship. The eight-case assessment suite checks saved destinations and receipts in payment journeys; it does not fully test directory navigation or the detail-page controls. Continue with [Earnings](earnings.md) or [Payments](payments.md).
