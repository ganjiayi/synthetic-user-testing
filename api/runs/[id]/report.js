// Report generation uses reporter.py which requires a Python runtime.
// Vercel does not support Python — this route is not available in this deployment.
// To generate reports, run locally: python3 src/pipeline/reporter.py <run_folder>
module.exports = (req, res) => {
  res.status(501).json({
    error: 'Report generation is not available in the cloud deployment.',
    note:  'Run locally: python3 src/pipeline/reporter.py <run_folder>',
  });
};
