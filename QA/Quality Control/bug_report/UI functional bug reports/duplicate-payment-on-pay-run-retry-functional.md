# Duplicate payment on pay-run retry — Functional bug report (PAY-001)

## Title

Retrying a processed pay run creates a duplicate employee payment.

## Bug description

MustPayroll must pay each employee once for the same pay period. After the operator processes approved earnings, retrying that pay run records a second payment instead of retaining the first.

**Severity: High. Priority: P1.** In this reproduction, the employee's recorded pay doubles from $1,500 to $3,000 without any additional earnings.

## Test case that verified the bug

[TC07 — Retrying payroll after payment was recorded](../../Buggy%20build/Functional%20testing/functional-test-suite.md).

## Preconditions

- The buggy application is running at `http://127.0.0.1:4175`.
- Amara Okafor exists with destination **Meridian Bank · •••• 4821**.
- The 13 October 2026 pay week is open, with no earnings or payments.

## Test data

| Employee | Description | Amount | Earned at | Approval status | Destination |
|---|---|---|---|---|---|
| Amara Okafor | Weekly project earnings | $1,500 | 8 October 2026, 12:00 UTC | Approved | Meridian Bank · •••• 4821 |

Pay date: **13 October 2026, 09:00 UTC**. It covers earnings from **5 October 00:00 UTC (included) to 12 October 00:00 UTC (excluded)**. The processing button simulates that pay date; no calendar wait is needed. All amounts are USD. Payment records are local test data; no real funds move.

## Steps to reproduce

1. Open `http://127.0.0.1:4175/earnings`. Record the Test data earning for Amara with **Approval status: Approved**.
2. Open **Pay runs** and select **13 October 2026**. Check **Approved pay: $1,500** and **Recorded pay: $0**.
3. Click **Pay on Tuesday 09:00 UTC** and confirm. Open **Payments → View receipt** for Amara's period starting 5 October; note the payment reference, $1,500 amount and destination.
4. Return to **Pay runs** with the same pay date. Click **Retry pay run** and confirm once; leave earnings unchanged.
5. Check **Recorded pay** and **Recorded payments for this period**. Open **Payments** and compare the payment references.

## Expected result

Only the original $1,500 payment remains. Recorded pay stays $1,500; the payment reference, amount and destination are unchanged.

## Actual result

The application retains the original payment and adds another $1,500 payment with a different reference. Two payments now total $3,000 for the same employee and pay period.

## Evidence

- **Buggy execution:** [TC07 functional results](../../Buggy%20build/Functional%20testing/functional-testing-results.md), recorded 20 October 2026 UTC; build `mustpayroll-0.2.0-faulty-f4ce4b794698`.
- **Fix verification:** [TC07 fixed results](../../Fixed%20build/Functional%20testing/functional-testing-results.md), same inputs and expectations; recorded 20 October 2026 UTC; build `mustpayroll-0.2.0-fixed-4c4c2fec65d0`. The fixed run retained one $1,500 payment and the original payment and notification identities.
