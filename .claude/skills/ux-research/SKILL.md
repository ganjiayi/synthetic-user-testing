---
name: ux-research
description: Use this skill whenever generating, evaluating, or structuring synthetic UX 
research outputs for the Astro Malaysia synthetic-user-testing pipeline. Triggers include: 
generating a research study plan from an intake questionnaire, running synthetic persona 
sessions, writing session logs, evaluating task completion, or producing stakeholder research 
reports. Also use when constructing research questions, defining inclusion/exclusion criteria, 
writing facilitator guides, or structuring findings into NNG-standard formats. This skill is 
synthetic-first — real user data is an optional supplement, never a requirement. Vision 
capabilities must be used whenever images are provided, regardless of which model is active.
---

This skill governs how Claude structures, conducts, and reports synthetic UX research for the
Astro Malaysia synthetic-user-testing pipeline. All outputs must meet NNG-standard research
rigour. The pipeline runs on synthetic persona simulation by default. Real user data — where
available — may be provided by the researcher to supplement, validate, or contrast synthetic
findings, but is never assumed to be present.

When images are uploaded (screenshots, UI designs, prototypes, analytics dashboards), vision
capabilities must be used to analyse them and ground session outputs in what is visually
present — regardless of which model is running.

Persona selection is dynamic — sessions are anchored to whichever persona files are active
in the current run, resolved from `/personas/` via each segment's `persona_library_ref`
in the study plan.

---

## 0. Synthetic-First Principle

This pipeline is designed to operate entirely on synthetic data. Every output — plans,
sessions, logs, evaluations, reports — must be complete and meaningful without any real
user data.

Real user data is treated as an **optional enrichment layer**:
- Provided by the researcher when available (e.g. analytics, prior interview quotes,
  support tickets, survey results)
- Supplements synthetic findings — does not replace or override them
- Must always be clearly labelled as real when present, so synthetic and real evidence
  are never conflated in outputs
- Its absence never blocks the pipeline from running or producing a valid report

**Visual inputs are also treated as an optional enrichment layer:**
- The researcher may upload screenshots, UI designs, prototypes, or any product image
  at any stage of the pipeline
- When provided, vision capabilities must be activated to analyse the image before
  generating any output that references it
- Visual inputs ground synthetic persona reactions in what is actually on screen,
  not what the pipeline assumes is there
- Their absence never blocks the pipeline — text-only simulation remains fully valid

When real user data is provided, the pipeline uses it to:
- Calibrate persona behaviour against observed real patterns
- Corroborate or flag divergence in synthetic findings
- Add a validation layer to high-severity recommendations

---

## 1. Research Plan Structure

Every study plan generated via `api/runs/[id]/plan.js` must include these sections in order,
following NNG's core components: purpose, participants, method, and relevant documents.

1. **Study Purpose** — what product/feature is being tested, what needs to be learned,
   and why
2. **Research Questions** — 3–6 questions starting with What / Why / How / Which / When
3. **Participants** — persona(s) selected from active library, sampling rationale,
   inclusion/exclusion criteria, sample size with justification
4. **Methodology** — method name, modality (text simulation vs tool-use simulation),
   session structure and length
5. **Task List** — task title, instruction, success criteria, and priority (P0/P1/P2)
6. **Schedule** — run date (DDMMYYYY), session count, persona assignments
7. **Visual Assets** *(optional)* — if the researcher is uploading images (screenshots,
   prototypes, UI designs), list them here with a description of what each shows and
   which tasks or research questions they support
8. **Real User Supplement** *(optional)* — if the researcher is providing real user data,
   describe the source, format, and which research questions it will inform
9. **Relevant Documents** — references to persona file, product DB entry, scenario file,
   facilitator guide, and any prototype or product links

The method section must be detailed enough that the study could be replicated in the future.

---

## 2. Research Questions — Quality Rules

A valid research question must be:
- **Specific**: answerable within the scope of one synthetic session
- **Practical**: testable via the product surface being simulated
- **Actionable**: the answer should inform a design, product, or content decision

