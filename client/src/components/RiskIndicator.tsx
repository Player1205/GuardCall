import React from 'react';
import { motion } from 'framer-motion';

interface RiskIndicatorProps {
  peakRiskScore: number;
  currentRiskScore: number;
}

const RiskIndicator: React.FC<RiskIndicatorProps> = ({ peakRiskScore, currentRiskScore }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  // Map 0–100 risk to a 270° (75%) arc to create a speedometer gauge
  const gaugeLength = circumference * 0.75;
  const dashoffset = gaugeLength - (peakRiskScore / 100) * gaugeLength;

  const getColor = (score: number) => {
    if (score >= 80) return '#E24B4A';
    if (score >= 40) return '#EF9F27';
    return '#1D9E75';
  };

  const currentColor = getColor(peakRiskScore);
  const isHighRisk = currentRiskScore >= 40;

  return (
    <div className="flex flex-col items-center justify-center p-4 relative">
      <div className="relative flex items-center justify-center">

        <svg className="w-24 h-24 transform -rotate-[135deg]" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="8"
            strokeDasharray={`${gaugeLength} ${circumference}`}
            strokeLinecap="round"
          />

          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke={currentColor}
            strokeWidth="8"
            strokeDasharray={`${gaugeLength} ${circumference}`}
            strokeLinecap="round"
            initial={{ strokeDashoffset: gaugeLength }}
            animate={{ strokeDashoffset: dashoffset }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{
              filter: `drop-shadow(0 0 8px ${currentColor}80)`
            }}
          />
        </svg>


        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span 
            key={currentRiskScore}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-2xl font-bold tracking-tighter"
            style={{ color: currentColor }}
          >
            {currentRiskScore}
          </motion.span>
          <span className="text-[10px] text-white/50 uppercase tracking-wider mt-[-2px]">Risk</span>
        </div>
      </div>

      {isHighRisk && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-0 right-0"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: currentColor }}></span>
            <span className="relative inline-flex rounded-full h-3 w-3" style={{ backgroundColor: currentColor }}></span>
          </span>
        </motion.div>
      )}
    </div>
  );
};

export default RiskIndicator;
