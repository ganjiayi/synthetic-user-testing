/**
 * SynthUX API Server
 *
 * Express backend that wraps the pipeline as REST endpoints.
 * Deployed on Railway — called by the Vercel frontend.
 *
 * Start: node src/server/index.js
 */

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');
const { spawn }  = require('child_process');

const app     = express();
const PORT    = process.env.PORT || 3001;
const RUNS_DIR = path.join(__dirname, '../../runs');

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── In-memory status store (backed by status.json per run) ──────────────────
const runStatus = {};

function setStatus(runId, status, extra = {}) {
  const entry = { status, updated_at: new Date().toISOString(), ...extra };
  runStatus[runId] = entry;
  const runFolder = path.join(RUNS_DIR, runId);
  if (fs.existsSync(runFolder)) {
    fs.writeFileSync(path.join(runFolder, 'status.json'), JSON.stringify(entry, null, 2));
  }
  console.log(`[${runId}] → ${status}`);
}

function getStatus(runId) {
  if (runStatus[runId]) return runStatus[runId];
  const statusPath = path.join(RUNS_DIR, runId, 'status.json');
  if (fs.existsSync(statusPath)) {
    const s = JSON.parse(fs.readFileSync(statusPath, 'utf8'));
    runStatus[runId] = s;
    return s;
  }
  return null;
}

// ─── Script runner helpers ────────────────────────────────────────────────────
function runNodeScript(scriptPath, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', [scriptPath, ...args], {
      env:  { ...process.env, MODEL_PROVIDER: 'openai' },
      cwd:  path.join(__dirname, '../..'),
    });
    let out = '', err = '';
    proc.stdout.on('data', d => { out += d; process.stdout.write(d); });
    proc.stderr.on('data', d => { err += d; process.stderr.write(d); });
    proc.on('close', code => {
      if (code === 0) resolve(out);
      else reject(new Error(`Script exited ${code}:\n${err.slice(-800)}`));
    });
  });
}

function runPythonScript(scriptPath, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', [scriptPath, ...args], {
      cwd: path.join(__dirname, '../..'),
    });
    let out = '', err = '';
    proc.stdout.on('data', d => { out += d; process.stdout.write(d); });
    proc.stderr.on('data', d => { err += d; process.stderr.write(d); });
    proc.on('close', code => {
      if (code === 0) resolve(out);
      else reject(new Error(`Python exited ${code}:\n${err.slice(-800)}`));
    });
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// POST /api/runs — create run folder and save intake
app.post('/api/runs', (req, res) => {
  try {
    const { runId, intake } = req.body;
    if (!runId || !intake) return res.status(400).json({ error: 'runId and intake required' });

    const runFolder = path.join(RUNS_DIR, runId);
    fs.mkdirSync(runFolder, { recursive: true });
    fs.writeFileSync(path.join(runFolder, 'intake.json'), JSON.stringify(intake, null, 2));

    setStatus(runId, 'intake_saved');
    res.json({ runId, status: 'intake_saved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/runs/:id/plan — generate plan (async)
app.post('/api/runs/:id/plan', (req, res) => {
  const { id } = req.params;
  const runFolder = path.join(RUNS_DIR, id);

  if (!fs.existsSync(path.join(runFolder, 'intake.json'))) {
    return res.status(404).json({ error: 'Intake not found. Create run first.' });
  }

  setStatus(id, 'planning');
  res.json({ status: 'planning' });

  runNodeScript(path.join(__dirname, '../pipeline/generatePlan.js'), [runFolder, '--model', 'openai'])
    .then(() => setStatus(id, 'plan_ready'))
    .catch(err => setStatus(id, 'error', { error: err.message, stage: 'planning' }));
});

// GET /api/runs/:id/plan — retrieve plan
app.get('/api/runs/:id/plan', (req, res) => {
  const planPath = path.join(RUNS_DIR, req.params.id, 'plan.json');
  if (!fs.existsSync(planPath)) return res.status(404).json({ error: 'Plan not found' });
  res.json(JSON.parse(fs.readFileSync(planPath, 'utf8')));
});

// POST /api/runs/:id/evaluate — run persona sessions (async)
app.post('/api/runs/:id/evaluate', (req, res) => {
  const { id } = req.params;
  const runFolder = path.join(RUNS_DIR, id);

  if (!fs.existsSync(path.join(runFolder, 'plan.json'))) {
    return res.status(400).json({ error: 'Plan not found. Generate plan first.' });
  }

  setStatus(id, 'evaluating', { sessions_complete: 0 });
  res.json({ status: 'evaluating' });

  runNodeScript(path.join(__dirname, '../pipeline/evaluator.js'), [runFolder, '--model', 'openai'])
    .then(() => setStatus(id, 'evaluation_complete'))
    .catch(err => setStatus(id, 'error', { error: err.message, stage: 'evaluating' }));
});

// GET /api/runs/:id/sessions — get all persona sessions
app.get('/api/runs/:id/sessions', (req, res) => {
  const sessionsDir = path.join(RUNS_DIR, req.params.id, 'sessions');
  if (!fs.existsSync(sessionsDir)) return res.status(404).json({ error: 'Sessions not found' });

  const files    = fs.readdirSync(sessionsDir).filter(f => /^P\d+.*\.json$/.test(f)).sort();
  const sessions = files.map(f => JSON.parse(fs.readFileSync(path.join(sessionsDir, f), 'utf8')));
  res.json({ sessions, count: sessions.length });
});

// POST /api/runs/:id/report — generate report files (async)
app.post('/api/runs/:id/report', (req, res) => {
  const { id } = req.params;
  const runFolder = path.join(RUNS_DIR, id);

  setStatus(id, 'reporting');
  res.json({ status: 'reporting' });

  runPythonScript(path.join(__dirname, '../pipeline/reporter.py'), [runFolder])
    .then(() => setStatus(id, 'complete'))
    .catch(err => setStatus(id, 'error', { error: err.message, stage: 'reporting' }));
});

// GET /api/runs/:id/status — poll run status
app.get('/api/runs/:id/status', (req, res) => {
  const s = getStatus(req.params.id);
  if (!s) return res.status(404).json({ error: 'Run not found' });
  res.json(s);
});

// GET /api/runs/:id/download/:file — download report file
app.get('/api/runs/:id/download/:file', (req, res) => {
  const filePath = path.join(RUNS_DIR, req.params.id, 'report', req.params.file);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
  res.download(filePath);
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`SynthUX API server running on port ${PORT}`);
  console.log(`Model provider: ${process.env.MODEL_PROVIDER || 'not set — will prompt'}`);
});
