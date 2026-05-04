#!/usr/bin/env node

/**
 * parseIntake.js
 *
 * Reads a filled synthetic UX study questionnaire (.docx),
 * extracts all question block answers, validates against
 * config/intake_schema.json, derives auto-populated fields,
 * and writes intake.json into the run folder.
 *
 * Usage:
 *   node src/pipeline/parseIntake.js <run_folder>
 *
 * Example:
 *   node src/pipeline/parseIntake.js runs/21042026_onboarding-activation
 *
 * The run folder must contain a .docx file (any name).
 * Output: runs/<run_folder>/intake.json
 */

const fs   = require('fs');
const path = require('path');
const mammoth = require('mammoth');

// ─── Config ──────────────────────────────────────────────────────────────────
const SCHEMA_PATH = path.join(__dirname, '../../config/intake_schema.json');

// ─── Derivation maps ─────────────────────────────────────────────────────────

const LIFECYCLE_CALIBRATION = {
  pre_launch:       'high_tolerance',
  private_beta:     'high_tolerance',
  public_beta:      'moderate_tolerance',
  live_early_growth:'moderate_tolerance',
  live_scaling:     'low_tolerance',
  live_mature:      'minimal_tolerance',
  sunset:           'minimal_tolerance',
  not_sure:         'moderate_tolerance',
};

const DESIGN_PHASE_FOCUS = {
  empathise:    'Broad behavioural discovery — agent should probe motivations and mental models',
  define:       'Problem framing — agent should surface pain points and unmet needs',
  ideate:       'Concept reaction — agent should evaluate desirability and comprehension',
  prototype:    'Interaction feasibility — agent should test flow completion and comprehension',
  test:         'Usability validation — agent should score task completion and friction signals',
  post_launch:  'Ongoing optimisation — agent should identify regression points and new friction',
};

const API_MODE_MAP = {
  screenshot_sequence: 'image_sequence',
  figma_url:           'url_fetch',
  live_url:            'live_url',
  description_only:    'description_only',
};

const FRICTION_SENSITIVITY_MAP = {
  wireframe:    'low',
  mid_fidelity: 'moderate',
  high_fidelity:'high',
  production:   'production_grade',
};

const DEFAULT_EVAL_KEYS = [
  'task_completion',
  'friction_score',
  'confusion_signal',
  'abandon_trigger',
  'trust_signal',
  'persona_alignment',
];

// ─── Text extraction ──────────────────────────────────────────────────────────

async function extractText(docxPath) {
  const result = await mammoth.extractRawText({ path: docxPath });
  return result.value;
}

// ─── Section splitter ─────────────────────────────────────────────────────────
// Splits the raw text into labelled sections based on the questionnaire
// question headers (Q1 through Q11 + meta cover block).

function splitIntoSections(text) {
  const sections = {};
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Identify section boundaries by question number headers
  const sectionPattern = /^(Q(\d+)[:\s–\-]|STUDY INTAKE|Researcher Name|Product \/ Project|Date Submitted|Urgency)/i;
  let currentSection = 'cover';
  let buffer = [];

  for (const line of lines) {
    const match = line.match(/^Q(\d+)/i);
    if (match) {
      sections[currentSection] = buffer.join('\n');
      currentSection = `q${match[1]}`;
      buffer = [line];
    } else if (/^(STUDY INTAKE|Researcher Name)/i.test(line)) {
      sections[currentSection] = buffer.join('\n');
      currentSection = 'cover';
      buffer = [line];
    } else {
      buffer.push(line);
    }
  }
  // flush last section
  sections[currentSection] = buffer.join('\n');

  return sections;
}

// ─── Field extractors ─────────────────────────────────────────────────────────
// Each extractor receives the raw text of its section and returns a
// structured object matching the intake schema.

function extractMeta(text) {
  const get = (label) => {
    const re = new RegExp(label + '[:\\s]+([^\\n]+)', 'i');
    const m = text.match(re);
    return m ? m[1].trim() : '';
  };
  return {
    researcher_name: get('Researcher Name'),
    product_project: get('Product \\/ Project') || get('Product / Project') || get('Product'),
    date_submitted:  get('Date Submitted'),
    urgency:         normaliseEnum(get('Urgency'), ['immediate','24h','48h','end_of_sprint'], ''),
  };
}