❌ Poor: "What do users think of Astro?"  
✅ Good: "Why do Family-Centric Devotee personas abandon the channel search flow before
   completing a selection?"

Always follow this chain: research goal → 3–6 questions → each question maps to ≥1 task.

Research questions should start with: What, When, Why, Which, How.
Avoid yes/no questions — they produce binary outputs with no design signal.

If visual assets or real user data are available for a specific question, note it in
the plan so the evaluator can cross-reference synthetic findings against them.

---

## 3. Persona Application in Sessions

Each synthetic session must be anchored to a defined persona file from the active persona
library. The library is versioned (e.g. v4) and may expand over time as new archetypes are
added or existing ones revised.

**Persona files live in:** `/personas/`  
Each persona file must include the required schema layers (demographics, psychographics,
tech literacy, UX change response, platform relationship, Astro-specific pain points, plus
any extended layers added in future versions) to be valid for simulation.

**At session time, the pipeline must:**
- Resolve each active persona via its `persona_library_ref` in the study plan
- Inject the full persona context block at session start (demographics + psychographics
  + platform relationship)
- Simulate opening context questions consistent with NNG's initial interview format:
  background, typical day, prior product experience
- Maintain persona voice and decision logic throughout all task attempts
- Flag any out-of-character responses with `[PERSONA DRIFT]` tag for evaluator review

**Visual stimuli in sessions (optional):**  
When images are uploaded, the persona must respond to what is visually present on screen —
not to a generic description of the product. Vision analysis must happen before the persona
reacts. The persona's response should reflect:
- What they notice first (visual hierarchy as seen by this archetype)
- What they expect to be tappable or interactive
- What causes confusion based on their tech literacy and UX change tolerance
- Any language, layout, or content mismatches relevant to their archetype

**Real user calibration (optional):**  
If the researcher provides real user data relevant to a persona archetype, this data may
be used to refine the persona's starting context, validate simulated behaviour against
observed real patterns, or flag divergence for the evaluator. Real user data used for
calibration must be noted in the session log under `real_user_supplement`. It does not
alter the persona file itself.

**Adding new personas:**  
Any persona file that meets the required schema can be added to `/personas/` and used in
sessions immediately — no pipeline changes required.

---

## 4. Session Structure

Synthetic sessions follow NNG's moderated usability test format, adapted for AI simulation.
Each session must follow this sequence:

```
[OPEN — ~10% of session]
Persona context injection
Simulated initial questions (background, prior product use, typical day)
Vision analysis of any uploaded images (run before tasks begin)

[TASKS — ~80% of session]
Tasks administered in priority order (P0 first)
Visual stimuli shown per task where images are available
Post-task probing after each task attempt
If P0/P1 tasks complete early, P2 tasks administered next

[CLOSE — ~10% of session]
Closing questions (overall impression, ease/difficulty, improvement wishes)
Session notes and flags recorded
```

Closing questions must always include:
- Overall impression of the product/feature tested today
- What was particularly easy or difficult, and why
- What the persona wishes could be improved
- Anything not covered in tasks the persona would raise unprompted

---

## 5. Task Design Rules

Tasks must be written as **realistic participant instructions**, not researcher instructions.

❌ Poor: "Test the search functionality."  
✅ Good: "You want to find a Malay drama to watch with your parents tonight. Use the app
   to find something suitable."

Each task must specify:
- **Task ID** (T01, T02…)
- **Top task category** (Navigation / Discovery / Account / Payment / Support)
- **Participant instruction** (scenario-framed, plain language, no leading)
- **Visual asset reference** *(optional)* — if an uploaded image anchors this task,
  reference it here (e.g. `image: homepage_screenshot_01.png`)
- **Expected completion path** (for evaluator reference only — never shown to persona)
- **Success criteria** (binary: completed / not completed + optional partial credit notes)
- **Priority** (P0 = core flow, P1 = secondary, P2 = edge case)

When a visual asset is referenced in a task:
- Vision analysis of that image must be completed before the persona attempts the task
- The persona's friction points and verbatim must reference specific visible UI elements,
  not generic assumptions about what the screen contains

