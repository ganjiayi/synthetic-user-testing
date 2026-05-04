import React, { useState } from 'react';
import Landing      from './pages/Landing';
import Questionnaire from './pages/Questionnaire';
import PlanViewer   from './pages/PlanViewer';
import RunResearch  from './pages/RunResearch';
import Results      from './pages/Results';
import Report       from './pages/Report';
import Nav          from './components/Nav';

export default function App() {
  const [page, setPage]           = useState('landing');
  const [savedDraft, setSavedDraft] = useState(null);

  const goTo = (p, data) => {
    if (data) setSavedDraft(data);
    setPage(p);
    window.scrollTo(0, 0);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav page={page} goTo={goTo} />
      {page === 'landing'        && <Landing       goTo={goTo} />}
      {page === 'questionnaire'  && <Questionnaire goTo={goTo} draft={savedDraft} />}
      {page === 'plan'           && <PlanViewer    goTo={goTo} />}
      {page === 'running'        && <RunResearch   goTo={goTo} />}
      {page === 'results'        && <Results       goTo={goTo} />}
      {page === 'report'         && <Report        goTo={goTo} />}
    </div>
  );
}
