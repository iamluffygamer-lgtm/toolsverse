import { jsPDF } from 'jspdf'

export interface ExportOptions {
  toolName: string
  content: string
  filename?: string
  format?: 'monospace' | 'prose'
}

export interface PDFExportOptions extends ExportOptions {
  title?: string
}

export function normalizeUnicodeExport(input: string): string {
  return input.normalize('NFC')
}

export function safeJsonExport(obj: unknown): string {
  return normalizeUnicodeExport(JSON.stringify(obj, null, 2))
}

export async function exportToClipboard(content: string): Promise<void> {
  await navigator.clipboard.writeText(normalizeUnicodeExport(content))
}

export function exportAsDownload(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([normalizeUnicodeExport(content)], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function exportToPDF(options: PDFExportOptions): Promise<void> {
  // Use browser print strategy to preserve Unicode characters (emoji, CJK, Arabic, etc)
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  const isCode = options.format !== 'prose'
  const safeContent = normalizeUnicodeExport(options.content)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${options.title || options.toolName}</title>
  <style>
    @page { margin: 14mm 20mm; }
    body { 
      font-family:
        Inter,
        system-ui,
        -apple-system,
        "Segoe UI",
        Roboto,
        "Noto Sans",
        "Noto Sans JP",
        "Noto Sans Arabic",
        sans-serif;
      color: #2E2B24;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      color-adjust: exact;
      print-color-adjust: exact;
    }
    .header {
      background-color: #0F0E0C;
      color: #FAF8F4;
      padding: 14px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .header h1 { margin: 0; font-size: 16px; }
    .header-right { text-align: right; color: #C8973E; font-size: 10px; }
    .date { color: #8C8880; font-size: 8px; margin-top: 2px; }
    .content {
      font-family: ${isCode ? 'courier, monospace' : 'inherit'};
      font-size: 9pt;
      line-height: 1.5;
      white-space: pre-wrap;
      word-wrap: break-word;
      padding: 0 20px;
    }
    .footer {
      position: fixed;
      bottom: 0;
      left: 20px;
      right: 20px;
      border-top: 1px solid #E0D9CE;
      padding-top: 5px;
      padding-bottom: 14px;
      color: #8C8880;
      font-size: 7pt;
      display: flex;
      justify-content: space-between;
    }
    @media screen {
      body { padding: 20px; background: #f0f0f0; }
      .page { background: white; max-width: 210mm; margin: 0 auto; box-shadow: 0 0 10px rgba(0,0,0,0.1); padding-bottom: 40px; position: relative; min-height: 297mm; }
      .footer { position: absolute; bottom: 0; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <h1>ToolStack</h1>
      <div class="header-right">
        <div>${options.toolName}</div>
        <div class="date">${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
      </div>
    </div>
    <div class="content">${safeContent}</div>
    <div class="footer">
      <span>Generated with ToolStack · toolstack.dev</span>
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(() => {
        window.print();
        window.close();
      }, 250);
    };
  </script>
</body>
</html>
  `
  
  printWindow.document.open()
  printWindow.document.write(htmlContent)
  printWindow.document.close()
}
