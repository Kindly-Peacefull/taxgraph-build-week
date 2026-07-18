# ОСНОВНОЕ ЗАДАНИЕ ДЛЯ CODEX

## Проект: TaxGraph for Software & AI Services

Ты выступаешь как ведущий full-stack разработчик и технический архитектор конкурсного проекта для OpenAI Build Week.

Нужно последовательно построить, проверить и подготовить к публичной демонстрации реально работающее веб-приложение. Не ограничивайся планом, макетом или генерацией текстового ответа.

---

# 1. Правила взаимодействия со мной

## Язык

- Отвечай мне и объясняй свои действия на русском языке.
- Весь исходный код пиши на английском.
- Идентификаторы, имена файлов, функций, типов и переменных пиши на английском.
- Интерфейс приложения должен быть полностью на английском.
- README, техническая документация, тексты для Devpost и сценарий видео должны быть на английском.
- Git commit messages пиши на английском.
- Комментарии в коде пиши на английском и только там, где они действительно нужны.

## Самостоятельность

- Сначала изучи рабочую папку и доступное окружение.
- Если можно выбрать разумное, безопасное и обратимое решение самостоятельно, выбирай его и продолжай.
- Не задавай общих вопросов вроде «какой стек вы хотите использовать».
- Задавай вопрос только если работа реально заблокирована:
  - отсутствует необходимый API-ключ;
  - требуется авторизация;
  - отсутствует URL GitHub-репозитория;
  - отсутствуют предоставляемые пользователем source-pack файлы;
  - требуется ручная налоговая или юридическая проверка;
  - требуется необратимое решение, для которого невозможно выбрать безопасный вариант.
- Перед существенным архитектурным решением кратко объясни его по-русски.
- После объяснения продолжай реализацию, если решение обратимо.

## Честность

Никогда не выдумывай:

- выполненные тесты;
- результаты сборки;
- Git-коммиты и commit hashes;
- успешный push или deployment;
- официальные налоговые источники;
- законодательные нормы;
- налоговые ставки;
- положения международных договоров;
- доступность VIES API;
- Codex Session ID;
- функции, которые фактически не работают.

Если часть не завершена или источник не подтверждён, обозначь это прямо в UI, документации и отчёте пользователю.

---

# 2. Конкурсный контекст

Проект создаётся для OpenAI Build Week в категории:

**Work & Productivity**

Проект должен:

- быть построен с существенным использованием Codex;
- содержать работающую интеграцию GPT-5.6;
- быть доступен судьям как работающая демонстрация;
- иметь понятный репозиторий и README;
- быть понятным в видео продолжительностью менее трёх минут;
- сохранять основную Codex-сессию, где создано большинство ключевой функциональности.

Не придумывай Codex `/feedback` Session ID. Его вручную получит пользователь.

Крайний срок submission: **21 July 2026, 17:00 Pacific Time**.

---

# 3. Название и продуктовая формулировка

## Название

**TaxGraph for Software & AI Services**

## Краткая формулировка

> TaxGraph converts a cross-border software or AI transaction into a source-backed map of tax touchpoints, missing facts, required documents, and questions that need professional review.

## Назначение

TaxGraph помогает небольшой IT- или AI-компании понять, какие налоговые и документальные вопросы могут возникнуть до заключения международной сделки.

Приложение не должно просто показывать ставку налога. Оно должно сначала определить:

- что именно продаёт компания;
- из каких компонентов состоит предложение;
- автоматизирована ли услуга;
- насколько существенна работа людей;
- передаются ли права на программное обеспечение;
- кто покупатель;
- где находится покупатель;
- является ли покупатель бизнесом или потребителем;
- предоставлен и проверен ли VAT ID;
- каким способом продаётся продукт;
- каких фактов не хватает;
- противоречат ли условия договора данным формы.

После этого система строит проверяемую карту потенциальных VAT, documentation и professional-review touchpoints.

---

# 4. Проблема

Коммерческий продукт под названием “AI assistant” может одновременно включать:

- SaaS access;
- cloud hosting;
- initial configuration;
- custom software integration;
- software licence;
- ongoing human technical support;
- consulting;
- staff training.

Эти компоненты могут влиять на предварительную квалификацию сделки по-разному.

Результат также может меняться в зависимости от покупателя:

- private consumer;
- VAT-registered business;
- business with an unverified VAT ID;
- intermediary or marketplace.

Обычные налоговые калькуляторы часто начинают работу после того, как сделка уже правильно классифицирована. TaxGraph работает раньше:

> сначала структурирует и декомпозирует сделку, затем показывает применимые проверенные правила, недостающие сведения, доказательства и вопросы для профессиональной проверки.

Декомпозиция продукта является аналитическим инструментом. Она не должна автоматически утверждать, что каждый компонент обязательно представляет отдельную поставку для VAT purposes. Вопрос single/composite supply всегда маркируй как требующий профессиональной проверки, если он влияет на результат.

---

# 5. Жёсткое ограничение MVP

