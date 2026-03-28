import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const val = row[header];
      return JSON.stringify(val === null || val === undefined ? '' : val);
    }).join(','))
  ];
  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function exportToPDF(title: string, subtitle: string, headers: string[], data: any[][], filename: string) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('Tampa Taste', 14, 20);
  
  doc.setFontSize(14);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(subtitle, 14, 30);
  
  // Table
  autoTable(doc, {
    head: [headers],
    body: data,
    startY: 40,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { top: 40 },
  });
  
  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`© ${new Date().getFullYear()} Tampa Taste. All rights reserved.`, 14, (doc as any).internal.pageSize.height - 10);
    doc.text(`Page ${i} of ${pageCount}`, (doc as any).internal.pageSize.width - 30, (doc as any).internal.pageSize.height - 10);
  }
  
  doc.save(`${filename}.pdf`);
}

export function exportInstructionsToPDF(title: string, sections: { title: string, content: string[] }[], filename: string) {
  const doc = new jsPDF();
  let y = 20;

  // Header
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text('Tampa Taste', 14, y);
  y += 10;

  doc.setFontSize(16);
  doc.setTextColor(100, 116, 139);
  doc.text(title, 14, y);
  y += 15;

  sections.forEach(section => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(section.title, 14, y);
    y += 8;

    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    section.content.forEach(line => {
      const splitText = doc.splitTextToSize(line, 180);
      splitText.forEach((textLine: string) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(textLine, 14, y);
        y += 6;
      });
      y += 2;
    });
    y += 5;
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text(`© ${new Date().getFullYear()} Tampa Taste. All rights reserved.`, 14, (doc as any).internal.pageSize.height - 10);
    doc.text(`Page ${i} of ${pageCount}`, (doc as any).internal.pageSize.width - 30, (doc as any).internal.pageSize.height - 10);
  }

  doc.save(`${filename}.pdf`);
}