function extractQ1(text) {
  const phaseMap = {
    'pre-launch':     'pre_launch',
    'pre launch':     'pre_launch',
    'concept':        'pre_launch',
    'private beta':   'private_beta',
    'public beta':    'public_beta',
    'live.*early':    'live_early_growth',
    'live.*scaling':  'live_scaling',
    'live.*mature':   'live_mature',
    'live.*optimis':  'live_mature',
    'sunset':         'sunset',
    'winding down':   'sunset',
    'not sure':       'not_sure',
  };

  const phase = matchEnum(text, phaseMap, 'not_sure');
  const contextMatch = text.match(/Phase Context[:\s]+([^\n]+(?:\n(?!Q\d)[^\n]+)*)/i);

  return {
    phase,
    phase_context: contextMatch ? contextMatch[1].trim() : extractFreeText(text, ['Phase Context','Anything specific']),
    agent_calibration: LIFECYCLE_CALIBRATION[phase],
  };
}

function extractQ2(text) {
  const phaseMap = {
    'empathis':   'empathise',
    'understand': 'empathise',
    'define':     'define',
    'framing':    'define',
    'ideate':     'ideate',
    'explor':     'ideate',
    'prototype':  'prototype',
    'test':       'test',
    'validat':    'test',
    'post.launch':'post_launch',
    'ongoing':    'post_launch',
    'optimis':    'post_launch',
  };

  const phase = matchEnum(text, phaseMap, 'test');
  return {
    phase,
    research_focus: DESIGN_PHASE_FOCUS[phase],
  };
}

function extractQ3(text) {
  const formatMap = {
    'screenshot':   'screenshot_sequence',
    'figma':        'figma_url',
    'live url':     'live_url',
    'production':   'live_url',
    'staging':      'live_url',
    'description':  'description_only',
    'no visual':    'description_only',
  };
  const fidelityMap = {
    'wireframe':    'wireframe',
    'lo.fi':        'wireframe',
    'low.fi':       'wireframe',
    'mid.fidelity': 'mid_fidelity',
    'mid.fi':       'mid_fidelity',
    'high.fidelity':'high_fidelity',
    'pixel':        'high_fidelity',
    'production':   'production',
  };

  const inputFormat   = matchEnum(text, formatMap, 'description_only');
  const fidelityLevel = matchEnum(text, fidelityMap, 'mid_fidelity');

  // Extract link — look for http/https URLs or a field label
  const linkMatch = text.match(/https?:\/\/[^\s\n]+/) || text.match(/Artefact Link[^:\n]*:[^\n]*\n([^\n]+)/i);
  const artefactLink = linkMatch ? linkMatch[1] || linkMatch[0] : '';

  return {
    input_format:        inputFormat,
    fidelity_level:      fidelityLevel,
    artefact_link:       artefactLink.trim(),
    artefact_notes:      extractFreeText(text, ['Artefact Notes','Additional Artefact Notes','3D','3C']),
    api_mode:            API_MODE_MAP[inputFormat],
    friction_sensitivity:FRICTION_SENSITIVITY_MAP[fidelityLevel],
  };
}

function extractQ4(text) {
  const insightMap = {
    'qualitative': 'qualitative',
    'quantitative':'quantitative',
    'mixed':       'mixed',
    'both':        'mixed',
  };
  return {
    main_question:          extractFreeText(text, ['Main Question','What is your main','4A']),
    good_answer_looks_like: extractFreeText(text, ['Good Answer','What would a satisfactory','4B']),
    insight_type:           matchEnum(text, insightMap, ''),
  };
}

function extractQ5(text) {
  return {
    product_name:       extractFreeText(text, ['Product Name','Product name']),
    product_category:   extractFreeText(text, ['Product Category','category']),
    feature_under_test: extractFreeText(text, ['Feature or Flow','Feature Under Test','feature']),
    target_market:      extractFreeText(text, ['Target Market','Region','market']),
    why_this_why_now:   extractFreeText(text, ['Why This','Why Now','Strategic Reason','5B']),
  };
}