Не строй универсальную систему международного налогообложения.

Нужно сделать один законченный вертикальный сценарий.

## Продавец

- Serbian company.

## Продукт

**Managed AI Customer Support Assistant**

Компоненты:

- SaaS access;
- initial chatbot configuration;
- custom integration with customer systems;
- hosting;
- ongoing human technical support;
- customer staff training.

## Два полностью работающих сценария

### Scenario A: France B2C

- seller: Serbian company;
- customer: private consumer in France;
- customer has no VAT ID;
- online subscription;
- significant automated SaaS component;
- standard package;
- limited initial setup;
- recurring payment.

### Scenario B: Germany B2B

- seller: Serbian company;
- customer: German business;
- VAT ID entered and checked through the VIES integration or demo fixture;
- negotiated contract;
- custom integration;
- substantial human implementation work;
- recurring support;
- invoice issued directly to the business.

## Не реализовывать сейчас

- Kazakhstan rule pack;
- Kyrgyzstan rule pack;
- personal taxation of the owner;
- founder tax residence;
- salaries;
- dividends;
- multi-company ownership structure;
- intercompany services;
- loans and interest;
- transfer pricing;
- permanent-establishment determination as a final conclusion;
- full corporate-income-tax calculation;
- tax-return filing;
- tax-minimisation recommendations;
- support for every country;
- document-file uploads;
- PDF or OCR processing.

Казахстан, Кыргызстан и более сложная структура бизнеса могут быть только в roadmap.

---

# 6. Обязательный пользовательский путь

1. Пользователь открывает приложение.
2. Загружает demo scenario или заполняет форму.
3. При желании вставляет текстовый фрагмент договора в `Paste contract excerpt (optional)`.
4. GPT-5.6 преобразует данные формы, free-text description и contract excerpt в валидированную модель.
5. GPT-5.6 декомпозирует mixed AI product на компоненты.
6. Система показывает known, inferred, missing и conflicting facts с provenance.
7. Детерминированный rule engine применяет только R1–R12 из этого задания.
8. Приложение строит простую HTML/SVG transaction-flow diagram.
9. Приложение показывает source-backed tax touchpoint matrix.
10. Каждый содержательный юридический или налоговый claim связан с источником или явно помечен как unsourced service text.
11. Пользователь сравнивает France B2C и Germany B2B.
12. Система показывает, какие изменённые факты вызвали различия.
13. Пользователь отвечает на один или несколько missing-fact вопросов.
14. `NormalizedTransaction` обновляется с provenance `user-answered`.
15. Rule engine синхронно перезапускается без нового GPT-вызова.
16. Изменившиеся touchpoints кратко подсвечиваются.
17. Пользователь получает pre-sale checklist.
18. Пользователь открывает Trace & Sources и видит полную цепочку анализа.

---

# 7. Разделение GPT-5.6 и детерминированного движка

## GPT-5.6 отвечает только за

- normalization of free-text input;
- extraction of facts from the pasted contract excerpt;
- service decomposition;
- preliminary classification suggestions;
- detection of missing facts;
- detection of contradictions;
- generation of typed, answerable missing-fact questions;
- explanation of already computed deterministic results;
- explanation of an already computed scenario diff.

## Обычный код отвечает за

- validated schemas;
- provenance tracking;
- deterministic rule conditions;
- rule evaluation;
- source and citation validation;
- VIES adapter and fallback;
- scenario diff;
- missing-fact answers;
- rule-engine reruns;
- changed-touchpoint highlighting;
- audit trace;
- demo fixtures;
- UI rendering.

GPT-5.6 не должен:

- придумывать налоговую норму;
- придумывать ставку;
- придумывать treaty provision;
- создавать новый rule ID;
- менять содержание R1–R12;
- превращать draft/pending source в authoritative source;
- формировать окончательное налоговое заключение.

---

# 8. Source pack, предоставляемый пользователем

Пользователь самостоятельно предоставляет два файла:

- `sources.json`;
- `SOURCE_REVIEW.md`.

Ожидаемые места в проекте:

```text
/data/sources/sources.json
/docs/SOURCE_REVIEW.md
```

## Жёсткие ограничения

- Не генерируй эти файлы заново.
- Не заменяй ссылки.
- Не редактируй цитаты.
- Не меняй `status`.
- Не меняй `humanReviewStatus`.
- Не исправляй их содержательно без прямого указания пользователя.
- Разрешено только подключить файлы, валидировать структуру и читать их из приложения.
- Если файлы отсутствуют, попроси пользователя скопировать их в проект и продолжай с другими независимыми задачами.
- Если schema несовместима, создай adapter/loader вокруг файла, но не переписывай source pack.

Все записи изначально имеют `humanReviewStatus: "pending"`. Пока пользователь вручную не изменит статус:

- источник можно показывать как research source;
- rule можно запускать в draft/demo analysis;
- результат нельзя оформлять как окончательный authoritative conclusion;
- UI должен показывать `Pending human review`.

