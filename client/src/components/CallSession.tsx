import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneOff, Phone, Wifi, WifiOff } from 'lucide-react';
import { useSession } from '../hooks/useSession';
import { useSessionStore } from '../store/useSessionStore';
import TranscriptFeed from './TranscriptFeed';
import RiskIndicator from './RiskIndicator';
import CoachingCard from './CoachingCard';
import VolumeMonitor from './VolumeMonitor';

/**
 * Calculates the Jaccard similarity index between two strings.
 * Jaccard similarity is the size of the intersection divided by the size of the union of two sets.
 * Here, it extracts words via lowercase regex matching boundaries (`\b\w+\b`).
 * This is used to detect when LLM-generated coaching text changes context meaningfully,
 * rather than triggering a new card for slight phrasing updates or minor corrections.
 */
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

const CallSession: React.FC = () => {
  const navigate = useNavigate();
  const { 
    startSession, endSession, isRecording, transcript, 
    riskData, reportResult, permissionError, isConnected 
  } = useSession();
  
  const setReportResult = useSessionStore((state) => state.setReportResult);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [cardDismissedId, setCardDismissedId] = useState<string | null>(null);
  const [dismissedPhases, setDismissedPhases] = useState<Set<string>>(new Set());
  const [seconds, setSeconds] = useState(0);

  // Stabilized coaching card state to prevent rapid flashing during risk updates
  const [displayCardData, setDisplayCardData] = useState<{ risk: number, signal: string, phase: string, coaching: string } | null>(null);
  const displayCardDataRef = React.useRef(displayCardData);
  displayCardDataRef.current = displayCardData;
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUpdateTimeRef = React.useRef<number>(0);

  /**
   * Evaluates active threat detection and coordinates coaching card updates.
   * Debounces close events using a 5-second lock (via closeTimerRef) to prevent 
   * rapid toggle flashes when the risk score briefly dips below the threshold.
   */
  useEffect(() => {
    const currentCard = displayCardDataRef.current;

    if (riskData.risk >= 40) {
      // Cancel pending close — threat is still active
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }

      const now = Date.now();

      let isSameContext = false;
      if (currentCard) {
        // Determine if the incoming threat belongs to the same logical context.
        // We consider it the same context if the phase identifier (motive) is identical,
        // OR if the text similarity threshold exceeds 80% (0.80).
        const similarity = calculateSimilarity(currentCard.coaching, riskData.coaching);
        isSameContext = (currentCard.phase === riskData.phase) || (similarity > 0.80);
      }
      
      // Show new card when: no card exists, or the context/motive has changed
      if (!currentCard || !isSameContext) {
        setDisplayCardData({
          risk: riskData.risk,
          signal: riskData.signal,
          phase: riskData.phase || 'intro',
          coaching: riskData.coaching
        });
        lastUpdateTimeRef.current = now;
      } else if (currentCard.risk !== riskData.risk) {
        // Silently update risk score without changing displayed text
        setDisplayCardData(prev => prev ? { ...prev, risk: riskData.risk } : null);
      }
    } else {
      // Delay card dismissal by 5s to prevent rapid show/hide flashing
      if (!closeTimerRef.current && currentCard) {
        closeTimerRef.current = setTimeout(() => {
          setDisplayCardData(null);
          closeTimerRef.current = null;
        }, 5000);
      }
    }

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

  /**
   * Manages the Socket.IO lifecycle and connection bindings.
   * Ensures the session starts only when a secure connection is fully established,
   * and guarantees cleanup (endSession) when the component unmounts or disconnects.
   */
  useEffect(() => {
    if (isConnected) {
      callbacksRef.current.startSession();
      setSessionStarted(true);
    }
    return () => {
      if (isConnected) {
        callbacksRef.current.endSession();
      }
    };
  }, [isConnected]);

  // Navigate to report or home when session ends
  useEffect(() => {
    if (reportResult && sessionStarted) {
      if (reportResult.safe) {
        navigate('/');
      } else {
        navigate('/report', { state: { report: reportResult.report } });
      }
    }
  }, [reportResult, sessionStarted, navigate]);

  // Reset reportResult when leaving the session screen
  useEffect(() => {
    return () => {
      setReportResult(null);
    };
  }, [setReportResult]);

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

      {/* --- Main Layout Flow --- */}
      {/* Dynamic background glow indicating active threat level */}
      <div className="absolute top-[-20%] left-[-10%] w-[120%] h-[40%] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      {riskData.risk >= 80 && (
        <div className="absolute top-0 left-0 w-full h-full bg-danger/5 animate-pulse pointer-events-none z-0" />
      )}

      {/* --- Command Bar Layout --- */}
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

        {/* --- Risk Gauge Embedding --- */}
        {/* Visualizes the current and peak threat analysis using dynamic SVG arcs */}
        <RiskIndicator peakRiskScore={riskData.peakRiskScore} currentRiskScore={riskData.risk} />
      </div>

      {/* --- Transcript Feed Binding --- */}
      {/* Streams live segmented utterances captured from the user's microphone */}
      <TranscriptFeed transcript={transcript} />

      {/* Coaching Overlay */}
      <AnimatePresence>
        {showCard && displayCardData && (
          <CoachingCard 
            key={displayCardData.signal}
            risk={displayCardData.risk} 
            signal={displayCardData.signal} 
            coaching={displayCardData.coaching} 
            onDismiss={handleDismissCard} 
          />
        )}
      </AnimatePresence>

      {/* --- Bottom Control Bar Action Mapping --- */}
      {/* Provides unified access to session termination and system status indicators */}
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
