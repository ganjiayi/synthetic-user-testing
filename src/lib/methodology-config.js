/**
 * Single source of truth for everything that varies by research methodology.
 *
 * Consumed by:
 *   - api/runs/[id]/plan.js   — injects eval_schema/session_config/task_derivation
 *                                into the research-planner prompt, then persists
 *                                the resolved config onto plan.methodology_config
 *                                so a run's behaviour stays stable even if this
 *                                file changes later.
 *   - src/lib/evaluate.js     — builds the per-turn JSON schema the persona must
 *                                follow, and parses eval_scores, from eval_schema.
 *   - src/lib/report.js       — drives the deliverables-synthesis prompt
 *                                (key_moments / findings categories).
 *   - ui/src/pages/RunDetail.js — drives CSV columns and per-task rendering.
 *
 * runner_type:
 *   'task_based'             — persona navigates a UI across multiple turns (click/scroll).
 *   'reaction_based'         — persona reacts to a concept in one or two turns, no navigation.
 *   'impression_based'       — persona gives a single-turn emotional/aesthetic reaction.
 *   'comparative_task_based' — persona attempts the same task on Variant A, then Variant B,
 *                              then gives one comparison turn stating a preference. Still
 *                              navigation-capable per variant attempt.
 *
 * navigation_required is derived from runner_type — task_based and comparative_task_based
 * methodologies ask the persona for click_target/scroll_direction or get browser-driven turns.
 *
 * qa_thresholds drives the Step 6.5 QA gate's automatic flagging (a session tripping
 * one of these is surfaced to the researcher for an include/exclude call — never
 * auto-dropped). Kept separate from data_integrity_rules, which govern what the
 * report-writer LLM may claim, not which sessions get flagged for human review:
 *   - min_turns_for_signal:        below this many turns, the session is too short to
 *                                   carry reliable signal — flag as "limited data".
 *   - early_abandon_turn:          an abandon at or before this turn number is flagged
 *                                   as suspiciously early rather than a genuine struggle.
 *   - max_consecutive_parse_errors: this many consecutive parse_error/model_error turns
 *                                   flags the session as unreliable (model/harness issue,
 *                                   not a real persona reaction).
 *   - stuck_loop_tolerance:        this many stuck_loop_flags entries flags the session
 *                                   for review (distinct from session_config's in-session
 *                                   abandon threshold — this is a post-hoc QA signal).
 */

