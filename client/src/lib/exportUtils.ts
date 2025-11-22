import * as XLSX from 'xlsx';
import i18n from '@/i18n/i18n';

/**
 * Interface for PDF column configuration
 */
export interface PDFColumn {
  key: string;
  header: string;
}

/**
 * Export data to XLSX format with auto-sized columns and styling
 * @param data - Array of objects to export
 * @param filename - Name of the file (without extension)
 * @param sheetName - Optional sheet name (defaults to 'Sheet1')
 */
export function exportToXLSX(
  data: any[],
  filename: string,
  sheetName: string = 'Sheet1'
): void {
  try {
    // Handle empty data
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }

    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Convert data to worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Auto-size columns based on content
    const columnWidths = autoSizeColumns(data, worksheet);
    worksheet['!cols'] = columnWidths;

    // Format dates properly
    formatDatesInWorksheet(worksheet, data);

    // Add header styling (first row)
    styleHeaders(worksheet, data);

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate file and trigger download
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    downloadFile(blob, `${filename}.xlsx`);
  } catch (error) {
    console.error('Error exporting to XLSX:', error);
    throw error;
  }
}

/**
 * Auto-size columns based on content
 */
function autoSizeColumns(data: any[], worksheet: XLSX.WorkSheet): XLSX.ColInfo[] {
  if (!data || data.length === 0) return [];

  const columns = Object.keys(data[0]);
  const columnWidths: XLSX.ColInfo[] = [];

  columns.forEach((column, index) => {
    // Get header length
    let maxLength = column.length;

    // Check content length for each row
    data.forEach(row => {
      const cellValue = row[column];
      const cellLength = cellValue ? String(cellValue).length : 0;
      maxLength = Math.max(maxLength, cellLength);
    });

    // Set width with a max cap of 50 and min of 10
    columnWidths.push({ 
      wch: Math.min(Math.max(maxLength + 2, 10), 50) 
    });
  });

  return columnWidths;
}

/**
 * Format dates in the worksheet
 */
function formatDatesInWorksheet(worksheet: XLSX.WorkSheet, data: any[]): void {
  if (!data || data.length === 0) return;

  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = worksheet[cellAddress];
      
      if (cell && cell.v instanceof Date) {
        cell.t = 'd';
        cell.z = 'yyyy-mm-dd hh:mm:ss';
      } else if (cell && typeof cell.v === 'string') {
        // Try to detect date strings
        const dateRegex = /^\d{4}-\d{2}-\d{2}/;
        if (dateRegex.test(cell.v)) {
          const date = new Date(cell.v);
          if (!isNaN(date.getTime())) {
            cell.t = 'd';
            cell.v = date;
            cell.z = 'yyyy-mm-dd hh:mm:ss';
          }
        }
      }
    }
  }
}

/**
 * Style headers in the worksheet
 */
function styleHeaders(worksheet: XLSX.WorkSheet, data: any[]): void {
  if (!data || data.length === 0) return;

  const columns = Object.keys(data[0]);
  
  columns.forEach((column, index) => {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: index });
    const cell = worksheet[cellAddress];
    
    if (cell) {
      // Add bold styling through cell formatting
      cell.s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "CCCCCC" } },
        alignment: { horizontal: "center", vertical: "center" }
      };
    }
  });
}

/**
 * Export data to PDF using browser print with custom styling
 * @param title - Title of the document
 * @param data - Array of objects to export
 * @param columns - Column configuration (key and header)
 * @param filename - Name of the file (for browser download suggestion)
 */
export function exportToPDF(
  title: string,
  data: any[],
  columns: PDFColumn[],
  filename: string
): void {
  try {
    // Handle empty data
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }

    if (!columns || columns.length === 0) {
      throw new Error('No columns specified');
    }

    // Create a print window
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      throw new Error('Unable to open print window. Please allow popups for this site.');
    }

    // Generate HTML content
    const htmlContent = generatePrintHTML(title, data, columns, filename);
    
    // Write content to print window
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      
      // Close window after printing (with a delay to ensure print dialog appears)
      setTimeout(() => {
        printWindow.close();
      }, 100);
    };
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw error;
  }
}

/**
 * Generate HTML for print-friendly PDF export
 */
