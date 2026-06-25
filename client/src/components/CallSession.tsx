import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneOff, Phone, Wifi, WifiOff } from 'lucide-react';
import { useSession } from '../hooks/useSession';
import TranscriptFeed from './TranscriptFeed';
import RiskIndicator from './RiskIndicator';
import CoachingCard from './CoachingCard';
import VolumeMonitor from './VolumeMonitor';

const CallSession: React.FC = () => {
  const navigate = useNavigate();
  const { 
    startSession, endSession, isRecording, transcript, 
    riskData, reportResult, permissionError, isConnected 
  } = useSession();
  
  const [cardDismissedId, setCardDismissedId] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  // Start session on mount
  useEffect(() => {
    startSession();
    return () => endSession();
  }, [startSession, endSession]);

  // Handle navigation when session ends
  useEffect(() => {
    if (reportResult) {
      if (reportResult.safe) {
        navigate('/');
      } else {
        navigate('/report', { state: { report: reportResult.report } });
      }
    }
  }, [reportResult, navigate]);

  // Call timer
  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => setSeconds(s => s + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [isRecording]);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleDismissCard = useCallback(() => {
    setCardDismissedId(riskData.signal);
  }, [riskData.signal]);

  if (permissionError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
        <div className="glass-card-strong p-8 max-w-sm w-full">
          <div className="w-16 h-16 bg-danger/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <PhoneOff className="w-8 h-8 text-danger" />
          </div>
          <h2 className="text-xl font-bold mb-2">Microphone Required</h2>
          <p className="text-white/60 text-sm mb-6 leading-relaxed">
            GuardCall cannot protect you without microphone access. {permissionError}
          </p>
          <button 
            onClick={() => navigate('/')} 
            className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const showCard = riskData.risk >= 40 && riskData.signal !== cardDismissedId;

  return (
    <div className="min-h-screen bg-background flex flex-col relative max-w-lg mx-auto overflow-hidden">
      {/* Animated background element */}
      <div className="absolute top-[-20%] left-[-10%] w-[120%] h-[40%] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      {riskData.risk >= 80 && (
        <div className="absolute top-0 left-0 w-full h-full bg-danger/5 animate-pulse pointer-events-none z-0" />
      )}

      {/* Top Bar / Command Center */}
      <div className="relative z-10 px-4 pt-6 pb-2">
        <div className="glass-card flex items-center justify-between p-3 px-5 mb-4 shadow-lg border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Phone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/50 font-semibold mb-0.5">Monitoring Call</p>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-bold">Unknown</span>
              </div>
            </div>
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              <span className="text-[11px] uppercase font-bold text-primary tracking-widest">LIVE</span>
            </div>
            <span className="font-mono text-white/70">{formatTime(seconds)}</span>
          </div>
        </div>

        {/* Risk Gauge integrated smoothly into the flow */}
        <RiskIndicator peakRiskScore={riskData.peakRiskScore} currentRiskScore={riskData.risk} />
      </div>

      {/* Main Transcript Area */}
      <TranscriptFeed transcript={transcript} />

      {/* Coaching Card Overlay */}
      <AnimatePresence>
        {showCard && (
          <CoachingCard 
            key={riskData.signal} // Re-animates if signal changes
            risk={riskData.risk} 
            signal={riskData.signal} 
            coaching={riskData.coaching} 
            onDismiss={handleDismissCard} 
          />
        )}
      </AnimatePresence>

      {/* Bottom Control Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/90 to-transparent pt-12 z-40">
        <div className="glass-card-strong p-2 pr-6 rounded-full flex items-center justify-between shadow-2xl">
          
          <div className="w-20 pl-4">
            <VolumeMonitor isRecording={isRecording} />
          </div>

          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={endSession}
            className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all ${
              riskData.risk >= 80 
                ? 'bg-danger shadow-[0_0_20px_rgba(226,75,74,0.5)] animate-pulse' 
                : 'bg-white/10 hover:bg-danger/80'
            }`}
          >
            <PhoneOff className={`w-7 h-7 ${riskData.risk >= 80 ? 'text-white' : 'text-danger'}`} />
          </motion.button>

          <div className="w-20 flex justify-end">
            {isConnected ? (
              <div className="p-2 bg-primary/10 rounded-full text-primary" title="Secured connection active">
                <Wifi className="w-5 h-5" />
              </div>
            ) : (
              <div className="p-2 bg-white/5 rounded-full text-white/30" title="Disconnected">
                <WifiOff className="w-5 h-5" />
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default CallSession;
