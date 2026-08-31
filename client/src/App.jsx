import { Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Console from './components/Console.jsx';
import Overview from './pages/Overview.jsx';
import Queue from './pages/Queue.jsx';
import Audit from './pages/Audit.jsx';
import Rules from './pages/Rules.jsx';
import Settings from './pages/Settings.jsx';
import Agent from './pages/Agent.jsx';
import Recoveries from './pages/Recoveries.jsx';
import Voice from './pages/Voice.jsx';
import Receivables from './pages/Receivables.jsx';
import Integrations from './pages/Integrations.jsx';
import Trace from './pages/Trace.jsx';
import Degradation from './pages/Degradation.jsx';
import Promises from './pages/Promises.jsx';
import Simulator from './pages/Simulator.jsx';
import Simulate from './pages/Simulate.jsx';
import Case from './pages/Case.jsx';
import ApiDocs from './pages/ApiDocs.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/docs" element={<ApiDocs />} />
      <Route path="/app" element={<Console />}>
        <Route index element={<Navigate to="/app/overview" replace />} />
        <Route path="overview" element={<Overview />} />
        <Route path="risk" element={<Queue />} />
        <Route path="case/:id" element={<Case />} />
        <Route path="agent" element={<Agent />} />
        <Route path="trace" element={<Trace />} />
        <Route path="degradation" element={<Degradation />} />
        <Route path="simulate" element={<Simulate />} />
        <Route path="recoveries" element={<Recoveries />} />
        <Route path="promises" element={<Promises />} />
        <Route path="simulator" element={<Simulator />} />
        <Route path="workflows" element={<Rules />} />
        <Route path="voice" element={<Voice />} />
        <Route path="receivables" element={<Receivables />} />
        <Route path="audit" element={<Audit />} />
        <Route path="integrations" element={<Integrations />} />
        <Route path="settings" element={<Settings />} />
        {/* legacy aliases */}
        <Route path="queue" element={<Navigate to="/app/risk" replace />} />
        <Route path="rules" element={<Navigate to="/app/workflows" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
