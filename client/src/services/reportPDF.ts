import jsPDF from 'jspdf';

export interface ReportData {
  callerNumber: string;
  peakRiskScore: number;
  scamType: string;
  summary: string;
  redFlags: string[];
  formalComplaintText: string;
  createdAt?: number | string | Date;
}

export const generatePDFReport = (reportData: ReportData) => {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.setTextColor(29, 158, 117);
  doc.text('GuardCall Incident Report', 20, 20);
  
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Date: ${new Date(reportData.createdAt || Date.now()).toLocaleString()}`, 20, 30);
  doc.text(`Caller Number: ${reportData.callerNumber}`, 20, 40);
  doc.text(`Scam Type: ${reportData.scamType}`, 20, 50);
  
  doc.setFontSize(14);
  doc.text('Summary:', 20, 70);
  doc.setFontSize(11);
  const summaryLines = doc.splitTextToSize(reportData.summary, 170);
  doc.text(summaryLines, 20, 80);
  
  let currentY = 80 + (summaryLines.length * 7) + 10;
  
  doc.setFontSize(14);
  doc.text('Red Flags Detected:', 20, currentY);
  doc.setFontSize(11);
  currentY += 10;
  reportData.redFlags.forEach(flag => {
    doc.text(`• ${flag}`, 25, currentY);
    currentY += 7;
  });
  
  currentY += 10;
  doc.setFontSize(14);
  doc.text('Formal Complaint Text (For Police FIR):', 20, currentY);
  doc.setFontSize(11);
  currentY += 10;
  const complaintLines = doc.splitTextToSize(reportData.formalComplaintText, 170);
  doc.text(complaintLines, 20, currentY);
  
  doc.save(`GuardCall_Report_${reportData.callerNumber}.pdf`);
};
