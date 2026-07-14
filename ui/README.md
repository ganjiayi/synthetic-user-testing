# SynthUX — Synthetic UX Research Platform

A React web app for creating, reviewing, and running synthetic UX research studies.

## Pages

- **Landing** — Hero with Get started CTA and 3-step USP section
- **Questionnaire** — 7-step multi-page form with product card selection, persona card selection, save draft, and submit
- **Plan Viewer** — Generated study plan with edit mode, save, download DOCX, and Run Research CTA

## Setup

```bash
npm install
npm start
```

Opens at http://localhost:3000

## Build for production

```bash
npm run build
```

## Deploy to Vercel

1. Push to GitHub
2. Import repo at vercel.com/new
3. Vercel auto-detects Create React App — no config needed
4. `vercel.json` is already included for client-side routing

## File structure

```
src/
├── App.js                    # Router between pages
├── styles.css                # Global tokens and reset
├── pages/
│   ├── Landing.js            # Landing page
│   ├── Questionnaire.js      # 7-step questionnaire
│   └── PlanViewer.js         # Generated plan viewer
├── components/
│   ├── Nav.js                # Top navigation
│   └── UI.js                 # Shared components (SelectCard, PersonaCard, Pill, etc.)
└── data/
    └── questionnaire.js      # Step definitions, persona data, product data
```

## Connecting to the pipeline

The questionnaire `form` state is transformed into the intake payload by `buildIntake(form, runId)` in `src/api.js` (see that file for the exact `q1_product` … `q8_output` shape). Submission is a two-step call, not a single request:

```js
// In IntakeReview.js / api.js
const runId  = generateRunId(form.feature);
const intake = buildIntake(form, runId);

await api.createRun(runId, intake);   // POST /api/runs — persists intake, status: 'intake_saved'
await api.startPlan(runId);           // POST /api/runs/:id/plan — generates the study plan
```