Если `status` равен `access_failed` или `not_found`, связанное правило должно быть disabled и не может выдавать содержательный вывод.

---

# 9. Источники и достоверность

Это высокорисковая профессиональная область.

Никогда не выдумывай:

- VAT rules;
- tax rates;
- thresholds;
- treaty provisions;
- registration obligations;
- invoice requirements;
- VIES endpoint.

Используй только содержимое предоставленного `sources.json`.

Каждый source record должен проходить validation:

- source ID exists;
- URL exists;
- jurisdiction exists;
- status is recognized;
- humanReviewStatus is recognized;
- linked rule exists;
- authoritative output cannot use a pending, rejected, missing or inaccessible source;
- unknown source ID causes a test failure;
- disabled rule cannot silently fire.

Для цитат применяй canonical exact match:

1. Unicode normalization `NFKC`;
2. normalization of non-breaking spaces to regular spaces;
3. collapse repeated whitespace;
4. preserve words and punctuation;
5. compare the rendered quote to the normalized `excerpt` from `sources.json`.

Не переписывай цитату моделью.

---

# 10. Rule pack content

Кодируй **только** правила R1–R12 ниже.

Не добавляй другие налоговые правила, даже если они кажутся очевидными. Если для вывода не хватает правила, показывай `Not covered by the current MVP rule pack`.

## R1 — B2C electronically supplied service destination rule

Sources: `S1`

Conditions:

- customer is a non-taxable person / consumer;
- customer is located in France;
- relevant component satisfies the preliminary ESS criteria.

Output:

- place-of-supply touchpoint: customer destination / France;
- status cannot be authoritative while S1 is pending;
- if ESS classification is unresolved, status is `Requires verification`.

## R2 — ESS and minimal-human-intervention test

Sources: `S7`, `S6`

Logic:

- use Article 7 criteria as the primary test;
- use Annex II only as an indicative list;
- high automation and minimal human intervention support preliminary ESS classification;
- substantial human involvement means the component may fail the ESS test and requires classification review;
- do **not** encode “substantial human involvement automatically means not ESS” as an absolute rule;
- do not decide single/composite supply treatment.

Outputs:

- `Likely ESS`, `Likely not ESS`, or `Requires verification`;
- supporting and conflicting input facts;
- professional-review flag when mixed supply treatment affects the result.

## R3 — Non-EU seller, B2C ESS, and non-Union OSS

Source: `S9`

Logic:

- Serbian-only seller cannot use the EUR 10,000 threshold reserved for qualifying suppliers established in one EU Member State;
- destination VAT analysis therefore starts with the first taxable covered supply;
- non-Union OSS is an **optional simplification**, not a mandatory scheme;
- the seller may need either non-Union OSS or the applicable national registration route;
- do not claim that OSS registration itself is legally mandatory.

Outputs:

- `Registration/reporting route requires action`;
- options: `Consider non-Union OSS` and `Verify national registration alternative`;
- quarterly-return note only when non-Union OSS is selected or discussed;
- source-backed explanation.

## R4 — Customer-location evidence

Source: `S8`

Logic:

- apply the two-non-conflicting-evidence requirement only when the relevant Article 24b residual presumption applies;
- recognize evidence categories from Article 24f;
- do not present the rule as universal for every delivery channel;
- a Serbian-only supplier does not receive the one-item simplification reserved for the qualifying EU-established threshold case.

Outputs:

- evidence count;
- conflicting evidence warning;
- missing evidence questions;
- `Requires verification` until the required evidence is present.

## R5 — French standard VAT rate, illustrative only

Source: `S11`

Logic:

- display 20% only as an illustrative standard rate;
- do not calculate definitive VAT payable;
- do not imply that no reduced or special treatment could apply;
- display `Illustrative rate — verify before use`.

## R6 — General B2B place-of-supply rule

Source: `S2`

Conditions:

- customer is acting as a taxable person;
- customer business location is Germany;
- no conflicting fixed-establishment fact is unresolved.

Output:

- preliminary place-of-supply touchpoint: customer location / Germany;
- unresolved taxable-person or establishment facts produce `Requires verification`.

## R7 — Reverse charge for qualifying German B2B service

Sources: `S4`, `S12`

Conditions:

- R6 conditions are satisfied;
- supplier is not established in Germany for the relevant supply;
- the supplied service falls within the relevant Article 44 / §13b condition chain;
- German customer is a qualifying recipient.

Output:

- preliminary reverse-charge touchpoint;
- do not state reverse charge as final if any condition is unresolved;
- pending source status must remain visible.

## R8 — Invoice fields for reverse charge

Source: `S5`

Logic:

- when R7 is satisfied, show checklist items for:
  - customer VAT identification number where required;
  - the wording `Reverse charge`;
- source pinpoint must cover Article 226(4) and 226(11a);
- this is a checklist, not an automatically generated legally final invoice.

## R9 — VAT ID validation through VIES

Source: `S10`

Logic:

