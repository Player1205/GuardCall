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
  
  const getLineHeightMM = () => {
    // getLineHeight() returns points. Convert to mm.
    return doc.getLineHeight() * 25.4 / 72;
  };

  const checkPageBreak = (neededSpace: number, currentY: number) => {
    if (currentY + neededSpace > 280) {
      doc.addPage();
      return 20;
    }
    return currentY;
  };

  let currentY = 20;
  
  doc.setFontSize(20);
  doc.setTextColor(29, 158, 117);
  doc.text('GuardCall Incident Report', 20, currentY);
  currentY += 12;
  
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Date: ${new Date(reportData.createdAt || Date.now()).toLocaleString()}`, 20, currentY);
  currentY += 8;
  doc.text(`Caller Number: ${reportData.callerNumber}`, 20, currentY);
  currentY += 8;
  doc.text(`Scam Type: ${reportData.scamType}`, 20, currentY);
  currentY += 14;
  
  doc.setFontSize(14);
  doc.text('Summary:', 20, currentY);
  currentY += 6;
  doc.setFontSize(11);
  const summaryLines = doc.splitTextToSize(reportData.summary, 170);
  currentY = checkPageBreak(summaryLines.length * getLineHeightMM(), currentY);
  doc.text(summaryLines, 20, currentY);
  currentY += (summaryLines.length * getLineHeightMM()) + 10;
  
  currentY = checkPageBreak(20, currentY);
  doc.setFontSize(14);
  doc.text('Red Flags Detected:', 20, currentY);
  currentY += 6;
  doc.setFontSize(11);
  reportData.redFlags.forEach(flag => {
    const flagLines = doc.splitTextToSize(`• ${flag}`, 165);
    currentY = checkPageBreak(flagLines.length * getLineHeightMM(), currentY);
    doc.text(flagLines, 25, currentY);
    currentY += (flagLines.length * getLineHeightMM()) + 4;
  });
  
  currentY += 6;
  currentY = checkPageBreak(20, currentY);
  doc.setFontSize(14);
  doc.text('Formal Complaint Text (For Police FIR):', 20, currentY);
  currentY += 6;
  doc.setFontSize(11);
  const complaintLines = doc.splitTextToSize(reportData.formalComplaintText, 170);
  
  // We might need to split complaintLines across pages if it's very long
  let remainingLines = [...complaintLines];
  while (remainingLines.length > 0) {
    const spaceLeft = 280 - currentY;
    const linesThatFit = Math.floor(spaceLeft / getLineHeightMM());
    
    if (linesThatFit <= 0) {
      doc.addPage();
      currentY = 20;
      continue;
    }
    
    const linesToDraw = remainingLines.slice(0, linesThatFit);
    doc.text(linesToDraw, 20, currentY);
    
    remainingLines = remainingLines.slice(linesThatFit);
    if (remainingLines.length > 0) {
      doc.addPage();
      currentY = 20;
    }
  }
  
  doc.save(`GuardCall_Report_${reportData.callerNumber}.pdf`);
};
