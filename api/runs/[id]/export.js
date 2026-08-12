require('dotenv').config();
const { getClient } = require('../../../src/lib/supabase');
const { buildXlsx, buildDocxTranscript, buildAnalyzedReportDocx } = require('../../../src/lib/exports');
const { generateAnalyzedReport } = require('../../../src/lib/report');

const VALID_TYPES = new Set(['xlsx', 'docx', 'analyzed_report_docx']);

function providerForName(name) {
  return require(`../../../src/providers/${name}`);
}

// Raw exports (target pipeline spec's Deliverable 1: xlsx/docx) and the
// interpretive Word report (Deliverable 2: analyzed_report_docx) — the
// browser-side CSV/PPTX in ui/src/pages/RunDetail.js now filter by the same
// QA decisions too (see that file's buildCsv/buildPresentation), so all
// deliverables agree. xlsx/docx read the Step 6.5 QA gate's decisions and
// exclude flagged-and-dropped sessions from the main output; analyzed_report_docx
// additionally requires analysis.json (Step 8) to already exist.
module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { id, type } = req.query;
  if (!VALID_TYPES.has(type)) {
    return res.status(400).json({ error: `type query param must be one of: ${[...VALID_TYPES].join(', ')}` });
  }

  const supabase = getClient();

  const [runRes, sessionsRes] = await Promise.all([
    supabase.from('runs').select('id, created_at, intake, plan, qa_review, analysis').eq('id', id).single(),
    supabase.from('sessions').select('persona_id, persona_name, data').eq('run_id', id).order('created_at'),
  ]);

  if (runRes.error || !runRes.data) return res.status(404).json({ error: 'Run not found' });
  if (!sessionsRes.data?.length) {
    return res.status(404).json({ error: 'No sessions found. Run evaluation first.' });
  }

  const run = {
    ...runRes.data,
    sessions: sessionsRes.data.map(s => ({ ...s.data, persona_id: s.persona_id, persona_name: s.persona_name })),
  };

  try {
    if (type === 'xlsx') {
      const buffer = buildXlsx(run);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${id}_raw_data.xlsx"`);
      return res.send(buffer);
    }

    if (type === 'docx') {
      const buffer = await buildDocxTranscript(run);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${id}_transcript.docx"`);
      return res.send(buffer);
    }

    // analyzed_report_docx
    if (!run.analysis) {
      return res.status(400).json({ error: 'Analysis not yet generated for this run — generate it on the Analysis tab first.' });
    }
    const providerNames = run.intake?.q8_output?.model_providers || ['claude'];
    const provider       = providerForName(providerNames[0]);
    const reportContent  = await generateAnalyzedReport(provider, run.analysis, run.plan, run.intake);
    const buffer         = await buildAnalyzedReportDocx(run, run.analysis, reportContent);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${id}_analyzed_report.docx"`);
    return res.send(buffer);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
