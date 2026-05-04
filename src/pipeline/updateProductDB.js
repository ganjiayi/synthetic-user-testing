#!/usr/bin/env node

/**
 * updateProductDB.js
 *
 * Reads intake.json from a completed study run, identifies any fields
 * that fill known database gaps in the product record, shows the
 * researcher a diff, and writes confirmed updates to the product JSON.
 *
 * Only updatable sections are written (section4a, section4b, section4c,
 * section8). Sections 1, 2, 6, and 7 are never touched by this script.
 *
 * Usage:
 *   node src/pipeline/updateProductDB.js <run_folder>
 *
 * Example:
 *   node src/pipeline/updateProductDB.js runs/04052026_homepage-revamp
 */

const fs       = require('fs');
const path     = require('path');
const readline = require('readline');

const PRODUCTS_DIR = path.join(__dirname, '../../products');

// ─── Load files ───────────────────────────────────────────────────────────────
function loadIntake(runFolder) {
  const p = path.join(runFolder, 'intake.json');
  if (!fs.existsSync(p)) {
    console.error(`intake.json not found in ${runFolder}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function loadProductRecord(slug) {
  const p = path.join(PRODUCTS_DIR, `${slug}.json`);
  if (!fs.existsSync(p)) {
    console.error(`Product record not found: products/${slug}.json`);
    console.error(`Available products: ${fs.readdirSync(PRODUCTS_DIR).filter(f => f.endsWith('.json') && f !== 'schema.json').join(', ')}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// ─── Find the product slug from intake ───────────────────────────────────────
function resolveProductSlug(intake) {
  const name = intake.q5_product_context?.product_name || '';
  const files = fs.readdirSync(PRODUCTS_DIR).filter(f => f.endsWith('.json') && f !== 'schema.json');

  for (const file of files) {
    const record = JSON.parse(fs.readFileSync(path.join(PRODUCTS_DIR, file), 'utf8'));
    if (
      record._meta?.product_id?.toLowerCase() === name.toLowerCase() ||
      record._meta?.slug?.toLowerCase() === name.toLowerCase() ||
      record._meta?.product_name?.toLowerCase() === name.toLowerCase() ||
      file.replace('.json', '').toLowerCase() === name.toLowerCase()
    ) {
      return { slug: record._meta.slug, file };
    }
  }
  return null;
}

// ─── Extract updatable fields from intake ────────────────────────────────────
function extractUpdatesFromIntake(intake, product) {
  const updates = [];
  const gaps    = product._meta?.database_gaps || [];

  // Section 4A — metrics
  const primaryMetric = intake.q9_eval_metrics?.primary_metric;
  if (primaryMetric) {
    const metrics = product.section4_performance?.metrics || [];
    for (const m of metrics) {
      if (m._gap && primaryMetric.toLowerCase().includes(m.metric_name.toLowerCase().split(' ')[0])) {
        updates.push({
          section: 'section4_performance.metrics',
          field:   m.metric_name,
          current: null,
          proposed: primaryMetric,
          path:    `section4_performance.metrics[${metrics.indexOf(m)}].value`,
          type:    'metric_value',
        });
      }
    }
  }

  // Section 4B — drop-off points (from Q5 why_this_why_now or Q10 known_ux_risks)
  const knownRisks = intake.q10_hypotheses?.known_ux_risks;
  if (knownRisks && knownRisks.length > 10) {
    const currentDropoff = product.section4_performance?.known_dropoff_points;
    if (!currentDropoff || currentDropoff.includes('~')) {
      updates.push({
        section:  'section4_performance',
        field:    'known_dropoff_points',
        current:  currentDropoff || null,
        proposed: knownRisks,
        path:     'section4_performance.known_dropoff_points',
        type:     'dropoff_update',
        note:     'Sourced from Q10B (Known UX Risks) in the study questionnaire',
      });
    }
  }

  // Section 4C — NPS score
  const whyNow = intake.q5_product_context?.why_this_why_now || '';
  const npsMatch = whyNow.match(/NPS[^0-9]*([+-]?\d+)/i);
  if (npsMatch && product.section4_performance?.nps?.current_score === null) {
    updates.push({
      section:  'section4_performance.nps',
      field:    'current_score',
      current:  null,
      proposed: npsMatch[1],
      path:     'section4_performance.nps.current_score',
      type:     'nps_score',
      note:     'Extracted from Q5 (Why This, Why Now) field',
    });
  }

  // Section 8 — research history (add completed study)
  const runId = intake.meta?.run_id;
  const existingStudies = product.section8_research_history?.prior_studies || [];
  const alreadyLogged   = existingStudies.some(s => s.study_id === runId);

  if (runId && !alreadyLogged) {
    updates.push({
      section:  'section8_research_history.prior_studies',
      field:    'new study entry',
      current:  `${existingStudies.length} prior studies`,
      proposed: {
        study_id:    runId,
        date:        intake.meta?.date_submitted || new Date().toLocaleDateString('en-GB').replace(/\//g, ''),
        method:      'Synthetic usability testing — agentic parallel persona sessions',
        key_finding: '[To be filled after report is reviewed]',
        status:      'completed',
      },
      path:     'section8_research_history.prior_studies',
      type:     'study_log',
      note:     'Logs this completed study run into the product research history',
    });
  }

  return updates;
}

// ─── Print diff ───────────────────────────────────────────────────────────────
function printDiff(updates, productName) {
  console.log(`\n🔍 Proposed updates to products/${productName}`);
  console.log('─'.repeat(60));

  if (updates.length === 0) {
    console.log('\n   No updatable fields found in this intake.');
    console.log('   Either all database gaps are already filled, or the');
    console.log('   questionnaire did not contain relevant new data.\n');
    return false;
  }

  for (let i = 0; i < updates.length; i++) {
    const u = updates[i];
    console.log(`\n   [${i + 1}] ${u.section} → ${u.field}`);
    console.log(`       Path:     ${u.path}`);
    if (u.note) console.log(`       Note:     ${u.note}`);
    console.log(`       Current:  ${u.current === null ? '(empty — database gap)' : JSON.stringify(u.current).slice(0, 120)}`);
    console.log(`       Proposed: ${typeof u.proposed === 'object' ? JSON.stringify(u.proposed, null, 2).split('\n').join('\n                 ') : String(u.proposed).slice(0, 200)}`);
  }

  console.log('\n' + '─'.repeat(60));
  return true;
}

// ─── Apply updates ────────────────────────────────────────────────────────────
function applyUpdates(product, updates) {
  for (const u of updates) {
    if (u.type === 'metric_value') {
      const metrics = product.section4_performance?.metrics || [];
      for (const m of metrics) {
        if (m.metric_name === u.field) {
          m.value = u.proposed;
          m._gap  = false;
        }
      }
    } else if (u.type === 'dropoff_update') {
      product.section4_performance.known_dropoff_points = u.proposed;
    } else if (u.type === 'nps_score') {
      product.section4_performance.nps.current_score = u.proposed;
      product.section4_performance.nps._gap = false;
    } else if (u.type === 'study_log') {
      product.section8_research_history.prior_studies.push(u.proposed);
      if (product.section8_research_history.prior_studies.length > 0) {
        product.section8_research_history.first_study_note = '';
      }
    }
  }

  // Update _meta
  product._meta.last_updated = new Date().toLocaleDateString('en-GB').replace(/\//g, '');

  // Refresh database_gaps list
  const remainingGaps = [];
  const metrics = product.section4_performance?.metrics || [];
  for (const m of metrics) {
    if (m._gap) remainingGaps.push(`section4a.${m.metric_name.toLowerCase().replace(/\s+/g,'_')}.value`);
  }
  if (product.section4_performance?.nps?._gap) {
    if (!product.section4_performance.nps.current_score) remainingGaps.push('section4c.nps_score');
    if (!product.section4_performance.nps.primary_driver_of_low_score) remainingGaps.push('section4c.primary_driver_of_low_score');
    if (!product.section4_performance.nps.data_source) remainingGaps.push('section4c.data_source');
  }
  product._meta.database_gaps = remainingGaps;

  return product;
}

// ─── Confirmation prompt ──────────────────────────────────────────────────────
function confirm(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// ─── Select updates interactively ────────────────────────────────────────────
async function selectUpdates(updates) {
  if (updates.length === 1) {
    const answer = await confirm(`\n   Apply this update? (y/n): `);
    return answer === 'y' ? updates : [];
  }

  console.log('\n   Options:');
  console.log('   a — apply all updates');
  console.log('   n — apply none');
  console.log('   1,2,3 — apply specific updates by number');

  const answer = await confirm('\n   Your choice: ');

  if (answer === 'a') return updates;
  if (answer === 'n') return [];

  const selected = answer.split(',').map(s => parseInt(s.trim()) - 1).filter(i => i >= 0 && i < updates.length);
  return selected.map(i => updates[i]);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const runFolder = process.argv[2];
  if (!runFolder) {
    console.error('Usage: node src/pipeline/updateProductDB.js <run_folder>');
    process.exit(1);
  }

  const absRunFolder = path.resolve(runFolder);
  const intake       = loadIntake(absRunFolder);

  console.log(`\n📦 Checking for product database updates — ${path.basename(absRunFolder)}`);

  // Resolve product
  const resolved = resolveProductSlug(intake);
  if (!resolved) {
    console.log(`\n   Product '${intake.q5_product_context?.product_name}' not found in products/ folder.`);
    console.log('   No database update possible. Fill in the product template and add it first.');
    process.exit(0);
  }

  const product     = loadProductRecord(resolved.slug);
  const productFile = path.join(PRODUCTS_DIR, resolved.file);

  console.log(`   Product matched: ${product._meta.product_name} (${resolved.file})`);
  console.log(`   Current gaps:    ${product._meta.database_gaps?.length || 0} fields`);

  // Extract proposed updates
  const updates = extractUpdatesFromIntake(intake, product);

  // Show diff
  const hasUpdates = printDiff(updates, resolved.file);
  if (!hasUpdates) process.exit(0);

  // Confirmation
  const selected = await selectUpdates(updates);

  if (selected.length === 0) {
    console.log('\n   No updates applied.\n');
    process.exit(0);
  }

  // Apply and write
  const updated = applyUpdates(product, selected);
  fs.writeFileSync(productFile, JSON.stringify(updated, null, 2));

  console.log(`\n✅ ${selected.length} update(s) applied to ${resolved.file}`);
  console.log(`   Remaining gaps: ${updated._meta.database_gaps?.length || 0} fields`);
  if (updated._meta.database_gaps?.length > 0) {
    updated._meta.database_gaps.forEach(g => console.log(`   - ${g}`));
  }
  console.log('');
}

main().catch(err => {
  console.error('\n❌ Update failed:', err.message);
  process.exit(1);
});
