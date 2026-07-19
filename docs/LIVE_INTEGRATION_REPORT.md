# Live integration report

Verified locally on 2026-07-19 against the Next.js 16.2.10 production build. The local environment file was ignored by Git and its contents were not printed or persisted in this report.

## OpenAI live path

- The server detected both required variables without printing their values.
- The first real route run failed before generation because Structured Outputs requires every field in the JSON schema to be required. `missingFactQuestions[].options` is now a required array in the model-only schema; ordinary domain objects remain backward compatible.
- A temporary invalid credential was safely reduced to `OPENAI_AUTHENTICATION_ERROR`, without returning the provider detail or retrying the non-retryable request. After the credential was corrected, the route reached successful structured generation.
- The first valid generation revealed a deterministic-engine edge case: France R1 could be active while the live-normalized EU-establishment fact remained unknown, leaving R3 unresolved. The reporting touchpoint now remains `Requires verification` with S9 attached, and a regression test covers that exact live state.
- `reasoning.effort` is set to `low`. The final usage confirms that the 6,000-token ceiling is sufficient for the current schema.

Final sanitized results:

| Scenario    | HTTP / mode    | Service decomposition                                                       | Missing facts / typed questions                                                                               | Token usage                            |
| ----------- | -------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| France B2C  | `200` / `live` | SaaS access, configuration, hosting, human support, training                | 4 / 4; customer-location evidence, software-rights details and physical presence                              | 919 input + 1,937 output = 2,856 total |
| Germany B2B | `200` / `live` | configuration, custom integration, hosting, human support, software licence | 9 / 9; VAT/VIES, taxable-person/location/FE, licence rights and delivery facts                                | 928 input + 2,236 output = 3,164 total |
| Free input  | `200` / `live` | SaaS access, custom integration, training, human support                    | 12 / 12; customer status/VAT/location/FE, software rights, automation/human involvement and physical presence | 919 input + 2,828 output = 3,747 total |

France and free input returned no contradictions; Germany returned one preserved contradiction for reviewer resolution. VIES was intentionally disabled during these GPT tests, so all three returned `not_checked` rather than conflating model verification with the separately tested live VIES adapter.

`scripts/live-gpt-smoke.mjs` contains the three synthetic cases and validates form-value preservation, live normalization mode, minimum component counts and at least one typed missing-fact question.

The route uses the official Responses API Structured Outputs helper, sets `store: false`, disables SDK-level retries and applies `max_output_tokens` on every call. OpenAI's official [Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs) documents schema adherence and the incomplete-output risk when a token limit is reached.

## API rate limiting and input budgets

Defaults:

- `/api/analyze`: 10 requests per minute per client and warm server instance.
- `/api/vies`: 30 requests per minute per client and warm server instance.
- OpenAI: 6,000 maximum output tokens per call, clamped to 1,024–12,000.
- Model-bound free text plus contract text: 16,000 characters.

With both route limits temporarily set to two, the production server returned:

- analyze fixture requests: HTTP `200`, `200`, `429`;
- invalid VIES-body requests: HTTP `400`, `400`, `429`;
- the final responses included `RateLimit-Limit: 2`, `RateLimit-Remaining: 0` and `Retry-After: 60`.

The in-process limiter is a defense-in-depth layer, not a distributed counter. Before a billable OpenAI key is added to Vercel, publish a global fixed-window IP rule for `/api/analyze` in Vercel WAF. Vercel's official [WAF rate-limiting documentation](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting) states that fixed-window rules are available on all plans.

## Official VIES REST and fallback

- Canonical source S10 remains unchanged.
- The current European Commission [`swagger_publicVAT.yaml`](https://ec.europa.eu/assets/taxud/vow-information/swagger_publicVAT.yaml) declares `POST /check-vat-number`, `operationId: checkVatNumber`, request properties `countryCode` and `vatNumber`, and a boolean `valid` response.
- A live `OPTIONS` request to `https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number` returned HTTP 200 and `Allow: POST,OPTIONS`.
- A real server-side POST using a synthetic German number returned HTTP 200 from TaxGraph with `status: invalid`, `liveOrFixture: live`, no error code and a masked number.
- A forced non-official endpoint override returned HTTP 200 from TaxGraph with `status: unavailable`, `liveOrFixture: unavailable`, `VIES_ENDPOINT_NOT_ALLOWED` and a masked number; no request was sent to the unapproved host.
- Unit tests also cover an official-service HTTP 503 response, which degrades to `unavailable` with `VIES_HTTP_503`.

## Regression result

- Prettier: passed.
- ESLint: passed.
- TypeScript: passed.
- Vitest: 36/36 passed across 6 files.
- Next.js production build: passed.
- Live GPT smoke: 3/3 scenarios passed.
