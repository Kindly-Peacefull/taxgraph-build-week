# Build log

## 2026-07-19 04:40 +06 — Repository and canonical-source baseline

- **Files changed:** canonical brief, source/rule packs, source review register, project configuration, planning and competition documentation.
- **Codex contribution:** located and read the canonical materials, copied them without substantive modification, inspected GitHub access, initialized the branch, and defined the safe implementation baseline.
- **Human decision:** use `CODEX_PROMPT_FINAL.md` and `*.codex.*` as the only authoritative implementation/source inputs.
- **Checks:** source files were read and SHA-256 hashes were calculated; implementation checks not yet run.
- **Known limitations:** source review remains pending; live GPT and VIES have not yet been exercised; no commit exists yet.
- **Commit:** `a80974d`.

## 2026-07-19 05:10 +06 — Competition-ready local MVP

- **Files changed:** Next.js application, typed domain/source/citation/rule modules, fixtures, OpenAI and VIES server routes, responsive five-view UI, tests, README, and competition documentation.
- **Codex contribution:** implemented the complete local MVP, source and review gates, deterministic R1–R12 evaluation, fixture/live separation, scenario diff, no-GPT answer rerun, exact source drawer, audit trace, and responsive UI; diagnosed and fixed package-toolchain and production-bundle compatibility issues.
- **Human decision:** preserve the narrow Serbian-seller / France B2C / Germany B2B scope and leave all canonical sources pending qualified review.
- **Checks:** Prettier passed; ESLint passed; TypeScript passed; 22 Vitest tests passed across 4 files; Next.js 16.2.10 production build passed; browser smoke passed across both fixtures and all five views; 390 px viewport had no page-level horizontal overflow.
- **Known limitations:** live OpenAI path was not called without user-supplied credentials; live VIES remains disabled pending a reviewer-confirmed full official operation URL; source review, Vercel deployment, public video, `/feedback` Session ID, and Devpost submission remain external user/release actions.
- **Commit:** `c4df561`.

## 2026-07-19 06:07 +06 — Public fixture-only release

- **Files changed:** deployment ignore rules, README deployment evidence, competition checklist, submission notes, and this build log.
- **Codex contribution:** connected the merged GitHub repository to a Vercel Hobby project, configured non-sensitive fixture/live-mode flags for Production and Preview, created the public deployment, and ran production smoke checks.
- **Human decision:** continue without an OpenAI API key for now and add it later; keep live VIES disabled until the official operation URL and production behavior receive release review.
- **Checks:** Vercel production build passed; the stable public URL loaded both fixtures and all five views; the matrix contained nine touchpoints; S7 opened with its exact canonical excerpt; the France missing-fact answer reran without GPT; the Germany trace exposed the fixture request ID; the no-key path showed a graceful error while retaining the fixture; the VIES route returned `LIVE_DISABLED`; no browser console errors were reported.
- **Known limitations:** live OpenAI and live VIES remain unverified and disabled; source review, public video, `/feedback` Session ID, and Devpost submission remain external user/release actions.
- **Commit:** pending.
