"use client";

import { useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import type {
  AnalysisResult,
  MissingFactQuestion,
  ScenarioDiff,
  ScenarioInput,
  ServiceComponent,
  SourceReference,
  TaxTouchpoint,
} from "@/lib/domain";
import { narrativeSummarySchema } from "@/lib/domain";
import {
  AnalyzeRateLimitError,
  readAnalyzeResponse,
} from "@/lib/analyze-client";
import { summarizeSourceReview } from "@/lib/citations";
import { compareAnalyses } from "@/lib/diff";
import { evaluateTransaction } from "@/lib/engine";
import {
  createFranceTransaction,
  createFranceViesResult,
  createGermanyTransaction,
  createGermanyViesResult,
  franceInput,
  germanyInput,
} from "@/lib/fixtures";
import { answerMissingFact } from "@/lib/rerun";
import { AdviserBrief } from "@/components/adviser-brief";

const franceAnalysis = evaluateTransaction(
  franceInput,
  createFranceTransaction(),
  createFranceViesResult(),
);
const germanyAnalysis = evaluateTransaction(
  germanyInput,
  createGermanyTransaction(),
  createGermanyViesResult(),
);
const fixtureComparison = compareAnalyses(franceAnalysis, germanyAnalysis);

const tabs = [
  "Overview",
  "Tax Touchpoints",
  "Scenario Comparison",
  "Checklist",
  "Trace & Sources",
] as const;

type Tab = (typeof tabs)[number];

function createBlankInput(): ScenarioInput {
  return {
    structuredForm: {
      sellerCountry: "RS",
      customerCountry: "FR",
      customerType: "consumer",
      deliveryChannel: "online-subscription",
      automationLevel: "high",
      humanInvolvement: "limited",
      recurring: true,
      customerVatId: "",
      ipRightsTransferred: false,
    },
    freeTextDescription:
      "Managed AI customer support assistant with SaaS access, hosting, setup, support and training.",
    contractExcerpt: "",
    demoScenarioId: null,
  };
}

const messyLiveInput: ScenarioInput = {
  structuredForm: {
    sellerCountry: "RS",
    customerCountry: "DE",
    customerType: "business",
    deliveryChannel: "negotiated-contract",
    automationLevel: "medium",
    humanInvolvement: "substantial",
    recurring: true,
    customerVatId: "DE811907980",
    ipRightsTransferred: true,
  },
  freeTextDescription:
    "We are a small Belgrade agency. A German manufacturing company wants our AI customer support assistant: we host the SaaS, do custom integration with their Zendesk and ERP, configure the bot, train their staff on-site in Munich for two days, and provide monthly human support. They gave VAT ID DE811907980 but we have not verified it yet. One-time setup fee plus a yearly licence, and they want exclusive rights to the fine-tuned bot model.",
  contractExcerpt: "",
  demoScenarioId: null,
};

function statusTone(status: string) {
  if (status === "Pending human review") return "status-pending";
  if (status === "Requires verification") return "status-verify";
  if (status === "Professional review required") return "status-review";
  if (status === "Illustrative only") return "status-illustrative";
  if (status.startsWith("Likely")) return "status-likely";
  return "status-neutral";
}

function formatValue(value: unknown) {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const componentCategoryLabels: Record<ServiceComponent["category"], string> = {
  "saas-access": "SaaS access",
  configuration: "Configuration",
  "custom-integration": "Custom integration",
  hosting: "Hosting",
  "human-support": "Human support",
  training: "Training",
  "software-licence": "Software licence",
};

export function componentCategoryLabel(category: ServiceComponent["category"]) {
  return componentCategoryLabels[category];
}

export function componentCountLabel(count: number, includeService = false) {
  return `${count} ${includeService ? "service " : ""}component${count === 1 ? "" : "s"}`;
}

function ComparisonValue({ path, value }: { path: string; value: unknown }) {
  if (path !== "serviceComponents" || !Array.isArray(value)) {
    return <span>{formatValue(value)}</span>;
  }

  return (
    <div className="component-diff-chips">
      {value.map((item, index) => {
        const component =
          item && typeof item === "object"
            ? (item as {
                category?: unknown;
                automationLevel?: unknown;
                humanInvolvement?: unknown;
              })
            : null;
        const category =
          typeof component?.category === "string"
            ? (componentCategoryLabels[
                component.category as ServiceComponent["category"]
              ] ?? component.category.replaceAll("-", " "))
            : `component ${index + 1}`;
        const details = [
          typeof component?.automationLevel === "string"
            ? `${component.automationLevel} automation`
            : null,
          typeof component?.humanInvolvement === "string"
            ? `${component.humanInvolvement} human input`
            : null,
        ].filter(Boolean);

        return (
          <span key={`${category}-${index}`}>
            <b>{category}</b>
            {details.length > 0 && <small>{details.join(" · ")}</small>}
          </span>
        );
      })}
    </div>
  );
}

function SourceFootnote({
  sourceId,
  onOpen,
}: {
  sourceId: string;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      className="source-footnote"
      onClick={() => onOpen(sourceId)}
      aria-label={`Open source ${sourceId}`}
      type="button"
    >
      {sourceId}
    </button>
  );
}

export function MissingFactAnswerControl({
  question,
  value,
  onChange,
  onApply,
}: {
  question: MissingFactQuestion;
  value: string;
  onChange: (value: string) => void;
  onApply: (answer: string | boolean) => void;
}) {
  if (question.answerType === "boolean") {
    return (
      <div className="answer-row binary-row">
        <button
          onClick={() => onApply(true)}
          aria-label={`Answer yes: ${question.prompt}`}
          type="button"
        >
          Yes
        </button>
        <button
          onClick={() => onApply(false)}
          aria-label={`Answer no: ${question.prompt}`}
          type="button"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <div className="answer-row">
      {question.answerType === "single_select" ? (
        <select
          aria-label={`Answer: ${question.prompt}`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Select an answer…</option>
          {question.options?.map((option) => (
            <option key={option} value={option}>
              {option.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`Answer: ${question.prompt}`}
          maxLength={256}
        />
      )}
      <button
        onClick={() => value.trim() && onApply(value.trim())}
        disabled={!value.trim()}
        aria-label={`Apply answer and rerun: ${question.prompt}`}
        type="button"
      >
        Apply & rerun
      </button>
    </div>
  );
}

function FlowDiagram({ analysis }: { analysis: AnalysisResult }) {
  const componentLabel = componentCountLabel(
    analysis.diagramData.components.length,
    true,
  );
  return (
    <div className="flow-wrap" aria-label="Transaction flow diagram">
      <svg viewBox="0 0 1040 190" role="img">
        <title>
          Serbian seller to service components to customer and jurisdictions
        </title>
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
        </defs>
        <line className="flow-line" x1="236" y1="95" x2="308" y2="95" />
        <line className="flow-line" x1="528" y1="95" x2="600" y2="95" />
        <line className="flow-line" x1="820" y1="95" x2="892" y2="95" />
        <g className="flow-node">
          <rect x="16" y="49" rx="12" width="220" height="92" />
          <text x="36" y="79">
            SELLER
          </text>
          <text className="flow-value" x="36" y="112">
            {analysis.diagramData.seller}
          </text>
        </g>
        <g className="flow-node flow-node-accent">
          <rect x="308" y="49" rx="12" width="220" height="92" />
          <text x="328" y="79">
            MIXED PRODUCT
          </text>
          <text className="flow-value" x="328" y="112">
            {componentLabel}
          </text>
        </g>
        <g className="flow-node">
          <rect x="600" y="49" rx="12" width="220" height="92" />
          <text x="620" y="79">
            CUSTOMER
          </text>
          <text className="flow-value" x="620" y="112">
            {analysis.diagramData.customer}
          </text>
        </g>
        <g className="flow-node">
          <rect x="892" y="49" rx="12" width="132" height="92" />
          <text x="912" y="79">
            SCOPE
          </text>
          <text className="flow-value" x="912" y="112">
            {analysis.diagramData.jurisdictions.join(" · ")}
          </text>
        </g>
      </svg>
    </div>
  );
}

function ClaimText({
  touchpoint,
  onOpenSource,
}: {
  touchpoint: TaxTouchpoint;
  onOpenSource: (id: string) => void;
}) {
  if (touchpoint.claims.length === 0) {
    return <span className="muted">No substantive claim generated.</span>;
  }
  return (
    <div className="claim-list">
      {touchpoint.claims.map((claim) => (
        <p key={claim.id}>
          {claim.text}{" "}
          {claim.sourceIds.map((sourceId) => (
            <SourceFootnote
              sourceId={sourceId}
              onOpen={onOpenSource}
              key={sourceId}
            />
          ))}
        </p>
      ))}
    </div>
  );
}

function InputPanel({
  input,
  setInput,
  onLoad,
  onLoadMessy,
  onAnalyze,
  analyzing,
  analyzeHighlighted,
  progressMessage,
}: {
  input: ScenarioInput;
  setInput: (value: ScenarioInput) => void;
  onLoad: (id: "france-b2c" | "germany-b2b") => void;
  onLoadMessy: () => void;
  onAnalyze: () => void;
  analyzing: boolean;
  analyzeHighlighted: boolean;
  progressMessage: string;
}) {
  const form = input.structuredForm;
  const setForm = <K extends keyof ScenarioInput["structuredForm"]>(
    key: K,
    value: ScenarioInput["structuredForm"][K],
  ) =>
    setInput({
      ...input,
      demoScenarioId: null,
      structuredForm: { ...form, [key]: value },
    });

  return (
    <aside className="input-panel" aria-label="Transaction input">
      <div className="panel-kicker">Transaction input</div>
      <h2>Map the deal before the invoice.</h2>
      <p className="panel-intro">
        Describe one Serbia-to-EU sale. TaxGraph separates transaction evidence,
        preliminary service classification and the fixed R1–R12 rule pack.
      </p>

      <div className="demo-buttons">
        <button
          className="demo-button"
          onClick={() => onLoad("france-b2c")}
          aria-label="Load France B2C fixture"
          type="button"
        >
          <span className="flag-mark">FR</span>
          <span>
            <b>Load France B2C</b>
            <small>Consumer · automated subscription</small>
          </span>
        </button>
        <button
          className="demo-button"
          onClick={() => onLoad("germany-b2b")}
          aria-label="Load Germany B2B fixture"
          type="button"
        >
          <span className="flag-mark">DE</span>
          <span>
            <b>Load Germany B2B</b>
            <small>Business · custom integration</small>
          </span>
        </button>
        <button
          className="demo-button messy-demo-button"
          onClick={onLoadMessy}
          aria-label="Load messy real-world input without analyzing"
          type="button"
        >
          <span className="flag-mark">LIVE</span>
          <span>
            <b>Load messy real-world input (live)</b>
            <small>
              Prefills a realistic messy deal — press Analyze to run live GPT
            </small>
          </span>
        </button>
      </div>

      <div className="form-grid">
        <label>
          Customer country
          <select
            value={form.customerCountry}
            onChange={(event) => setForm("customerCountry", event.target.value)}
          >
            <option value="FR">France</option>
            <option value="DE">Germany</option>
          </select>
        </label>
        <label>
          Customer status
          <select
            value={form.customerType}
            onChange={(event) =>
              setForm(
                "customerType",
                event.target.value as typeof form.customerType,
              )
            }
          >
            <option value="consumer">Private consumer</option>
            <option value="business">Business</option>
            <option value="unknown">Not confirmed</option>
          </select>
        </label>
        <label>
          Delivery channel
          <select
            value={form.deliveryChannel}
            onChange={(event) =>
              setForm(
                "deliveryChannel",
                event.target.value as typeof form.deliveryChannel,
              )
            }
          >
            <option value="online-subscription">Online subscription</option>
            <option value="negotiated-contract">Negotiated contract</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          Automation
          <select
            value={form.automationLevel}
            onChange={(event) =>
              setForm(
                "automationLevel",
                event.target.value as typeof form.automationLevel,
              )
            }
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>
        <label>
          Human involvement
          <select
            value={form.humanInvolvement}
            onChange={(event) =>
              setForm(
                "humanInvolvement",
                event.target.value as typeof form.humanInvolvement,
              )
            }
          >
            <option value="minimal">Minimal</option>
            <option value="limited">Limited</option>
            <option value="substantial">Substantial</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>
        <label>
          Customer VAT ID
          <input
            value={form.customerVatId}
            onChange={(event) => setForm("customerVatId", event.target.value)}
            placeholder="DE123456789"
            autoComplete="off"
          />
        </label>
      </div>
      <label>
        Free-text description
        <textarea
          rows={3}
          value={input.freeTextDescription}
          onChange={(event) =>
            setInput({
              ...input,
              demoScenarioId: null,
              freeTextDescription: event.target.value,
            })
          }
        />
      </label>
      <label>
        Paste contract excerpt (optional)
        <textarea
          rows={4}
          value={input.contractExcerpt}
          onChange={(event) =>
            setInput({
              ...input,
              demoScenarioId: null,
              contractExcerpt: event.target.value,
            })
          }
          placeholder="Plain text only. Contract text is not logged or stored by TaxGraph."
        />
      </label>
      <div className="inline-checks">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.recurring}
            onChange={(event) => setForm("recurring", event.target.checked)}
          />
          Recurring payment
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={form.ipRightsTransferred === true}
            onChange={(event) =>
              setForm("ipRightsTransferred", event.target.checked)
            }
          />
          Software/IP rights indicated
        </label>
      </div>
      <button
        className={`primary-button ${analyzeHighlighted ? "primary-button-ready" : ""}`}
        onClick={onAnalyze}
        disabled={analyzing}
        aria-label="Analyze transaction with live GPT"
        type="button"
      >
        {analyzing ? "Normalizing and decomposing…" : "Analyze transaction"}
        <span aria-hidden="true">→</span>
      </button>
      <p className="privacy-note" aria-live="polite">
        {analyzing
          ? progressMessage
          : "Live mode uses server-side OpenAI credentials. Demo fixtures need no API key and use the same schemas and rule engine."}
      </p>
    </aside>
  );
}

function Overview({
  analysis,
  onAnswer,
  onExplain,
  onOpenSource,
  changedIds,
  explaining,
  narrativeError,
}: {
  analysis: AnalysisResult;
  onAnswer: (questionId: string, answer: string | boolean) => void;
  onExplain: () => void;
  onOpenSource: (id: string) => void;
  changedIds: Set<string>;
  explaining: boolean;
  narrativeError: string | null;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const transaction = analysis.normalizedTransaction;
  const sourceReview = summarizeSourceReview(analysis.sourceReferences);
  return (
    <div className="tab-stack">
      <section className="summary-grid">
        <article className="summary-card">
          <span>Seller</span>
          <b>Serbian company</b>
          <small>
            {analysis.fixtureOrLive === "fixture"
              ? "No EU fixed establishment in fixture"
              : transaction.seller.euFixedEstablishment === false
                ? "No EU fixed establishment reported"
                : "EU fixed establishment requires confirmation"}
          </small>
        </article>
        <article className="summary-card">
          <span>Customer</span>
          <b>
            {transaction.customer.country} · {transaction.customer.type}
          </b>
          <small>{transaction.commercialArrangement.deliveryChannel}</small>
        </article>
        <article className="summary-card">
          <span>Analysis mode</span>
          <b>
            {analysis.fixtureOrLive === "fixture" ? "Demo fixture" : "Live"}
          </b>
          <small>{analysis.modelMetadata.model ?? "No model call"}</small>
        </article>
        <article className="summary-card">
          <span>VIES</span>
          {analysis.viesCheck.status === "invalid_format" ? (
            <>
              <b className="vies-invalid-label">
                Invalid format — not sent to VIES
              </b>
              <small>No request sent</small>
            </>
          ) : (
            <>
              <b>{analysis.viesCheck.status.replaceAll("_", " ")}</b>
              <small>
                {analysis.viesCheck.liveOrFixture} ·{" "}
                {analysis.viesCheck.checkedAt.slice(0, 10)}
              </small>
            </>
          )}
        </article>
      </section>

      {changedIds.size > 0 && (
        <div className="change-banner">
          Rule engine rerun completed without GPT. Changed touchpoints:{" "}
          {Array.from(changedIds).join(", ")}.
        </div>
      )}

      <section className="content-card narrative-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Task D · on demand</span>
            <h3>Narrative summary</h3>
          </div>
          <button
            className="narrative-button"
            type="button"
            onClick={onExplain}
            disabled={explaining || Boolean(analysis.narrativeSummary)}
            aria-label="Explain this analysis with live GPT"
          >
            {analysis.narrativeSummary
              ? "Narrative cached"
              : explaining
                ? "Writing summary…"
                : "Explain this analysis"}
          </button>
        </div>
        {analysis.narrativeSummary ? (
          <div className="narrative-copy">
            {analysis.narrativeSummary.sentences.map((sentence, index) => (
              <p key={`${analysis.narrativeSummary?.generatedAt}-${index}`}>
                {sentence.text}{" "}
                {sentence.sourceIds.map((sourceId) => (
                  <SourceFootnote
                    sourceId={sourceId}
                    onOpen={onOpenSource}
                    key={`${index}-${sourceId}`}
                  />
                ))}
              </p>
            ))}
          </div>
        ) : narrativeError ? (
          <p className="narrative-error" role="alert">
            {narrativeError}
          </p>
        ) : (
          <p className="narrative-placeholder">
            Generate a 150–250 word, source-footnoted explanation from the
            completed analysis. This is never started automatically.
          </p>
        )}
      </section>

      <section className="content-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Transaction flow</span>
            <h3>One commercial package, several analytical signals</h3>
          </div>
          <span
            className={
              sourceReview.state === "reviewed"
                ? "reviewed-chip"
                : "pending-chip"
            }
          >
            {sourceReview.label}
          </span>
        </div>
        <FlowDiagram analysis={analysis} />
      </section>

      <section className="content-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Product decomposition</span>
            <h3>Managed AI Customer Support Assistant</h3>
          </div>
          <span className="count-chip">
            {componentCountLabel(transaction.serviceComponents.length)}
          </span>
        </div>
        <div className="component-grid">
          {transaction.serviceComponents.map((component) => {
            const classification = analysis.serviceClassifications.find(
              (item) => item.componentId === component.id,
            );
            return (
              <article className="component-card" key={component.id}>
                <div className="component-topline">
                  <span>{componentCategoryLabel(component.category)}</span>
                  <b>{classification?.result ?? "Requires verification"}</b>
                </div>
                <p>{component.description}</p>
                <div className="fact-pills">
                  <span>Automation · {component.automationLevel}</span>
                  <span>Human · {component.humanInvolvement}</span>
                  {component.recurring && <span>Recurring</span>}
                </div>
              </article>
            );
          })}
        </div>
        <p className="inline-citation-note">
          Preliminary ESS signals use Article 7 and Annex II.{" "}
          <SourceFootnote sourceId="S7" onOpen={onOpenSource} />{" "}
          <SourceFootnote sourceId="S6" onOpen={onOpenSource} /> Component
          decomposition does not decide single/composite supply treatment.
        </p>
      </section>

      <section className="facts-layout">
        <article className="content-card">
          <span className="eyebrow">Known facts</span>
          <h3>Captured with provenance</h3>
          <ul className="fact-list">
            {transaction.knownFacts.map((fact) => (
              <li key={`${fact.path}-${fact.label}`}>
                <span>
                  <b>{fact.label}</b>
                  <small>
                    {fact.provenance.sourceType} ·{" "}
                    {fact.provenance.sourcePointer}
                  </small>
                </span>
                <code>{formatValue(fact.value)}</code>
              </li>
            ))}
          </ul>
        </article>
        <article className="content-card missing-card">
          <span className="eyebrow">Missing & conflicting</span>
          <h3>Facts that could move the map</h3>
          {transaction.contradictions.map((item) => (
            <div className="contradiction" key={item.id}>
              <b>Conflict · {item.factPath}</b>
              <p>
                {formatValue(item.firstValue)} ↔ {formatValue(item.secondValue)}
              </p>
              <small>{item.explanation}</small>
            </div>
          ))}
          {transaction.missingFactQuestions.length === 0 ? (
            <p className="empty-state">
              No answerable questions remain in this fixture.
            </p>
          ) : (
            transaction.missingFactQuestions.map((question) => (
              <div className="question-card" key={question.id}>
                <div className="question-rules">
                  {question.affectedRuleIds.map((id) => (
                    <span key={id}>{id}</span>
                  ))}
                </div>
                <b>{question.prompt}</b>
                <p>{question.reason}</p>
                <MissingFactAnswerControl
                  question={question}
                  value={answers[question.id] ?? ""}
                  onChange={(value) =>
                    setAnswers({ ...answers, [question.id]: value })
                  }
                  onApply={(answer) => onAnswer(question.id, answer)}
                />
              </div>
            ))
          )}
        </article>
      </section>
    </div>
  );
}

function Touchpoints({
  analysis,
  onOpenSource,
  changedIds,
}: {
  analysis: AnalysisResult;
  onOpenSource: (id: string) => void;
  changedIds: Set<string>;
}) {
  const sortedTouchpoints = [...analysis.taxTouchpoints].sort(
    (first, second) =>
      Number(first.status === "Not covered by the current MVP rule pack") -
      Number(second.status === "Not covered by the current MVP rule pack"),
  );

  return (
    <section className="content-card touchpoint-card">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Deterministic output</span>
          <h3>Tax touchpoint matrix</h3>
        </div>
        <span className="count-chip">R1–R12 only</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Topic</th>
              <th>Jurisdiction</th>
              <th>Status</th>
              <th>Claims & sources</th>
              <th>Missing facts</th>
              <th>Review state</th>
            </tr>
          </thead>
          <tbody>
            {sortedTouchpoints.map((touchpoint) => (
              <tr
                key={touchpoint.id}
                className={changedIds.has(touchpoint.id) ? "row-changed" : ""}
              >
                <td>
                  <b>{touchpoint.topic}</b>
                  <div className="rule-pills">
                    {touchpoint.triggeredRuleIds.map((id) => (
                      <span key={id}>{id}</span>
                    ))}
                  </div>
                </td>
                <td>{touchpoint.jurisdiction}</td>
                <td>
                  <span
                    className={`status-badge ${statusTone(touchpoint.status)}`}
                  >
                    {touchpoint.status}
                  </span>
                </td>
                <td>
                  <ClaimText
                    touchpoint={touchpoint}
                    onOpenSource={onOpenSource}
                  />
                  {touchpoint.status ===
                    "Not covered by the current MVP rule pack" && (
                    <p className="coverage-note">
                      No R1–R12 rule maps this topic for the current scenario
                      facts.
                    </p>
                  )}
                </td>
                <td>
                  {touchpoint.missingFacts.length > 0 ? (
                    <ul className="compact-list">
                      {touchpoint.missingFacts.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>
                  <span className="review-state">{touchpoint.reviewState}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Comparison({
  comparison,
  onOpenSource,
}: {
  comparison: ScenarioDiff;
  onOpenSource: (id: string) => void;
}) {
  const touchedSources = Array.from(
    new Set(
      germanyAnalysis.taxTouchpoints
        .filter((item) =>
          comparison.changedTouchpoints.some((change) => change.id === item.id),
        )
        .flatMap((item) => item.sourceIds),
    ),
  );
  return (
    <div className="tab-stack">
      <section className="comparison-hero">
        <div>
          <span className="eyebrow">Scenario comparison</span>
          <h3>Same product. Different customer facts. Different review map.</h3>
          <p>
            The comparison is computed from two full deterministic analyses; GPT
            does not invent the differences.
          </p>
        </div>
        <div className="comparison-counters">
          <span>
            <b>{comparison.changedInputs.length}</b> input groups
          </span>
          <span>
            <b>{comparison.affectedRules.length}</b> affected rules
          </span>
          <span>
            <b>{comparison.changedTouchpoints.length}</b> status changes
          </span>
        </div>
      </section>
      <section className="comparison-columns">
        <article className="scenario-card france-scenario">
          <span>SCENARIO A</span>
          <h3>France B2C</h3>
          <p>Private consumer · automated standard package · no VAT ID</p>
          <div className="scenario-route">
            RS seller <i>→</i> FR consumer
          </div>
        </article>
        <article className="scenario-card germany-scenario">
          <span>SCENARIO B</span>
          <h3>Germany B2B</h3>
          <p>
            Business · negotiated integration · VIES fixture · rights signal
          </p>
          <div className="scenario-route">
            RS seller <i>→</i> DE business
          </div>
        </article>
      </section>
      <section className="content-card">
        <span className="eyebrow">Changed inputs</span>
        <h3>Facts that drive the delta</h3>
        <div className="diff-grid">
          {comparison.changedInputs.map((change) => (
            <article key={change.path}>
              <b>{change.path}</b>
              <div className="value-change">
                <ComparisonValue path={change.path} value={change.oldValue} />
                <i>→</i>
                <ComparisonValue path={change.path} value={change.newValue} />
              </div>
              <div className="rule-pills">
                {change.affectedRuleIds.map((id) => (
                  <span key={id}>{id}</span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="content-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Changed touchpoints</span>
            <h3>What the rule engine maps differently</h3>
          </div>
          <div className="source-cluster">
            {touchedSources.slice(0, 8).map((id) => (
              <SourceFootnote key={id} sourceId={id} onOpen={onOpenSource} />
            ))}
          </div>
        </div>
        <div className="touchpoint-diffs">
          {comparison.changedTouchpoints.map((change) => (
            <article key={change.id}>
              <div>
                <b>{change.topic}</b>
                <div className="rule-pills">
                  {change.affectedRuleIds.map((id) => (
                    <span key={id}>{id}</span>
                  ))}
                </div>
              </div>
              <span className={`status-badge ${statusTone(change.oldStatus)}`}>
                {change.oldStatus}
              </span>
              <i>→</i>
              <span className={`status-badge ${statusTone(change.newStatus)}`}>
                {change.newStatus}
              </span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Checklist({ analysis }: { analysis: AnalysisResult }) {
  return (
    <section className="checklist-grid">
      {Object.entries(analysis.checklist).map(([title, items], index) => (
        <article className="content-card checklist-card" key={title}>
          <span className="checklist-number">0{index + 1}</span>
          <h3>{title}</h3>
          <ul>
            {items.map((item) => (
              <li key={item}>
                <span aria-hidden="true">□</span>
                {item}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </section>
  );
}

function Trace({
  analysis,
  onOpenSource,
}: {
  analysis: AnalysisResult;
  onOpenSource: (id: string) => void;
}) {
  return (
    <div className="trace-layout">
      <section className="content-card trace-summary">
        <span className="eyebrow">Audit envelope</span>
        <h3>Analysis metadata</h3>
        <dl>
          <div>
            <dt>Transaction</dt>
            <dd>{analysis.normalizedTransaction.id}</dd>
          </div>
          <div>
            <dt>Mode</dt>
            <dd>{analysis.fixtureOrLive}</dd>
          </div>
          <div>
            <dt>Model</dt>
            <dd>{analysis.modelMetadata.model ?? "No model call"}</dd>
          </div>
          <div>
            <dt>Generated</dt>
            <dd>{analysis.generatedAt}</dd>
          </div>
          <div>
            <dt>Citation gate</dt>
            <dd>
              {analysis.analysisTrace.citationGatePassed ? "Passed" : "Failed"}
            </dd>
          </div>
          <div>
            <dt>Rerun without GPT</dt>
            <dd>{String(analysis.analysisTrace.rerunWithoutGpt)}</dd>
          </div>
          <div>
            <dt>VIES mode</dt>
            <dd>{analysis.viesCheck.liveOrFixture}</dd>
          </div>
          <div>
            <dt>VIES evidence</dt>
            <dd>{analysis.viesCheck.evidenceRef}</dd>
          </div>
          {analysis.viesCheck.requestIdentifier && (
            <div>
              <dt>VIES request ID</dt>
              <dd>{analysis.viesCheck.requestIdentifier}</dd>
            </div>
          )}
        </dl>
      </section>
      <section className="content-card trace-rules">
        <span className="eyebrow">Rule trace</span>
        <h3>Evaluated conditions</h3>
        <div className="details-stack">
          {analysis.analysisTrace.ruleEvaluations.map((rule) => (
            <details
              key={rule.ruleId}
              open={rule.ruleId === "R1" || rule.ruleId === "R6"}
            >
              <summary>
                <span>{rule.ruleId}</span>
                <b>
                  {rule.triggered
                    ? "Triggered"
                    : rule.enabled
                      ? "Not triggered"
                      : "Disabled"}
                </b>
                <em className={`status-badge ${statusTone(rule.outputStatus)}`}>
                  {rule.outputStatus}
                </em>
              </summary>
              <div className="detail-body">
                <p>
                  <b>Matched:</b> {rule.matchedConditions.join(" · ") || "None"}
                </p>
                <p>
                  <b>Unresolved:</b>{" "}
                  {rule.unresolvedConditions.join(" · ") || "None"}
                </p>
                {rule.disabledReason && (
                  <p>
                    <b>Disabled:</b> {rule.disabledReason}
                  </p>
                )}
                <div className="source-cluster">
                  {rule.sourceIds.map((id) => (
                    <SourceFootnote
                      key={id}
                      sourceId={id}
                      onOpen={onOpenSource}
                    />
                  ))}
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>
      <section className="content-card trace-sources">
        <span className="eyebrow">Source register</span>
        <h3>Exact excerpts, never model-rewritten</h3>
        <div className="source-list">
          {analysis.sourceReferences.map((source) => (
            <button key={source.id} onClick={() => onOpenSource(source.id)}>
              <span>{source.id}</span>
              <b>{source.title}</b>
              <small>
                {source.jurisdiction} · {source.humanReviewStatus}
              </small>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function SourceDrawer({
  source,
  onClose,
}: {
  source: SourceReference | null;
  onClose: () => void;
}) {
  if (!source) return null;
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside
        className="source-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Source ${source.id}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="drawer-header">
          <div>
            <span>
              {source.id} · {source.jurisdiction}
            </span>
            <h2>{source.title}</h2>
          </div>
          <button onClick={onClose} aria-label="Close source drawer">
            ×
          </button>
        </div>
        <div className="drawer-meta">
          <div>
            <span>Authority</span>
            <b>{source.issuingAuthority}</b>
          </div>
          <div>
            <span>Pinpoint</span>
            <b>{source.pinpoint}</b>
          </div>
          <div>
            <span>Retrieved</span>
            <b>{source.retrievedAt}</b>
          </div>
          <div>
            <span>Review state</span>
            <b className="pending-text">{source.humanReviewStatus}</b>
          </div>
        </div>
        <section className="excerpt-block">
          <span>Canonical exact excerpt</span>
          <blockquote>{source.excerpt}</blockquote>
        </section>
        {source.translationEn && (
          <section className="translation-block">
            <span>English translation from source pack</span>
            <p>{source.translationEn}</p>
          </section>
        )}
        <section className="drawer-notes">
          <span>Research note</span>
          <p>{source.notes}</p>
        </section>
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="official-link"
        >
          Open official source <span>↗</span>
        </a>
      </aside>
    </div>
  );
}

export function TaxGraphApp() {
  const [input, setInput] = useState<ScenarioInput>(() => createBlankInput());
  const [analysis, setAnalysis] = useState<AnalysisResult>(franceAnalysis);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeHighlighted, setAnalyzeHighlighted] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [narrativeError, setNarrativeError] = useState<string | null>(null);
  const [rerunDiff, setRerunDiff] = useState<ScenarioDiff | null>(null);
  const [briefExportedAt, setBriefExportedAt] = useState<string | null>(null);

  const selectedSource = useMemo(
    () =>
      analysis.sourceReferences.find((item) => item.id === selectedSourceId) ??
      franceAnalysis.sourceReferences.find(
        (item) => item.id === selectedSourceId,
      ) ??
      null,
    [analysis.sourceReferences, selectedSourceId],
  );
  const changedIds = useMemo(
    () => new Set(rerunDiff?.changedTouchpoints.map((item) => item.id) ?? []),
    [rerunDiff],
  );
  const sourceReview = summarizeSourceReview(analysis.sourceReferences);

  useEffect(() => {
    if (!analyzing) return;
    const decompositionTimer = window.setTimeout(
      () =>
        setProgressMessage(
          "The model is decomposing services and checking missing facts. The server stops at its configured limit (75 seconds by default).",
        ),
      25_000,
    );
    const finalTimer = window.setTimeout(
      () =>
        setProgressMessage(
          "Still working within the server deadline. If it cannot finish safely, no partial result will replace the fixture.",
        ),
      55_000,
    );

    return () => {
      window.clearTimeout(decompositionTimer);
      window.clearTimeout(finalTimer);
    };
  }, [analyzing]);

  const loadDemo = (id: "france-b2c" | "germany-b2b") => {
    const next = id === "france-b2c" ? franceAnalysis : germanyAnalysis;
    setInput(id === "france-b2c" ? franceInput : germanyInput);
    setAnalysis(next);
    setRerunDiff(null);
    setError(null);
    setNarrativeError(null);
    setAnalyzeHighlighted(false);
    setActiveTab("Overview");
  };

  const loadMessyInput = () => {
    setInput(messyLiveInput);
    setError(null);
    setNarrativeError(null);
    setAnalyzeHighlighted(true);
  };

  const analyze = async () => {
    setProgressMessage(
      "Sending the transaction for live normalization. This usually takes 30–45 seconds; the current fixture stays visible.",
    );
    setAnalyzing(true);
    setAnalyzeHighlighted(false);
    setError(null);
    const controller = new AbortController();
    const clientTimeoutId = window.setTimeout(() => controller.abort(), 90_000);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...input, demoScenarioId: null }),
        signal: controller.signal,
      });
      const payload = await readAnalyzeResponse(response);
      setAnalysis(payload as AnalysisResult);
      setNarrativeError(null);
      setRerunDiff(null);
      setActiveTab("Overview");
    } catch (caught) {
      if (caught instanceof AnalyzeRateLimitError) {
        setError(caught.message);
        return;
      }
      const message =
        caught instanceof DOMException && caught.name === "AbortError"
          ? "Live analysis stopped after 90 seconds. Please retry or use a demo fixture."
          : caught instanceof Error
            ? caught.message
            : "Analysis failed.";
      setError(`${message} The loaded fixture remains unchanged.`);
    } finally {
      window.clearTimeout(clientTimeoutId);
      setAnalyzing(false);
      setProgressMessage("");
    }
  };

  const explainAnalysis = async () => {
    if (analysis.narrativeSummary || explaining) return;
    const transactionId = analysis.normalizedTransaction.id;
    setExplaining(true);
    setNarrativeError(null);
    const controller = new AbortController();
    const clientTimeoutId = window.setTimeout(() => controller.abort(), 90_000);
    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(analysis),
        signal: controller.signal,
      });
      const payload = await readAnalyzeResponse(response);
      const narrativeSummary = narrativeSummarySchema.parse(payload);
      setAnalysis((current) =>
        current.normalizedTransaction.id === transactionId
          ? { ...current, narrativeSummary }
          : current,
      );
    } catch (caught) {
      const message =
        caught instanceof DOMException && caught.name === "AbortError"
          ? "The narrative explanation stopped after 90 seconds. The analysis remains available."
          : caught instanceof Error
            ? caught.message
            : "The narrative explanation failed. The analysis remains available.";
      setNarrativeError(message);
    } finally {
      window.clearTimeout(clientTimeoutId);
      setExplaining(false);
    }
  };

  const applyAnswer = (questionId: string, answer: string | boolean) => {
    try {
      const rerun = answerMissingFact(analysis, questionId, answer);
      setAnalysis(rerun.result);
      setRerunDiff(rerun.diff);
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The answer could not be applied; the question remains open.",
      );
    }
  };

  const exportAdviserBrief = () => {
    const exportedAt = new Date().toISOString();
    flushSync(() => setBriefExportedAt(exportedAt));
    window.print();
  };

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="TaxGraph home">
          <span className="brand-mark">TG</span>
          <span>
            <b>TaxGraph</b>
            <small>Software & AI Services</small>
          </span>
        </a>
        <div className="header-state">
          <span className="live-dot" />
          {analysis.fixtureOrLive === "fixture"
            ? "Demo fixture"
            : "Live analysis"}
          <i />
          Source pack 14/14 found
        </div>
        <div className="scope-badge">SERBIA → EU · MVP</div>
      </header>

      <section className="hero" id="top">
        <div>
          <span className="hero-kicker">PRE-SALE RESEARCH WORKSPACE</span>
          <h1>See the tax questions hiding inside an AI deal.</h1>
        </div>
        <p>
          TaxGraph converts a cross-border software or AI transaction into a
          source-backed map of touchpoints, missing facts, evidence and
          questions for professional review.
        </p>
      </section>

      <div className="safety-notice">
        <b>Research boundary</b>
        <span>
          TaxGraph is a research and scenario-mapping tool. It does not provide
          a final tax opinion, calculate definitive tax payable, or replace
          review by a qualified professional.
        </span>
      </div>

      <section className="workspace">
        <InputPanel
          input={input}
          setInput={setInput}
          onLoad={loadDemo}
          onLoadMessy={loadMessyInput}
          onAnalyze={analyze}
          analyzing={analyzing}
          analyzeHighlighted={analyzeHighlighted}
          progressMessage={progressMessage}
        />
        <div className="analysis-workspace">
          <div className="workspace-topbar">
            <div>
              <span className="eyebrow">Analysis workspace</span>
              <h2>
                {analysis.normalizedTransaction.customer.country === "FR"
                  ? "France B2C"
                  : "Germany B2B"}
                <span> · Managed AI Assistant</span>
              </h2>
            </div>
            <div className="workspace-actions">
              <button
                className="export-brief-button"
                type="button"
                onClick={exportAdviserBrief}
                aria-label="Export current analysis as an adviser brief"
              >
                Export adviser brief
              </button>
              <div className="workspace-badges">
                <span>
                  {analysis.fixtureOrLive === "fixture"
                    ? "Demo fixture"
                    : "Live analysis"}
                </span>
                <span
                  className={
                    sourceReview.state === "reviewed"
                      ? "reviewed-chip"
                      : "pending-chip"
                  }
                >
                  {sourceReview.label}
                </span>
              </div>
            </div>
          </div>
          {error && (
            <div className="error-banner" role="alert">
              {error}
            </div>
          )}
          <nav className="tab-list" aria-label="Analysis views">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                aria-current={activeTab === tab ? "page" : undefined}
                aria-label={`Open ${tab} view`}
                type="button"
              >
                {tab}
              </button>
            ))}
          </nav>
          <div className="tab-content">
            {activeTab === "Overview" && (
              <Overview
                analysis={analysis}
                onAnswer={applyAnswer}
                onExplain={explainAnalysis}
                onOpenSource={setSelectedSourceId}
                changedIds={changedIds}
                explaining={explaining}
                narrativeError={narrativeError}
              />
            )}
            {activeTab === "Tax Touchpoints" && (
              <Touchpoints
                analysis={analysis}
                onOpenSource={setSelectedSourceId}
                changedIds={changedIds}
              />
            )}
            {activeTab === "Scenario Comparison" && (
              <Comparison
                comparison={fixtureComparison}
                onOpenSource={setSelectedSourceId}
              />
            )}
            {activeTab === "Checklist" && <Checklist analysis={analysis} />}
            {activeTab === "Trace & Sources" && (
              <Trace analysis={analysis} onOpenSource={setSelectedSourceId} />
            )}
          </div>
        </div>
      </section>

      <footer>
        <span>TaxGraph · OpenAI Build Week 2026 · Work & Productivity</span>
        <span>R1–R12 only · No final tax advice · {sourceReview.label}</span>
      </footer>
      <AdviserBrief
        analysis={analysis}
        exportedAt={briefExportedAt ?? analysis.generatedAt}
      />
      <SourceDrawer
        source={selectedSource}
        onClose={() => setSelectedSourceId(null)}
      />
    </main>
  );
}