**Task turn generation — deterministic, from questionnaire input.**
When a task's instruction in the intake questionnaire contains multiple atomic
sub-questions (e.g. "a) ... b) ... c) ..."), each sub-question must be administered
as its own turn, phrased close to verbatim from the input. Do not merge or paraphrase
multiple sub-questions into a single combined prompt — merging loses the ability to
tell which specific sub-question a persona struggled with.

Post-task probes must be derived 1:1 from the questionnaire, in this order:
1. **One probe per objective** listed under the questionnaire's `Testing:` field,
   phrased as a direct, non-leading question drawn from that objective.
   Example: `Testing: Are users confused about the information presented?` →
   "Was there anything on this page that felt unclear or confusing?"
2. **One targeted probe per caution** listed under `What must not be assumed`,
   designed to directly test that specific assumption rather than leaving it as
   an implicit cue for the researcher to watch for while narrating.
   Example: `Do not assume users understand pack names indicate content type` →
   "What do you think each pack actually includes, without scrolling back to check?"
   Example: `Do not assume users will scroll to the FAQ` →
   "Did you look at anything further down the page, like more detailed questions
   or an FAQ section?"
3. If the questionnaire supplies no `Testing:` field or `What must not be assumed`
   field for a task, fall back to the generic non-leading probes below.

Generic fallback probes (only when the questionnaire has no explicit objectives or
cautions to derive a probe from):
- "What were you expecting to happen there?"
- "What would you do next?"
- "Was there anything unclear?"

This rule governs the TASK phase only (Section 4). The OPEN and CLOSE phases are
fixed regardless of questionnaire content and are not affected by this rule — every
session still opens with background/typical-day/prior-experience questions and
closes with the four standard closing questions, unchanged.

---

## 6. Session Log Format (`session_log.json`)

Each session entry must capture:

```json
{
  "session_id": "S01",
  "run_date": "DDMMYYYY",
  "persona": "persona-filename",
  "persona_version": "v4",
  "product": "ACM",
  "model": "claude-sonnet-4-20250514",
  "data_mode": "synthetic",
  "visual_inputs": [
    {
      "image_id": "IMG01",
      "filename": "homepage_screenshot_01.png",
      "description": "Astro.com.my homepage as of May 2025",
      "used_in_tasks": ["T01", "T02"],
      "vision_observations": [
        "Primary navigation is top-aligned with 6 items",
        "Hero banner occupies ~60% of viewport with a Malay-language CTA",
        "Search icon visible top-right but small relative to banner"
      ]
    }
  ],
  "tasks": [
    {
      "task_id": "T01",
      "title": "Find a Malay drama",
      "visual_asset_ref": "IMG01",
      "completed": true,
      "partial": false,
      "friction_points": [
        "Search icon not immediately noticed — persona scanned nav bar first",
        "Filter UI not visible on first scroll"
      ],
      "verbatim": "I see a big banner but I'm not sure where to start looking for dramas...",
      "post_task_probe": "Expected a Browse or Categories option in the main nav",
      "sentiment": "frustrated",
      "severity": "medium"
    }
  ],
  "closing_responses": {
    "overall_impression": "",
    "ease_difficulty": "",
    "improvement_wishes": "",
    "unprompted_feedback": ""
  },
  "real_user_supplement": {
    "provided": false,
    "source": null,
    "description": null,
    "applies_to_questions": [],
    "corroborates_synthetic": null,
    "divergence_notes": null
  },
  "session_notes": "",
  "flags": []
}
```

**`data_mode` values:** `synthetic` | `supplemented`  
Set to `supplemented` when real user data has been provided and used in this session.

**`visual_inputs` rules:**
- Include one entry per uploaded image used in the session
- `vision_observations` — what the model actually sees in the image; factual,
  layout-level observations (hierarchy, labels, CTAs, navigation structure)
- If no images were uploaded, set `visual_inputs` to `[]`
- `vision_observations` must be completed before any task that references that image

