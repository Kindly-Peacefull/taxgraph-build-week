# Submission notes

## Tagline

Turn a cross-border AI sale into a source-backed map of tax touchpoints, missing facts, evidence, and professional-review questions.

## Problem

Small software and AI teams often sell a single commercial package that actually mixes automated access, hosting, implementation, support, training, and software rights. The tax analysis can change with the composition of the service and the customer facts, before a rate calculation is even meaningful.

## Target users

Founders, finance teams, accountants, tax advisers, and compliance professionals preparing a Serbia-to-EU software or AI sale.

## Solution and differentiator

TaxGraph decomposes the transaction, preserves provenance and contradictions, evaluates a deliberately narrow R1–R12 rule pack, and exposes every substantive claim through an exact official excerpt. It maps decisions and evidence; it does not issue a final tax opinion.

TaxGraph works before tools in adjacent categories: calculation and compliance engines such as Avalara, Anrok, and Sphere operate after a transaction is classified; research assistants such as Blue J and azta answer cited practitioner questions once the user knows what to ask; and merchants of record such as Paddle and Lemon Squeezy replace the seller for B2C. TaxGraph instead decomposes a mixed AI deal, identifies missing facts, and maps source-gated touchpoints before the deal is signed.

## Planned business model

The roadmap is a white-label intake tool for accounting and tax firms: a client describes a deal in their own words, and the firm receives a structured adviser brief for professional review. Possible pricing is per brief or per seat. This is a planned model only; TaxGraph does not claim current customers or commercial adoption.

## How it works

The user loads or enters a transaction and may paste a contract excerpt. GPT-5.6 performs schema-constrained normalization and service decomposition on the server. Deterministic TypeScript code evaluates the fixed rules, enforces source review state, builds touchpoints, and reruns instantly when the user answers a missing-fact question.

## Codex usage

Codex is being used for architecture, implementation, tests, source-pack integration, safety gates, UI, documentation, and submission preparation. The primary task must be retained and its Session ID must not be fabricated.

## Architecture

Next.js App Router, TypeScript, Zod, the official OpenAI SDK, a typed R1–R12 engine, server-only OpenAI and VIES adapters, Vitest, and local typed demo fixtures. No database is required for the MVP.

## Source integrity

Legal and tax claims refer only to the supplied source pack. Exact excerpts are rendered without model rewriting. Every current source remains pending human review and therefore supports draft research output only.

## GPT-5.6 usage

The live path uses the model ID configured in `OPENAI_MODEL`; no model identifier is guessed or hard-coded. GPT does not create or modify tax rules and cannot elevate source authority. The production route returned HTTP 200 for the France B2C, Germany B2B and free-input smoke cases.

## Limitations and roadmap

The MVP supports only a Serbian seller and France B2C / Germany B2B demo scenarios for a Managed AI Customer Support Assistant. It does not calculate definitive tax, file returns, or replace qualified review. Future work may add Kazakhstan and Kyrgyzstan rule packs, founder residence, multi-company structures, payroll, dividends, intercompany services, financing, transfer pricing, treaty networks, and regulatory monitoring.

## Links

- Repository: `https://github.com/Kindly-Peacefull/taxgraph-build-week`
- Demo: `https://taxgraph-build-week.vercel.app`
- Video: `________________`
- Codex Session ID: `________________`

## Verified MVP status

- Both typed demo scenarios use the production schemas, deterministic engine, citation gate, and UI.
- The public deployment passed both fixture paths, all five views, the exact-source drawer, the no-GPT rerun and Germany fixture metadata.
- The France location-evidence answer reruns the engine without GPT and highlights the changed touchpoint.
- The Germany VIES result is visibly labelled as a fixture and includes safe audit metadata.
- The server-only OpenAI Structured Outputs path is live in production; France B2C, Germany B2B and free input each returned HTTP 200 in live normalization mode.
- The official VIES `POST /check-vat-number` operation is confirmed and enabled in production. A synthetic number returned a masked live `invalid` result; the fixture and unavailable states remain distinct.
- The test suite currently passes 61/61 tests across 12 files, and the Next.js production build passes.
- Source excerpts are exact and all remain pending qualified human review.