function extractQ6(text) {
  // Primary RQ — look for labelled field or first substantive sentence
  const primaryMatch = text.match(/Primary RQ[^:\n]*:\s*\n?([^\n]+(?:\n(?!RQ\d|Secondary|Decision)[^\n]+)*)/i)
    || text.match(/6A[^:\n]*:\s*\n?([^\n]+)/i);
  const primary = primaryMatch ? primaryMatch[1].trim() : extractFreeText(text, ['Primary RQ','6A']);

  // Secondary RQs — numbered entries
  const secondaryRQs = [];
  const rqPattern = /(?:RQ\d+:|^\d+\.|^[-•])\s*([^\n]+)/gm;
  let m;
  while ((m = rqPattern.exec(text)) !== null) {
    const q = m[1].trim();
    if (q && q !== primary && q.length > 5) secondaryRQs.push(q);
  }

  return {
    primary_rq:          primary,
    secondary_rqs:       secondaryRQs,
    decision_to_support: extractFreeText(text, ['Decision This Research','Decision to Support','6C','go.*no.go']),
  };
}

function extractQ7(text) {
  const segments = [];
  // Each segment row: name | context | priority | include checkbox
  // Try to find table-like rows — name appears first, then context, priority keyword, include
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const priorityWords = ['primary','secondary','optional'];
  const v4Names = [
    'spontaneous traditionalist',
    'progressive influencer',
    'trendsetter explorer',
    'family-centric devotee',
    'routine conservative',
  ];

  let inTable = false;
  let currentSegment = null;

  for (const line of lines) {
    const lineLow = line.toLowerCase();

    // Detect v4 persona names
    const matchedV4 = v4Names.find(n => lineLow.includes(n));
    if (matchedV4) {
      if (currentSegment) segments.push(currentSegment);
      currentSegment = {
        name: toTitleCase(matchedV4),
        context: '',
        priority: 'primary',
        include: true,
        persona_library_ref: `v4_${matchedV4.replace(/\s+/g,'_')}`,
      };
      inTable = true;
      continue;
    }

    // Detect numbered rows like "1. [Name]"
    const rowMatch = line.match(/^(\d)\.\s+(.+)/);
    if (rowMatch && inTable) {
      if (currentSegment) segments.push(currentSegment);
      currentSegment = {
        name: rowMatch[2].trim(),
        context: '',
        priority: 'secondary',
        include: false,
        persona_library_ref: '',
      };
      continue;
    }

    if (currentSegment) {
      const pri = priorityWords.find(p => lineLow.includes(p));
      if (pri) { currentSegment.priority = pri; continue; }
      if (lineLow.includes('yes') || lineLow.includes('[x]') || lineLow.includes('☑')) {
        currentSegment.include = true; continue;
      }
      if (lineLow.includes('no') && lineLow.includes('include')) {
        currentSegment.include = false; continue;
      }
      // Accumulate context
      if (line.length > 5 && !priorityWords.some(p => lineLow === p)) {
        currentSegment.context += (currentSegment.context ? ' ' : '') + line;
      }
    }
  }
  if (currentSegment) segments.push(currentSegment);

  // Fallback: if nothing parsed, create placeholder
  if (segments.length === 0) {
    segments.push({ name: '[Persona not specified]', context: '', priority: 'primary', include: true, persona_library_ref: '' });
  }

  const prioritySegmentMatch = text.match(/Priority Segment[^:\n]*:\s*\n?([^\n]+)/i);

  return {
    segments,
    priority_segment: prioritySegmentMatch ? prioritySegmentMatch[1].trim() : (segments[0]?.name || ''),
  };
}

