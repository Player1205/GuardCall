import React, { useEffect, useState } from 'react';

const VolumeMonitor = ({ isRecording }) => {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!isRecording) {
      setLevel(0);
      return;
    }

    // Simulate audio levels since actual AudioContext parsing per frame is expensive for scaffold
    // In production, connect AnalyserNode to the MediaStream.
    const interval = setInterval(() => {
      setLevel(Math.random() * 100);
    }, 100);

    return () => clearInterval(interval);
  }, [isRecording]);

  return (
    <div className="w-full flex items-center justify-center space-x-1 h-8">
      {[...Array(5)].map((_, i) => (
        <div 
          key={i} 
          className="w-1 bg-primary rounded-t-full transition-all duration-100 ease-in-out"
          style={{ 
            height: isRecording ? `${Math.max(10, (level / 100) * 32 * (Math.random() * 0.5 + 0.5))}px` : '4px',
            opacity: isRecording ? 0.7 : 0.2
          }}
        />
      ))}
    </div>
  );
};

export default VolumeMonitor;
