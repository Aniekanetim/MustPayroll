# Payments and receipts

**Routes:** `/payments` and `/payments/:paymentId`

**Purpose:** Inspect saved payments and compare them with approved employee totals.

Pay runs creates the records displayed here. Paid means a local record exists; payment amount, approval and uniqueness still need to be checked against the business rule.

## History and scope

Payments lists saved records across all loaded pay periods. The **Employee** filter narrows that history; the selected pay date on Overview does not filter it. Each row shows employee, saved bank destination, period start, recorded time, amount, **Paid**, notification status and **View receipt**, with the reference visible below the link. When no notification record exists, its status is **Not available**, distinct from a saved notification awaiting delivery (**Pending**).

Payment records describe successful local writes. They do not establish that an external bank transfer occurred.

## Inspect a payment

1. Select **Payments**, or follow a receipt link from an employee or notification record.
2. Choose **All employees** or an individual employee in the Employee filter.
3. Locate the employee and pay-period start. Compare the payment count and amount with the Pay runs breakdown.
4. Open **View receipt** and inspect reference, amount, period, recorded time, bank and masked account ending.
5. Check Notification separately. Pending means saved delivery work awaits retry; Not available means no instruction exists.
6. Inspect **Included earnings**: the frozen earning IDs, amounts and approval statuses. Compare them with the approval rule. The processed period blocks earning and review changes.
7. Retain the reference and amount before recovery, then reopen the receipt afterwards to confirm that the payment is unchanged.

## Copy, download and export

- **Copy reference** copies the payment reference and reports Reference copied. If clipboard access fails, use Download receipt.
- **Download receipt** saves a text receipt for that payment, including its current notification status.
- **Export payments** downloads `mustpayroll-payments.csv` containing the currently employee-filtered history across periods. It includes reference, employee, period start, amount, destination and recorded time.

These actions copy existing information; they do not create, reverse or retry payments. A downloaded receipt is a snapshot: later notification recovery can change the on-screen notification status.

## Connections and exceptions

Pay runs creates the records displayed here. Employee detail uses the same records for its all-period history. Notifications links to receipts through payment identity.

**No payments recorded** offers **Review pay run**. Check whether no payment exists for the chosen employee or whether processing failed. An unknown reference shows **Payment not found** with **View payments** to return to history.

If the amount or count exceeds the approved employee-period total, stop processing and retain the references for reconciliation. There is no delete, refund or reversal control. If no notification instruction exists for a saved payment, delivery retry has no work to process; preserve the payment and escalate for repair.

## Build comparison

Both versions provide equivalent payment views while keeping their records separate. Buggy can show Paid records containing unapproved amounts or duplicate payments, with Notification Not available. Fixed applies the eligibility, identity and notification-creation rules. The before-and-after comparison uses amounts, references and Included earnings to establish those differences. See the [build guide](../README.md#expected-behaviour-and-the-two-builds) and [controlled-defect mapping](../../QA/Quality%20assurance/business_rules.md#controlled-defects-and-their-checks).

## Requirements and verification

[PAY-01](../PRD.md#pay-01), [REC-01](../PRD.md#rec-01), [VIEW-01](../PRD.md#view-01) and [RECEIPT-01](../PRD.md#receipt-01) define these expectations. The browser cases inspect payment lists and receipts during their payroll journeys; export, text download and clipboard behaviour are outside their automated coverage. Continue with [Notifications](notifications.md) for delivery recovery.
