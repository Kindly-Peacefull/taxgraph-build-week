# TaxGraph for Software & AI Services

> TaxGraph converts a cross-border software or AI transaction into a source-backed map of tax touchpoints, missing facts, required documents, and questions that need professional review.

TaxGraph is a Work & Productivity project built for OpenAI Build Week 2026. It helps a small software or AI company structure a pre-sale tax review before a cross-border contract or invoice is finalized.

**Research boundary:** TaxGraph is a research and scenario-mapping tool. It does not provide a final tax opinion, calculate definitive tax payable, or replace review by a qualified professional.

## Why this exists

A commercial product called an “AI assistant” can combine SaaS access, hosting, initial configuration, custom integration, human support, staff training, and software rights. Those components and the customer facts can create different preliminary VAT, evidence, invoicing, reporting, and treaty-review questions.

TaxGraph works one step before a tax calculator. It decomposes the deal, preserves known and missing facts, exposes contradictions, runs a narrow deterministic rule pack, and makes every substantive claim traceable to the supplied official-source excerpt.

Target users are founders, finance teams, accountants, tax advisers, and compliance professionals preparing an international software or AI sale.

## Supported MVP scope

- Seller: one Serbian company.
- Product: Managed AI Customer Support Assistant.
- Components: SaaS access, setup, custom integration, hosting, recurring human support, staff training, and an optional software-rights signal.
- Destination scenarios: France B2C and Germany B2B.
- Rule pack: exactly R1–R12 from the canonical implementation brief.
- Output: research touchpoints, missing facts, evidence, checklist items, provenance, and professional-review questions.

TaxGraph does not support every country, calculate final VAT or corporate income tax, file returns, upload documents, process OCR/PDFs, determine a permanent establishment conclusively, or recommend tax minimization.

## Demo scenarios

### France B2C

A Serbian company sells a recurring standard AI assistant subscription to a private consumer in France. The fixture contains a highly automated SaaS component, limited setup, hosting, human support, and staff training. One customer-location evidence item is intentionally missing so the reviewer can answer the typed question and watch the deterministic engine rerun without GPT.

### Germany B2B

A Serbian company supplies a German business under a negotiated contract with substantial custom implementation, recurring support, a safely masked VAT ID, a clearly labelled VIES fixture, and a limited software-rights signal. The fixture exposes B2B place-of-supply, reverse-charge, invoice-checklist, and treaty-classification review paths.

## Product workflow

1. Load a typed fixture or complete the guided form.
2. Optionally paste a plain-text contract excerpt.
3. In live mode, GPT-5.6 normalizes free text, extracts description and contract facts into separate provenance channels, decomposes the mixed service, and returns schema-constrained missing-fact questions.
4. Form values remain authoritative; contract provenance is accepted only when contract text was actually supplied, and duplicate form/contract conflicts are collapsed without silently resolving them.
5. Deterministic TypeScript evaluates only R1–R12 and checks every mandatory source.
6. The workspace renders the transaction flow, touchpoint matrix, scenario comparison, checklist, and full trace.
7. A source footnote opens the exact canonical excerpt and review state.
8. A missing-fact answer updates provenance to `user-answered`, reruns the engine synchronously without GPT, and highlights the changed touchpoint.

## Key differentiators

- **Classification before calculation.** Mixed software and human services are decomposed before tax touchpoints are mapped.
- **Model/rule separation.** GPT may structure evidence and suggest preliminary classifications; it cannot create, modify, or elevate a tax rule.
- **Citation gate.** Substantive outputs require known source IDs. Unknown, missing, inaccessible, altered, or authority-incompatible references fail validation.
- **Exact source drawer.** Legal excerpts are rendered from the canonical JSON after NFKC and whitespace-aware exact-match validation, never rewritten by the model.
- **Interactive audit loop.** Missing facts update the normalized transaction with prior-value provenance and rerun the same deterministic engine.
- **Fixture honesty.** Live, fixture, and unavailable VIES/model states are represented separately.

## How TaxGraph differs