function extractQ8(text) {
  // Session config
  const maxTurnsMatch     = text.match(/Max Turns[^:\n]*[:\s]+(\d+)/i);
  const stuckMatch        = text.match(/Stuck[^:\n]*[:\s]+(\d+)/i);
  const entryMatch        = text.match(/Entry Point[^:\n]*[:\s]+([^\n]+)/i);
  const modeMap = {
    'single.pass': 'single_pass',
    'multi.turn':  'multi_turn',
    'branch':      'multi_turn',
    'explorat':    'exploratory',
  };

  const session_config = {
    entry_point:          entryMatch ? entryMatch[1].trim() : '',
    max_turns:            maxTurnsMatch ? parseInt(maxTurnsMatch[1]) : 20,
    stuck_loop_threshold: stuckMatch ? parseInt(stuckMatch[1]) : 3,
    session_mode:         matchEnum(text, modeMap, ''),
  };

  // Task scenarios — look for T1..T9 labels or numbered rows in table
  const scenarios = [];
  const taskPattern = /T(\d+)\s*[|\t]?\s*([^\n|]+?)(?:\s*[|\t]\s*([^\n|]+?))?(?:\s*[|\t]\s*([^\n|]+?))?(?:\s*[|\t]\s*([^\n|]*))?(?:\n|$)/gi;
  let tm;
  while ((tm = taskPattern.exec(text)) !== null) {
    const task_name = (tm[2] || '').trim();
    if (!task_name || task_name.length < 2) continue;
    scenarios.push({
      task_id:           `T${tm[1]}`,
      task_name,
      instruction:       (tm[3] || '').trim(),
      success_condition: (tm[4] || '').trim(),
      abandon_condition: (tm[5] || '').trim(),
    });
  }

  // Fallback: look for numbered lines under "Task" heading
  if (scenarios.length === 0) {
    const taskSection = text.match(/8B[^]*?(?=8C|Q9|$)/is)?.[0] || text;
    const lines = taskSection.split('\n').map(l => l.trim()).filter(Boolean);
    let idx = 1;
    for (const line of lines) {
      if (/^(task|T\d)/i.test(line) && line.length > 5) {
        scenarios.push({
          task_id:           `T${idx}`,
          task_name:         line.replace(/^(task\s*\d+[:\-]?\s*|T\d+[:\-]?\s*)/i,'').trim(),
          instruction:       '',
          success_condition: '',
          abandon_condition: '',
        });
        idx++;
      }
    }
  }

  if (scenarios.length === 0) {
    scenarios.push({ task_id: 'T1', task_name: '[Task not specified]', instruction: '', success_condition: '', abandon_condition: '' });
  }

  return { session_config, scenarios };
}

function extractQ9(text) {
  // Custom eval keys from table rows
  const customKeys = [];
  const keyPattern = /([a-z_]{3,40})\s*[|\t]\s*([^\n|]{5,}?)\s*[|\t]\s*(binary|numeric|qualitative|categorical|scored)?/gi;
  let km;
  while ((km = keyPattern.exec(text)) !== null) {
    const key = km[1].trim().toLowerCase().replace(/\s+/g,'_');
    if (DEFAULT_EVAL_KEYS.includes(key)) continue;
    customKeys.push({
      key,
      description: (km[2] || '').trim(),
      signal_type: (km[3] || '').trim().toLowerCase() || '',
    });
  }

  // Friction signals — tickbox-style lines
  const frictionOptions = [
    'navigation confusion',
    'label / copy misunderstanding',
    'trust / credibility hesitation',
    'price or value friction',
    'technical error',
    'too many steps',
    'missing information',
    'language / localisation',
  ];
  const frictionSignals = frictionOptions.filter(opt =>
    text.toLowerCase().includes(opt.toLowerCase().replace(' / ',' ').split(' ')[0])
  );

  return {
    default_eval_keys: DEFAULT_EVAL_KEYS,
    custom_eval_keys:  customKeys,
    friction_signals:  frictionSignals,
    primary_metric:    extractFreeText(text, ['Primary Metric','9C','single most important']),
  };
}

function extractQ10(text) {
  // Hypotheses — H1, H2, H3 or numbered list
  const hypotheses = [];
  const hPattern = /H(\d+)[:\s]+([^\n]+)/gi;
  let hm;
  while ((hm = hPattern.exec(text)) !== null) {
    hypotheses.push({ id: `H${hm[1]}`, statement: hm[2].trim() });
  }

  // Numbered fallback
  if (hypotheses.length === 0) {
    const lines = text.split('\n').map(l=>l.trim()).filter(Boolean);
    let idx = 1;
    for (const line of lines) {
      if (/^(\d+\.|•|-)\s+if\s+/i.test(line)) {
        hypotheses.push({ id: `H${idx}`, statement: line.replace(/^(\d+\.|•|-)\s+/,'').trim() });
        idx++;
      }
    }
  }

  return {
    hypotheses,
    known_ux_risks:          extractFreeText(text, ['Known UX Risks','Pain Points','10B']),
    forbidden_assumptions:   extractFreeText(text, ['Must NOT Be Assumed','Forbidden','10C','do not assume']),
    risk_severity_threshold: extractFreeText(text, ['Risk Severity','threshold','escalat']),
  };
}

