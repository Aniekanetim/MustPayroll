# QA Portfolio

This portfolio presents three case reports focused on identifying defects, investigating their causes and verifying lasting corrections. Each report sets out the business context, what I found, the steps I took, what engineering changed and how I checked the outcome.

## Case 1: Correct wallet address, wrong blockchain

**Role:** Software Quality Assurance Engineer, Octav — July 2023–December 2024.

### Context and finding

At Octav, I encountered an issue where the correct chain was selected, but transaction tracking queried another chain. The wallet address was correct; the application did not respect the selected network. That distinction mattered because the same address can have different transactions on different blockchains.

I reproduced the issue with Base selected while the application queried BNB Smart Chain (BSC). A successful HTTP response contained valid records, but those records belonged to the wrong network.

### How I investigated

1. I repeated the tracking request with the same wallet, date range and filters. I recorded the selected network and response so that a change in search criteria could not explain the difference.
2. I compared the returned history with network-specific reference transactions. A Base-only transaction was missing, while BSC-only activity appeared. This gave me a concrete expected-versus-actual difference to investigate.
3. I inspected the outgoing application request. It carried Base's chain ID, 8453. I then checked the identity of the provider used for that same query through `eth_chainId`; it reported BSC's chain ID, 56. This located the mismatch after request construction, before transaction retrieval.
4. I traced the request through the client resolver with engineering. The selected chain reached the resolver, but it reused a default BSC client. I also checked the cache identity and the handling of responses returned after a network switch, because those paths could preserve incorrect history after the resolver was corrected.
5. I documented the selected chain, request chain ID, effective provider chain ID and conflicting transaction records in the defect report. I gave engineering the repeatable sequence and defined the pass condition: selected network, provider identity and returned records had to agree.

### Engineering correction

Engineering changed provider resolution to use the selected chain and added a network-identity check. Cache identity included chain and wallet, and an older response could no longer replace the results for a newer network selection. I owned the reproduction evidence and verification expectations; engineering owned the application changes.

### How I verified the fix

1. I repeated the original request in the controlled test environment. With Base selected, the request and provider both identified Base, the Base reference transaction appeared, and BSC-only activity was excluded.
2. I switched from Base to BSC and back without clearing the cache. Each selection returned its own network's records for the same wallet. This checked the recovery path as well as the first request.
3. I delayed a BSC response, switched to Base, and then allowed the older response to finish. I checked that it did not overwrite the Base results.
4. I deliberately configured a provider mismatch. The application reported the mismatch instead of displaying another network's data as a successful result. I included the network-consistency and switching cases in the regression coverage.

### Outcome

My verification confirmed that the selected network was preserved throughout the request and display flow. The regression checks detected a mismatch through chain identity and transaction content, so an HTTP 200 response could no longer satisfy the check by itself.

## Case 2: Borrowing debt omitted from portfolio value

**Role:** Software Quality Assurance Engineer, Octav — July 2023–December 2024.

### Context and finding

At Octav, I investigated a discrepancy between a portfolio's displayed net asset value (NAV) and its assets minus liabilities. For controlled reproduction and verification, I used a snapshot containing USD 100,000 in recognized assets and USD 40,000 in variable-rate borrowing debt, but the application displayed NAV of USD 100,000. The expected NAV was USD 60,000.

The asset total was already deduplicated and included borrowed proceeds still held in the portfolio. The investigation therefore needed to establish where the liability disappeared, rather than subtracting the borrowed proceeds from assets a second time.

### How I investigated

1. I recorded the wallet, network, synchronization reference, blockchain block and price basis used for the displayed valuation. I kept those references consistent across the comparisons so that a newer balance or price could not explain the mismatch.
2. I checked the protocol's supplied balances and current borrowing debt, normalized token decimals, and converted both sides to the same valuation currency. The protocol data still contained the USD 40,000 liability in the verification snapshot.
3. I compared the protocol response with the normalized positions and then the aggregate NAV response. The liability existed in the protocol response but had no corresponding normalized position. The aggregate consequently received assets without the debt.
4. I traced that boundary with engineering and identified the adapter mapping that retained asset positions but omitted the borrowing position. I documented the three checkpoints, the USD 100,000 actual value and the USD 60,000 expected value, giving engineering a specific mapping defect to correct.

### Engineering correction

