import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../hooks/useSession.js';
import TranscriptFeed from './TranscriptFeed.jsx';
import RiskIndicator from './RiskIndicator.jsx';
import CoachingCard from './CoachingCard.jsx';
import VolumeMonitor from './VolumeMonitor.jsx';

const CallSession = () => {
  const navigate = useNavigate();
  const { startSession, endSession, isRecording, transcript, riskData, reportResult, permissionError } = useSession();
  const [cardDismissedId, setCardDismissedId] = useState(null);

  useEffect(() => {
    startSession();
    return () => endSession();
  }, [startSession, endSession]);

  useEffect(() => {
    if (reportResult) {
      if (reportResult.safe) {
        navigate('/');
      } else {
        navigate('/report', { state: { report: reportResult.report } });
      }
    }
  }, [reportResult, navigate]);

  if (permissionError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-danger text-center">
          <p className="text-xl font-bold mb-2">Microphone Error</p>
          <p>{permissionError}</p>
          <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 bg-white/10 rounded">Go Back</button>
        </div>
      </div>
    );
  }

  const handleDismissCard = () => {
    setCardDismissedId(riskData.signal); // Hack to dismiss until new signal
  };

  const showCard = riskData.risk >= 40 && riskData.signal !== cardDismissedId;

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto border-x border-white/5 relative">
      <RiskIndicator peakRiskScore={riskData.peakRiskScore} currentRiskScore={riskData.risk} />
      
      <div className="flex-1 flex flex-col relative">
        <TranscriptFeed transcript={transcript} />
        
        {showCard && (
          <CoachingCard 
            risk={riskData.risk} 
            signal={riskData.signal} 
            coaching={riskData.coaching} 
            onDismiss={handleDismissCard} 
          />
        )}
      </div>

      <div className="bg-white/5 border-t border-white/10 p-4 pb-8 flex flex-col items-center">
        <VolumeMonitor isRecording={isRecording} />
        <button 
          onClick={endSession}
          className="mt-4 bg-danger hover:bg-danger/90 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform active:scale-95 flex items-center space-x-2"
        >
          <span className="h-3 w-3 bg-white rounded-sm"></span>
          <span>End Protection</span>
        </button>
      </div>
    </div>
  );
};

export default CallSession;
