# TaxGraph demo script (under three minutes)

Use the deterministic fixtures for the recorded walkthrough so the presentation remains reproducible and comfortably under three minutes. Live GPT and live VIES are production-verified but do not need to be invoked during the recording.

**0:00–0:20 — Problem.** A product sold as one “AI assistant” can combine automated software, implementation, support, and training. TaxGraph maps the questions before a cross-border sale instead of pretending one rate answers everything.

**0:20–0:40 — Load the mixed product.** Open TaxGraph and load the France B2C demo. Point out the Serbian seller, consumer customer, and optional contract excerpt.

**0:40–1:00 — Decomposition and contract facts.** Show the service components and the known, inferred, missing, and conflicting fact groups with provenance.

**1:00–1:25 — France B2C touchpoints.** Open Tax Touchpoints. Show the preliminary ESS, destination, evidence, and reporting-route rows. Emphasize that every legal claim is pending human review.

**1:25–1:50 — Compare Germany B2B.** Open Scenario Comparison. Show the readable component chips, changed customer facts, affected rules, German B2B place-of-supply path, reverse-charge checklist, and professional-review flags.

**1:50–2:10 — Answer a missing fact.** Return to Overview, answer the location-evidence question, and show the rule engine rerun and changed touchpoint highlight without another GPT call.

**2:10–2:30 — Open evidence.** Open a source footnote to display its exact official excerpt. Show the clearly labelled Germany VIES fixture and audit timestamp. Mention that the official live VIES adapter is enabled separately in production and never relabels the fixture as live.

**2:30–2:45 — Explain the architecture.** GPT-5.6 normalizes and decomposes on the server and has passed three production smoke cases. Typed code owns R1–R12, source gates, citations, diffs, VIES states, and reruns. Fixture mode uses the same schemas and engine.

**2:45–2:50 — Close.** TaxGraph turns a vague cross-border AI sale into a reviewable pre-sale evidence map, with every legal source still visibly pending qualified human review.
