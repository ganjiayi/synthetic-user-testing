export const PERSONAS = [
  { code: 'ST', name: 'Spontaneous Traditionalist', tag: 'Family-oriented · 35–50', loc: 'Shah Alam / Seremban', bg: '#EEF3FF', color: '#1B4FD8', priority: 'Primary' },
  { code: 'PI', name: 'Progressive Influencer', tag: 'Urban professional · 25–35', loc: 'Kuala Lumpur', bg: '#EAF3DE', color: '#27500A', priority: 'Secondary' },
  { code: 'TE', name: 'Trendsetter Explorer', tag: 'Digital native · 20–30', loc: 'Mont Kiara / PJ', bg: '#FAEEDA', color: '#633806', priority: 'Secondary' },
  { code: 'FC', name: 'Family-Centric Devotee', tag: 'Suburban family · 38–55', loc: 'Petaling Jaya', bg: '#EEEDFE', color: '#3C3489', priority: 'Primary' },
  { code: 'RC', name: 'Routine Conservative', tag: 'Habitual · 45–65', loc: 'Kota Bharu / East Coast', bg: '#F1EFE8', color: '#444441', priority: 'Secondary' },
];

export const PRODUCTS = [
  { id: 'ACM', name: 'Astro.com.my', desc: 'Marketing and acquisition website', icon: '🌐', badge: '2 data gaps', badgeType: 'gap' },
  { id: 'MAA', name: 'My Astro App', desc: 'Account management and self-service', icon: '📱', badge: 'Template pending', badgeType: 'pending' },
  { id: 'NEW', name: 'Add new product', desc: 'Fill in the product template first', icon: '+', badge: null, badgeType: 'add' },
];

export const STEPS = [
  { section: 'Product', title: 'Select a product', sub: 'Product context, pain points, and agent instructions will auto-populate from the database.' },
  { section: 'Methodology', title: 'Choose your research methodology', sub: 'This determines what test materials are needed next and how synthetic sessions will run.' },
  { section: 'Study context', title: 'Product and design phase', sub: 'The agent uses these to calibrate friction sensitivity and research focus for your sessions.' },
  { section: 'Research goals', title: 'What must this study answer?', sub: 'Define the feature under test, your research questions, and the decision this study needs to support.' },
  { section: 'Personas', title: 'Select persona segments', sub: 'Choose which synthetic agents run sessions. Select at least two — one primary, one secondary.' },
  { section: 'Tasks', title: 'Define tasks for synthetic users', sub: 'Write what each synthetic user will attempt, given the methodology you selected.' },
  { section: 'Output', title: 'Output and handoff', sub: 'This workflow runs entirely on Claude — no configuration needed here.' },
];

export const PLAN_SECTIONS = [
  { id: 'ctx',     label: 'Study context',    dot: '#1B4FD8' },
  { id: 'goals',   label: 'Research goals',   dot: '#1B4FD8' },
  { id: 'personas',label: 'Personas',          dot: '#534AB7' },
  { id: 'tasks',   label: 'Tasks',             dot: '#C97B2F' },
  { id: 'eval',    label: 'Eval metrics',      dot: '#0F8A6E' },
  { id: 'constraints', label: 'Guardrails',    dot: '#C42B2B' },
  { id: 'method',  label: 'Method',            dot: '#6B7280' },
  { id: 'output',  label: 'Output & handoff',  dot: '#6B7280' },
];
