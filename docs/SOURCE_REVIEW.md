# TaxGraph Source Review

Register prepared by ChatGPT (research assistant) on 2026-07-19. Verification of the
excerpts against the official sources was performed by the **project author** (tax and
accounting consultant, 15 years in practice) on 2026-07-20. Research support only; not
tax or legal advice.

This register accompanies `data/sources/sources.json` and `data/rules/rules.json`.
All fourteen records are `approved` and carry `humanReviewStatus: "reviewed"` in the
canonical data. S3 and S12 received corrected `confirms` wording per the review notes
below; the corrected wording was re-checked and confirmed by the project author on
2026-07-20.

## Material corrections made during source validation

1. **R3 / S9 — OSS is optional.** A Serbian supplier without an EU establishment owes
   destination VAT on covered EU B2C electronically supplied services from the first
   sale, but may choose the non-Union OSS instead of separate local registrations. The
   EUR 10,000 threshold does not apply to this fixture.
2. **R7 / S12 — correct German provision.** For a Serbian supplier, the relevant
   national reverse-charge path is § 13b Abs. 2 Nr. 1 together with Abs. 5 Satz 1 UStG.
3. **R11 / S13 — official Serbian text found and verified** in the consolidated VAT Act.
4. **R12 / S14 — treaty verified, classification unresolved.** Article 13 of the
   Germany–Yugoslavia treaty contains the royalty rule; whether a specific software
   payment is a royalty remains a professional-review question.
5. **S3, S12 `confirms` reworded** (2026-07-20) per review: S3 now states the Article 45
   general rule neutrally; S12 now states the § 13b(2)(1) and § 13b(5) conditions
   expressly. Excerpts themselves were confirmed verbatim.

## Review register

| ID | Source and pinpoint | Excerpt status | Decision | Date |
|---|---|---|---|---|
| S1 | Directive 2006/112/EC (consolidated), Art. 58(1)(c) | Verbatim confirmed | approved | 2026-07-19 |
| S2 | Directive 2006/112/EC, Art. 44 | Verbatim confirmed | approved | 2026-07-19 |
| S3 | Directive 2006/112/EC, Art. 45 | Verbatim confirmed; `confirms` reworded and re-checked | approved | 2026-07-20 |
| S4 | Directive 2006/112/EC, Art. 196 | Verbatim confirmed | approved | 2026-07-19 |
| S5 | Directive 2006/112/EC, Art. 226(4), (11a) | Verbatim confirmed (disclosed ellipsis) | approved | 2026-07-19 |
| S6 | Directive 2006/112/EC, Annex II | Verbatim confirmed | approved | 2026-07-19 |
| S7 | Impl. Regulation 282/2011, Art. 7(1), 7(3)(i), (j) | Verbatim confirmed | approved | 2026-07-19 |
| S8 | Impl. Regulation 282/2011, Art. 24b(d), 24f | Verbatim confirmed | approved | 2026-07-19 |
| S9 | European Commission OSS portal (three passages) | Verbatim confirmed | approved | 2026-07-19 |
| S10 | European Commission VIES technical information | Verbatim confirmed | approved | 2026-07-19 |
| S11 | French BOFiP BOI-TVA-LIQ-20 ¶1; CGI Art. 278 | Verbatim confirmed (whitespace normalised) | approved | 2026-07-19 |
| S12 | UStG § 13b Abs. 2 Nr. 1, Abs. 5 S. 1 | Verbatim confirmed; `confirms` reworded and re-checked | approved | 2026-07-20 |
| S13 | Serbian VAT Act, čl. 12(4), 12(6)(7)(12) | Verbatim confirmed against consolidated text | approved | 2026-07-19 |
| S14 | Germany–Yugoslavia treaty Art. 13(1)–(3); BMF continuation notice | Verbatim confirmed | approved | 2026-07-19 |

## Additional independent review

An additional, non-binding professional review of the project's methodology and
outputs was performed by **Maria S. Chumak** — certified internal auditor (ICFM
diploma), President of the Eurasian Association of Tax and Financial Consulting.

Scope note: Ms. Chumak is not a specialist in German, French or Serbian tax law, and
her review does not constitute verification of the legal sources above. Her assessment
concerned the product's methodology, honesty controls and practical usefulness. Her
overall impression was highly positive, and she expressed interest in adopting the
system in her own advisory practice as it develops.

## Reviewer workflow

For each row: open the official URL and pinpoint stored in `data/sources/sources.json`;
compare the official text with `excerpt` character-for-character (whitespace
normalisation only); check surrounding provisions, effective date and territorial
scope; confirm `confirms` and `linkedRules` do not go beyond the source; record the
decision and date; only then change `humanReviewStatus` in the canonical data.

## Release gate

No pending item may be represented as reviewed, verified, authoritative or final. A
source with `status: access_failed` or `status: not_found` must disable every linked
substantive rule. An approved source does not remove the product-wide requirement for
professional review where the rule output says so.
