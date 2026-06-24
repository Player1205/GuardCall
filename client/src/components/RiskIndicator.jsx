import React from 'react';

const RiskIndicator = ({ peakRiskScore, currentRiskScore }) => {
  let color = 'bg-primary'; // Green
  let text = 'Watching...';

  if (peakRiskScore >= 40 && peakRiskScore < 80) {
    color = 'bg-warning'; // Amber
    text = 'Suspicious Patterns Detected';
  } else if (peakRiskScore >= 80) {
    color = 'bg-danger'; // Red
    text = 'High Risk Scam Call';
  }

  return (
    <div className={`w-full ${color} text-white px-4 py-2 flex items-center justify-between text-sm font-medium transition-colors duration-500`}>
      <div className="flex items-center space-x-2">
        {peakRiskScore >= 40 && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
        )}
        <span>{text}</span>
      </div>
      <span>Risk Score: {peakRiskScore}/100</span>
    </div>
  );
};

export default RiskIndicator;