- validate a German VAT ID through the server-side VIES adapter when live access is enabled and the official endpoint has been verified;
- represent results as `valid`, `invalid`, `unavailable`, `not_checked`, or `fixture`;
- invalid or unavailable does **not** automatically mean B2C;
- those states produce `Requires verification`;
- retain timestamp and request metadata safe for audit;
- recommend retaining evidence of validation.

## R10 — General B2C supplier-location rule for non-ESS human services

Source: `S3`

Logic:

- use Article 45 only as the general B2C rule and as a contrast with R1;
- apply only when the component is preliminarily not ESS and no special rule is represented in the current MVP;
- if another special rule may exist but is outside the rule pack, show `Not covered by the current MVP rule pack` and `Professional review required`;
- do not claim that all consulting or training always follows Article 45.

## R11 — Serbian VAT place-of-supply check

Source: `S13`

The rule is source-gated and data-driven:

- if S13 has `status: access_failed` or `status: not_found`, keep R11 disabled, do not fire it and show `Serbian-side rule pending source availability`;
- if S13 has `status: found` and `humanReviewStatus: pending`, R11 may produce only a draft/research result labelled `Pending human review` and must not create authoritative output;
- an approved S13 may support the corresponding reviewed status, subject to the global professional-review and no-tax-advice constraints;
- distinguish at minimum B2B, B2C, ESS, customer status and relevant special rules;
- for the current official Article 12 excerpt, the represented branches are the B2B general rule in paragraph 4 and the B2C electronically supplied-services rule in paragraph 6 point 7 subpoint 12;
- do not encode the blanket statement “foreign customer means outside Serbia” and do not extend the rule to service types outside those represented branches.

## R12 — Software-rights transfer and Serbia–Germany treaty review

Source: `S14`

Trigger:

- contract or form indicates transfer/licensing of software or IP rights in the Germany B2B scenario.

Output:

- `Professional review required`;
- identify a possible royalty/withholding/treaty-classification question;
- identify the treaty provision as Article 13 in the supplied source;
- do not state that German withholding definitely applies;
- do not state that every software payment is a royalty;
- request facts about rights transferred, exclusivity, reproduction/modification rights, payment structure and beneficial ownership.

---

# 11. VIES live check

Реализуй server-side VIES adapter.

## Ограничения

- Не вызывай VIES непосредственно из браузера.
- Не выдумывай официальный endpoint.
- Не используй неофициальный сторонний VAT-validation API.
- Перед hard-coding endpoint найди и зафиксируй официальную техническую документацию на разрешённом домене.
- Если официальный технический endpoint не подтверждён до feature freeze, оставь live adapter disabled и используй demo fixture с явной маркировкой.

## Environment variables

```text
VIES_LIVE_ENABLED=false
VIES_ENDPOINT_URL=
VIES_TIMEOUT_MS=5000
```

## Поведение

- validate country prefix and basic VAT ID input format locally before network call;
- timeout;
- graceful error handling;
- no crash when service is unavailable;
- demo fixture for the Germany B2B scenario;
- show status, timestamp and whether the result is live or fixture;
- `invalid` and `unavailable` lead to `Requires verification`;
- include result in Transaction Summary, Tax Touchpoints and Trace & Sources.

Не выдавай fixture за live result.

---

# 12. Contract paste

Добавь в input form:

```text
Paste contract excerpt (optional)
```

Только plain text. Не делай file upload.

GPT-5.6 должен извлекать из contract excerpt только факты, поддерживаемые текстом, например:

- service components;
- customer status representations;
- VAT ID wording;
- subscription or one-time structure;
- human implementation obligations;
- support obligations;
- licensing and IP rights;
- invoice recipient;
- location references.

Каждый извлечённый факт получает provenance:

```text
sourceType: "contract"
sourcePointer: character range or short quoted fragment
```

Система сверяет contract-derived facts с form values.

При конфликте:

- не выбирай один вариант молча;
- добавляй `Contradiction`;
- показывай оба значения и provenance;
- создавай typed missing-fact question, если ответ может изменить rule output.

Не сохраняй contract text в публичный fixture и не логируй его в production logs.

---

# 13. Missing-facts loop

Missing facts и contradictions должны быть интерактивными.

## Генерация вопросов

GPT-5.6 на этапе normalization создаёт только вопросы, которые могут изменить:

- service classification;
- customer status;
- VIES status interpretation;
- R1–R12 evaluation;
- checklist result.

Каждый вопрос должен быть typed:

```ts
type MissingFactQuestion = {
  id: string;
  factPath: string;
  prompt: string;
  answerType: "boolean" | "single_select" | "short_text";
  options?: string[];
  affectedRuleIds: string[];
  reason: string;
};
```

Не создавай arbitrary long-form questions.

## Ответ пользователя

- answer updates `NormalizedTransaction`;
- provenance becomes `user-answered`;
- keep previous value in audit history;
- do not call GPT again;
- synchronously rerun the deterministic rule engine;
- compute the touchpoint diff;
- briefly highlight changed statuses;
- preserve answers when switching tabs.

