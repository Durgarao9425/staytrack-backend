import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Helper function to format date
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Generate PDF Report
export const downloadPDFReport = async (req: AuthRequest, res: Response) => {
  try {
    const { month } = req.query; // Format: YYYY-MM (e.g., 2026-01)
    const user = req.user;

    if (!month || typeof month !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Month parameter is required (format: YYYY-MM)'
      });
    }

    // Parse month
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0); // Last day of the month

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get hostel info
    let hostelId: number;
    let hostelName = 'Hostel';

    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      hostelId = user.hostel_id;
      
      const hostel = await db('hostel_master')
        .where('hostel_id', hostelId)
        .first();
      if (hostel) {
        hostelName = hostel.hostel_name || 'Hostel';
      }
    } else {
      return res.status(403).json({
        success: false,
        error: 'This feature is only available for Hostel Owners.'
      });
    }

    // Fetch income records
    const incomes = await db('income as i')
      .leftJoin('payment_modes as pm', 'i.payment_mode_id', 'pm.payment_mode_id')
      .select(
        'i.income_date',
        'i.amount',
        'i.source',
        'pm.payment_mode_name as payment_mode',
        'i.receipt_number',
        'i.description'
      )
      .where('i.hostel_id', hostelId)
      .whereBetween('i.income_date', [startDateStr, endDateStr])
      .orderBy('i.income_date', 'asc');

    // Fetch expense records
    const expenses = await db('expenses as e')
      .leftJoin('expense_categories as ec', 'e.category_id', 'ec.category_id')
      .leftJoin('payment_modes as pm', 'e.payment_mode_id', 'pm.payment_mode_id')
      .select(
        'e.expense_date',
        'e.amount',
        'ec.category_name',
        'pm.payment_mode_name as payment_mode',
        'e.bill_number',
        'e.vendor_name',
        'e.description'
      )
      .where('e.hostel_id', hostelId)
      .whereBetween('e.expense_date', [startDateStr, endDateStr])
      .orderBy('e.expense_date', 'asc');

    // Calculate totals
    const totalIncome = incomes.reduce((sum, inc) => sum + Number(inc.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    const netProfit = totalIncome - totalExpenses;

    // Month name
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[monthNum - 1];

    // Create PDF with proper margins
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4',
      layout: 'portrait'
    });
    const filename = `Income_Expense_Report_${monthName}_${year}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // Page dimensions
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 50;
    const contentWidth = pageWidth - (margin * 2);

    // Header Section
    doc.fontSize(20).font('Helvetica-Bold').text(hostelName, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(16).font('Helvetica-Bold').text('Income & Expense Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica').text(`${monthName} ${year}`, { align: 'center' });
    doc.moveDown(2);

    // Summary Section with Box
    const summaryY = doc.y;
    doc.rect(margin, summaryY, contentWidth, 80)
       .strokeColor('#333333')
       .lineWidth(1)
       .stroke();
    
    doc.fontSize(14).font('Helvetica-Bold').text('Summary', margin + 10, summaryY + 10);
    doc.moveDown(1);
    
    doc.fontSize(11).font('Helvetica');
    doc.text('Total Income:', margin + 20, doc.y, { width: 150 });
    doc.text(formatCurrency(totalIncome), margin + 170, doc.y, { width: 150, align: 'right' });
    doc.moveDown(1);
    
    doc.text('Total Expenses:', margin + 20, doc.y, { width: 150 });
    doc.text(formatCurrency(totalExpenses), margin + 170, doc.y, { width: 150, align: 'right' });
    doc.moveDown(1);
    
    doc.font('Helvetica-Bold');
    doc.text('Net Profit/Loss:', margin + 20, doc.y, { width: 150 });
    doc.text(formatCurrency(netProfit), margin + 170, doc.y, { width: 150, align: 'right' });
    
    doc.y = summaryY + 80 + 20;

    // Income Details Section
    doc.fontSize(14).font('Helvetica-Bold').text('Income Details', margin);
    doc.moveDown(0.5);
    
    if (incomes.length === 0) {
      doc.fontSize(10).font('Helvetica').text('No income records found for this month.', margin + 10);
      doc.moveDown(1);
    } else {
      // Table header
      const tableTop = doc.y;
      const rowHeight = 20;
      const colWidths = [80, 120, 100, 100, 100]; // Date, Source, Amount, Payment Mode, Receipt
      let xPos = margin;
      
      // Header row background
      doc.rect(xPos, tableTop, contentWidth, rowHeight)
         .fillColor('#E0E0E0')
         .fill();
      
      // Header text
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000');
      xPos = margin + 5;
      doc.text('Date', xPos, tableTop + 5, { width: colWidths[0] - 10 });
      xPos += colWidths[0];
      doc.text('Source', xPos, tableTop + 5, { width: colWidths[1] - 10 });
      xPos += colWidths[1];
      doc.text('Amount', xPos, tableTop + 5, { width: colWidths[2] - 10, align: 'right' });
      xPos += colWidths[2];
      doc.text('Payment Mode', xPos, tableTop + 5, { width: colWidths[3] - 10 });
      xPos += colWidths[3];
      doc.text('Receipt #', xPos, tableTop + 5, { width: colWidths[4] - 10 });
      
      // Header border
      doc.strokeColor('#333333').lineWidth(1)
         .moveTo(margin, tableTop + rowHeight)
         .lineTo(margin + contentWidth, tableTop + rowHeight)
         .stroke();
      
      let currentY = tableTop + rowHeight;
      
      // Data rows
      incomes.forEach((income: any, index: number) => {
        if (currentY + rowHeight > pageHeight - margin - 50) {
          doc.addPage();
          currentY = margin;
        }
        
        xPos = margin + 5;
        doc.fontSize(9).font('Helvetica').fillColor('#000000');
        
        doc.text(formatDate(income.income_date), xPos, currentY + 5, { width: colWidths[0] - 10 });
        xPos += colWidths[0];
        doc.text((income.source || '-').substring(0, 20), xPos, currentY + 5, { width: colWidths[1] - 10 });
        xPos += colWidths[1];
        doc.text(formatCurrency(Number(income.amount || 0)), xPos, currentY + 5, { width: colWidths[2] - 10, align: 'right' });
        xPos += colWidths[2];
        doc.text((income.payment_mode || '-').substring(0, 15), xPos, currentY + 5, { width: colWidths[3] - 10 });
        xPos += colWidths[3];
        doc.text((income.receipt_number || '-').substring(0, 15), xPos, currentY + 5, { width: colWidths[4] - 10 });
        
        // Row border
        doc.strokeColor('#CCCCCC').lineWidth(0.5)
           .moveTo(margin, currentY + rowHeight)
           .lineTo(margin + contentWidth, currentY + rowHeight)
           .stroke();
        
        currentY += rowHeight;
      });
      
      doc.y = currentY + 10;
    }

    // Check if we need a new page for expenses
    if (doc.y > pageHeight - 200) {
      doc.addPage();
    }

    // Expense Details Section
    doc.fontSize(14).font('Helvetica-Bold').text('Expense Details', margin);
    doc.moveDown(0.5);
    
    if (expenses.length === 0) {
      doc.fontSize(10).font('Helvetica').text('No expense records found for this month.', margin + 10);
    } else {
      // Table header
      const tableTop = doc.y;
      const rowHeight = 20;
      const colWidths = [80, 120, 100, 100, 100]; // Date, Category, Amount, Payment Mode, Bill #
      let xPos = margin;
      
      // Header row background
      doc.rect(xPos, tableTop, contentWidth, rowHeight)
         .fillColor('#E0E0E0')
         .fill();
      
      // Header text
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000');
      xPos = margin + 5;
      doc.text('Date', xPos, tableTop + 5, { width: colWidths[0] - 10 });
      xPos += colWidths[0];
      doc.text('Category', xPos, tableTop + 5, { width: colWidths[1] - 10 });
      xPos += colWidths[1];
      doc.text('Amount', xPos, tableTop + 5, { width: colWidths[2] - 10, align: 'right' });
      xPos += colWidths[2];
      doc.text('Payment Mode', xPos, tableTop + 5, { width: colWidths[3] - 10 });
      xPos += colWidths[3];
      doc.text('Bill #', xPos, tableTop + 5, { width: colWidths[4] - 10 });
      
      // Header border
      doc.strokeColor('#333333').lineWidth(1)
         .moveTo(margin, tableTop + rowHeight)
         .lineTo(margin + contentWidth, tableTop + rowHeight)
         .stroke();
      
      let currentY = tableTop + rowHeight;
      
      // Data rows
      expenses.forEach((expense: any) => {
        if (currentY + rowHeight > pageHeight - margin - 50) {
          doc.addPage();
          currentY = margin;
        }
        
        xPos = margin + 5;
        doc.fontSize(9).font('Helvetica').fillColor('#000000');
        
        doc.text(formatDate(expense.expense_date), xPos, currentY + 5, { width: colWidths[0] - 10 });
        xPos += colWidths[0];
        doc.text((expense.category_name || '-').substring(0, 20), xPos, currentY + 5, { width: colWidths[1] - 10 });
        xPos += colWidths[1];
        doc.text(formatCurrency(Number(expense.amount || 0)), xPos, currentY + 5, { width: colWidths[2] - 10, align: 'right' });
        xPos += colWidths[2];
        doc.text((expense.payment_mode || '-').substring(0, 15), xPos, currentY + 5, { width: colWidths[3] - 10 });
        xPos += colWidths[3];
        doc.text((expense.bill_number || '-').substring(0, 15), xPos, currentY + 5, { width: colWidths[4] - 10 });
        
        // Row border
        doc.strokeColor('#CCCCCC').lineWidth(0.5)
           .moveTo(margin, currentY + rowHeight)
           .lineTo(margin + contentWidth, currentY + rowHeight)
           .stroke();
        
        currentY += rowHeight;
      });
    }

    // Footer on last page
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).font('Helvetica').fillColor('#666666')
         .text(
           `Generated on ${formatDate(new Date().toISOString())} at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} | Page ${i + 1} of ${pageCount}`,
           margin,
           pageHeight - 30,
           { align: 'center', width: contentWidth }
         );
    }

    doc.end();
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate PDF report'
    });
  }
};

// Generate Excel Report
export const downloadExcelReport = async (req: AuthRequest, res: Response) => {
  try {
    const { month } = req.query; // Format: YYYY-MM (e.g., 2026-01)
    const user = req.user;

    if (!month || typeof month !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Month parameter is required (format: YYYY-MM)'
      });
    }

    // Parse month
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0); // Last day of the month

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get hostel info
    let hostelId: number;
    let hostelName = 'Hostel';

    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      hostelId = user.hostel_id;
      
      const hostel = await db('hostel_master')
        .where('hostel_id', hostelId)
        .first();
      if (hostel) {
        hostelName = hostel.hostel_name || 'Hostel';
      }
    } else {
      return res.status(403).json({
        success: false,
        error: 'This feature is only available for Hostel Owners.'
      });
    }

    // Fetch income records
    const incomes = await db('income as i')
      .leftJoin('payment_modes as pm', 'i.payment_mode_id', 'pm.payment_mode_id')
      .select(
        'i.income_date',
        'i.amount',
        'i.source',
        'pm.payment_mode_name as payment_mode',
        'i.receipt_number',
        'i.description'
      )
      .where('i.hostel_id', hostelId)
      .whereBetween('i.income_date', [startDateStr, endDateStr])
      .orderBy('i.income_date', 'asc');

    // Fetch expense records
    const expenses = await db('expenses as e')
      .leftJoin('expense_categories as ec', 'e.category_id', 'ec.category_id')
      .leftJoin('payment_modes as pm', 'e.payment_mode_id', 'pm.payment_mode_id')
      .select(
        'e.expense_date',
        'e.amount',
        'ec.category_name',
        'pm.payment_mode_name as payment_mode',
        'e.bill_number',
        'e.vendor_name',
        'e.description'
      )
      .where('e.hostel_id', hostelId)
      .whereBetween('e.expense_date', [startDateStr, endDateStr])
      .orderBy('e.expense_date', 'asc');

    // Calculate totals
    const totalIncome = incomes.reduce((sum, inc) => sum + Number(inc.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    const netProfit = totalIncome - totalExpenses;

    // Month name
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[monthNum - 1];

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Income & Expense Report');

    // Set default row height
    worksheet.properties.defaultRowHeight = 20;

    // Header Section
    worksheet.mergeCells('A1:F1');
    const headerCell1 = worksheet.getCell('A1');
    headerCell1.value = hostelName;
    headerCell1.font = { size: 16, bold: true, color: { argb: 'FF000000' } };
    headerCell1.alignment = { horizontal: 'center', vertical: 'middle' };
    headerCell1.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    worksheet.getRow(1).height = 25;

    worksheet.mergeCells('A2:F2');
    const headerCell2 = worksheet.getCell('A2');
    headerCell2.value = 'Income & Expense Report';
    headerCell2.font = { size: 14, bold: true, color: { argb: 'FF000000' } };
    headerCell2.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 22;

    worksheet.mergeCells('A3:F3');
    const headerCell3 = worksheet.getCell('A3');
    headerCell3.value = `${monthName} ${year}`;
    headerCell3.font = { size: 12, color: { argb: 'FF000000' } };
    headerCell3.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(3).height = 20;

    // Summary Section
    let row = 5;
    worksheet.getRow(row).height = 22;
    const summaryTitle = worksheet.getCell(`A${row}`);
    summaryTitle.value = 'Summary';
    summaryTitle.font = { size: 12, bold: true, color: { argb: 'FF000000' } };
    summaryTitle.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F0F0' }
    };
    row++;

    // Summary rows
    const summaryLabels = ['Total Income:', 'Total Expenses:', 'Net Profit/Loss:'];
    const summaryValues = [totalIncome, totalExpenses, netProfit];
    
    summaryLabels.forEach((label, index) => {
      worksheet.getRow(row).height = 18;
      const labelCell = worksheet.getCell(`A${row}`);
      labelCell.value = label;
      labelCell.font = { size: 11, color: { argb: 'FF000000' } };
      labelCell.alignment = { horizontal: 'left', vertical: 'middle' };
      
      const valueCell = worksheet.getCell(`B${row}`);
      valueCell.value = summaryValues[index];
      valueCell.numFmt = '₹#,##0.00';
      valueCell.font = { 
        size: 11, 
        bold: index === 2, // Bold for Net Profit/Loss
        color: { argb: 'FF000000' } 
      };
      valueCell.alignment = { horizontal: 'right', vertical: 'middle' };
      row++;
    });
    row += 2;

    // Income Details Section
    worksheet.getRow(row).height = 22;
    const incomeTitle = worksheet.getCell(`A${row}`);
    incomeTitle.value = 'Income Details';
    incomeTitle.font = { size: 12, bold: true, color: { argb: 'FF000000' } };
    incomeTitle.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F0F0' }
    };
    row++;

    // Income table headers
    const incomeHeaders = ['Date', 'Source', 'Amount', 'Payment Mode', 'Receipt Number', 'Description'];
    worksheet.getRow(row).height = 20;
    incomeHeaders.forEach((header, colIndex) => {
      const cell = worksheet.getCell(row, colIndex + 1);
      cell.value = header;
      cell.font = { size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' } // Blue background
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
    row++;

    // Income data rows
    if (incomes.length === 0) {
      worksheet.getRow(row).height = 18;
      worksheet.getCell(`A${row}`).value = 'No income records found for this month.';
      worksheet.mergeCells(`A${row}:F${row}`);
      row++;
    } else {
      incomes.forEach((income: any) => {
        worksheet.getRow(row).height = 18;
        
        worksheet.getCell(`A${row}`).value = new Date(income.income_date);
        worksheet.getCell(`A${row}`).numFmt = 'dd/mm/yyyy';
        worksheet.getCell(`A${row}`).alignment = { horizontal: 'center', vertical: 'middle' };
        
        worksheet.getCell(`B${row}`).value = income.source || '-';
        worksheet.getCell(`B${row}`).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        
        worksheet.getCell(`C${row}`).value = Number(income.amount || 0);
        worksheet.getCell(`C${row}`).numFmt = '₹#,##0.00';
        worksheet.getCell(`C${row}`).alignment = { horizontal: 'right', vertical: 'middle' };
        
        worksheet.getCell(`D${row}`).value = income.payment_mode || '-';
        worksheet.getCell(`D${row}`).alignment = { horizontal: 'center', vertical: 'middle' };
        
        worksheet.getCell(`E${row}`).value = income.receipt_number || '-';
        worksheet.getCell(`E${row}`).alignment = { horizontal: 'center', vertical: 'middle' };
        
        worksheet.getCell(`F${row}`).value = income.description || '-';
        worksheet.getCell(`F${row}`).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        
        // Add borders to data rows
        ['A', 'B', 'C', 'D', 'E', 'F'].forEach(col => {
          const cell = worksheet.getCell(`${col}${row}`);
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
          };
        });
        
        row++;
      });
    }
    row += 2;

    // Expense Details Section
    worksheet.getRow(row).height = 22;
    const expenseTitle = worksheet.getCell(`A${row}`);
    expenseTitle.value = 'Expense Details';
    expenseTitle.font = { size: 12, bold: true, color: { argb: 'FF000000' } };
    expenseTitle.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F0F0' }
    };
    row++;

    // Expense table headers
    const expenseHeaders = ['Date', 'Category', 'Amount', 'Payment Mode', 'Bill Number', 'Vendor/Description'];
    worksheet.getRow(row).height = 20;
    expenseHeaders.forEach((header, colIndex) => {
      const cell = worksheet.getCell(row, colIndex + 1);
      cell.value = header;
      cell.font = { size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFC55A11' } // Orange background
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
    });
    row++;

    // Expense data rows
    if (expenses.length === 0) {
      worksheet.getRow(row).height = 18;
      worksheet.getCell(`A${row}`).value = 'No expense records found for this month.';
      worksheet.mergeCells(`A${row}:F${row}`);
      row++;
    } else {
      expenses.forEach((expense: any) => {
        worksheet.getRow(row).height = 18;
        
        worksheet.getCell(`A${row}`).value = new Date(expense.expense_date);
        worksheet.getCell(`A${row}`).numFmt = 'dd/mm/yyyy';
        worksheet.getCell(`A${row}`).alignment = { horizontal: 'center', vertical: 'middle' };
        
        worksheet.getCell(`B${row}`).value = expense.category_name || '-';
        worksheet.getCell(`B${row}`).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        
        worksheet.getCell(`C${row}`).value = Number(expense.amount || 0);
        worksheet.getCell(`C${row}`).numFmt = '₹#,##0.00';
        worksheet.getCell(`C${row}`).alignment = { horizontal: 'right', vertical: 'middle' };
        
        worksheet.getCell(`D${row}`).value = expense.payment_mode || '-';
        worksheet.getCell(`D${row}`).alignment = { horizontal: 'center', vertical: 'middle' };
        
        worksheet.getCell(`E${row}`).value = expense.bill_number || '-';
        worksheet.getCell(`E${row}`).alignment = { horizontal: 'center', vertical: 'middle' };
        
        worksheet.getCell(`F${row}`).value = expense.vendor_name || expense.description || '-';
        worksheet.getCell(`F${row}`).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        
        // Add borders to data rows
        ['A', 'B', 'C', 'D', 'E', 'F'].forEach(col => {
          const cell = worksheet.getCell(`${col}${row}`);
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
          };
        });
        
        row++;
      });
    }

    // Set fixed column widths for better readability
    worksheet.getColumn('A').width = 12; // Date
    worksheet.getColumn('B').width = 20; // Source/Category
    worksheet.getColumn('C').width = 15; // Amount
    worksheet.getColumn('D').width = 15; // Payment Mode
    worksheet.getColumn('E').width = 15; // Receipt/Bill Number
    worksheet.getColumn('F').width = 30; // Description

    // Set response headers
    const filename = `Income_Expense_Report_${monthName}_${year}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate Excel report'
    });
  }
};
