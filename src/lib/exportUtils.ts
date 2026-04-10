import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const exportToPDF = (title: string, headers: string[], data: any[][], fileName: string) => {
  const doc = new jsPDF();
  doc.text(title, 14, 15);
  (doc as any).autoTable({
    head: [headers],
    body: data,
    startY: 20,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillStyle: [59, 130, 246] }
  });
  doc.save(`${fileName}.pdf`);
};

export const exportToExcel = (data: any[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};

export const exportMultiSheetExcel = (sheets: { name: string, data: any[] }[], fileName: string) => {
  const workbook = XLSX.utils.book_new();
  sheets.forEach(sheet => {
    const worksheet = XLSX.utils.json_to_sheet(sheet.data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  });
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