function generatePrintHTML(
  title: string,
  data: any[],
  columns: PDFColumn[],
  filename: string
): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Generate table rows
  const tableRows = data.map(row => {
    const cells = columns.map(col => {
      const value = row[col.key];
      const formattedValue = formatCellValue(value);
      return `<td>${formattedValue}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  // Generate table headers
  const tableHeaders = columns.map(col => 
    `<th>${col.header}</th>`
  ).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${filename}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        @media print {
          body {
            margin: 0;
            padding: 20px;
          }

          /* Hide elements not needed in print */
          button, .no-print, input, select, textarea {
            display: none !important;
          }

          /* Ensure proper page breaks */
          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }

          thead {
            display: table-header-group;
          }

          tfoot {
            display: table-footer-group;
          }

          /* Prevent orphans and widows */
          p {
            orphans: 3;
            widows: 3;
          }
        }

        @page {
          margin: 20mm;
          size: A4;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          color: #333;
          line-height: 1.6;
          background: white;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #333;
        }

        .header h1 {
          font-size: 28px;
          font-weight: bold;
          margin-bottom: 10px;
          color: #1a1a1a;
        }

        .header .subtitle {
          font-size: 14px;
          color: #666;
        }

        .meta-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 5px;
          font-size: 13px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 12px;
        }

        thead {
          background: #333;
          color: white;
        }

        th {
          padding: 12px 8px;
          text-align: left;
          font-weight: 600;
          border: 1px solid #dee2e6;
        }

        td {
          padding: 10px 8px;
          border: 1px solid #dee2e6;
        }

        tbody tr:nth-child(even) {
          background: #f8f9fa;
        }

        tbody tr:hover {
          background: #e9ecef;
        }

        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #dee2e6;
          text-align: center;
          font-size: 11px;
          color: #666;
        }

        .summary {
          margin-top: 20px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 5px;
          font-size: 13px;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
        }

        .summary-item strong {
          font-weight: 600;
        }

        /* Print-specific styles */
        @media print {
          .meta-info, .summary {
            background: #f0f0f0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          thead {
            background: #333 !important;
            color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          tbody tr:nth-child(even) {
            background: #f8f9fa !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${title}</h1>
          <div class="subtitle">${i18n.t('reports:exportReport')}</div>
        </div>

        <div class="meta-info">
          <div>
            <strong>Document:</strong> ${filename}
          </div>
          <div>
            <strong>Generated:</strong> ${currentDate}
          </div>
          <div>
            <strong>Records:</strong> ${data.length}
          </div>
        </div>

        <table>
          <thead>
            <tr>${tableHeaders}</tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-item">
            <span>Total Records:</span>
            <strong>${data.length}</strong>
          </div>
        </div>

        <div class="footer">
          <p>Generated on ${currentDate} | This document was automatically generated</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Format cell value for display
 */
function formatCellValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  // Handle dates
  if (value instanceof Date) {
    return value.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Handle date strings
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  }

  // Handle numbers
  if (typeof value === 'number') {
    // If it looks like a currency value (has 2 decimal places), format it
    if (value % 1 !== 0) {
      return value.toFixed(2);
    }
    return value.toLocaleString();
  }

  // Handle booleans
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  // Handle objects
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  // Default to string
  return String(value);
}

/**
 * Format data for export by selecting specific columns
 * @param data - Array of objects
 * @param columns - Array of column keys to include
 * @returns Formatted data with only specified columns
 */
export function formatDataForExport(data: any[], columns: string[]): any[] {
  try {
    if (!data || data.length === 0) {
      return [];
    }

    if (!columns || columns.length === 0) {
      return data;
    }

    return data.map(row => {
      const formattedRow: any = {};
      
      columns.forEach(column => {
        if (column in row) {
          formattedRow[column] = row[column];
        } else {
          formattedRow[column] = '';
        }
      });

      return formattedRow;
    });
  } catch (error) {
    console.error('Error formatting data for export:', error);
    return data;
  }
}

/**
 * Download a file from a Blob
 * @param blob - File blob to download
 * @param filename - Name of the file
 */
export function downloadFile(blob: Blob, filename: string): void {
  try {
    // Create a temporary URL for the blob
    const url = window.URL.createObjectURL(blob);
    
    // Create a temporary anchor element
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
}

/**
 * Export data to CSV format
 * @param data - Array of objects to export
 * @param filename - Name of the file (without extension)
 */
export function exportToCSV(data: any[], filename: string): void {
  try {
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }

    // Get headers
    const headers = Object.keys(data[0]);
    
    // Create CSV content
    const csvRows = [];
    
    // Add headers
    csvRows.push(headers.join(','));
    
    // Add data rows
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma or quote
        const escaped = String(value).replace(/"/g, '""');
        return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
      });
      csvRows.push(values.join(','));
    }
    
    // Create blob and download
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, `${filename}.csv`);
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    throw error;
  }
}

/**
 * Sanitize filename to remove invalid characters
 * @param filename - Original filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9-_. ]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 255);
}

/**
 * Get export filename with timestamp
 * @param baseFilename - Base filename
 * @param extension - File extension (without dot)
 * @returns Filename with timestamp
 */
export function getTimestampedFilename(baseFilename: string, extension: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const sanitized = sanitizeFilename(baseFilename);
  return `${sanitized}_${timestamp}.${extension}`;
}
