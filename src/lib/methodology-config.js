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
 *   'task_based'    — persona navigates a UI across multiple turns (click/scroll).
 *   'reaction_based' — persona reacts to a concept in one or two turns, no navigation.
 *   'impression_based' — persona gives a single-turn emotional/aesthetic reaction.
 *
 * navigation_required is derived from runner_type — only task_based methodologies
 * ask the persona for click_target/scroll_direction or get browser-driven turns.
 */

const METHODOLOGY_CONFIGS = {
  'Usability Testing': {
    methodology_id: 'usability_testing',
    runner_type: 'task_based',

    session_config: { max_turns: 20, stuck_loop_threshold: 3, session_mode: 'multi_turn' },

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

    planner_guidance: 'Focus the plan on task completion and friction identification. Define a clear success condition and abandon condition for every task. Identify the exact UI steps where drop-off is most likely. The primary metric is task completion rate. Hypotheses should predict where friction will occur and why.',

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

  'UX Testing': {
    methodology_id: 'ux_testing',
    runner_type: 'task_based',

    session_config: { max_turns: 20, stuck_loop_threshold: 3, session_mode: 'multi_turn' },

    eval_schema: {
      fields: [
        { key: 'friction_score',      type: 'number 0-10',   description: '0 = completely smooth, 10 = blocked entirely' },
        { key: 'comprehension_signal',type: 'string or null',description: 'whether the persona correctly understood design intent at this step, null if not applicable' },
        { key: 'confusion_signal',    type: 'string or null',description: 'short description of confusion, null if none' },
        { key: 'trust_signal',        type: 'string or null',description: 'short description of trust/distrust reaction, null if none' },
        { key: 'value_perception',    type: 'string or null',description: 'whether the persona perceives the product as relevant/valuable to them, null if not applicable' },
      ],
    },

    task_derivation: {
      success_condition: 'User correctly understands and articulates the design intent, and navigates toward the intended outcome.',
      abandon_condition: 'User fundamentally misinterprets the design after 2+ attempts and cannot self-correct.',
    },

    persona_instruction_mode: 'Task-directed with comprehension probing. After each navigation turn, also report whether you understand what the product is offering and whether it feels relevant to you.',

    planner_guidance: 'Focus the plan on whether the product communicates its value proposition clearly across the full experience — not just task completion but comprehension at each stage. Define what \'understood the product\' looks like for each persona. The primary metric is comprehension signal strength. Hypotheses should challenge whether the design communicates intent without external explanation.',

    data_integrity_rules: [
      'No finding may be fabricated or inferred beyond what session data directly supports.',
      'Every finding must be traceable to a specific session — cite as (PersonaName · TaskID).',
      'If fewer than 3 sessions produced signal on a metric, label it "limited signal" and do not draw conclusions from it.',
    ],

    keyMoments: [
      { key: 'comprehension_moments', label: 'Comprehension Moments', description: 'Where the persona correctly or incorrectly understood design intent, unprompted — quote + context' },
      { key: 'navigation_moments',    label: 'Navigation Moments',    description: 'Unexpected navigation paths, dead ends, or wrong turns — quote + context' },
      { key: 'design_observations',   label: 'Design Observations',   description: 'Notable comments about layout, labels, or visual hierarchy' },
      { key: 'friction_moments',      label: 'Friction Moments',      description: 'Information overload, hesitation, or re-reading the same content' },
      { key: 'trust_moments',         label: 'Trust Moments',         description: 'Trust or distrust reactions to the interface — quote + context' },
    ],
    findingsKey: 'ux_findings',
    findings: [
      { key: 'intuitive_elements', label: 'Intuitive Elements',  description: 'Design elements, labels, or flows understood correctly without help' },
      { key: 'misinterpretations', label: 'Misinterpretations',  description: 'Labels, icons, or flows interpreted incorrectly relative to design intent' },
      { key: 'whats_missing',      label: "What's Missing",      description: 'Cues, labels, or affordances needed but absent' },
    ],
  },

  'Concept Testing': {
    methodology_id: 'concept_testing',
    runner_type: 'reaction_based',

    session_config: { max_turns: 2, stuck_loop_threshold: 3, session_mode: 'reaction_only' },

    eval_schema: {
      fields: [
        { key: 'comprehension_rate',  type: 'binary',                                 description: 'whether the persona articulated the core value proposition unprompted' },
        { key: 'appeal_rating',       type: 'number 0-10',                            description: '0 = no appeal, 10 = highly appealing' },
        { key: 'preference_signal',   type: 'string or null',                         description: 'preference expressed relative to alternatives, null if none stated' },
        { key: 'confusion_signal',    type: 'string or null',                         description: 'category confusion or feature misattribution, null if none' },
        { key: 'adoption_likelihood', type: 'categorical: likely | unlikely | unsure', description: 'how likely the persona is to adopt this concept' },
      ],
    },

    task_derivation: {
      success_condition: 'User unprompted identifies the core value proposition or concept being communicated.',
      abandon_condition: 'User cannot articulate the concept after direct engagement, or consistently attributes incorrect meaning.',
    },

    persona_instruction_mode: 'Reaction-based. You are shown the concept once and respond with your honest, immediate reaction in one or two turns. There is no UI to navigate — do not produce click_target or scroll_direction. Set task_completion to "completed" once you have given your full reaction.',

    planner_guidance: 'There are no navigation tasks. Each scenario presents a concept and asks the persona to react. Focus the plan on defining what successful comprehension looks like and what the persona\'s honest adoption likelihood would be. The primary metric is comprehension rate and appeal rating. Hypotheses should test whether the concept is self-explanatory and appealing to the target segment.',

    data_integrity_rules: [
      'No finding may be fabricated or inferred beyond what session data directly supports.',
      'Every finding must be traceable to a specific session — cite as (PersonaName · TaskID).',
      'If fewer than 3 sessions produced signal on a metric, label it "limited signal" and do not draw conclusions from it.',
    ],

    keyMoments: [
      { key: 'first_impression_moments', label: 'First Impression Moments', description: "The persona's immediate, unprompted reaction on first seeing the concept — quote + context" },
      { key: 'value_prop_moments',       label: 'Value Proposition Moments', description: 'Where the core value proposition landed clearly — quote + context' },
      { key: 'confusion_moments',        label: 'Confusion Moments',         description: 'Category confusion or feature misattribution — quote + context' },
      { key: 'skepticism_moments',       label: 'Skepticism Moments',        description: 'Trust or skepticism reactions to the concept — quote + context' },
      { key: 'comparison_moments',       label: 'Comparison Moments',        description: 'Comparisons to competitors or known alternatives' },
    ],
    findingsKey: 'concept_findings',
    findings: [
      { key: 'what_resonated',    label: 'What Resonated',     description: 'Aspects of the concept that were immediately understood or valued' },
      { key: 'what_was_unclear',  label: 'What Was Unclear',   description: 'Aspects of the concept that confused or were misread' },
      { key: 'whats_missing',     label: "What's Missing",     description: 'Information or framing needed to fully evaluate the concept' },
    ],
  },

  'Desirability Testing': {
    methodology_id: 'desirability_testing',
    runner_type: 'impression_based',

    session_config: { max_turns: 1, stuck_loop_threshold: 3, session_mode: 'impression_only' },

    eval_schema: {
      fields: [
        { key: 'emotional_response', type: 'string or null',  description: "the persona's emotional reaction to the stimulus" },
        { key: 'appeal_rating',      type: 'number 0-10',     description: '0 = no appeal, 10 = highly appealing' },
        { key: 'word_association',  type: 'string',           description: '3-5 words the persona associates with the stimulus, comma-separated' },
        { key: 'fit_signal',        type: 'string or null',   description: "whether the stimulus fits the persona's identity/values, null if no signal" },
        { key: 'preference_signal', type: 'string or null',   description: 'preference expressed relative to alternatives, null if none stated' },
      ],
    },

    task_derivation: {
      success_condition: 'User expresses a clear emotional or aesthetic reaction aligned with the intended design tone.',
      abandon_condition: 'User shows no engagement, or expresses a strong negative or opposite reaction to the intended tone.',
    },

    persona_instruction_mode: 'Impression-based. You are shown the stimulus once and report your immediate reaction in a single turn. There are no tasks and no navigation — do not produce click_target or scroll_direction. Set task_completion to "completed" once you have given your impression.',

    planner_guidance: 'There are no tasks or navigation steps. Each scenario presents a stimulus — a visual, a piece of copy, or a brand expression — and asks the persona to report their immediate impression. Focus the plan on what emotional response and word associations are desirable for this product and segment. The primary metric is appeal rating and fit signal. Hypotheses should test whether the stimulus resonates with each persona\'s identity and values.',

    data_integrity_rules: [
      'No finding may be fabricated or inferred beyond what session data directly supports.',
      'Every finding must be traceable to a specific session — cite as (PersonaName · TaskID).',
      'If fewer than 3 sessions produced signal on a metric, label it "limited signal" and do not draw conclusions from it.',
    ],

    keyMoments: [
      { key: 'emotional_highlights',    label: 'Emotional Highlights',    description: 'Positive emotional reactions — quote + context' },
      { key: 'emotional_mismatches',    label: 'Emotional Mismatches',    description: 'Moments where the design evoked an unintended feeling — quote + context' },
      { key: 'aesthetic_observations',  label: 'Aesthetic Observations',  description: 'Comments on visual design, tone, or style' },
      { key: 'brand_alignment_moments', label: 'Brand Alignment Moments', description: "Where the design aligned or conflicted with the persona's brand expectations" },
    ],
    findingsKey: 'desirability_findings',
    findings: [
      { key: 'what_resonated_emotionally', label: 'What Resonated Emotionally', description: 'Design elements that evoked the intended feeling' },
      { key: 'what_felt_off',              label: 'What Felt Off',              description: 'Elements that created emotional dissonance or mismatch' },
      { key: 'whats_missing',              label: "What's Missing",             description: 'Emotional or brand cues needed but absent' },
    ],
  },
};

const DEFAULT_METHODOLOGY = 'Usability Testing';

function getMethodologyConfig(methodology) {
  return METHODOLOGY_CONFIGS[methodology] || METHODOLOGY_CONFIGS[DEFAULT_METHODOLOGY];
}

function navigationRequired(methodologyConfig) {
  return methodologyConfig.runner_type === 'task_based';
}

module.exports = {
  METHODOLOGY_CONFIGS,
  DEFAULT_METHODOLOGY,
  getMethodologyConfig,
  navigationRequired,
};
