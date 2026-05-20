import React, { useState } from 'react';
import Landing        from './pages/Landing';
import PinPage        from './pages/PinPage';
import Dashboard      from './pages/Dashboard';
import Questionnaire  from './pages/Questionnaire';
import IntakeReview   from './pages/IntakeReview';
import PlanViewer     from './pages/PlanViewer';
import RunResearch    from './pages/RunResearch';
import Results        from './pages/Results';
import Report         from './pages/Report';
import History        from './pages/History';
import RunDetail      from './pages/RunDetail';
import Nav            from './components/Nav';

export default function App() {
  const [page, setPage]             = useState('landing');
  const [savedDraft, setSavedDraft] = useState(null);
  const [runId,      setRunId]      = useState(null);
  const [planData,   setPlanData]   = useState(null);
  const [isAuth,     setIsAuth]     = useState(() => sessionStorage.getItem('synthux_auth') === '1');

  const goTo = (p, data) => {
    if (data?.draft)   setSavedDraft(data.draft);
    if (data?.runId)   setRunId(data.runId);
    if (data?.plan)    setPlanData(data.plan);
    setPage(p);
    window.scrollTo(0, 0);
  };

  const onAuth = () => setIsAuth(true);

  const onLogout = () => {
    sessionStorage.removeItem('synthux_auth');
    setIsAuth(false);
    goTo('landing');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav page={page} goTo={goTo} isAuth={isAuth} onLogout={onLogout} />
      {page === 'landing'        && <Landing        goTo={goTo} />}
      {page === 'pin'            && <PinPage        goTo={goTo} onAuth={onAuth} />}
      {page === 'dashboard'      && <Dashboard      goTo={goTo} />}
      {page === 'questionnaire'  && <Questionnaire  goTo={goTo} draft={savedDraft} />}
      {page === 'review'         && <IntakeReview   goTo={goTo} draft={savedDraft} />}
      {page === 'plan'           && <PlanViewer     goTo={goTo} runId={runId} plan={planData} />}
      {page === 'running'        && <RunResearch    goTo={goTo} runId={runId} />}
      {page === 'results'        && <Results        goTo={goTo} runId={runId} />}
      {page === 'report'         && <Report         goTo={goTo} runId={runId} />}
      {page === 'history'        && <History        goTo={goTo} />}
      {page === 'runDetail'      && <RunDetail      goTo={goTo} runId={runId} />}
    </div>
  );
}
