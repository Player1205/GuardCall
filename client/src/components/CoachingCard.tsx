import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertOctagon, AlertTriangle, Info } from 'lucide-react';

interface CoachingCardProps {
  risk: number;
  signal: string;
  coaching: string;
  onDismiss: () => void;
}

const CoachingCard: React.FC<CoachingCardProps> = ({ risk, signal, coaching, onDismiss }) => {
  if (risk < 40) return null;

  let bgColor = 'bg-warning';
  let labelColor = 'text-warning';
  let label = 'CAUTION';
  let Icon = Info;

  if (risk >= 60 && risk < 80) {
    bgColor = 'bg-orange-500';
    labelColor = 'text-orange-500';
    label = 'SUSPICIOUS';
    Icon = AlertTriangle;
  } else if (risk >= 80) {
    bgColor = 'bg-danger';
    labelColor = 'text-danger';
    label = 'HIGH RISK';
    Icon = AlertOctagon;
  }

  return (
    <AnimatePresence>
      <motion.div 
        className="absolute bottom-4 left-4 right-4 z-50"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <div className={`p-5 rounded-2xl shadow-2xl border-2 ${bgColor.replace('bg-', 'border-')} bg-background/95 backdrop-blur-md`}>
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-4 w-4 items-center justify-center">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${bgColor}`}></span>
                <Icon className={`relative z-10 w-4 h-4 ${labelColor}`} />
              </span>
              <span className={`text-sm font-bold tracking-wider ${labelColor}`}>{label}</span>
            </div>
            <button onClick={onDismiss} className="text-white/50 hover:text-white transition-colors">✕</button>
          </div>
          
          <p className="text-white/70 text-sm mb-3">
            <span className="font-semibold text-white">Detected:</span> {signal}
          </p>
          
          <div className="bg-white/10 rounded-lg p-4 border border-white/20">
            <p className="text-xs text-white/50 mb-1 uppercase tracking-wider font-semibold">Say this exactly:</p>
            <p className="text-white font-medium text-lg leading-snug">"{coaching}"</p>
          </div>

          {risk >= 80 && (
            <div className="mt-3 text-center">
              <p className="text-danger font-bold uppercase text-sm animate-pulse">You can end this call now</p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CoachingCard;
