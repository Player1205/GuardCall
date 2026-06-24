import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SCAM_DETECTION_SYSTEM_PROMPT = `You are a real-time scam detection AI for India. 
Analyze this phone call transcript and detect scam patterns.
Detect:
- Authority impersonation (CBI, ED, RBI, police, customs) without verifiable ID
- Manufactured urgency ("arrested in 2 hours", "act now", "warrant will be issued")
- Financial demands (UPI transfer, cash deposit, OTP, card numbers, bank details)
- Isolation tactics ("do not tell family", "this is confidential", "don't hang up")
- Threats of legal action without formal documentation
- Requesting Aadhaar, PAN, or other government ID verbally

RESPOND ONLY WITH VALID JSON. NO explanation text before or after.
Format: { "risk": <number 0-100>, "signal": "<brief what you detected>", "coaching": "<exact words for user to say right now>" }

If nothing suspicious, return: { "risk": 0, "signal": "normal conversation", "coaching": "" }`;

export const scoreRisk = async (transcript) => {
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SCAM_DETECTION_SYSTEM_PROMPT },
        { role: 'user', content: `TRANSCRIPT:\n${transcript}` }
      ],
      temperature: 0.1,
      max_tokens: 200,
      response_format: { type: 'json_object' }
    });
    const result = JSON.parse(response.choices[0].message.content);
    return { risk: result.risk || 0, signal: result.signal || '', coaching: result.coaching || '' };
  } catch (err) {
    console.error('Groq scoreRisk error:', err.message);
    return { risk: 0, signal: '', coaching: '' };
  }
};

export const scrubPII = async (transcript) => {
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: `Redact PII from this transcript. Replace: Aadhaar numbers with [AADHAAR], bank accounts with [ACCOUNT], addresses with [ADDRESS], full names of the victim with [NAME], phone numbers other than the scammer's with [PHONE]. Keep all scammer statements intact. Return ONLY the redacted transcript text, nothing else.` },
        { role: 'user', content: transcript }
      ],
      temperature: 0,
      max_tokens: 2000
    });
    return response.choices[0].message.content.trim();
  } catch (err) {
    console.error('Groq scrubPII error:', err.message);
    return transcript;
  }
};

export const generateReport = async (transcript, peakRiskScore, callerNumber, callDuration) => {
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: `You are a fraud incident report generator for India. Generate a structured report from this scam call transcript. RESPOND ONLY WITH VALID JSON in this exact format:
{
  "summary": "<2 sentence plain English summary>",
  "scamType": "<Digital Arrest | KYC Fraud | Banking Fraud | Impersonation | Investment Fraud | Other>",
  "redFlags": ["<flag 1>", "<flag 2>"],
  "psychologicalTactics": ["<tactic 1>", "<tactic 2>"],
  "evidenceLog": [{"time": "<MM:SS>", "event": "<what happened>"}],
  "recommendedAction": "<what victim should do now>",
  "formalComplaintText": "<complete paragraph for police FIR submission>"
}` },
        { role: 'user', content: `Caller Number: ${callerNumber}\nCall Duration: ${callDuration}\nPeak Risk Score: ${peakRiskScore}/100\n\nTRANSCRIPT:\n${transcript}` }
      ],
      temperature: 0.2,
      max_tokens: 1500,
      response_format: { type: 'json_object' }
    });
    return JSON.parse(response.choices[0].message.content);
  } catch (err) {
    console.error('Groq generateReport error:', err.message);
    return null;
  }
};
