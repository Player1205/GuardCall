import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react';

interface RiskIndicatorProps {
  peakRiskScore: number;
  currentRiskScore: number;
}

const RiskIndicator: React.FC<RiskIndicatorProps> = ({ peakRiskScore }) => {
  let color = 'bg-primary'; 
  let text = 'Watching...';
  let Icon = ShieldCheck;

  if (peakRiskScore >= 40 && peakRiskScore < 80) {
    color = 'bg-warning';
    text = 'Suspicious Patterns Detected';
    Icon = ShieldAlert;
  } else if (peakRiskScore >= 80) {
    color = 'bg-danger';
    text = 'High Risk Scam Call';
    Icon = Shield;
  }

  return (
    <motion.div 
      className={`w-full ${color} text-white px-4 py-3 flex items-center justify-between text-sm font-medium transition-colors duration-500`}
      animate={peakRiskScore >= 40 ? { scale: [1, 1.02, 1] } : {}}
      transition={{ repeat: Infinity, duration: 2 }}
    >
      <div className="flex items-center space-x-2">
        <Icon className="w-5 h-5" />
        <span>{text}</span>
      </div>
      <span>Risk Score: {peakRiskScore}/100</span>
    </motion.div>
  );
};

export default RiskIndicator;