| Category                             | Examples               | Focus                                                                          | Works at                            |
| ------------------------------------ | ---------------------- | ------------------------------------------------------------------------------ | ----------------------------------- |
| Tax calculation & compliance engines | Avalara, Anrok, Sphere | registration thresholds, calculation, filing                                   | after the transaction is classified |
| AI tax research assistants           | Blue J, azta           | cited answers to practitioner questions                                        | when you already know what to ask   |
| Merchant of record                   | Paddle, Lemon Squeezy  | takes over B2C sales tax by reselling                                          | replaces the seller for B2C         |
| TaxGraph                             | this project           | decomposes a mixed AI deal, finds missing facts, maps source-gated touchpoints | before the deal is signed           |

## Interface

The application has one input panel and five analysis views:

1. **Overview** — summary, SVG flow, product decomposition, known/missing/conflicting facts, provenance, VIES state, and missing-fact answers.
2. **Tax Touchpoints** — nine rows covering customer status, service classification, place of supply, reverse charge, reporting route, location evidence, invoicing, treaty review, and professional review.
3. **Scenario Comparison** — changed facts, affected R1–R12 rules, and changed touchpoint statuses for France B2C vs Germany B2B.
4. **Checklist** — information, evidence, contract, invoice, and adviser-review actions.
5. **Trace & Sources** — normalization metadata, every rule evaluation, matched/unresolved conditions, source IDs, VIES audit metadata, and all fourteen source records.

## Architecture

```text
Next.js App Router UI
        │
        ├── Demo fixtures ────────────────┐
        │                                 │
        └── POST /api/analyze             │
              └── OpenAI Responses API    │
                  + Zod Structured Output │
                                          ▼
                                  NormalizedTransaction
                                          │
                    ┌─────────────────────┼────────────────────┐
                    ▼                     ▼                    ▼
             R1–R12 engine        citation/source gate   VIES adapter
                    └─────────────────────┼────────────────────┘
                                          ▼
                                    AnalysisResult
                                          │
                              UI · diff · rerun · trace
```

Core modules:

- `lib/domain.ts` — Zod schemas and inferred TypeScript types.
- `lib/source-pack.ts` — immutable adapters for the canonical source and rule JSON.
- `lib/citations.ts` — source, authority, exact-quote, and prohibited-unsourced-claim gates.
- `lib/engine.ts` — transparent typed predicates and output mapping for R1–R12.
- `lib/fixtures.ts` — France B2C, Germany B2B, and VIES demo fixtures.
- `lib/diff.ts` / `lib/rerun.ts` — scenario comparison and user-answer reruns.
- `lib/model-normalization.ts` — model-output schema, form/free-text/contract provenance, form-preserving merge, and deduplicated contradiction detection.
- `lib/vies.ts` — server-only validation adapter, timeout, safe masking, and graceful unavailability.
- `app/api/analyze/route.ts` — server-only OpenAI integration and limited validated retry.
- `app/api/vies/route.ts` — server-only VIES entry point.

No database, authentication, analytics platform, file upload, OCR, microservice, or React Flow dependency is used.

## The R1–R12 limit

The engine refuses to load anything other than R1–R12. The covered topics are:

- R1–R5: France B2C ESS destination, classification, optional non-Union OSS/local route, customer-location evidence, and an illustrative French standard-rate display.
- R6–R9: Germany B2B general rule, preliminary reverse-charge path, invoice checklist, and VIES evidence.
- R10: separate review for preliminarily non-ESS human-delivered B2C components.
- R11: Serbian Article 12 branches represented in the supplied source.
- R12: software-rights and Germany–Serbia treaty Article 13 review question.

If a conclusion is not represented, the UI uses `Not covered by the current MVP rule pack` or requires professional review. Component decomposition never decides single/composite supply treatment.

## GPT-5.6 role

The live path uses the official OpenAI JavaScript SDK, the Responses API, `responses.parse`, `zodTextFormat`, and a Zod schema. The model ID is read only from `OPENAI_MODEL`; the repository does not guess or hard-code an account-specific identifier.

GPT is limited to:

- normalization of free text;
- free-text fact extraction with explicit `free-text` provenance;
- contract-fact extraction with a character range or short exact fragment;
- service decomposition and preliminary classification suggestions;
- missing facts and typed questions material to R1–R12;
- contradictions and uncertainty.

The route attempts a maximum of two validated calls within one configurable 75-second deadline, disables SDK-level retries, limits each call to a configurable output-token budget, and sends `store: false`. The browser stops its own wait after 90 seconds. A refusal, timeout, invalid structured result, or API error is reduced to a safe error code; partial or malformed data is never passed to the rule engine. The fixture remains available without a key.

