import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic } from 'lucide-react';

interface TranscriptFeedProps {
  transcript: string;
}

const TranscriptFeed: React.FC<TranscriptFeedProps> = ({ transcript }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever transcript updates
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transcript]);

  // Split transcript into sentences for per-phrase animation
  const phrases = transcript.split(/(?<=[.!?])\s+/).filter(p => p.trim().length > 0);

  return (
    <div className="relative flex-1 min-h-0 mx-4 my-2 mb-24 rounded-2xl overflow-hidden glass-card shadow-lg flex flex-col">
      {/* Top fade gradient */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-background/90 to-transparent z-10 pointer-events-none" />
      
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-5 pb-10 pt-8 scroll-smooth"
      >
        <AnimatePresence mode="popLayout">
          {phrases.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="h-full flex flex-col items-center justify-center text-white/40 space-y-4"
            >
              <div className="flex items-center justify-center space-x-2">
                {[...Array(4)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 bg-primary/50 rounded-full"
                    animate={{ height: ['8px', '24px', '8px'] }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.15,
                      ease: 'easeInOut'
                    }}
                  />
                ))}
              </div>
              <p className="text-sm font-medium uppercase tracking-widest flex items-center gap-2">
                <Mic className="w-4 h-4" /> Listening securely...
              </p>
            </motion.div>
          ) : (
            phrases.map((phrase, idx) => (
              <motion.div
                key={idx} // Using index is okay here because transcript is append-only from Deepgram mostly
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-3 text-[15px] leading-relaxed text-white/80 font-medium"
              >
                {phrase}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TranscriptFeed;