function extractQ11(text) {
  const audienceMap = {
    'product':    'product_team',
    'ux':         'design_team',
    'design':     'design_team',
    'engineer':   'engineering',
    'leadership': 'leadership',
    'c-suite':    'leadership',
    'marketing':  'marketing',
    'investor':   'investors',
    'board':      'investors',
    'client':     'client_external',
    'external':   'client_external',
    'all':        'all',
  };
  const formatMap = {
    'json':      'json_eval_log',
    'markdown':  'markdown_summary',
    'html':      'html_report_card',
    'docx':      'docx_research_plan',
    'word':      'docx_research_plan',
    'slide':     'slide_deck',
    'debrief':   'verbal_debrief',
    'all':       'all',
  };
  const turnaroundMap = {
    'immediate': 'immediate',
    'same':      'immediate',
    '24h':       '24h',
    '24 h':      '24h',
    '48h':       '48h',
    '48 h':      '48h',
    'sprint':    'end_of_sprint',
  };
  const escalationMap = {
    'p0 only':    'p0_only',
    'p1 and':     'p1_and_above',
    'p2 and':     'p2_and_above',
    'all finding':'all_findings',
  };

  const audience   = matchMultiEnum(text, audienceMap);
  const formats    = matchMultiEnum(text, formatMap);
  const turnaround = matchEnum(text, turnaroundMap, '');
  const escalation = matchEnum(text, escalationMap, '');

  return {
    primary_audience:      audience,
    output_formats:        formats,
    turnaround,
    escalation_threshold:  escalation,
    additional_notes:      extractFreeText(text, ['Anything Else','Additional Notes','11E','Final notes']),
  };
}

// ─── Utility helpers ──────────────────────────────────────────────────────────

function matchEnum(text, map, fallback) {
  const lower = text.toLowerCase();
  for (const [pattern, value] of Object.entries(map)) {
    if (new RegExp(pattern, 'i').test(lower)) return value;
  }
  return fallback;
}

function matchMultiEnum(text, map) {
  const lower = text.toLowerCase();
  const found = new Set();
  for (const [pattern, value] of Object.entries(map)) {
    if (new RegExp(pattern, 'i').test(lower)) found.add(value);
  }
  return [...found];
}

function normaliseEnum(value, options, fallback) {
  if (!value) return fallback;
  const v = value.toLowerCase().trim();
  return options.find(o => v.includes(o)) || fallback;
}

function extractFreeText(text, labels) {
  for (const label of labels) {
    const re = new RegExp(label + '[^:\\n]*[:\\s]+([^\\n]+(?:\\n(?![A-Z\\d])[^\\n]+){0,3})', 'i');
    const m = text.match(re);
    if (m && m[1].trim().length > 2) return m[1].trim();
  }
  return '';
}

function toTitleCase(str) {
  return str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1));
}

// ─── Derive _derived block ────────────────────────────────────────────────────

