import type {
  AnalysisResult,
  FactProvenance,
  ServiceComponent,
} from "@/lib/domain";
import { validateTouchpointClaims } from "@/lib/citations";
import {
  buildNarrativeInput,
  narrativeInputSourceIds,
  validateNarrativePayload,
} from "@/lib/narrative";

const researchBoundary =
  "TaxGraph is a research and scenario-mapping tool. It does not provide a final tax opinion, calculate definitive tax payable, or replace review by a qualified professional.";

const componentCategoryLabels: Record<ServiceComponent["category"], string> = {
  "saas-access": "SaaS access",
  configuration: "Configuration",
  "custom-integration": "Custom integration",
  hosting: "Hosting",
  "human-support": "Human support",
  training: "Training",
  "software-licence": "Software licence",
};

function countryName(code: string) {
  if (code === "RS") return "Serbia";
  if (code === "FR") return "France";
  if (code === "DE") return "Germany";
  return code;
}

function formatValue(value: unknown) {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function formatProvenance(provenance: FactProvenance) {
  return `${provenance.sourceType} · ${provenance.sourcePointer}`;
}

export function adviserBriefScenarioLabel(analysis: AnalysisResult) {
  const customer = analysis.normalizedTransaction.customer;
  if (customer.country === "FR" && customer.type === "consumer") {
    return "France B2C";
  }
  if (customer.country === "DE" && customer.type === "business") {
    return "Germany B2B";
  }
  return `${countryName(customer.country)} · ${customer.type}`;
}

export function validateAdviserBrief(analysis: AnalysisResult) {
  if (!analysis.analysisTrace.citationGatePassed) {
    throw new Error(
      "Adviser brief cannot render before the citation gate passes.",
    );
  }
  for (const touchpoint of analysis.taxTouchpoints) {
    validateTouchpointClaims(touchpoint, analysis.sourceReferences);
  }
  if (analysis.narrativeSummary) {
    const narrativeInput = buildNarrativeInput(analysis);
    validateNarrativePayload(
      { sentences: analysis.narrativeSummary.sentences },
      narrativeInputSourceIds(narrativeInput),
      analysis.sourceReferences,
    );
  }
  return true;
}

export function AdviserBrief({
  analysis,
  exportedAt,
}: {
  analysis: AnalysisResult;
  exportedAt: string;
}) {
  validateAdviserBrief(analysis);

  const transaction = analysis.normalizedTransaction;
  const scenarioLabel = adviserBriefScenarioLabel(analysis);
  const classifications = new Map(
    analysis.serviceClassifications.map((item) => [item.componentId, item]),
  );
  const adviserQuestions =
    analysis.checklist["Questions for a qualified adviser"] ?? [];
  const evidenceSections = Object.entries(analysis.checklist).filter(
    ([title]) => title !== "Questions for a qualified adviser",
  );
  const formattedExportedAt = new Date(exportedAt).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
  const narrativeOffset = analysis.narrativeSummary ? 1 : 0;

  return (
    <article className="adviser-brief" aria-label="TaxGraph Adviser Brief">
      <header className="brief-header">
        <div>
          <span>TaxGraph · pre-sale research workspace</span>
          <h1>TaxGraph Adviser Brief</h1>
        </div>
        <dl>
          <div>
            <dt>Date / time</dt>
            <dd>
              <time dateTime={exportedAt}>{formattedExportedAt} UTC</time>
            </dd>
          </div>
          <div>
            <dt>Mode</dt>
            <dd>{analysis.fixtureOrLive}</dd>
          </div>
          <div>
            <dt>Scenario</dt>
            <dd>{scenarioLabel}</dd>
          </div>
        </dl>
        <p className="brief-review-state">Pending human review</p>
      </header>

      <section className="brief-section">
        <h2>1. Transaction summary</h2>
        <dl className="brief-summary-grid">
          <div>
            <dt>Seller</dt>
            <dd>{transaction.seller.legalForm}</dd>
          </div>
          <div>
            <dt>Seller country</dt>
            <dd>{countryName(transaction.seller.country)}</dd>
          </div>
          <div>
            <dt>Customer</dt>
            <dd>{transaction.customer.type}</dd>
          </div>
          <div>
            <dt>Customer country</dt>
            <dd>{countryName(transaction.customer.country)}</dd>
          </div>
          <div>
            <dt>Delivery channel</dt>
            <dd>{transaction.commercialArrangement.deliveryChannel}</dd>
          </div>
          <div>
            <dt>VIES status</dt>
            <dd>
              {analysis.viesCheck.status.replaceAll("_", " ")} ·{" "}
              {analysis.viesCheck.liveOrFixture}
            </dd>
          </div>
        </dl>
      </section>

      {analysis.narrativeSummary && (
        <section className="brief-section">
          <h2>2. Narrative summary</h2>
          {analysis.narrativeSummary.sentences.map((sentence, index) => (
            <p key={`${analysis.narrativeSummary?.generatedAt}-${index}`}>
              {sentence.text}{" "}
              {sentence.sourceIds.map((sourceId) => (
                <sup key={`${index}-${sourceId}`}>[{sourceId}]</sup>
              ))}
            </p>
          ))}
        </section>
      )}

      <section className="brief-section">
        <h2>{2 + narrativeOffset}. Component decomposition</h2>
        <p className="brief-citation-note">
          Preliminary ESS signals use Article 7 and Annex II [S7] [S6]. All
          classifications remain subject to qualified review.
        </p>
        <div className="brief-components">
          {transaction.serviceComponents.map((component) => {
            const classification = classifications.get(component.id);
            return (
              <section key={component.id}>
                <h3>{componentCategoryLabels[component.category]}</h3>
                <strong>
                  {classification?.result ?? "Requires verification"}
                </strong>
                <p>{component.description}</p>
                <small>
                  {component.automationLevel} automation ·{" "}
                  {component.humanInvolvement} human involvement · [S7] [S6]
                </small>
              </section>
            );
          })}
        </div>
      </section>

      <section className="brief-section">
        <h2>{3 + narrativeOffset}. Tax touchpoints</h2>
        <table className="brief-table brief-touchpoints">
          <thead>
            <tr>
              <th>Topic</th>
              <th>Jurisdiction</th>
              <th>Status</th>
              <th>Claims and source footnotes</th>
            </tr>
          </thead>
          <tbody>
            {analysis.taxTouchpoints.map((touchpoint) => (
              <tr key={touchpoint.id}>
                <td>{touchpoint.topic}</td>
                <td>{touchpoint.jurisdiction}</td>
                <td>
                  <strong>{touchpoint.status}</strong>
                  <small>{touchpoint.reviewState}</small>
                </td>
                <td>
                  {touchpoint.claims.length === 0 ? (
                    <span>No substantive claim generated.</span>
                  ) : (
                    touchpoint.claims.map((claim) => (
                      <p key={claim.id}>
                        {claim.text}{" "}
                        {claim.sourceIds.map((sourceId) => (
                          <sup key={`${claim.id}-${sourceId}`}>
                            [{sourceId}]
                          </sup>
                        ))}
                      </p>
                    ))
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="brief-section brief-two-column">
        <div>
          <h2>{4 + narrativeOffset}. Missing facts</h2>
          {transaction.missingFacts.length === 0 ? (
            <p>None recorded.</p>
          ) : (
            <ul>
              {transaction.missingFacts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2>{5 + narrativeOffset}. Contradictions and provenance</h2>
          {transaction.contradictions.length === 0 ? (
            <p>None recorded.</p>
          ) : (
            <ul className="brief-contradictions">
              {transaction.contradictions.map((contradiction) => (
                <li key={contradiction.id}>
                  <strong>{contradiction.factPath}</strong>
                  <span>
                    {formatValue(contradiction.firstValue)} —{" "}
                    {formatProvenance(contradiction.firstProvenance)}
                  </span>
                  <span>
                    {formatValue(contradiction.secondValue)} —{" "}
                    {formatProvenance(contradiction.secondProvenance)}
                  </span>
                  <small>{contradiction.explanation}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="brief-section">
        <h2>{6 + narrativeOffset}. Evidence checklist</h2>
        <div className="brief-checklist">
          {evidenceSections.map(([title, items]) => (
            <section key={title}>
              <h3>{title}</h3>
              <ul>
                {items.map((item) => (
                  <li key={item}>□ {item}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </section>

      <section className="brief-section">
        <h2>{7 + narrativeOffset}. Questions for a qualified adviser</h2>
        <ol>
          {adviserQuestions.map((question) => (
            <li key={question}>{question}</li>
          ))}
        </ol>
      </section>

      <section className="brief-section">
        <h2>{8 + narrativeOffset}. Source register</h2>
        <table className="brief-table brief-sources">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Pinpoint</th>
              <th>Review state</th>
            </tr>
          </thead>
          <tbody>
            {analysis.sourceReferences.map((source) => (
              <tr key={source.id}>
                <td>{source.id}</td>
                <td>{source.title}</td>
                <td>{source.pinpoint}</td>
                <td>{source.humanReviewStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="brief-footer">
        <p>{researchBoundary}</p>
        <strong>
          This brief is not a tax opinion. Prepared with TaxGraph.
        </strong>
      </footer>
    </article>
  );
}
