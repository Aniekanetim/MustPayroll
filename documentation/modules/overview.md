# Overview

**Route:** `/overview`

**Purpose:** Compare approved and recorded pay for the selected week and identify the next action.

Overview is the starting point for MustPayroll's payroll journey. Select a Tuesday pay date to inspect its preceding completed earning week.

## What the screen shows

The period bar shows the earning window, pay date and **Pay date** selector. The window shows both Monday boundaries with their actual dates and 00:00 UTC times. Start included · End excluded makes the cut-off explicit. The same display updates when another pay date is selected, including across months and years.

| Indicator | Scope and meaning |
|---|---|
| Approved payroll | Sum of approved earnings in the selected period |
| Payments recorded | Sum of saved payments for that period |
| Pending approvals | Pending earnings in that period |
| Pending notifications | Pending delivery across all loaded pay periods |

The employee breakdown shows approved and recorded amounts alongside Unpaid or Paid status. The operator compares these records with the business rules; the screen does not label discrepancies as defects. The policy panel explains the weekly window, calculation and recovery rules.

## User interaction

1. Open Overview in the chosen application. The default selected pay date is 13 October 2026 unless a saved supported date is restored.
2. Select **Pay date** and confirm the displayed earning window.
3. Compare Approved payroll, Payments recorded and the employee breakdown. Check pending approvals before processing.
4. Select **Review pay run** or **View pay run** to continue to Pay runs with the selected date.
5. If the delivery warning is present, select **Review pending notifications** to inspect errors and recover delivery.
6. After processing or recovery, return here and reconcile the same period.

## Connections and effects

Overview reads existing records; visiting or changing the selected date creates no payments. Recording or approving earnings changes the relevant period's approved total. In the fixed build, processing creates payments with linked notification records. Successful delivery decreases the pending-notification count across all loaded pay periods.

The same screen is available in the independent buggy and fixed applications. Buggy can record unapproved or duplicate payments and omit notification work; fixed applies the corrections. Comparing the ordinary amounts, references and delivery states exposes those differences. The [build guide](../README.md#expected-behaviour-and-the-two-builds) explains the comparison.

A nonzero pending-notification count can belong to another period even when the selected period has no payroll. Paid means a payment record exists; it does not establish that its amount is correct, that it is unique or that its notification was delivered.

## Empty and unavailable states

When the period has no approved earnings or payments to summarize, **No approved earnings in this period** provides **Review earnings**. Review the date before adding data; an empty selected period does not imply that other periods have no records.

If loading fails, select **Refresh payroll**. Confirm that the application address belongs to the intended build. Refresh reads saved data and does not reset the run.

## Requirements and verification

[VIEW-01](../PRD.md#view-01), [PER-01](../PRD.md#per-01) and [RUN-02](../PRD.md#run-02) define the relevant expectations. Browser test case TC01 checks Overview against processed payroll. TC02 checks the displayed UTC boundaries for future pay dates across month, year and leap-day transitions. Other cross-period indicators and navigation paths remain outside those checks. Continue with [Employees](employees.md), [Earnings](earnings.md) or [Pay runs](pay-runs.md).