The live GPT route has been verified both locally and on the production Vercel deployment for France B2C, Germany B2B and a free-input transaction. The production smoke returned HTTP 200 for all three cases, preserved authoritative form values, produced multi-component decomposition and returned typed missing-fact questions. No credential value or full model payload is logged. See [`docs/LIVE_INTEGRATION_REPORT.md`](docs/LIVE_INTEGRATION_REPORT.md).

## Deterministic engine role

Ordinary code owns schemas, provenance, source availability, human-review gates, rule conditions, statuses, claim objects, citation validation, VIES behavior, fixture parity, scenario diffs, user-answer application, touchpoint changes, and trace generation. A missing-fact rerun never calls GPT.

## Citation and provenance model

- `sourceIds` refer only to official legal/tax sources in `data/sources/sources.json`.
- `evidenceRefs` refer to form, contract, fixture, model-inference, VIES, or user-answer evidence.
- Unsourced service UI text is allowed only when it contains no substantive tax conclusion.
- Exact excerpts are canonicalized with Unicode NFKC, non-breaking-space replacement, and repeated-whitespace collapse before comparison.
- An unavailable mandatory source disables its rule.
- A pending source can support visibly labelled draft research only.
- `Likely applicable` or `Likely not applicable` cannot exist without a valid source.

## Source pack and human-review gate

The canonical files supplied by the user are used without substantive modification:

```text
data/sources/sources.json
data/rules/rules.json
docs/SOURCE_REVIEW.md
```

All fourteen sources currently have `status: found` and `humanReviewStatus: pending`. The application therefore displays `Pending human review` and does not represent any source-backed result as reviewed, verified, authoritative, or final. A qualified reviewer must complete `docs/SOURCE_REVIEW.md` and explicitly update the canonical status fields before that can change.

## VIES: live vs fixture

The Germany demo uses a typed `fixture` result with a masked number, stable fixture request ID, timestamp, and evidence reference. It is never presented as live.

The live adapter:

- runs server-side only;
- validates the prefix/basic format locally;
- posts the official `countryCode` / `vatNumber` payload shape;
- applies a configurable timeout;
- returns `valid`, `invalid`, or `unavailable` safely;
- rejects malformed IDs locally as `invalid_format` and does not send them to VIES;
- masks the number sent back to the browser;
- preserves safe request metadata.