const METHODOLOGY_CONFIGS = {
  'Usability Testing': {
    methodology_id: 'usability_testing',
    runner_type: 'task_based',
    ui_description: 'Task-based — where do users get stuck or abandon?',

    session_config: { max_turns: 20, stuck_loop_threshold: 3, session_mode: 'multi_turn' },

    qa_thresholds: { min_turns_for_signal: 3, early_abandon_turn: 2, max_consecutive_parse_errors: 2, stuck_loop_tolerance: 2 },

    eval_schema: {
      fields: [
        { key: 'friction_score',   type: 'number 0-10',       description: '0 = completely smooth, 10 = blocked entirely' },
        { key: 'confusion_signal', type: 'string or null',     description: 'short description of confusion, null if none' },
        { key: 'trust_signal',     type: 'string or null',     description: 'short description of trust/distrust reaction, null if none' },
      ],
    },

    task_derivation: {
      success_condition: 'User completes the described action and reaches the defined endpoint without external assistance.',
      abandon_condition: 'User makes 3 or more attempts without forward progress, or explicitly expresses that they cannot continue.',
    },

    persona_instruction_mode: 'Task-directed. Navigate step by step toward the success condition, reporting friction, confusion, and trust signals as they occur.',

    planner_guidance: 'Focus the plan on task completion and friction identification. Define a clear success condition and abandon condition for every task. Identify the exact UI steps where drop-off is most likely. The primary metric is task completion rate.',

    data_integrity_rules: [
      'No finding may be fabricated or inferred beyond what session data directly supports.',
      'Every finding must be traceable to a specific session — cite as (PersonaName · TaskID).',
      'If fewer than 3 sessions produced signal on a metric, label it "limited signal" and do not draw conclusions from it.',
    ],

    keyMoments: [
      { key: 'aha_moments',         label: '"Aha" Moments',     description: 'Quote + context where the persona found value' },
      { key: 'friction_moments',    label: 'Friction Moments',  description: 'Quote + what they were trying to do when stuck' },
      { key: 'design_observations', label: 'Design Observations', description: 'Notable usability comments about the interface' },
      { key: 'comparison_moments',  label: 'Comparison Moments', description: "References to the persona's current mental or physical system" },
      { key: 'cultural_fit',        label: 'Cultural Fit',      description: 'Where the product aligns or conflicts with the persona\'s cultural/professional norms' },
    ],
    findingsKey: 'usability_findings',
    findings: [
      { key: 'what_worked',     label: 'What Worked',     description: 'Features understood immediately, tasks completed easily, pain points solved, design elements that helped' },
      { key: 'what_didnt_work', label: "What Didn't Work", description: 'Confusing functionality, things they could not figure out, tasks abandoned, design issues' },
      { key: 'whats_missing',   label: "What's Missing",  description: 'Expected features not present, things needed for their use case, considerations not addressed' },
    ],
  },

  'A/B Testing': {
    methodology_id: 'ab_testing',
    runner_type: 'comparative_task_based',
    ui_description: 'Comparative — same task on two variants, then a stated preference.',

    session_config: { max_turns: 20, stuck_loop_threshold: 3, session_mode: 'comparative' },

    // Higher min_turns_for_signal than Usability Testing — a comparative
    // session needs enough turns to cover both variant attempts plus the
    // comparison turn before its preference signal is meaningful.
    qa_thresholds: { min_turns_for_signal: 4, early_abandon_turn: 2, max_consecutive_parse_errors: 2, stuck_loop_tolerance: 2 },

    eval_schema: {
      fields: [
        { key: 'friction_score',       type: 'number 0-10',    description: '0 = completely smooth, 10 = blocked entirely — score whichever variant is currently being attempted' },
        { key: 'confusion_signal',     type: 'string or null', description: 'short description of confusion, null if none' },
        { key: 'trust_signal',         type: 'string or null', description: 'short description of trust/distrust reaction, null if none' },
        { key: 'preferred_variant',    type: 'categorical: A | B | no_preference', description: 'which variant is preferred — null on every turn except the final comparison turn for a task, where it is required' },
        { key: 'preference_reasoning', type: 'string or null', description: 'why that variant was preferred, citing a specific difference actually observed — null on every turn except the final comparison turn' },
      ],
    },

    task_derivation: {
      success_condition: 'User completes the described action and reaches the defined endpoint on both variants without external assistance.',
      abandon_condition: 'User makes 3 or more attempts without forward progress on a variant, or explicitly expresses that they cannot continue on that variant.',
    },

    persona_instruction_mode: 'Comparative. You will attempt the same task twice — first on Variant A, then on Variant B — reporting friction, confusion, and trust signals for whichever variant is currently in front of you. Leave preferred_variant and preference_reasoning null on every turn during those two attempts. Once you have attempted the task on both variants, you will be given one final comparison turn: state which variant you preferred and why, citing a specific difference between the two attempts. Do not state a preference without a concrete reason grounded in what you actually experienced on each variant. On that final comparison turn only, set friction_score to 0 and confusion_signal/trust_signal to null — you are reflecting on both attempts, not attempting the task again.',

    planner_guidance: 'This study compares two variants of the same experience. Before defining tasks, write an explicit hypothesis using this structure: "Because [observation/data], we believe [the change from Variant A to Variant B] will cause [expected outcome] for [audience]. We will know this is true when [metric]." Define primary, secondary, and guardrail metrics: the primary metric is the preference distribution across personas and why; secondary metrics are the per-variant friction/confusion signals that explain the preference; guardrail metrics are any way a preferred variant introduces a new problem the other variant did not have. This is a qualitative, synthetic study, not a statistically powered experiment — do not calculate, state, or imply statistical significance, confidence intervals, or p-values from these sessions. If a real production A/B test would be the natural next step to validate the finding, note that as a follow-up in method.limitations rather than fabricating the sample size or baseline conversion data a real test would need — that data does not exist in a synthetic study.',

    data_integrity_rules: [
      'No finding may be fabricated or inferred beyond what session data directly supports.',
      'Every finding must be traceable to a specific session — cite as (PersonaName · TaskID).',
      'If fewer than 3 sessions produced signal on a metric, label it "limited signal" and do not draw conclusions from it.',
      'A stated preference must cite a specific observed difference between the two variants — a preference with no supporting reason is not a valid finding.',
      'Never state or imply statistical significance, confidence intervals, or p-values — this is a qualitative signal from synthetic sessions, not a powered experiment.',
    ],

    keyMoments: [
      { key: 'preference_moments',  label: 'Preference Moments',  description: 'Where the persona stated a clear preference between variants and why — quote + context' },
      { key: 'variant_a_friction',  label: 'Variant A Friction',  description: 'Friction, confusion, or hesitation moments specific to Variant A — quote + context' },
      { key: 'variant_b_friction',  label: 'Variant B Friction',  description: 'Friction, confusion, or hesitation moments specific to Variant B — quote + context' },
      { key: 'comparison_moments',  label: 'Comparison Moments',  description: 'Direct A-vs-B comparisons the persona articulated unprompted — quote + context' },
      { key: 'design_observations', label: 'Design Observations', description: 'Notable usability comments about either variant' },
    ],
    findingsKey: 'ab_findings',
    findings: [
      { key: 'what_worked_in_a',   label: 'What Worked in Variant A', description: 'Elements of Variant A that were understood immediately or handled easily' },
      { key: 'what_worked_in_b',   label: 'What Worked in Variant B', description: 'Elements of Variant B that were understood immediately or handled easily' },
      { key: 'preference_drivers', label: 'Preference Drivers',       description: 'The specific differences that tipped personas toward one variant over the other' },
      { key: 'whats_missing',      label: "What's Missing",           description: 'Cues, information, or affordances needed but absent from both variants' },
    ],
  },
};

const DEFAULT_METHODOLOGY = 'Usability Testing';

function getMethodologyConfig(methodology) {
  return METHODOLOGY_CONFIGS[methodology] || METHODOLOGY_CONFIGS[DEFAULT_METHODOLOGY];
}

function navigationRequired(methodologyConfig) {
  return methodologyConfig.runner_type === 'task_based' || methodologyConfig.runner_type === 'comparative_task_based';
}

// UI-facing listing (id + description only) for the methodology picker —
// keeps the wizard's options sourced from this config instead of a
// hardcoded array that can drift from what the backend actually supports.
function listMethodologies() {
  return Object.entries(METHODOLOGY_CONFIGS).map(([name, cfg]) => ({
    id:          name,
    desc:        cfg.ui_description || '',
    runner_type: cfg.runner_type,
  }));
}

module.exports = {
  METHODOLOGY_CONFIGS,
  DEFAULT_METHODOLOGY,
  getMethodologyConfig,
  navigationRequired,
  listMethodologies,
};
