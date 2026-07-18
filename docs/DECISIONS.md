# Product decisions

| Human decision                                             | Codex recommendation                                                                  | Final decision                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Narrow the product to international software and AI sales. | Build one defensible vertical slice instead of a general tax calculator.              | Accepted: Managed AI Customer Support Assistant only. |
| Use a Serbian seller.                                      | Keep seller facts fixed so the demo can focus on service and customer classification. | Accepted.                                             |
| Demonstrate France B2C and Germany B2B.                    | Make the contrast the main product story and reuse the same analysis pipeline.        | Accepted.                                             |
| Map touchpoints instead of calculating final tax.          | Use cautious statuses, missing facts, and review flags.                               | Accepted.                                             |
| Separate GPT classification from deterministic rules.      | Constrain model output with Zod and never let it author or change R1–R12.             | Accepted.                                             |
| Require source-backed claims and human review.             | Treat pending sources as draft research only and reject unsupported conclusions.      | Accepted.                                             |
| Accept pasted contract text, not files.                    | Keep the input plain-text and avoid persistence or production logging.                | Accepted.                                             |
| Rerun rules after missing-fact answers without GPT.        | Apply typed answers to the normalized transaction with audit provenance.              | Accepted.                                             |
| Exclude Kazakhstan and Kyrgyzstan before submission.       | Keep them in the roadmap only.                                                        | Accepted.                                             |
