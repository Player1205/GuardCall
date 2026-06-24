import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SessionProvider } from './context/SessionContext.jsx';
import NumberCheck from './components/NumberCheck.jsx';
import ConsentBanner from './components/ConsentBanner.jsx';
import CallSession from './components/CallSession.jsx';
import ReportView from './components/ReportView.jsx';

function App() {
  return (
    <SessionProvider>
      <Router>
        <Routes>
          <Route path="/" element={<NumberCheck />} />
          <Route path="/consent" element={<ConsentBanner />} />
          <Route path="/session" element={<CallSession />} />
          <Route path="/report" element={<ReportView />} />
        </Routes>
      </Router>
    </SessionProvider>
  );
}

export default App;
