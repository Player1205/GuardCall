import Groq from 'groq-sdk';
import { z } from 'zod';
import logger from '../utils/logger.js';

let groqInstance: Groq | null = null;
const getGroq = () => {
  if (!groqInstance) groqInstance = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groqInstance;
};

const SCAM_DETECTION_SYSTEM_PROMPT = `You are a real-time scam detection AI for India. 
Analyze this phone call transcript and detect crime patterns across multiple categories.
Detect:
1. Fake Police/Digital Arrest: Authority impersonation (CBI, ED, Customs) or warrants.
2. Sextortion & Blackmail: Threats to leak photos, videos, or private data.
3. Tech Support/Remote Access: Claiming PC/phone is hacked or asking for AnyDesk/TeamViewer.
4. Virtual Kidnapping/Emergency: Claiming family is in jail/hospital to extort money.
5. Job/Investment Fraud: Offering easy money (like YouTube videos) but demanding a deposit.
6. Lottery/Customs Duty: Claiming a prize/parcel is stuck at customs and needs tax clearance.
7. Harassment & Intimidation: Severe verbal abuse or stalking.

RESPOND ONLY WITH VALID JSON. NO explanation text before or after.
Format: { "risk": <number 0-100>, "signal": "<brief what you detected>", "coaching": "<exact words for user to say right now>" }

IMPORTANT RULES FOR SCORING AND COACHING:
1. DO NOT jump to conclusions early. An introduction is NOT a threat. Keep risk at 0 and coaching empty ("") until there is a CLEAR threat or demand.
2. ONLY provide coaching when there is a CLEAR threat, demand for money, or manipulation tactic.

IMPORTANT COACHING STRATEGY (Street-Smart Human & Logic Traps):
When a clear threat/demand is detected, do NOT tell the user to hang up or aggressively threaten the scammer. Instead, provide "Street-Smart Human" coaching. The user should sound highly confident, sarcastic, and completely unfazed, using logic traps to break the scammer's script and make them realize their scam failed.
CRITICAL LANGUAGE RULE: If the scammer is speaking Hindi, the coaching MUST be in conversational, street-smart Hinglish (humanly spoken Hindi written in English script). Do NOT use robotic textbook translations.
Examples:
- Fake Police: "Acha arrest warrant aaya hai? Thik hai bhai, main abhi DSP saab se baat karke inquiry daalta hu. Apna batch number batana."
- Tech Support: "Mera laptop hack ho gaya? Acha, par maine toh pichle ek hafte se laptop chalu hi nahi kiya bhai. Kisko ullu bana raha hai?"
- Sextortion: "Bhai tu bhej de jisko bhejna hai. Vaise mera phone corporate-monitored hai, tera IP trace ho gaya hai."
- Lottery/Customs: "Itna tax lag raha hai? Ek kaam kar, prize money me se tax kaat le aur baaki ka paisa bhej de."`;

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
  summary: z.string().default('No summary provided'),
  scamType: z.string().default('Unknown'),
  redFlags: z.array(z.string()).default([]),
  psychologicalTactics: z.array(z.string()).default([]),
  evidenceLog: z.array(z.object({
    time: z.string(),
    event: z.string()
  })).default([]),
  recommendedAction: z.string().optional(),
  formalComplaintText: z.string().optional()
});

export type GeneratedReport = z.infer<typeof ReportSchema>;

export const generateReport = async (transcript: string, peakRiskScore: number, callerNumber: string, callDuration: string): Promise<GeneratedReport | null> => {
  try {
    const response = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: `You are a fraud incident report generator for India. Generate a structured report from this scam call transcript.
CRITICAL RULE: Ensure perfect spelling and grammar in all your outputs. The audio transcript may contain garbled text, slang, or misspellings from the Speech-to-Text engine. DO NOT blindly copy misspelled words. You MUST correct all spelling errors, fix grammar, and write in highly professional, perfectly spelled English. NEVER hallucinate or output wrongly written words.

RESPOND ONLY WITH VALID JSON in this exact format:
{
  "summary": "<2 sentence plain English summary>",
  "scamType": "<Digital Arrest | Sextortion/Blackmail | Tech Support Scam | Fake Emergency/Kidnapping | Job Fraud | Lottery Scam | Harassment/Intimidation | Other>",
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
