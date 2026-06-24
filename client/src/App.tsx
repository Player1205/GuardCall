
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import NumberCheck from './components/NumberCheck';
import ConsentBanner from './components/ConsentBanner';
import CallSession from './components/CallSession';
import ReportView from './components/ReportView';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<NumberCheck />} />
        <Route path="/consent" element={<ConsentBanner />} />
        <Route path="/session" element={<CallSession />} />
        <Route path="/report" element={<ReportView />} />
      </Routes>
    </Router>
  );
}

export default App;