Это основной интерактивный момент demo после Scenario Comparison.

---

# 14. Citation layer

Каждый содержательный результат должен быть представлен claim objects, а не свободной строкой.

```ts
type Claim = {
  id: string;
  text: string;
  sourceIds: string[];
  evidenceRefs?: string[];
  unsourced?: boolean;
};
```

## Разделение ссылок

- `sourceIds` — official legal/tax sources from `sources.json`.
- `evidenceRefs` — transaction evidence such as `form`, `contract`, `demo-fixture`, or `user-answered`.
- claim about law or tax treatment requires `sourceIds`.
- claim about a user-provided transaction fact may use `evidenceRefs` without a legal source.
- service UI phrases may be `unsourced: true`, but they cannot contain substantive tax conclusions.

## UI

- render source footnotes as superscripts;
- clicking a footnote opens the source drawer;
- source drawer shows title, authority, pinpoint, exact excerpt, translation when present, status, human-review status and official URL;
- evidence references open or highlight the corresponding form/contract/user-answer provenance.

## Citation gate

Validator must reject:

- substantive legal claim without sourceIds;
- unknown sourceId;
- claim using source with `status != found` as authoritative;
- claim using `humanReviewStatus != reviewed/approved` as authoritative;
- `Likely applicable` or `Likely not applicable` without a valid source;
- rendered quote that does not canonical-exact-match `source.excerpt`;
- unsourced service phrase containing configured prohibited tax-conclusion patterns.

Pending sources may support only visibly labelled draft/research claims.

Cover citation gate with tests.

---

# 15. Интерфейс и сокращение объёма

Не используй React Flow.

Сделай простую responsive HTML/SVG flow diagram:

```text
Serbian seller → service components → customer → relevant jurisdictions
```

Диаграмма строится из application state, но не требует drag-and-drop.

## View 1: Transaction Input

- concise product explanation;
- `Load France B2C demo`;
- `Load Germany B2B demo`;
- guided form;
- free-text description;
- `Paste contract excerpt (optional)`;
- `Analyze transaction`.

## View 2: Analysis Workspace

Максимум пять вкладок:

1. `Overview`
2. `Tax Touchpoints`
3. `Scenario Comparison`
4. `Checklist`
5. `Trace & Sources`

### Overview

- transaction summary;
- HTML/SVG flow diagram;
- product decomposition;
- known/missing/conflicting facts;
- interactive missing-facts panel;
- VIES status when relevant.

### Tax Touchpoints

Rows:

- customer status;
- service classification;
- VAT place-of-supply question;
- reverse-charge question;
- registration/reporting route;
- customer-location evidence;
- invoice checklist;
- withholding/treaty review;
- professional-review requirement.

Columns:

- topic;
- jurisdiction;
- status;
- claims with citations;
- missing facts;
- review state.

Allowed statuses:

- Likely applicable;
- Likely not applicable;
- Requires verification;
- Insufficient information;
- Professional review required;
- Illustrative only;
- Pending human review;
- Not covered by the current MVP rule pack.

### Scenario Comparison

Compare France B2C and Germany B2B.

For each difference show:

- changed input fact;
- old value;
- new value;
- affected R1–R12 rules;
- changed touchpoint;
- claims and sources;
- concise explanation.

### Checklist

Sections:

- Information to request;
- Evidence to retain;
- Contract points to review;
- Invoice points to review;
- Questions for a qualified adviser.

### Trace & Sources

For each result show:

1. original input fact;
2. provenance;
3. normalized value;
4. GPT classification when present;
5. confidence;
6. missing/conflicting facts;
7. evaluated rules;
8. matched/unresolved conditions;
9. source IDs;
10. source review status;
11. final claim objects;
12. live/fixture metadata.

---

# 16. Модель данных

Используй TypeScript and Zod.

Минимальные сущности:

## `ScenarioInput`

- structured form;
- freeTextDescription;
- contractExcerpt;
- demoScenarioId.

## `FactProvenance`

- sourceType: `form | free-text | contract | model-inference | user-answered | demo-fixture`;
- sourcePointer;
- capturedAt;
- previousValue where applicable.

## `NormalizedTransaction`

- seller;
- customer;
- jurisdictions;
- commercialArrangement;
- serviceComponents;
- paymentFlow;
- contractFlow;
- knownFacts;
- inferredFacts;
- missingFacts;
- contradictions;
- missingFactQuestions;
- provenance;
- normalizationMetadata.

## `ServiceComponent`

- id;
- category;
- description;
- deliveryMode;
- automationLevel;
- humanInvolvement;
- recurring;
- separatelyPriced;
- commercialImportance;
- ipRightsTransferred;
- physicalPresenceRequired;
- evidenceRefs;
- confidence;
- alternatives.

## `SourceReference`

Create a loader schema compatible with the user-provided `sources.json`. Do not rewrite the file to fit the schema.

## `TaxRule`

- id, restricted to R1–R12;
- title;
- jurisdiction;
- topic;
- conditions;
- outputs;
- sourceIds;
- enabled;
- disabledReason;
- authorityStatus.

