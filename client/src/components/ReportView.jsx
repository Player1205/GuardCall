import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { generatePDFReport } from '../services/reportPDF.js';
import api from '../services/api.js';

const ReportView = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const report = location.state?.report;

  if (!report) {
    return (
      <div className="min-h-screen bg-background text-white flex flex-col items-center justify-center">
        <p>No report data found.</p>
        <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 bg-primary rounded">Home</button>
      </div>
    );
  }

  const handleDownloadPDF = () => {
    generatePDFReport(report);
  };

  const handleAddToCommunity = async () => {
    try {
      await api.post('/community', {
        callerNumber: report.callerNumber,
        riskScore: report.peakRiskScore
      });
      alert('Added to community database!');
    } catch (err) {
      console.error(err);
      alert('Error adding to community database');
    }
  };

  const handleSancharSaathi = () => {
    // Open government portal
    window.open('https://sancharsaathi.gov.in', '_blank');
  };

  return (
    <div className="min-h-screen bg-background text-textMain p-4 md:p-8 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-danger">Incident Report</h1>
        <button onClick={() => navigate('/')} className="text-primary hover:underline font-medium">Close</button>
      </div>

      <div className="bg-white/5 border border-danger/30 rounded-2xl p-6 mb-6 shadow-lg shadow-danger/5">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-textMain/50 mb-1">Caller Number</p>
            <p className="font-semibold">{report.callerNumber}</p>
          </div>
          <div>
            <p className="text-sm text-textMain/50 mb-1">Risk Score</p>
            <p className="font-semibold text-danger">{report.peakRiskScore} / 100</p>
          </div>
          <div className="col-span-2">
            <p className="text-sm text-textMain/50 mb-1">Scam Type</p>
            <p className="font-semibold text-warning">{report.scamType}</p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm text-textMain/50 mb-2">Summary</p>
          <p className="text-sm leading-relaxed">{report.summary}</p>
        </div>

        <div className="mb-6">
          <p className="text-sm text-textMain/50 mb-2">Red Flags Detected</p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {report.redFlags.map((flag, i) => (
              <li key={i} className="text-danger/90">{flag}</li>
            ))}
          </ul>
        </div>

        <div className="mb-6">
          <p className="text-sm text-textMain/50 mb-2">Formal Complaint Text</p>
          <div className="bg-black/30 p-4 rounded-lg font-mono text-xs text-textMain/80 whitespace-pre-wrap select-all">
            {report.formalComplaintText}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <button 
          onClick={handleDownloadPDF}
          className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center"
        >
          📄 Download PDF Report
        </button>
        
        <button 
          onClick={handleSancharSaathi}
          className="w-full bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center"
        >
          🛡️ Report to Sanchar Saathi
        </button>
        
        <button 
          onClick={handleAddToCommunity}
          className="w-full border border-white/20 hover:bg-white/5 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center"
        >
          👥 Add to Community Database
        </button>
      </div>
    </div>
  );
};

export default ReportView;
