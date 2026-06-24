import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionContext } from '../context/SessionContext.jsx';
import { checkCommunityDB } from '../services/api.js';

const NumberCheck = () => {
  const { callerNumber, setCallerNumber } = useSessionContext();
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState(null);
  const navigate = useNavigate();

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!callerNumber || callerNumber.length < 10) return;
    
    setLoading(true);
    const result = await checkCommunityDB(callerNumber);
    setLoading(false);

    if (result.flagged) {
      setWarning(`⚠️ This number has been reported ${result.reportsCount} times for scams. Exercise caution.`);
    } else {
      // If safe or not flagged, just go to consent
      navigate('/consent');
    }
  };

  const handleProceed = () => {
    navigate('/consent');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/5 p-6 rounded-2xl shadow-xl border border-white/10">
        <h1 className="text-3xl font-bold text-center text-primary mb-2">GuardCall</h1>
        <p className="text-center text-textMain/70 mb-8">AI-Powered Scam Call Protection</p>

        <form onSubmit={handleCheck} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-textMain/80 mb-1">Incoming Caller Number</label>
            <input 
              type="tel" 
              placeholder="+91-9876-543-XXX"
              className="w-full bg-background border border-white/20 rounded-lg px-4 py-3 text-textMain focus:outline-none focus:border-primary transition-colors"
              value={callerNumber}
              onChange={(e) => setCallerNumber(e.target.value)}
              required
            />
          </div>

          {!warning ? (
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-lg transition-colors flex justify-center items-center"
            >
              {loading ? 'Checking...' : 'Start Protection'}
            </button>
          ) : null}
        </form>

        {warning && (
          <div className="mt-6 p-4 bg-danger/20 border border-danger/50 rounded-lg">
            <p className="text-danger font-medium text-sm mb-4">{warning}</p>
            <button 
              onClick={handleProceed}
              className="w-full bg-danger hover:bg-danger/90 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Proceed with Protection
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NumberCheck;
