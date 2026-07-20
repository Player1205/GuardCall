import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';

interface CoachingCardProps {
  risk: number;
  signal: string;
  coaching: string;
  onDismiss: () => void;
}

const CoachingCard: React.FC<CoachingCardProps> = ({ risk, signal, coaching, onDismiss }) => {

  /**
   * Tier Style Classification:
   * Maps the current numeric risk score to specific visual warning levels:
   * - Danger (>= 80): Uses deep reds (`bg-danger`), large glowing shadows, and the ShieldAlert icon.
   * - Suspicious (>= 60): Uses orange colors and medium glow.
   * - Caution (< 60): Uses yellow/warning styles.
   * Tailwind classes are dynamically injected to adjust background colors, text colors, and glowing shadow variants.
   */
  let tierStyle = {
    cardBg: 'bg-warning/10 border-warning/30',
    headerBg: 'bg-warning',
    textColor: 'text-warning-light',
    glow: 'shadow-[0_0_30px_rgba(239,159,39,0.15)]',
    icon: <AlertTriangle className="w-5 h-5 text-white" />,
    label: 'CAUTION',
  };

  if (risk >= 80) {
    tierStyle = {
      cardBg: 'bg-danger/10 border-danger/40',
      headerBg: 'bg-danger',
      textColor: 'text-danger-light',
      glow: 'shadow-[0_0_40px_rgba(226,75,74,0.3)]',
      icon: <ShieldAlert className="w-5 h-5 text-white" />,
      label: 'HIGH RISK',
    };
  } else if (risk >= 60) {
    tierStyle = {
      cardBg: 'bg-orange-500/10 border-orange-500/40',
      headerBg: 'bg-orange-500',
      textColor: 'text-orange-300',
      glow: 'shadow-[0_0_35px_rgba(249,115,22,0.2)]',
      icon: <AlertTriangle className="w-5 h-5 text-white" />,
      label: 'SUSPICIOUS',
    };
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      /**
       * Framer Motion Configuration:
       * Defines a `spring` physics-based animation for a smooth slide-up transition overlay.
       * - stiffness: 300 (determines the tension of the spring, higher = faster snap)
       * - damping: 25 (determines the friction, reducing bounce and smoothing the end of the motion)
       */
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`absolute bottom-[100px] left-4 right-4 z-50 rounded-2xl border backdrop-blur-xl max-h-[calc(100dvh-180px)] flex flex-col overflow-hidden ${tierStyle.cardBg} ${tierStyle.glow}`}
    >
      {/* Header bar */}
      <div className={`${tierStyle.headerBg} px-4 py-2 flex items-center justify-between shrink-0`}>
        <div className="flex items-center gap-2 font-bold text-white tracking-wide text-sm">
          {tierStyle.icon}
          {tierStyle.label}
        </div>
        <button 
          onClick={onDismiss}
          className="p-1 rounded-full hover:bg-white/20 transition-colors"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
        {/* Detected Pattern */}
        <div className="text-sm">
          <span className="text-white/50 uppercase tracking-wider text-[10px] block mb-1">Detected Pattern</span>
          <p className="text-white/90 font-medium leading-snug">{signal}</p>
        </div>

        {/* Recommended Action */}
        <div className="bg-black/30 rounded-xl p-4 border border-white/5 mt-1">
          <span className="text-white/50 uppercase tracking-wider text-[10px] block mb-2">Recommended Action</span>
          <p className="text-white text-lg font-semibold leading-relaxed">
            "{coaching}"
          </p>
        </div>

        {/* Critical danger warning */}
        {risk >= 80 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 text-center text-danger-light font-bold text-sm uppercase tracking-widest animate-pulse"
          >
            End this call immediately
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default CoachingCard;