## `RuleEvaluation`

- ruleId;
- evaluatedConditions;
- matchedConditions;
- unresolvedConditions;
- triggered;
- sourceIds;
- outputStatus.

## `Claim`

As defined in Citation layer.

## `TaxTouchpoint`

- id;
- topic;
- jurisdiction;
- status;
- claims;
- triggeredRuleIds;
- sourceIds;
- missingFacts;
- confidence;
- professionalReviewRequired;
- reviewState.

## `ViesCheckResult`

- countryCode;
- vatNumberMaskedOrSafe;
- status;
- checkedAt;
- liveOrFixture;
- requestIdentifier if safely available;
- errorCode;
- evidenceRef.

## `AnalysisResult`

- input;
- normalizedTransaction;
- serviceClassifications;
- diagramData;
- taxTouchpoints;
- checklist;
- analysisTrace;
- sourceReferences;
- viesCheck;
- modelMetadata;
- generatedAt;
- fixtureOrLive.

## `ScenarioDiff`

- changedInputs;
- affectedRules;
- changedTouchpoints;
- unchangedTouchpoints;
- claims;
- generatedAt.

---

# 17. Детерминированный rule engine

Rule engine должен:

1. принимать `NormalizedTransaction`;
2. загружать только R1–R12;
3. проверять source availability and review status;
4. оценивать каждое условие;
5. фиксировать matched and unresolved conditions;
6. создавать missing facts;
7. отключать rule при недоступном mandatory source;
8. формировать typed touchpoints;
9. формировать claim objects;
10. сохранять trace;
11. поддерживать повторный синхронный запуск после `user-answered`;
12. возвращать diff между предыдущим и новым результатом.

Не создавай сложный DSL. Достаточно прозрачных typed TypeScript predicates.

---

# 18. GPT-5.6 integration

Используй официальный OpenAI JavaScript/TypeScript SDK.

Вызов только server-side.

## Environment variables

Создай `.env.example`:

```text
OPENAI_API_KEY=
OPENAI_MODEL=
NEXT_PUBLIC_DEMO_MODE=
VIES_LIVE_ENABLED=false
VIES_ENDPOINT_URL=
VIES_TIMEOUT_MS=5000
```

Не создавай заполненный `.env.local`.

Не проси пользователя отправить API key в чат.

Сообщи, когда пользователь должен самостоятельно создать `.env.local`.

## Model ID

Не выдумывай GPT-5.6 model identifier. Используй `OPENAI_MODEL`, заданный пользователем или подтверждённый официальной документацией/доступным окружением.

## Structured output

Normalization и decomposition должны использовать schema-constrained structured output.

Каждый ответ проходит Zod validation.

При invalid output:

- limited retry;
- понятная ошибка;
- safe fallback to demo fixture;
- no silent continuation with malformed data.

## GPT tasks

### Task A — Normalize transaction

Merge form, free text and contract facts. Preserve deterministic form values and provenance.

### Task B — Decompose mixed service

Return typed components, supporting facts, alternatives, uncertainty and missing questions.

### Task C — Generate material missing-fact questions

Only questions that can affect R1–R12 or the checklist.

### Task D — Explain deterministic outputs

Input only:

- normalized facts;
- triggered rules;
- source-backed claims;
- missing facts.

No new tax rule generation.

### Task E — Explain scenario diff

Explain only the already computed `ScenarioDiff`.

---

# 19. Demo fixture mode

Приложение работает в двух режимах.

## Live mode

- GPT-5.6 normalization;
- optional verified VIES live check;
- deterministic R1–R12 evaluation.

## Demo fixture mode

- no API dependency;
- typed France B2C fixture;
- typed Germany B2B fixture;
- VIES fixture for Germany;
- same schemas, rule engine, citation gate and UI;
- clear `Demo fixture` label.

Fixture не должен быть отдельным mock screen.

Не выдавай fixture за live analysis.

---

# 20. Технологический стек

Предпочтительно:

- Next.js;
- TypeScript;
- App Router;
- Tailwind CSS;
- Zod;
- official OpenAI SDK;
- Vitest;
- Vercel-compatible deployment;
- pnpm if already available.

Не добавляй:

- database unless strictly necessary;
- React Flow;
- microservices;
- authentication;
- file upload;
- OCR;
- analytics platform.

Для MVP достаточно local typed fixtures, source pack, R1–R12 rule definitions and server routes.

---

# 21. Дизайн

Интерфейс должен выглядеть как профессиональный инструмент для:

- founders;
- finance teams;
- accountants;
- tax advisers;
- compliance professionals.

Используй:

- restrained typography;
- readable tables;
- clear status badges;
- concise cards;
- expandable trace;
- source drawer;
- visible provenance;
- changed-status highlight.

Не используй:

- chatbot-first UI;
- decorative robots;
- generic AI gradients;
- fake dashboard metrics;
- unsupported percentages;
- large walls of model-generated prose.

Главные visual moments:

