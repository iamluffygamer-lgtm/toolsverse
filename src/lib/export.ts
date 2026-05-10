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

export async function exportToClipboard(content: string): Promise<void> {
  await navigator.clipboard.writeText(content)
}

export function exportAsDownload(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType })
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
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  
  const marginX = 20
  const marginY = 14
  const headerHeight = 28
  
  const contentWidth = pageWidth - (marginX * 2)
  const contentStartY = headerHeight + marginY
  const contentEndY = pageHeight - marginY - 10 // Leave space for footer

  let currentPage = 1

  function drawHeader() {
    // Background: #0F0E0C (ink-900)
    doc.setFillColor(15, 14, 12)
    doc.rect(0, 0, pageWidth, headerHeight, 'F')
    
    // Left: ToolStack wordmark
    doc.setTextColor(250, 248, 244) // #FAF8F4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text('ToolStack', marginX, headerHeight / 2, { baseline: 'middle' })
    
    // Right: tool name
    doc.setTextColor(200, 151, 62) // #C8973E
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(options.toolName, pageWidth - marginX, (headerHeight / 2) - 2, { align: 'right', baseline: 'middle' })
    
    // Right below tool name: export date
    doc.setTextColor(140, 136, 128) // #8C8880
    doc.setFontSize(8)
    const dateStr = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    doc.text(dateStr, pageWidth - marginX, (headerHeight / 2) + 4, { align: 'right', baseline: 'middle' })
  }

  function drawFooter(pageNum: number, totalPages?: number) {
    const footerY = pageHeight - marginY
    
    // Separator line: #E0D9CE
    doc.setDrawColor(224, 217, 206)
    doc.line(marginX, footerY - 5, pageWidth - marginX, footerY - 5)
    
    // Left text
    doc.setTextColor(140, 136, 128)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.text('Generated with ToolStack · toolstack.dev', marginX, footerY)
    
    // Right text
    if (totalPages) {
      doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - marginX, footerY, { align: 'right' })
    }
  }

  // Pre-process text
  const isCode = options.format !== 'prose'
  doc.setFont(isCode ? 'courier' : 'helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(46, 43, 36) // #2E2B24

  // jsPDF handles text wrapping, but we need to manage pagination
  const splitText: string[] = doc.splitTextToSize(options.content, contentWidth)
  const lineHeight = doc.getLineHeight() * 1.5 / doc.internal.scaleFactor // mm
  const linesPerPage = Math.floor((contentEndY - contentStartY) / lineHeight)
  const totalPages = Math.ceil(splitText.length / linesPerPage) || 1

  for (let i = 0; i < totalPages; i++) {
    if (i > 0) doc.addPage()
    
    drawHeader()
    
    // Print content lines
    const startLine = i * linesPerPage
    const endLine = Math.min(startLine + linesPerPage, splitText.length)
    const pageLines = splitText.slice(startLine, endLine)
    
    doc.setFont(isCode ? 'courier' : 'helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(46, 43, 36)
    
    doc.text(pageLines, marginX, contentStartY, { lineHeightFactor: 1.5 })
    
    drawFooter(i + 1, totalPages)
  }

  const filename = options.filename || `toolstack-${options.toolName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`
  doc.save(filename)
}