Engineering mapped borrowing debt as a liability, identified by chain, market, asset, user and position type. Synchronization updated an existing position instead of appending another copy, and NAV aggregation subtracted the liability once. A failed debt lookup marked the valuation incomplete rather than turning missing data into zero debt.

### How I verified the fix

1. I replayed the original snapshot with the same price basis. I checked the normalized liability, the aggregate response and the displayed NAV. All three agreed: USD 100,000 in assets minus USD 40,000 in debt produced USD 60,000 NAV.
2. I repeated synchronization without changing the source data. I checked that one liability remained and NAV stayed at USD 60,000. This detected a fix that inserted debt correctly but duplicated it on later synchronization.
3. I tested a USD 10,000 repayment from recognized cash. Assets fell to USD 90,000 and debt fell to USD 30,000; NAV remained USD 60,000 before fees or additional interest.
4. I reset to the original snapshot and tested full repayment. Assets became USD 60,000 and debt became zero. I checked that the old liability did not remain in the valuation.
5. I simulated a failed debt lookup. The valuation was identified as incomplete, rather than reporting the asset total as a fully verified NAV. I retained these missing-debt, repeated-sync, repayment and lookup-failure checks as regression conditions.

### Outcome

My verification confirmed that the liability was counted once, the correct NAV was preserved across repeated synchronization and repayment, and a genuine zero debt balance was distinguished from unavailable debt data. My QA contribution was the reconciliation, defect evidence and fix verification; engineering owned the application correction.

## Case 3: Retried bet settlement credits the wallet twice

**Role:** Technical Support Engineer, Bet9ja / KC Gaming Networks — September 2021–August 2022.

### Context and finding

At Bet9ja / KC Gaming Networks, I investigated a settlement mismatch caused by a repeated credit. For controlled reproduction, I used an NGN 20,000 return and a wallet holding NGN 5,000 before the return, with stake processing already complete. One credit should have produced NGN 25,000, but the wallet showed NGN 45,000 after settlement recovery.

My support responsibility was to reconcile the customer's entitlement with the settlement and wallet records, reproduce the issue safely, and escalate actionable evidence to engineering.

### How I investigated

1. I collected the bet reference, wallet reference, accepted settlement revision and incident window. I confirmed that NGN 20,000 was the return to credit and that the stake had already been accounted for.
2. I compared the displayed wallet balance with the ledger. I found two NGN 20,000 credits for the same bet, revision and settlement action. This established a duplicate ledger entry, rather than a stale display or a different authorized adjustment.
3. I aligned the delivery attempts with the ledger timestamps. The first credit committed before completion was acknowledged; a timeout then triggered redelivery. The second attempt created another credit for the same business operation.
4. I reproduced that sequence in an isolated integration sandbox by replaying the same settlement operation. I kept the business identity unchanged even when the transport attempt differed, because a new delivery attempt did not create a new entitlement.
5. I escalated the repeated payload identity, delivery sequence, ledger references and expected-versus-actual balances to engineering. The investigation showed that retry handling did not durably recognize an already committed settlement operation.

### Engineering correction

Engineering introduced a unique business-operation identity covering the bet, settlement revision and action. The operation record, ledger credit and wallet update committed in one transaction before acknowledgement. A replay recognized the saved operation instead of crediting again.

### How I checked the fix

1. I reset the sandbox wallet to NGN 5,000 and processed the settlement once. I checked for one NGN 20,000 ledger credit and an NGN 25,000 wallet balance.
2. I replayed the identical settlement. I compared the ledger reference, credit count and wallet balance with the first result. The original credit remained, no second credit appeared, and the balance stayed at NGN 25,000.
3. I repeated the lost-acknowledgement sequence: the credit committed, the acknowledgement failed, and the operation was delivered again. I checked that recovery preserved the same ledger entry and balance.
4. I reviewed QA's simultaneous-delivery check against the same ledger expectations. Engineering and QA owned that controlled concurrency verification; I used its results to confirm the support resolution addressed duplicate processing.
5. I separately checked the previously overcredited sandbox wallet after an authorized NGN 20,000 compensating entry. Its balance fell from NGN 45,000 to NGN 25,000, while both original credits and the correction remained in the ledger. I passed the reproduction and resolution checks into the support handoff.

### Outcome

My recovery checks confirmed one NGN 20,000 credit and an NGN 25,000 balance across the retry scenarios. My contribution remained within technical support: investigation, reconciliation, safe reproduction, escalation and resolution checks. Engineering owned settlement-code changes, and QA owned formal regression and release verification.
