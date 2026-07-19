const baseUrl = process.env.TAXGRAPH_BASE_URL ?? "http://127.0.0.1:3100";

const scenarios = [
  {
    name: "france-b2c-live",
    expected: { country: "FR", customerType: "consumer", minimumComponents: 4 },
    input: {
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
        "Standard managed AI assistant subscription with automated SaaS access, initial configuration, cloud hosting, limited human support and remote staff training. Only the billing country is currently available as customer-location evidence.",
      contractExcerpt:
        "The supplier provides recurring platform access, hosting and initial configuration. Remote training and support are included. No reproduction or modification rights are granted.",
      demoScenarioId: null,
    },
  },
  {
    name: "germany-b2b-live",
    expected: { country: "DE", customerType: "business", minimumComponents: 4 },
    input: {
      structuredForm: {
        sellerCountry: "RS",
        customerCountry: "DE",
        customerType: "business",
        deliveryChannel: "negotiated-contract",
        automationLevel: "medium",
        humanInvolvement: "substantial",
        recurring: true,
        customerVatId: "",
        ipRightsTransferred: true,
      },
      freeTextDescription:
        "Negotiated managed AI deployment with custom CRM integration, implementation work, hosting, recurring human support and a limited software licence. The customer's VAT ID and fixed-establishment position have not yet been confirmed.",
      contractExcerpt:
        "The customer receives a non-exclusive right to use the integration software during the subscription. Reproduction, modification, sublicensing and beneficial-ownership terms are not stated.",
      demoScenarioId: null,
    },
  },
  {
    name: "free-input-live",
    expected: { country: "DE", customerType: "unknown", minimumComponents: 3 },
    input: {
      structuredForm: {
        sellerCountry: "RS",
        customerCountry: "DE",
        customerType: "unknown",
        deliveryChannel: "other",
        automationLevel: "unknown",
        humanInvolvement: "unknown",
        recurring: false,
        customerVatId: "",
        ipRightsTransferred: null,
      },
      freeTextDescription:
        "A Serbian company may build a one-off hosted AI support workflow for a German customer. The draft scope mentions a hosted assistant, custom CRM integration, remote staff training and 30 days of human support. The buyer's business status, VAT ID, software-rights scope, renewal terms and any on-site work are not confirmed.",
      contractExcerpt: "",
      demoScenarioId: null,
    },
  },
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const results = [];
for (const scenario of scenarios) {
  const startedAt = Date.now();
  const response = await fetch(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": `198.51.100.${results.length + 10}`,
    },
    body: JSON.stringify(scenario.input),
  });
  const payload = await response.json();
  if (!response.ok) {
    const safeDiagnostics = {
      errorCode: payload.errorCode ?? null,
      maxOutputTokens: Number(
        response.headers.get("x-taxgraph-max-output-tokens"),
      ),
      inputTokens: Number(response.headers.get("x-taxgraph-input-tokens")),
      outputTokens: Number(response.headers.get("x-taxgraph-output-tokens")),
      totalTokens: Number(response.headers.get("x-taxgraph-total-tokens")),
    };
    throw new Error(
      `${scenario.name} failed with HTTP ${response.status}: ${JSON.stringify(safeDiagnostics)}`,
    );
  }

  const transaction = payload.normalizedTransaction;
  assert(
    transaction?.normalizationMetadata?.mode === "live",
    `${scenario.name}: not live`,
  );
  assert(
    transaction.customer.country === scenario.expected.country,
    `${scenario.name}: customer country changed`,
  );
  assert(
    transaction.customer.type === scenario.expected.customerType,
    `${scenario.name}: customer type changed`,
  );
  assert(
    transaction.serviceComponents.length >= scenario.expected.minimumComponents,
    `${scenario.name}: insufficient service decomposition`,
  );
  assert(
    transaction.missingFactQuestions.length > 0,
    `${scenario.name}: no missing-fact questions`,
  );

  results.push({
    scenario: scenario.name,
    httpStatus: response.status,
    elapsedMs: Date.now() - startedAt,
    normalizationMode: transaction.normalizationMetadata.mode,
    componentCategories: transaction.serviceComponents.map(
      (item) => item.category,
    ),
    missingFactCount: transaction.missingFacts.length,
    questionFactPaths: transaction.missingFactQuestions.map(
      (item) => item.factPath,
    ),
    contradictionCount: transaction.contradictions.length,
    viesStatus: payload.viesCheck.status,
    limits: {
      requestsPerMinute: Number(response.headers.get("ratelimit-limit")),
      remainingRequests: Number(response.headers.get("ratelimit-remaining")),
      maxOutputTokens: Number(
        response.headers.get("x-taxgraph-max-output-tokens"),
      ),
    },
    usage: {
      inputTokens: Number(response.headers.get("x-taxgraph-input-tokens")),
      outputTokens: Number(response.headers.get("x-taxgraph-output-tokens")),
      totalTokens: Number(response.headers.get("x-taxgraph-total-tokens")),
    },
  });
}

console.log(JSON.stringify(results, null, 2));