1. France B2C vs Germany B2B comparison;
2. missing-fact answer reruns rules and changes touchpoints;
3. source footnote opens the exact official excerpt.

---

# 22. Safety and professional-use boundary

Показывай notice:

> TaxGraph is a research and scenario-mapping tool. It does not provide a final tax opinion, calculate definitive tax payable, or replace review by a qualified professional.

Приложение не должно:

- promise the lowest possible tax;
- recommend hiding income or ownership;
- recommend sham entities;
- recommend fabricated expenses;
- suggest evasion or circumvention;
- produce final personalized tax advice;
- file returns;
- guarantee legal compliance;
- predict enforcement outcomes.

Допустимые формулировки:

- identify potential tax touchpoints;
- compare legally available scenarios;
- identify missing evidence;
- identify possible double taxation or overpayment questions;
- prepare questions for professional review.

---

# 23. Критические тесты — только необходимое

Не раздувай тестовую инфраструктуру.

## Schema tests

- valid source pack loads;
- invalid model output fails;
- missing customer country fails safely;
- contract/form contradiction is preserved;
- user-answered provenance is preserved.

## Rule-engine tests

- only R1–R12 can load;
- rule fires only when conditions match;
- unresolved condition creates missing fact;
- R11 cannot fire when S13 is unavailable;
- found-but-pending S13 can produce only draft output labelled `Pending human review`;
- pending source cannot create authoritative status;
- unavailable source disables dependent rule;
- missing-fact answer reruns without GPT;
- touchpoint diff identifies changed statuses.

## Citation-gate tests

- unknown source ID fails;
- substantive claim without legal source fails;
- transaction-fact claim may use evidenceRefs;
- `Likely applicable` without valid source fails;
- pending source is labelled draft;
- canonical exact excerpt match passes;
- altered quote fails.

## Smoke test

1. app opens;
2. France B2C fixture loads;
3. Overview renders;
4. Tax Touchpoints render;
5. source footnote opens drawer;
6. Germany B2B comparison renders;
7. VIES fixture status appears;
8. missing-fact answer updates analysis without GPT;
9. Trace & Sources renders;
10. contract paste field exists.

Before final status run:

- formatter;
- lint;
- typecheck;
- critical tests;
- production build.

Report actual results only.

---

# 24. Git and GitHub

## Initialization

- inspect whether Git exists;
- initialize with `main` if needed;
- create `.gitignore` before dependencies;
- ask once for GitHub remote if missing;
- continue locally if push is temporarily unavailable.

## Never commit

- `.env`;
- `.env.local`;
- API keys;
- access tokens;
- passwords;
- real client documents;
- pasted contract contents;
- personal tax data;
- deployment credentials.

Commit `.env.example` only.

## Commits

After a real working milestone:

1. run relevant checks;
2. inspect `git status`;
3. create a meaningful atomic commit;
4. push to `origin/main` if available;
5. report in Russian:
   - implemented work;
   - tests/checks;
   - commit message;
   - commit hash;
   - push status;
   - unresolved issues.

Do not create empty, artificial, backdated or misleading commits. Do not squash/rewrite without explicit approval.

---

# 25. Competition documentation

## `docs/BUILD_LOG.md`

After each milestone record only actual work:

- date and local time;
- milestone;
- files changed;
- Codex contribution;
- human decision;
- tests;
- known limitations;
- commit hash.

## `docs/DECISIONS.md`

Record:

- Human decision;
- Codex recommendation;
- Final decision.

Human decisions already established:

- narrow to international software/AI sales;
- Serbia as seller;
- France B2C and Germany B2B as demos;
- map touchpoints instead of final tax calculation;
- separate GPT classification from deterministic rules;
- source-backed claims and human review;
- contract paste, not file upload;
- missing-facts loop without repeated GPT calls;
- no Kazakhstan/Kyrgyzstan implementation before submission.

## `docs/COMPETITION_CHECKLIST.md`

Include checkboxes for:

- working project;
- Work & Productivity track;
- primary Codex thread retained;
- `/feedback` Session ID obtained;
- repository accessible;
- README complete;
- demo URL working;
- GPT-5.6 live path documented;
- demo fixture working;
- Codex contribution documented;
- human decisions documented;
- source review completed by user;
- secrets removed;
- tests pass;
- production build passes;
- public YouTube video under three minutes;
- video contains voiceover/English presentation;
- Devpost description ready;
- submission completed before deadline.

Leave Session ID and URLs blank until user supplies them.

## `docs/DEMO_SCRIPT.md`

Target under three minutes:

- 0:00–0:20 — problem;
- 0:20–0:40 — load mixed AI product;
- 0:40–1:00 — decomposition and contract facts;
- 1:00–1:25 — France B2C touchpoints;
- 1:25–1:55 — compare Germany B2B;
- 1:55–2:15 — answer one missing fact and show live rule rerun;
- 2:15–2:35 — open citation/source drawer and VIES status;
- 2:35–2:55 — explain Codex and GPT-5.6 roles;
- 2:55–3:00 — final statement.

