import React from 'react';

const CoachingCard = ({ risk, signal, coaching, onDismiss }) => {
  if (risk < 40) return null;

  let bgColor = 'bg-warning';
  let labelColor = 'text-warning';
  let label = 'CAUTION';

  if (risk >= 60 && risk < 80) {
    bgColor = 'bg-orange-500';
    labelColor = 'text-orange-500';
    label = 'SUSPICIOUS';
  } else if (risk >= 80) {
    bgColor = 'bg-danger';
    labelColor = 'text-danger';
    label = 'HIGH RISK';
  }

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 animate-[slideUp_0.3s_ease-out]">
      <div className={`p-5 rounded-2xl shadow-2xl border-2 ${bgColor.replace('bg-', 'border-')} bg-background/95 backdrop-blur-md`}>
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center space-x-2">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${bgColor}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${bgColor}`}></span>
            </span>
            <span className={`text-sm font-bold tracking-wider ${labelColor}`}>{label}</span>
          </div>
          <button onClick={onDismiss} className="text-white/50 hover:text-white">✕</button>
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
    </div>
  );
};

export default CoachingCard;