function buildDerived(intake, sourceFile) {
  const warnings = [];

  // Required field checks
  if (!intake.meta.researcher_name) warnings.push('meta.researcher_name is empty');
  if (!intake.q4_core_question.main_question) warnings.push('q4_core_question.main_question is empty');
  if (!intake.q5_product_context.product_name) warnings.push('q5_product_context.product_name is empty');
  if (!intake.q6_research_questions.primary_rq) warnings.push('q6_research_questions.primary_rq is empty');
  if (intake.q7_personas.segments.filter(s => s.include).length === 0)
    warnings.push('q7_personas: no segments marked as included');
  if (intake.q8_tasks.scenarios.length === 0)
    warnings.push('q8_tasks: no task scenarios found');

  const activePersonas = intake.q7_personas.segments
    .filter(s => s.include)
    .map(s => s.name);

  const activeTasks = intake.q8_tasks.scenarios.map(s => s.task_id);

  const allEvalKeys = [
    ...DEFAULT_EVAL_KEYS,
    ...(intake.q9_eval_metrics.custom_eval_keys || []).map(k => k.key),
  ];

  return {
    parsed_at:         new Date().toISOString(),
    source_file:       path.basename(sourceFile),
    validation_status: warnings.length === 0 ? 'valid' : 'valid_with_warnings',
    warnings,
    active_personas:   activePersonas,
    active_tasks:      activeTasks,
    all_eval_keys:     allEvalKeys,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const runFolder = process.argv[2];
  if (!runFolder) {
    console.error('Usage: node src/pipeline/parseIntake.js <run_folder>');
    console.error('Example: node src/pipeline/parseIntake.js runs/21042026_onboarding-activation');
    process.exit(1);
  }

  const absRunFolder = path.resolve(runFolder);
  if (!fs.existsSync(absRunFolder)) {
    console.error(`Run folder not found: ${absRunFolder}`);
    process.exit(1);
  }

  // Find the questionnaire docx in the run folder
  const files = fs.readdirSync(absRunFolder);
  const docxFile = files.find(f => f.endsWith('.docx'));
  if (!docxFile) {
    console.error(`No .docx file found in ${absRunFolder}`);
    console.error('Drop your filled questionnaire.docx into the run folder first.');
    process.exit(1);
  }

  const docxPath = path.join(absRunFolder, docxFile);
  console.log(`\n📄 Reading questionnaire: ${docxFile}`);

  // Extract text
  const rawText = await extractText(docxPath);
  console.log(`   Extracted ${rawText.length} characters`);

  // Split into sections
  const sections = splitIntoSections(rawText);
  const sectionNames = Object.keys(sections);
  console.log(`   Found sections: ${sectionNames.join(', ')}`);

  // Extract each question block
  console.log('\n🔍 Parsing question blocks...');
  const intake = {
    meta:                  extractMeta(sections.cover || rawText),
    q1_lifecycle_phase:    extractQ1(sections.q1 || ''),
    q2_design_phase:       extractQ2(sections.q2 || ''),
    q3_artefact:           extractQ3(sections.q3 || ''),
    q4_core_question:      extractQ4(sections.q4 || ''),
    q5_product_context:    extractQ5(sections.q5 || ''),
    q6_research_questions: extractQ6(sections.q6 || ''),
    q7_personas:           extractQ7(sections.q7 || ''),
    q8_tasks:              extractQ8(sections.q8 || ''),
    q9_eval_metrics:       extractQ9(sections.q9 || ''),
    q10_hypotheses:        extractQ10(sections.q10 || ''),
    q11_output:            extractQ11(sections.q11 || ''),
  };

  // Auto-generate run_id from folder name
  const folderBase = path.basename(absRunFolder);
  intake.meta.run_id = folderBase;

  // Build _derived block
  intake._derived = buildDerived(intake, docxPath);

  // Write intake.json
  const outputPath = path.join(absRunFolder, 'intake.json');
  fs.writeFileSync(outputPath, JSON.stringify(intake, null, 2));

  // Summary output
  console.log('\n✅ Parsing complete');
  console.log(`   Run ID:          ${intake.meta.run_id}`);
  console.log(`   Researcher:      ${intake.meta.researcher_name || '(not found)'}`);
  console.log(`   Product:         ${intake.q5_product_context.product_name || '(not found)'}`);
  console.log(`   Lifecycle phase: ${intake.q1_lifecycle_phase.phase}`);
  console.log(`   Design phase:    ${intake.q2_design_phase.phase}`);
  console.log(`   Input format:    ${intake.q3_artefact.input_format} → API mode: ${intake.q3_artefact.api_mode}`);
  console.log(`   Fidelity:        ${intake.q3_artefact.fidelity_level} → friction sensitivity: ${intake.q3_artefact.friction_sensitivity}`);
  console.log(`   Active personas: ${intake._derived.active_personas.join(', ') || '(none)'}`);
  console.log(`   Active tasks:    ${intake._derived.active_tasks.join(', ') || '(none)'}`);
  console.log(`   Eval keys:       ${intake._derived.all_eval_keys.join(', ')}`);
  console.log(`   Status:          ${intake._derived.validation_status}`);

  if (intake._derived.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    intake._derived.warnings.forEach(w => console.log(`   - ${w}`));
  }

  console.log(`\n📁 Output written to: ${outputPath}`);
  console.log('\nNext step: node src/pipeline/generatePlan.js ' + runFolder);
}

main().catch(err => {
  console.error('\n❌ Parse failed:', err.message);
  process.exit(1);
});
