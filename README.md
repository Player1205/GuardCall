# GuardCall

AI-Powered Scam Call Protection built as a Progressive Web App (PWA).

## Tech Stack
- Frontend: React + Vite + Tailwind CSS + PWA
- Backend: Node.js + Express + Socket.IO
- Database: MongoDB
- STT: Deepgram Nova-2
- AI: Groq (Llama 3.3 70B)

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas Account
- Deepgram API Key
- Groq API Key

### Setup Backend
1. `cd server`
2. `npm install`
3. Copy `.env.example` to `.env` and fill in your keys.
4. `npm run dev` (Ensure you added a dev script to package.json or use node src/index.js)

### Setup Frontend
1. `cd client`
2. `npm install`
3. `npm run dev`

### Features
- Real-time call transcription and scam detection.
- Context-aware coaching cards injected into the UI during the call.
- Post-call automated incident report generation with jsPDF.
- PII scrubbing before storage.
- Community reporting database.
