# Pending and Rejected earnings paid — Functional bug report (PAY-002)

## Title

Payroll pays Pending and Rejected earnings.

## Bug description

Only Approved earnings within the selected period should be paid. Processing payroll also pays Amara's Pending bonus and Rejected claim, while their approval statuses remain unchanged.

**Severity: High. Priority: P1.** The run pays $750 without approval: a $500 bonus and a $250 rejected claim.

## Test case that verified the bug

[TC01 — Approved payroll with excluded earnings](../../Buggy%20build/Functional%20testing/functional-test-suite.md).

## Preconditions

- The buggy application is running at `http://127.0.0.1:4175`.
- Amara Okafor, Daniel Mensah and Zara Bello exist.
- The 13 and 20 October 2026 pay weeks are open, with no earnings or payments.

## Test data

All dates are UTC in 2026. Enter each record as Pending approval, then apply the final status shown.

| Employee | Description | Amount | Earned at | Final status |
|---|---|---|---|---|
| Amara Okafor | Weekly project earnings | $1,200 | 8 Oct, 12:00 | Approved |
| Amara Okafor | Approved delivery bonus | $300 | 9 Oct, 15:00 | Approved |
| Daniel Mensah | Weekly project earnings | $2,000 | 9 Oct, 12:00 | Approved |
| Zara Bello | Weekly project earnings | $850 | 10 Oct, 12:00 | Approved |
| Amara Okafor | Unapproved bonus | $500 | 9 Oct, 16:00 | Pending |
| Amara Okafor | Rejected claim | $250 | 8 Oct, 12:00 | Rejected |
| Zara Bello | Next period project earnings | $850 | 12 Oct, 08:00 | Pending |

Pay date: **13 October 2026, 09:00 UTC**. It covers earnings from **5 October 00:00 UTC (included) to 12 October 00:00 UTC (excluded)**. The processing button simulates that pay date; no calendar wait is needed. All amounts are USD. Payment records are local test data; no real funds move.

## Steps to reproduce

1. Open `http://127.0.0.1:4175/earnings`. In **Record earnings**, enter each of the seven Test data rows as **Pending approval** using its employee, description, amount and UTC earning date/time.
2. On Amara's **Rejected claim** ($250), click **Reject earnings** and confirm. Click **Approve earnings** for the four rows whose Final status is Approved. Leave the other two Pending. Check four Approved, two Pending and one Rejected record.
3. Open **Pay runs** from the left navigation. Set **Pay date** to 13 October 2026. Check **Approved pay: $4,350**, **Recorded pay: $0** and one pending approval in this period.
4. Click **Pay on Tuesday 09:00 UTC**, then the same button in the confirmation dialog.
5. Compare **Recorded pay** and **Employee breakdown** with the approved amounts. Open **Payments → View receipt** for Amara and inspect **Included earnings**, including each earning's approval status.
6. Open **Overview** with 13 October selected and compare its recorded total. Stop after inspection; do not retry payroll.

## Expected result

Three payments total $4,350: Amara $1,500, Daniel $2,000 and Zara $850. The $500 Pending bonus and $250 Rejected claim remain unpaid; their statuses do not change. Zara's next-period $850 earning is excluded.

## Actual result

Three payments total $5,100: Amara $2,250, Daniel $2,000 and Zara $850. Amara's receipt includes the $500 Pending bonus and $250 Rejected claim, even though those statuses are unchanged. Zara's next-period earning is correctly excluded.

## Evidence

- **Buggy execution:** [TC01 functional results](../../Buggy%20build/Functional%20testing/functional-testing-results.md), recorded 20 October 2026 UTC; build `mustpayroll-0.2.0-faulty-f4ce4b794698`.
- **Fix verification:** [TC01 fixed results](../../Fixed%20build/Functional%20testing/functional-testing-results.md), same inputs and expectations; recorded 20 October 2026 UTC; build `mustpayroll-0.2.0-fixed-4c4c2fec65d0`. The fixed run recorded $4,350 and excluded Pending, Rejected and next-period earnings.