Live VIES is opt-in and is enabled on the production deployment. The current official [`swagger_publicVAT.yaml`](https://ec.europa.eu/assets/taxud/vow-information/swagger_publicVAT.yaml) confirms `POST /check-vat-number`, and the verified operation URL is `https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number`. That URL is the built-in default; an optional override is accepted only when it resolves to the same HTTPS host and path. A production request with a synthetic number returned a masked live `invalid` result. Invalid, malformed or unavailable results do not turn a customer into B2C automatically.

## Local setup

Requirements:

- Node.js 22 or newer (the verified build used Node.js 24.14.0).
- pnpm 11.9.0 or a compatible pnpm 11 release.

```bash
git clone https://github.com/Kindly-Peacefull/taxgraph-build-week.git
cd taxgraph-build-week
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Leave the secret values blank to use demo fixtures only.

## Environment variables

```text
OPENAI_API_KEY=
OPENAI_MODEL=
OPENAI_MAX_OUTPUT_TOKENS=6000
OPENAI_TIMEOUT_MS=75000
ANALYZE_RATE_LIMIT_PER_MINUTE=10
ANALYZE_MAX_INPUT_CHARACTERS=16000
NEXT_PUBLIC_DEMO_MODE=true
VIES_LIVE_ENABLED=false
VIES_ENDPOINT_URL=
VIES_TIMEOUT_MS=5000
VIES_RATE_LIMIT_PER_MINUTE=30
```

- `OPENAI_API_KEY`: server-only API key. Never prefix it with `NEXT_PUBLIC_`.
- `OPENAI_MODEL`: GPT-5.6-family model identifier confirmed for the deployment account.
- `OPENAI_MAX_OUTPUT_TOKENS`: per-call Responses API output-token ceiling; clamped to 1,024–12,000.
- `OPENAI_TIMEOUT_MS`: shared deadline for all route-level model attempts; clamped to 60,000–90,000 ms.
- `ANALYZE_RATE_LIMIT_PER_MINUTE`: per-client, per-instance analysis request ceiling; clamped to 1–120.
- `ANALYZE_MAX_INPUT_CHARACTERS`: total ceiling across structured and free-text transaction strings before any model call.
- `NEXT_PUBLIC_DEMO_MODE`: documents fixture-first deployment intent.
- `VIES_LIVE_ENABLED`: must be exactly `true` to permit the live adapter.
- `VIES_ENDPOINT_URL`: optional exact official operation override; leave blank to use the verified built-in URL.
- `VIES_TIMEOUT_MS`: server request timeout.
- `VIES_RATE_LIMIT_PER_MINUTE`: per-client, per-instance VIES request ceiling; clamped to 1–300.

Create `.env.local` yourself. Do not send API keys in chat and do not commit `.env.local`.

## Verification commands

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:run
pnpm build
# with a local production/dev server already running:
pnpm test:live-gpt
```

Current verified local result:

- Prettier: passed.
- ESLint: passed.
- TypeScript: passed.
- Vitest: 63 tests passed in 13 test files.
- Next.js production build: passed with static `/` and dynamic `/api/analyze`, `/api/explain`, and `/api/vies` routes.
- API integration: both routes returned the expected `200/200/429` or `400/400/429` sequence under a two-request test limit; live VIES returned a masked `invalid` result for a synthetic number and a forced endpoint mismatch returned safe `unavailable`.
- Live GPT integration: France B2C, Germany B2B and free input returned HTTP 200 in live normalization mode; each produced multiple service components and typed missing-fact questions within the 6,000-token per-call ceiling.
- Browser smoke: passed for fixture loading, Overview, the 9-row sorted Tax Touchpoints matrix, readable Scenario Comparison component chips, Checklist, Trace & Sources, source drawer, Germany VIES fixture metadata, and the missing-fact rerun.

The tests cover schema failure, separated form/free-text/contract provenance, duplicate contract/form contradictions, generic typed missing-fact answers, user-answer provenance, R6/R7/R9 and R12 reruns, engine-owned rule IDs, form-priority component fields, only-R1–R12 loading, condition matching, unresolved facts, R11/S13 availability and pending gates, source authority, exact excerpts, altered quotes, unsourced conclusion blocking, forged narrative claims, current-analysis source gating, request size/origin/content-type guards, malformed VIES input, endpoint/fallback safety, shared rate-limit windows and safe OpenAI timeout/error classification.

## Demo fixture instructions

1. Run the application with no API key.
2. Select **Load France B2C**.
3. Inspect decomposition and open any `S#` footnote.
4. Answer the location-evidence question and select **Apply & rerun**.
5. Confirm the changed-touchpoint banner states that the rerun used no GPT.
6. Open **Scenario Comparison**.
7. Select **Load Germany B2B**, inspect the VIES fixture, then open Tax Touchpoints and Trace & Sources.

## Vercel deployment

1. Import the GitHub repository into Vercel.
2. Keep the detected Next.js preset and `pnpm build` command.
3. In Vercel Firewall, add a fixed-window IP rule for `/api/analyze` before adding the key; 10 requests per 60 seconds matches the application default. Vercel documents WAF rate limiting as the global deployment layer.
4. Add a separately scoped, valid `OPENAI_API_KEY` and `OPENAI_MODEL` as encrypted server environment variables for the live GPT path.
5. Set `NEXT_PUBLIC_DEMO_MODE=true` so judges have a no-key path.
6. Set `VIES_LIVE_ENABLED=true` only when production use of the confirmed official operation is intended; otherwise keep it `false` and use the labelled fixture/fallback paths.
7. Deploy, run both fixture paths, and repeat the source/rerun checks on the public URL.

The application limiter is deliberately dependency-free and protects each warm server instance. Vercel Functions can scale across instances, so the Hobby-plan global WAF rule is assigned to the billable `/api/analyze` route. The `/api/vies` route retains its 30-per-minute per-client, per-instance limiter because the free plan permits only one custom rate-limit rule. See [Vercel's official rate-limiting guide](https://vercel.com/kb/guide/add-rate-limiting-vercel).

What becomes public: the UI bundle, the fourteen already supplied source excerpts/URLs, rule metadata, fixtures, and documentation. API keys, live server credentials, and pasted contract text must not become public.

All application responses include a Content Security Policy, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin`.

A production deployment is live at [taxgraph-build-week.vercel.app](https://taxgraph-build-week.vercel.app). It keeps the no-key fixture path available, has server-only OpenAI credentials configured, and has live VIES enabled. The public smoke passed both fixtures, all five analysis views, the exact source drawer, the no-GPT rerun, Germany VIES fixture metadata, all three live GPT cases, and a masked live VIES request with a synthetic number. The demo fixtures remain explicitly labelled and do not masquerade as live results.

## Codex contribution and human decisions

Codex implemented the architecture, typed schemas, source adapters, citation gate, R1–R12 engine, fixtures, OpenAI/VIES server routes, UI, tests, browser verification, documentation, and submission materials in the retained primary task.

Human decisions controlled the scope: international software/AI sales; Serbian seller; France B2C and Germany B2B demos; touchpoint mapping instead of final calculation; GPT/deterministic separation; source-backed claims; contract paste rather than upload; no-repeat-GPT missing-fact loop; and Kazakhstan/Kyrgyzstan deferred until after submission.

See `docs/DECISIONS.md` and `docs/BUILD_LOG.md`.

## Safety and limitations

TaxGraph does not promise the lowest tax, recommend hiding income or ownership, suggest sham entities or fabricated expenses, support evasion, generate a final personalized tax opinion, file a return, guarantee compliance, or predict enforcement.

The source pack is research material pending qualified human review. Model output can contain factual classification mistakes despite schema adherence. VIES availability and a valid VAT ID do not alone prove every B2B condition. Single/composite supply treatment, fixed establishments, software-rights classification, withholding procedure, and all special rules outside R1–R12 remain professional-review matters.

### Known implementation limitations at submission

- The dependency-free rate limiter is in memory and protects one warm function instance; only `/api/analyze` has the available deployment-level WAF rate-limit rule on the free plan.
- The VIES adapter currently supports the customer-country prefix used by this MVP and does not resolve a conflicting VAT country prefix as a separate jurisdictional fact.
- Provenance pointers are preserved and displayed, but character ranges and short fragments are not independently verified against the submitted text after model normalization.
- A narrative request can finish after the user has changed workspace state; the client discards a result for a different transaction, but there is no server-side cancellation or cross-tab coordination.
- Workspace branch labels use the MVP's France-consumer / Germany-business heuristic and are not a general B2C/B2B legal classifier.
- The current PostCSS advisory is accepted as low risk for this submission because the application does not process user-supplied CSS; the dependency is intentionally not upgraded during feature freeze.
- The CSP retains `unsafe-inline` for styles required by the current Next.js rendering setup; a nonce-based CSP redesign is deferred.

## Roadmap only

- Kazakhstan and Kyrgyzstan destination packs.
- Founder tax residence and personal taxation.
- Multi-company structures, salaries, dividends, and intercompany services.
- Loans, interest, transfer pricing, and wider treaty-network analysis.
- Regulatory-change monitoring.

None of these are implemented in the MVP.

## Competition materials

- `docs/DEMO_SCRIPT.md` — verified under-three-minute walkthrough.
- `docs/SUBMISSION_NOTES.md` — Devpost-ready narrative and link placeholders.
- `docs/COMPETITION_CHECKLIST.md` — release and submission gates.
- `docs/SOURCE_REVIEW.md` — qualified-review register.

Repository: [Kindly-Peacefull/taxgraph-build-week](https://github.com/Kindly-Peacefull/taxgraph-build-week)  
Demo URL: [taxgraph-build-week.vercel.app](https://taxgraph-build-week.vercel.app)  
Video URL: pending  
Codex `/feedback` Session ID: pending user action

## License and dependencies

TaxGraph is released under the MIT License. See [`LICENSE`](LICENSE).

Runtime dependencies are Next.js, React, Zod, and the official OpenAI JavaScript SDK. Development dependencies are TypeScript, ESLint with the Next.js config, Prettier, and Vitest. Exact versions and integrity hashes are locked in `pnpm-lock.yaml`.
