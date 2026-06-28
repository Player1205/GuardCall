import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneOff, Phone, Wifi, WifiOff } from 'lucide-react';
import { useSession } from '../hooks/useSession';
import TranscriptFeed from './TranscriptFeed';
import RiskIndicator from './RiskIndicator';
import CoachingCard from './CoachingCard';
import VolumeMonitor from './VolumeMonitor';

// Helper function to calculate Jaccard similarity between two strings
const calculateSimilarity = (str1: string, str2: string) => {
  const getWords = (s: string) => new Set(s.toLowerCase().match(/\b\w+\b/g) || []);
  const set1 = getWords(str1);
  const set2 = getWords(str2);
  if (set1.size === 0 && set2.size === 0) return 1;
  
  let intersection = 0;
  set1.forEach(word => {
    if (set2.has(word)) intersection++;
  });
  
  const union = set1.size + set2.size - intersection;
  return intersection / union;
};

const PHASE_ORDER: Record<string, number> = {
  'intro': 0,
  'allegation': 1,
  'intimidation': 2,
  'demand': 3
};

const CallSession: React.FC = () => {
  const navigate = useNavigate();
  const { 
    startSession, endSession, isRecording, transcript, 
    riskData, reportResult, permissionError, isConnected 
  } = useSession();
  
  const [cardDismissedId, setCardDismissedId] = useState<string | null>(null);
  const [dismissedPhases, setDismissedPhases] = useState<Set<string>>(new Set());
  const [seconds, setSeconds] = useState(0);

  // State to hold the currently displayed coaching card data to prevent rapid flashing
  const [displayCardData, setDisplayCardData] = useState<{ risk: number, signal: string, phase: string, coaching: string } | null>(null);
  const closeTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimeRef = React.useRef<number>(0);

  useEffect(() => {
    if (riskData.risk >= 40) {
      // Cancel any pending close timer since the threat is active
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }

      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
      const isCooldownOver = timeSinceLastUpdate > 5000; // 5 seconds lock-in cooldown

      let isSameContext = false;
      if (displayCardData) {
        // Consider it the same context if the phase (motive) is identical OR if the text is 80% similar
        const similarity = calculateSimilarity(displayCardData.coaching, riskData.coaching);
        isSameContext = (displayCardData.phase === riskData.phase) || (similarity > 0.80);
      }
      
      // Update the card text if:
      // 1. No card is currently displayed.
      // 2. The context/motive has changed (different phase and not similar text).
      // We no longer use a 5-second lock because isSameContext already prevents spamming, 
      // and we MUST show new phase escalations instantly.
      if (!displayCardData || !isSameContext) {
        setDisplayCardData({
          risk: riskData.risk,
          signal: riskData.signal,
          phase: riskData.phase || 'intro',
          coaching: riskData.coaching
        });
        lastUpdateTimeRef.current = now;
      } else if (displayCardData.risk !== riskData.risk) {
        // Update just the risk score silently if text remains similar or phase is same
        setDisplayCardData(prev => prev ? { ...prev, risk: riskData.risk } : null);
      }
    } else {
      // Risk is low. Set a 5-second delay before hiding the card to prevent rapid close/open flashing.
      if (!closeTimerRef.current && displayCardData) {
        closeTimerRef.current = setTimeout(() => {
          setDisplayCardData(null);
          closeTimerRef.current = null;
        }, 5000);
      }
    }

    // Cleanup on unmount
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, [riskData.risk, riskData.signal, riskData.phase, riskData.coaching]);

  const callbacksRef = React.useRef({ startSession, endSession });
  useEffect(() => {
    callbacksRef.current = { startSession, endSession };
  }, [startSession, endSession]);

  // Start session only when socket connects
  useEffect(() => {
    if (isConnected) {
      callbacksRef.current.startSession();
    }
    return () => {
      if (isConnected) {
        callbacksRef.current.endSession();
      }
    };
  }, [isConnected]);

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
    if (displayCardData) {
      setCardDismissedId(displayCardData.signal);
      setDismissedPhases(prev => {
        const next = new Set(prev);
        next.add(displayCardData.phase);
        return next;
      });
    }
  }, [displayCardData]);

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

  const showCard = displayCardData !== null && 
                   displayCardData.signal !== cardDismissedId &&
                   !dismissedPhases.has(displayCardData.phase);

  return (
    <div className="h-[100dvh] bg-background flex flex-col relative max-w-lg mx-auto overflow-hidden">
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
        {showCard && displayCardData && (
          <CoachingCard 
            key={displayCardData.signal} // Re-animates if signal changes
            risk={displayCardData.risk} 
            signal={displayCardData.signal} 
            coaching={displayCardData.coaching} 
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