**`real_user_supplement` rules:**
- `provided: false` — leave all other fields null
- `provided: true` — all fields must be populated
- `corroborates_synthetic`: `true` | `false` | `partial`
- `divergence_notes` — required when `corroborates_synthetic` is `false` or `partial`

**General rules:**
- `friction_points` — observable behaviours only, not inferred conclusions
- When a visual asset is referenced, friction points must cite specific visible UI
  elements from `vision_observations`, not generic assumptions
- `verbatim` — persona's own words, in character
- `sentiment`: `neutral` | `satisfied` | `frustrated` | `confused` | `delighted`
- `severity`: `low` | `medium` | `high` | `critical`
- `closing_responses` — must be populated for every session, never left blank

**Notetaking standard (NNG):**  
Poor note: "Persona was confused."  
Good note: "Persona expected to find Malay titles first after setting UI language to BM."  
One observation per friction point. Stick to what was observed, not solutions or conclusions.

---

## 7. Evaluation Rubric Alignment

When `src/lib/evaluate.js` scores a session, apply these criteria per task:

| Dimension | What to assess |
|---|---|
| **Completion** | Did the persona complete the task within the simulated flow? |
| **Friction** | How many decision points caused hesitation, workaround, or abandonment? |
| **Persona Consistency** | Did behaviour match the archetype's known patterns? Flag drift if not. |
| **Signal Quality** | Does the output surface a design-actionable insight? |
| **Severity** | Would this friction block a real user of this archetype? |
| **Post-task Validity** | Does the post-task probe add diagnostic depth beyond completion status? |
| **Visual Grounding** *(if images provided)* | Are friction points grounded in specific visible UI elements from vision analysis, not generic assumptions? |
| **Real Data Alignment** *(if supplemented)* | Do synthetic findings corroborate or diverge from provided real user data? |

Scores must roll up per research question, not just per task.  
Persona drift flags must be reviewed before report generation — resolve or explicitly note.  
Conditional dimensions only apply when their input type is present in the session.

---

## 8. Research Report Structure

Reports follow a three-part NNG-aligned narrative. Part 1 uses the preferred layout order.
`src/lib/report.js` synthesises this structure as JSON, which is then rendered to the
deliverable formats (CSV, `.docx` transcript, `.pptx` presentation) — there is no
standalone `research_report.md` file; the structure below is the canonical shape regardless
of which format it's exported to.

### Part 1 — Study Overview
- Research questions
- Run date(s) (DDMMYYYY)
- Synthetic users (persona name + version)
- Methodology description (method, modality, session count)
- Data mode: `Synthetic only` | `Synthetic + visual inputs` |
  `Synthetic + real user supplement [source]` | `Synthetic + visual inputs + real user supplement [source]`
- Task list with completion rates: `T01 — Find a Malay drama — 4/5 completed (80%)`

### Part 2 — Findings by Research Question
For each research question:
- **Finding**: one-sentence answer grounded in session data
- **Evidence**: 2–3 friction points or verbatim quotes with session + task ID citations
- **Data source label** on every evidence item:
  `[Synthetic]` | `[Synthetic + Visual]` | `[Supplemented — source name]`
- **Severity**: aggregate severity across sessions
- **Affected Personas**: which archetypes were most impacted
- **Visual note** *(if images provided)*: reference the specific screen or UI element
  the finding is grounded in
- **Real data note** *(if supplemented)*: whether real data corroborates or diverges,
  and what that means for confidence level

### Part 3 — Recommendations
- Prioritised by severity: Critical → High → Medium → Low
- Each recommendation tied to a specific finding with citation
- Format: `[Area] — [Observation] → [Recommendation]`
- Example: `[Search] — BM-first users received English results before Malay →
  Localise search result ranking by UI language preference (S01-T01, S03-T01)`
- Where visual evidence grounds a recommendation, reference the screen it came from
- Where real user data corroborates a synthetic finding, note it — raises confidence
- Where real user data diverges, flag as requiring validation before acting

**Stakeholder guidance:**
- Always make data source visible: synthetic, visual, supplemented — or a combination
- Part 2 findings must be falsifiable — grounded in session evidence, not assertion
- Stakeholders should calibrate confidence based on data source labelling

