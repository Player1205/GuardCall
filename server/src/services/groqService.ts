import Groq from 'groq-sdk';
import { z } from 'zod';
import logger from '../utils/logger.js';

let groqInstance: Groq | null = null;
const getGroq = () => {
  if (!groqInstance) groqInstance = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groqInstance;
};

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

IMPORTANT COACHING STRATEGY: 
When you detect a scam, do NOT just tell the user to hang up. Instead, provide "offensive coaching" to make the scammer panic, think they called the wrong person, and cut the call themselves. 
For example:
- If they claim to be police/CBI/Customs: Tell the user to say "Please provide your official employee ID and department jurisdiction code before we proceed."
- If they ask for OTP/Money: Tell the user to say "This is a corporate device monitored by the IT department, all network requests are being traced. Who is this?"
- To generally spook them: Tell the user to say "You've actually called a law enforcement officer's personal number. I am tracing this call's origin right now."

If nothing suspicious, return: { "risk": 0, "signal": "normal conversation", "coaching": "" }`;

const RiskScoreSchema = z.object({
  risk: z.number().min(0).max(100).default(0),
  signal: z.string().default(''),
  coaching: z.string().default('')
});

export type RiskScore = z.infer<typeof RiskScoreSchema>;

export const scoreRisk = async (transcript: string): Promise<RiskScore> => {
  try {
    const response = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SCAM_DETECTION_SYSTEM_PROMPT },
        { role: 'user', content: `TRANSCRIPT:\n${transcript}` }
      ],
      temperature: 0.1,
      max_tokens: 200,
      response_format: { type: 'json_object' }
    });
    const parsedJson = JSON.parse(response.choices[0].message.content || '{}');
    const result = RiskScoreSchema.parse(parsedJson);
    return result;
  } catch (err: any) {
    logger.error('Groq scoreRisk error', { error: err.message });
    return { risk: 0, signal: '', coaching: '' };
  }
};

export const scrubPII = async (transcript: string): Promise<string> => {
  try {
    const response = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: `Redact PII from this transcript. Replace: Aadhaar numbers with [AADHAAR], bank accounts with [ACCOUNT], addresses with [ADDRESS], full names of the victim with [NAME], phone numbers other than the scammer's with [PHONE]. Keep all scammer statements intact. Return ONLY the redacted transcript text, nothing else.` },
        { role: 'user', content: transcript }
      ],
      temperature: 0,
      max_tokens: 2000
    });
    return (response.choices[0].message.content || '').trim();
  } catch (err: any) {
    logger.error('Groq scrubPII error', { error: err.message });
    return transcript;
  }
};

const ReportSchema = z.object({
  summary: z.string(),
  scamType: z.string(),
  redFlags: z.array(z.string()),
  psychologicalTactics: z.array(z.string()),
  evidenceLog: z.array(z.object({
    time: z.string(),
    event: z.string()
  })),
  recommendedAction: z.string().optional(),
  formalComplaintText: z.string().optional()
});

export type GeneratedReport = z.infer<typeof ReportSchema>;

export const generateReport = async (transcript: string, peakRiskScore: number, callerNumber: string, callDuration: string): Promise<GeneratedReport | null> => {
  try {
    const response = await getGroq().chat.completions.create({
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
    const parsedJson = JSON.parse(response.choices[0].message.content || '{}');
    const result = ReportSchema.parse(parsedJson);
    return result;
  } catch (err: any) {
    logger.error('Groq generateReport error', { error: err.message });
    return null;
  }
};