Do not mention functionality that is not implemented.

## `docs/SUBMISSION_NOTES.md`

Draft:

- tagline;
- problem;
- target users;
- solution;
- differentiator;
- how it works;
- Codex usage;
- GPT-5.6 usage;
- architecture;
- source integrity;
- limitations;
- future roadmap;
- repository/demo/video URLs;
- Session ID placeholder.

---

# 26. README

README in English must include:

1. title and product statement;
2. problem and target users;
3. supported scope;
4. two demo scenarios;
5. product workflow;
6. key differentiators;
7. architecture;
8. R1–R12 limitation;
9. GPT-5.6 role;
10. deterministic rule-engine role;
11. citation and provenance model;
12. VIES live/fixture distinction;
13. user-provided source pack and human-review gate;
14. safety and limitations;
15. Codex contribution;
16. human decisions;
17. local setup;
18. environment variables;
19. tests and build commands;
20. deployment instructions;
21. demo fixture instructions;
22. roadmap;
23. licence and dependencies;
24. URL placeholders.

Do not promise unsupported jurisdictions or final tax advice.

---

# 27. Deployment

Prepare for Vercel.

- verify production build;
- server-side OpenAI route only;
- server-side VIES adapter only;
- environment variables documented;
- fixture mode works without API;
- graceful API/VIES failure;
- no blank screen;
- no secret exposure.

Before production deployment tell the user:

- required environment variables;
- where to enter them;
- whether live VIES was officially verified;
- what becomes public.

---

# 28. Трёхдневный план

Заменяет любые прежние milestones.

## Day 1 — 19 July 2026

Goal: a working deterministic demo by end of day.

- inspect environment;
- initialize project/Git/docs;
- connect user-provided `sources.json` and `SOURCE_REVIEW.md`;
- schemas and loaders;
- R1–R12 definitions;
- source/review gates;
- deterministic rule engine;
- France/Germany fixtures;
- minimal Input and Analysis Workspace;
- Tax Touchpoints rendering;
- critical schema/rule tests;
- working demo, commit and push.

## Day 2 — 20 July 2026

Goal: complete feature set and feature freeze by evening.

- citation layer and source drawer;
- static HTML/SVG flow diagram;
- scenario comparison;
- checklist;
- Trace & Sources;
- contract paste;
- GPT-5.6 normalization/decomposition;
- missing-facts loop;
- VIES adapter if official endpoint is verified;
- VIES fixture and fallback;
- citation/smoke tests;
- working deployed preview;
- feature freeze in the evening.

## Day 3 — 21 July 2026

No new product features.

- bug fixes;
- source-review integration after user decisions;
- responsive polish;
- production deployment;
- README and competition docs;
- final test/build run;
- screenshots;
- video;
- submission.

Every day must end with a runnable demo.

---

# 29. Acceptance criteria

MVP is complete only when:

- app runs from README instructions;
- production build passes;
- France B2C fixture loads;
- Germany B2B fixture loads;
- live GPT path exists and is meaningfully integrated;
- fixture path works without API;
- contract paste is parsed with provenance;
- contradictions are visible;
- product decomposition works;
- flow diagram renders from state;
- R1–R12 are the only tax rules;
- R11 is disabled when S13 is unavailable and is draft-only while S13 review is pending;
- Tax Touchpoints render claim objects;
- source footnotes open exact excerpts;
- citation gate passes;
- scenario comparison explains changed facts;
- one missing-fact answer reruns rules without GPT;
- changed touchpoints are highlighted;
- VIES result is labelled live/fixture/unavailable;
- invalid VIES does not automatically create B2C status;
- pending sources are visibly pending;
- unsupported conclusions are blocked;
- API keys are not exposed;
- critical tests pass;
- README and competition docs reflect actual functionality;
- the full demo fits under three minutes.

---

# 30. Roadmap only

Document but do not implement:

- Kazakhstan and Kyrgyzstan destination packs;
- founder tax residence;
- multi-company structures;
- salaries and dividends;
- intercompany services;
- loans and interest;
- transfer pricing;
- treaty-network analysis;
- regulatory-change monitoring.

---

# 31. Первое действие

Сейчас:

1. Изучи текущую папку и окружение.
2. Сообщи по-русски:
   - detected tools and versions;
   - package manager;
   - Git status;
   - GitHub remote status;
   - whether `sources.json` and `SOURCE_REVIEW.md` are present;
   - assumptions and blockers.
3. Создай `PROJECT_PLAN.md` по трёхдневному плану.
4. Инициализируй Next.js/TypeScript project and Git if needed.
5. Создай `.gitignore` и `.env.example`.
6. Создай competition docs without fabricated entries.
7. Подключи source pack without substantive modification.
8. Создай schemas, fixtures and R1–R12 skeletons.
9. Запусти initial checks.
10. Сделай первый честный commit.
11. Push if remote/auth are available.
12. Продолжи Day 1 implementation, не останавливаясь на плане.
