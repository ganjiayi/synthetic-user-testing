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

The questionnaire `form` state maps directly to `intake_schema.json` in the Node.js pipeline. On submit, send the form object to your backend:

```js
// In Questionnaire.js handleSubmit()
const res = await fetch('/api/generate-plan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(form),
});
const plan = await res.json();
goTo('plan', plan);
```