---

## 9. Output Quality Checks

Before finalising any pipeline output, verify:

- [ ] Every research question maps to at least one task
- [ ] Every task has a success criterion and priority assigned
- [ ] Session log `friction_points` are observable, not interpretive
- [ ] `closing_responses` populated for every session
- [ ] `data_mode` correctly set per session
- [ ] If images were uploaded: `visual_inputs` block populated with `vision_observations`
  before any task referencing that image was run
- [ ] If images were uploaded: friction points citing visual elements reference only what
  is present in `vision_observations` — no assumed UI elements
- [ ] If `supplemented`: `real_user_supplement` block fully populated
- [ ] Synthetic, visual, and real evidence never mixed without correct source labels
- [ ] Report findings cite session evidence (session ID + task ID)
- [ ] Recommendations are actionable without further clarification
- [ ] Divergence between synthetic and real data flagged, not silently resolved
- [ ] Persona drift flags reviewed before report runs
- [ ] Report Part 1 order: Research Questions → Dates → Synthetic Users →
  Methodology → Data Mode → Task Title + Completion %
- [ ] Post-task probes are non-leading
- [ ] Every atomic sub-question in the task instruction is administered as its own turn
  (not merged/paraphrased into one combined prompt)
- [ ] Every `Testing:` objective and every `What must not be assumed` caution in the
  questionnaire has exactly one corresponding probe turn tied to it
- [ ] OPEN and CLOSE phase questions are unchanged from the fixed Section 4 structure

---

## 10. Simulation Mode Selection

Use **text simulation** (default) when:
- Mapping mental models and decision logic
- Running discovery-phase research
- Covering broad task coverage across multiple personas efficiently

Use **tool-use simulation** when:
- Testing specific UI flows that require state (login, cart, search filters)
- Validating a flow that text simulation flagged as high-severity
- Reproducing a specific friction point for deeper investigation

Text simulation always runs first. Tool-use simulation is reserved for flows that
text simulation has already identified as warranting the higher cost.

Real user data and visual inputs supplement either simulation mode — they do not
change which mode is selected.

---

## 11. Vision Input Handling

Vision capabilities must be used whenever images are uploaded — regardless of which
model is active. This is not model-specific behaviour; it is a pipeline requirement.

**Supported image types:**
- Product screenshots (web, mobile, app)
- UI wireframes and prototypes
- Analytics dashboards and heatmaps
- Error states and edge case screens
- Onboarding flows and modal overlays
- Any visual asset the researcher deems relevant to a task or research question

**Vision analysis must produce:**
1. **Layout observations** — what is on screen, where, and in what visual hierarchy
2. **Language and localisation observations** — UI language, any mixed-language content
3. **Interactive element inventory** — buttons, links, inputs, navigation items visible
4. **Potential friction indicators** — elements that are small, ambiguous, hidden,
   or inconsistent with standard patterns for this product type
5. **Persona-relevant observations** — flag anything specifically relevant to the
   active persona's tech literacy, language preference, or UX change tolerance

**Vision analysis runs:**
- Once per image at session open, stored in `visual_inputs.vision_observations`
- Before any task that references that image — do not re-run unless a new image
  is provided for a later task

**When vision is unavailable for the active model:**
- Note in `session_notes`: `[VISION UNAVAILABLE — model: x]`
- Fall back to researcher-provided image description if supplied in the task or plan
- If no description is available, note `[NO VISUAL CONTEXT]` on affected tasks and
  flag for re-run with a vision-capable model
- Do not fabricate UI observations — only describe what has been explicitly provided

**Quality rule:**  
Vision observations must be factual and layout-level. They describe what is present.
Persona reactions to those observations are separate and happen during task simulation.

❌ Poor vision observation: "The search bar is hard to find."  
✅ Good vision observation: "Search icon is 18px, top-right corner, no label text,
   adjacent to a profile icon of similar size."

The persona then reacts to that observation through their archetype lens — the
difficulty inference belongs in `friction_points`, not in `vision_observations`.
