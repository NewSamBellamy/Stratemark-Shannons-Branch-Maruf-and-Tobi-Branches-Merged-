# Recommended next steps

## 1. Product-owner visual acceptance

Open the staged web artifact and test the following flows:

1. New Deck → start research → minimize/expand the research stage.
2. Research stage → Live log and Market Brief/grounded updates.
3. Deck → More → Ask AI and Compare cards.
4. Deck → Expand deck → select multiple passes → run them in parallel.
5. Deck → More → Insight, Vice, Culture, Barrier to Entry.
6. Open a signal card → page through key points → inspect source/Ask AI.
7. Company dashboard → Team & Org Chart → click a person → Dig deeper.
8. Company dashboard → Live Landing, History, Products & Roadmap, and back navigation.
9. AI panel → Wide, Full, PIP, Left, Right.
10. Deck Settings → change Daily / 2x Daily / Every 3 days / Weekly / Monthly.

Record failures by route, action, expected behavior, actual behavior, and screenshot/video timestamp.

## 2. Demo catalog build

Do not copy or multiply the current Frontier fixture without verifying it. Build a catalog schema with:

- market name and thesis
- deck ID and last-verified timestamp
- company, infrastructure, distribution, insight, vice, culture, and barrier cards
- source URL and source title for every hard-baked claim
- logo URL plus monogram fallback status
- dashboard payload and dashboard source metadata
- freshness/verification status

Start with Frontier AI Labs because the existing snapshot is closest to that use case, then add nine diverse markets. Require a minimum of 15–20 companies per deck or explicitly document why a market has fewer credible entities.

## 3. Refresh/cron architecture

Current cadence controls refresh while the app is open. Production needs a server-side scheduler that:

- runs daily, twice daily, every three days, weekly, or monthly
- queues one market/deck at a time per account to respect quota
- refreshes each card and dashboard tab according to evidence freshness
- detects changed or contradicted claims
- runs a second verification search before replacing an existing value
- records old value, new value, citations, verification timestamp, and change reason
- surfaces a change digest to the user

## 4. Production configuration

Configure Firebase Auth, Firestore/cloud persistence, Gemini API access, Paddle checkout, Google Drive export, Sentinel, and cron execution in the target deployment environment. Never put credentials in Git or this handoff archive.

## 5. Remote branch handoff

After product-owner acceptance:

```bash
git switch launch/integration-ui-cycle
git push -u origin launch/integration-ui-cycle
```

The sandbox currently has no GitHub HTTPS write credential, so this final push must be done after GitHub write access is available. Do not push until the final visual acceptance passes.
