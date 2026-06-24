import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const ConsentBanner: React.FC = () => {
  const [agreed, setAgreed] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleConfirm = () => {
    if (agreed) {
      navigate('/session');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/5 p-6 rounded-2xl shadow-xl border border-white/10">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <CheckCircle className="w-6 h-6 text-primary" />
          Legal Consent
        </h2>
        
        <p className="text-textMain/80 mb-6 text-sm leading-relaxed">
          You are about to record a call you are a party to. This is legal under Indian IT law for personal safety and investigation purposes.
          <br /><br />
          Audio is streamed securely to AI for transcription and is <strong>never stored</strong>. PII is scrubbed automatically.
        </p>

        <div className="flex items-start mb-6">
          <div className="flex items-center h-5">
            <input 
              id="consent" 
              type="checkbox" 
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-5 h-5 bg-background border-white/30 rounded text-primary focus:ring-primary focus:ring-offset-background"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="consent" className="font-medium text-textMain cursor-pointer">
              I acknowledge and agree to start recording this call for my protection.
            </label>
          </div>
        </div>

        <button 
          onClick={handleConfirm}
          disabled={!agreed}
          className={`w-full font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${agreed ? 'bg-primary hover:bg-primary/90 text-white' : 'bg-white/10 text-white/40 cursor-not-allowed'}`}
        >
          Confirm & Start
        </button>
      </div>
    </div>
  );
};

export default ConsentBanner;
