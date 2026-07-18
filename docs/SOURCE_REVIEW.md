# TaxGraph Source Review

Prepared by ChatGPT (research assistant) on 2026-07-19; all entries pending human review. Research support only; not tax or legal advice.

This register accompanies `data/sources/sources.json` and `data/rules/rules.json`. All fourteen records have a verbatim excerpt from an official source and `status: found`. Every record remains `humanReviewStatus: pending` until a qualified reviewer checks the excerpt, its context, currency, translation where relevant, and the linked rule. Pending sources may support draft/research output only and must be labelled **Pending human review** in the product.

## Material corrections made during source validation

1. **R3 / S9 — OSS is optional.** A Serbian supplier without an EU establishment owes destination VAT on covered EU B2C electronically supplied services from the first sale, but may choose the non-Union OSS instead of separate local registrations. The EUR 10,000 threshold does not apply to this fixture.
2. **R7 / S12 — correct German provision.** For a Serbian supplier, the relevant national reverse-charge path is § 13b Abs. 2 Nr. 1 together with Abs. 5 Satz 1 UStG. Abs. 1 concerns a different supplier-establishment case and should not be used for this fixture.
3. **R11 / S13 — official Serbian text found.** R11 no longer needs to be hard-disabled merely because the source was unavailable. It must still be source-gated: disable it if S13 later becomes unavailable; while review remains pending, expose only a draft, non-authoritative conclusion.
4. **R12 / S14 — treaty verified, classification unresolved.** Article 13 of the Germany–Yugoslavia treaty contains the royalty rule and the German BMF states that the treaty continues to apply to Serbia. Whether a specific software payment is a royalty remains a professional-review question.

## Review register

| ID | Official source and pinpoint | What the excerpt confirms | Excerpt status | Reviewer check | Decision | Date |
|---|---|---|---|---|---|---|
| S1 | EUR-Lex, Directive 2006/112/EC, Art. 58(1)(c) | EU B2C ESS place of supply follows the consumer. | Verbatim found | Confirm consolidated version and scope of Art. 58. |  |  |
| S2 | EUR-Lex, Directive 2006/112/EC, Art. 44 | B2B general-rule services follow the taxable customer or relevant fixed establishment. | Verbatim found | Confirm no special place-of-supply rule overrides Art. 44 in the fixture. |  |  |
| S3 | EUR-Lex, Directive 2006/112/EC, Art. 45 | B2C general rule follows the supplier, subject to specific exceptions. | Verbatim found | Confirm R10 stays a review flag and does not overgeneralise Art. 45. |  |  |
| S4 | EUR-Lex, Directive 2006/112/EC, Art. 196 | The taxable customer is liable under reverse charge for qualifying Art. 44 services. | Verbatim found | Confirm supplier is not established in the relevant Member State. |  |  |
| S5 | EUR-Lex, Directive 2006/112/EC, Art. 226(4), (11a) | Reverse-charge invoice fields include the customer VAT ID and “Reverse charge”. | Verbatim found | Check all other invoice fields applicable to the concrete transaction. |  |  |
| S6 | EUR-Lex, Directive 2006/112/EC, Annex II | Indicative ESS list includes software, websites, online information and databases. | Verbatim found | Confirm list is illustrative and classify each component separately. |  |  |
| S7 | EUR-Lex, Implementing Regulation 282/2011, Art. 7(1), 7(3)(i), (j) | ESS requires essential automation, minimal human intervention and IT dependence; listed human services are excluded. | Verbatim found | Confirm mixed-service analysis does not turn human involvement into an automatic exclusion. |  |  |
| S8 | EUR-Lex, Implementing Regulation 282/2011, Art. 24b(d), 24f | Residual location presumption normally requires two non-contradictory evidence items. | Verbatim found | Confirm the one-item EU-established-supplier exception does not fit the Serbian fixture. |  |  |
| S9 | European Commission OSS portal, Background / taxable person / EUR 10,000 threshold sections | Non-Union OSS eligibility, optional nature, destination taxation, no threshold for the fixture, quarterly returns. | Verbatim found | Confirm selected compliance route: non-Union OSS or local registrations. |  |  |
| S10 | European Commission VIES Technical Information | Official REST and SOAP interfaces exist for VAT-number validation. | Verbatim found | Recheck current OpenAPI/WSDL, production route, availability and logging/privacy design before release. |  |  |
| S11 | French BOFiP, BOI-TVA-LIQ-20 ¶1; CGI Art. 278 | Metropolitan France standard VAT rate is 20%. | Verbatim found | Confirm rate and territorial/supply-specific exceptions on the analysis date. |  |  |
| S12 | Germany, UStG § 13b Abs. 2 Nr. 1 and Abs. 5 Satz 1 | German recipient liability for qualifying services from a Serbian supplier. | Verbatim found | Confirm recipient status, German place of supply and absence of an establishment exception. |  |  |
| S13 | Serbian Tax Administration, VAT Act Art. 12(4), 12(6)(7)(12) | Serbian B2B general rule and B2C ESS exception follow the foreign recipient in the fixture. | Verbatim found | Native-language reviewer to confirm Serbian text, amendment 109/25 effective dates, and both branches of R11. |  |  |
| S14 | German BMF, treaty continuation notice and treaty Art. 13(1)–(3) | Royalty allocation and treaty ceiling; treaty continues to apply to Serbia. | Verbatim found | Treaty specialist to classify the exact software rights and verify domestic WHT procedure and beneficial ownership. |  |  |

## Reviewer workflow

For each row:

1. Open the exact official URL and pinpoint stored in `data/sources/sources.json`.
2. Compare the official text with `excerpt` character-for-character, allowing only whitespace normalisation.
3. Check surrounding provisions, effective date, territorial scope and any cross-references.
4. Confirm that `confirms`, `linkedRules` and each rule condition do not go beyond the source.
5. Record `approved`, `rejected` or `needs changes`, reviewer name/initials and date. Only then change `humanReviewStatus` in the source and rule data.

## Release gate

No pending item may be represented as reviewed, verified, authoritative or final. A source with `status: access_failed` or `status: not_found` must disable every linked substantive rule. An approved source does not remove the product-wide requirement for professional review where the rule output says so.
