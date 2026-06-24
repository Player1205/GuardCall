import React, { useEffect, useRef } from 'react';

interface TranscriptFeedProps {
  transcript: string;
}

const TranscriptFeed: React.FC<TranscriptFeedProps> = ({ transcript }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="bg-white/5 p-4 rounded-xl border border-white/10 shadow-inner min-h-[50vh]">
        <p className="text-textMain/90 leading-relaxed text-lg tracking-wide">
          {transcript || "Listening..."}
        </p>
        <div ref={endRef} />
      </div>
    </div>
  );
};

export default TranscriptFeed;
