'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { marked } from 'marked'
import { 
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3, 
  Link as LinkIcon, Image as ImageIcon, Code, SquareCode, 
  Table as TableIcon, Quote, List, Minus, Maximize, X 
} from 'lucide-react'
import PageTransition from '@/components/PageTransition'
import ToolHeader from '@/components/ToolHeader'
import WorkflowBar from '@/components/WorkflowBar'
import ExportBar from '@/components/ExportBar'
import { getToolById } from '@/lib/tools'
import { consumeIncomingContent, addRecentTool } from '@/lib/session'
import { exportAsDownload, exportToPDF, normalizeUnicodeExport } from '@/lib/export'

marked.setOptions({
  gfm: true,
  breaks: true,
})

// ── Types ──────────────────────────────────────────────────────────────────────
type Tab = 'editor' | 'toc' | 'stats'

interface Heading {
  level: number
  text: string
  slug: string
  line: number
}

interface DocStats {
  words: number
  chars: number
  charsNoSpaces: number
  lines: number
  readTime: number
  speakTime: number
  sentences: number
  paragraphs: number
  headings: number
  h1: number
  h2: number
  h3plus: number
  links: number
  images: number
  codeBlocks: number
  blockquotes: number
  tables: number
  taskLists: { checked: number; unchecked: number }
  longestLine: number
  avgWordLength: number
  avgWordsPerSentence: number
}

// ── Constants ──────────────────────────────────────────────────────────────────
const SAMPLE_MARKDOWN = `# Getting Started with ToolStack

ToolStack is a collection of **100+ free developer tools** designed for
speed, precision, and everyday use.

## Why ToolStack?

- ✅ No sign-up required
- ✅ All processing happens in your browser
- ✅ Export to PDF, HTML, or Markdown

## Features

### Developer Tools

| Tool | Category | Status |
| ---- | -------- | ------ |
| JSON Formatter | Developer | ✅ Live |
| Base64 Encoder | Developer | ✅ Live |
| Regex Tester | Developer | ✅ Live |

### Code Example

\`\`\`javascript
const response = await fetch('https://api.toolstack.dev/tools')
const tools = await response.json()
console.log(\`Found \${tools.length} tools\`)
\`\`\`

## Task List

- [x] Build JSON Formatter
- [x] Build Base64 Encoder
- [x] Build Regex Tester
- [ ] Build 97 more tools

> "The best tool is the one you actually use." — ToolStack

---

Made with ❤️ by the ToolStack team.
`

const FAQS = [
  { q: 'What is Markdown?', a: 'Markdown is a lightweight markup language created by John Gruber in 2004. It lets you write plain text using simple symbols like # for headings, ** for bold, and * for lists — which then converts to clean HTML. It is the standard format for README files, documentation, and developer writing.' },
  { q: 'What is GitHub Flavored Markdown (GFM)?', a: 'GFM is GitHub\'s extended version of Markdown adding tables, task lists (- [ ]), strikethrough (~~text~~), fenced code blocks with syntax highlighting, and autolinked URLs. This editor supports all GFM features.' },
  { q: 'Can I export my Markdown as a PDF?', a: 'Yes. Click the PDF button in the export bar to download a professionally formatted PDF with ToolStack branding. You can also export as a self-contained HTML file or download the raw Markdown.' },
  { q: 'How do I add a table in Markdown?', a: 'Use the Table button in the toolbar to insert a template, or write it manually: | Col 1 | Col 2 | on the first line, | --- | --- | on the second line (the separator), then | Value | Value | for each row.' },
  { q: 'What are task lists in Markdown?', a: 'Task lists are a GFM extension: - [ ] creates an unchecked checkbox, - [x] creates a checked one. They are widely used in GitHub issues, pull requests, and project documentation.' },
  { q: 'Is my content saved?', a: 'This editor is intentionally stateless — your content is not saved to any server or database. All processing is in your browser. If you need to save your work, use the export buttons to download a copy.' },
]

// ── Helpers ────────────────────────────────────────────────────────────────────
function sanitizeHTML(html: string): string {
  let safe = html
  // Basic XSS mitigation since we're using dangerouslySetInnerHTML without a full sanitizer lib
  safe = safe.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  safe = safe.replace(/ on\w+="[^"]*"/gi, '')
  safe = safe.replace(/ on\w+='[^']*'/gi, '')
  safe = safe.replace(/ on\w+=\w+/gi, '')
  safe = safe.replace(/href="javascript:[^"]*"/gi, 'href="#"')
  safe = safe.replace(/href='javascript:[^']*'/gi, 'href="#"')
  return safe
}

function extractHeadings(markdown: string): Heading[] {
  const lines = markdown.split('\n')
  const headings: Heading[] = []
  lines.forEach((line, index) => {
    if (/^#{1,6}\s/.test(line)) {
      const match = line.match(/^(#{1,6})\s+(.+)/)
      if (match) {
        headings.push({
          level: match[1].length,
          text: match[2].trim(),
          slug: match[2].trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          line: index
        })
      }
    }
  })
  return headings
}

function calcStats(markdown: string): DocStats {
  const words = markdown.trim().split(/\s+/).filter(Boolean).length
  const chars = markdown.length
  const charsNoSpaces = markdown.replace(/\s/g, '').length
  const lines = markdown.split('\n').length
  const readTime = Math.max(1, Math.round(words / 200)) // 200 wpm
  const speakTime = Math.max(1, Math.round(words / 130)) // 130 wpm
  
  const sentences = (markdown.match(/[^.!?]+[.!?]+/g) || []).length
  const paragraphs = markdown.split(/\n\s*\n/).filter(p => p.trim().length > 0).length
  
  const headingsMatches = markdown.match(/^#{1,6}\s.+/gm) || []
  const h1 = headingsMatches.filter(h => /^#\s/.test(h)).length
  const h2 = headingsMatches.filter(h => /^##\s/.test(h)).length
  const h3plus = headingsMatches.length - h1 - h2
  
  const links = (markdown.match(/\[.+?\]\(.+?\)/g) || []).length
  const images = (markdown.match(/!\[.*?\]\(.+?\)/g) || []).length
  const codeBlocks = (markdown.match(/```[\s\S]*?```/g) || []).length
  const blockquotes = (markdown.match(/^>\s/gm) || []).length
  const tables = (markdown.match(/\|.+\|\n\|[-:\s|]+\|\n/g) || []).length
  
  const checked = (markdown.match(/-\s\[[xX]\]/g) || []).length
  const unchecked = (markdown.match(/-\s\[ \]/g) || []).length
  
  const lineLengths = markdown.split('\n').map(l => l.length)
  const longestLine = lineLengths.length > 0 ? Math.max(...lineLengths) : 0
  
  const avgWordLength = words > 0 ? Math.round((charsNoSpaces / words) * 10) / 10 : 0
  const avgWordsPerSentence = sentences > 0 ? Math.round((words / sentences) * 10) / 10 : words

  return {
    words, chars, charsNoSpaces, lines, readTime, speakTime, sentences, paragraphs,
    headings: headingsMatches.length, h1, h2, h3plus,
    links, images, codeBlocks, blockquotes, tables,
    taskLists: { checked, unchecked },
    longestLine, avgWordLength, avgWordsPerSentence
  }
}

function wrapSelection(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
  placeholder: string
): void {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = textarea.value.slice(start, end) || placeholder
  const newValue = textarea.value.slice(0, start) + before + selected + after + textarea.value.slice(end)
  
  textarea.value = newValue
  textarea.selectionStart = start + before.length
  textarea.selectionEnd = start + before.length + selected.length
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
  textarea.focus()
}

function prefixLines(textarea: HTMLTextAreaElement, prefix: string): void {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const val = textarea.value
  
  // Find start of line
  let lineStart = start
  while (lineStart > 0 && val[lineStart - 1] !== '\n') lineStart--
  
  // Find end of line
  let lineEnd = end
  while (lineEnd < val.length && val[lineEnd] !== '\n') lineEnd++
  
  const lines = val.slice(lineStart, lineEnd).split('\n')
  const newLines = lines.map(line => prefix + line.replace(/^#{1,6}\s|> |-\s/, '')) // Replace existing prefix if any
  const replacement = newLines.join('\n')
  
  textarea.value = val.slice(0, lineStart) + replacement + val.slice(lineEnd)
  textarea.selectionStart = lineStart
  textarea.selectionEnd = lineStart + replacement.length
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
  textarea.focus()
}

// ── Components ─────────────────────────────────────────────────────────────────
export default function MarkdownPreviewPage() {
  const tool = getToolById('markdown-preview')!
  const [activeTab, setActiveTab] = useState<Tab>('editor')
  
  const [markdown, setMarkdown] = useState('')
  const [preview, setPreview] = useState('')
  const [focusMode, setFocusMode] = useState(false)
  const [headings, setHeadings] = useState<Heading[]>([])
  const [stats, setStats] = useState<DocStats | null>(null)
  
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  
  const isSyncingEditor = useRef(false)
  const isSyncingPreview = useRef(false)

  // ── Handlers ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    addRecentTool('markdown-preview')
    const incoming = consumeIncomingContent()
    if (incoming) {
      setMarkdown(incoming)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const parsed = await marked.parse(markdown)
        setPreview(sanitizeHTML(parsed))
      } catch (e) {
        setPreview('<p class="text-[--ts-error]">Error parsing markdown.</p>')
      }
      setHeadings(extractHeadings(markdown))
      setStats(calcStats(markdown))
    }, 150)
    return () => clearTimeout(timer)
  }, [markdown])

  useEffect(() => {
    if (focusMode) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && focusMode) {
        setFocusMode(false)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [focusMode])

  const handleEditorScroll = () => {
    if (isSyncingPreview.current) {
      isSyncingPreview.current = false
      return
    }
    
    if (editorRef.current && previewRef.current) {
      isSyncingEditor.current = true
      const editor = editorRef.current
      const preview = previewRef.current
      
      const ratio = editor.scrollTop / (editor.scrollHeight - editor.clientHeight)
      if (!isNaN(ratio)) {
        preview.scrollTop = ratio * (preview.scrollHeight - preview.clientHeight)
      }
      
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = editor.scrollTop
      }
    }
  }

  const handlePreviewScroll = () => {
    if (isSyncingEditor.current) {
      isSyncingEditor.current = false
      return
    }
    
    if (editorRef.current && previewRef.current) {
      isSyncingPreview.current = true
      const editor = editorRef.current
      const preview = previewRef.current
      
      const ratio = preview.scrollTop / (preview.scrollHeight - preview.clientHeight)
      if (!isNaN(ratio)) {
        editor.scrollTop = ratio * (editor.scrollHeight - editor.clientHeight)
      }
      
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = editor.scrollTop
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!editorRef.current) return

    if (e.key === 'Tab') {
      e.preventDefault()
      const start = editorRef.current.selectionStart
      const end = editorRef.current.selectionEnd
      const val = editorRef.current.value
      editorRef.current.value = val.substring(0, start) + '  ' + val.substring(end)
      editorRef.current.selectionStart = editorRef.current.selectionEnd = start + 2
      setMarkdown(editorRef.current.value)
    }

    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b': e.preventDefault(); toolbarActions.bold(); break;
        case 'i': 
          if (e.shiftKey) { e.preventDefault(); toolbarActions.image(); }
          else { e.preventDefault(); toolbarActions.italic(); }
          break;
        case 's': 
          if (e.shiftKey) { e.preventDefault(); toolbarActions.strike(); }
          break;
        case 'k': 
          if (e.shiftKey) { e.preventDefault(); toolbarActions.codeBlock(); }
          else { e.preventDefault(); toolbarActions.link(); }
          break;
        case '1': e.preventDefault(); toolbarActions.h1(); break;
        case '2': e.preventDefault(); toolbarActions.h2(); break;
        case '3': e.preventDefault(); toolbarActions.h3(); break;
        case '.': if (e.shiftKey) { e.preventDefault(); toolbarActions.quote(); } break;
        case 'l': if (e.shiftKey) { e.preventDefault(); toolbarActions.list(); } break;
        case '`': e.preventDefault(); toolbarActions.code(); break;
      }
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text/plain')
    if (text.match(/^https?:\/\//) && editorRef.current) {
      const start = editorRef.current.selectionStart
      const end = editorRef.current.selectionEnd
      if (start !== end) {
        e.preventDefault()
        const selected = editorRef.current.value.slice(start, end)
        const newValue = editorRef.current.value.slice(0, start) + `[${selected}](${text})` + editorRef.current.value.slice(end)
        editorRef.current.value = newValue
        editorRef.current.selectionStart = editorRef.current.selectionEnd = start + selected.length + text.length + 4
        setMarkdown(editorRef.current.value)
      }
    }
  }

  const scrollToHeading = (line: number) => {
    setActiveTab('editor')
    setTimeout(() => {
      if (editorRef.current) {
        const lines = editorRef.current.value.split('\n')
        const charsToLine = lines.slice(0, line).join('\n').length + (line > 0 ? 1 : 0)
        
        editorRef.current.focus()
        editorRef.current.setSelectionRange(charsToLine, charsToLine)
        
        const lineHeight = 24 // approximate line height
        editorRef.current.scrollTop = line * lineHeight
      }
    }, 100)
  }

  const executeAction = (action: (t: HTMLTextAreaElement) => void) => {
    if (editorRef.current) {
      action(editorRef.current)
      setMarkdown(editorRef.current.value)
    }
  }

  const toolbarActions = {
    bold: () => executeAction(t => wrapSelection(t, '**', '**', 'bold text')),
    italic: () => executeAction(t => wrapSelection(t, '*', '*', 'italic text')),
    strike: () => executeAction(t => wrapSelection(t, '~~', '~~', 'strikethrough')),
    h1: () => executeAction(t => prefixLines(t, '# ')),
    h2: () => executeAction(t => prefixLines(t, '## ')),
    h3: () => executeAction(t => prefixLines(t, '### ')),
    link: () => executeAction(t => wrapSelection(t, '[', '](url)', 'link text')),
    image: () => executeAction(t => wrapSelection(t, '![', '](image.jpg)', 'alt text')),
    code: () => executeAction(t => wrapSelection(t, '`', '`', 'code')),
    codeBlock: () => executeAction(t => wrapSelection(t, '\n```\n', '\n```\n', 'code block')),
    quote: () => executeAction(t => prefixLines(t, '> ')),
    list: () => executeAction(t => prefixLines(t, '- ')),
    hr: () => executeAction(t => {
      const start = t.selectionStart
      const val = t.value
      t.value = val.slice(0, start) + '\n---\n' + val.slice(t.selectionEnd)
      t.selectionStart = t.selectionEnd = start + 5
    }),
    table: () => executeAction(t => {
      const template = '\n| Column 1 | Column 2 | Column 3 |\n| -------- | -------- | -------- |\n| Cell     | Cell     | Cell     |\n| Cell     | Cell     | Cell     |\n'
      const start = t.selectionStart
      t.value = t.value.slice(0, start) + template + t.value.slice(t.selectionEnd)
      t.selectionStart = t.selectionEnd = start + template.length
    }),
  }

  const handleExportHTML = () => {
    const title = headings.length > 0 ? headings[0].text : 'Document'
    const htmlExport = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #2E2B24; line-height: 1.7; }
    h1 { font-size: 1.75rem; font-weight: 700; color: #0F0E0C; margin: 1.5rem 0 0.75rem; border-bottom: 1px solid #E0D9CE; padding-bottom: 0.4rem; }
    h2 { font-size: 1.35rem; font-weight: 600; color: #0F0E0C; margin: 1.25rem 0 0.6rem; }
    h3 { font-size: 1.1rem; font-weight: 600; margin: 1rem 0 0.5rem; }
    p { margin: 0 0 1rem; }
    a { color: #C8973E; text-decoration: underline; }
    code { font-family: monospace; font-size: 0.85em; background: #F4F0E8; border: 0.5px solid #E0D9CE; border-radius: 4px; padding: 1px 5px; color: #C8973E; }
    pre { background: #0F0E0C; border-radius: 10px; padding: 16px; overflow-x: auto; margin: 1rem 0; }
    pre code { background: none; border: none; padding: 0; color: #FAF8F4; }
    blockquote { border-left: 3px solid #C8973E; margin: 1rem 0; padding: 0.5rem 0 0.5rem 1rem; color: #6B6660; background: #F4E8CE; border-radius: 0 6px 6px 0; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    th, td { padding: 8px 12px; border: 1px solid #E0D9CE; text-align: left; }
    th { background: #F4F0E8; font-weight: 600; }
    tr:nth-child(even) { background: #F4F0E8; }
    img { max-width: 100%; border-radius: 8px; }
    hr { border: none; border-top: 1px solid #E0D9CE; margin: 1.5rem 0; }
  </style>
</head>
<body>
  ${preview}
  <hr style="margin-top:3rem;border-color:#E0D9CE">
  <p style="font-size:11px;color:#8C8880;text-align:center">Generated with ToolStack · toolstack.dev</p>
</body>
</html>`
    exportAsDownload(htmlExport, `toolstack-markdown-${Date.now()}.html`, 'text/html')
  }

  // ── Render Helpers ─────────────────────────────────────────────────────────────
  const lineCount = markdown.split('\n').length
  const linesArray = Array.from({ length: lineCount }, (_, i) => i + 1)

  return (
    <PageTransition>
      {!focusMode && <ToolHeader tool={tool} outputReady={markdown.length > 0} />}

      <div className={`${focusMode ? 'fixed inset-0 z-[9999] bg-[--ts-bg] flex flex-col w-[100vw] h-[100vh]' : 'card p-0 mb-6 flex flex-col h-[700px]'}`}>
        
        {/* Tab Bar (Hidden in Focus Mode) */}
        {!focusMode && (
          <div className="flex items-center gap-2 px-4 py-3 bg-[--ts-surface] border-b border-[--ts-border] overflow-x-auto shrink-0">
            {[
              { id: 'editor', label: 'Editor & Preview' },
              { id: 'toc', label: 'Table of Contents' },
              { id: 'stats', label: 'Document Stats' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id
                  ? 'bg-[--ts-ink-900] text-[--ts-bg]'
                  : 'text-[--ts-ink-500] hover:text-[--ts-ink-900] bg-transparent'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Tab 1: Editor */}
        {activeTab === 'editor' && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-[--ts-border] shrink-0 w-full overflow-x-auto">
              <div className="flex items-center gap-1">
                <button onClick={toolbarActions.bold} className="p-1.5 rounded text-[--ts-ink-600] hover:bg-[--ts-surface] hover:text-[--ts-ink-900]" title="Bold (Ctrl+B)"><Bold size={16}/></button>
                <button onClick={toolbarActions.italic} className="p-1.5 rounded text-[--ts-ink-600] hover:bg-[--ts-surface] hover:text-[--ts-ink-900]" title="Italic (Ctrl+I)"><Italic size={16}/></button>
                <button onClick={toolbarActions.strike} className="p-1.5 rounded text-[--ts-ink-600] hover:bg-[--ts-surface] hover:text-[--ts-ink-900]" title="Strikethrough (Ctrl+Shift+S)"><Strikethrough size={16}/></button>
                <div className="w-px h-4 bg-[--ts-border] mx-1" />
                <button onClick={toolbarActions.h1} className="p-1.5 rounded text-[--ts-ink-600] hover:bg-[--ts-surface] hover:text-[--ts-ink-900]" title="Heading 1 (Ctrl+1)"><Heading1 size={16}/></button>
                <button onClick={toolbarActions.h2} className="p-1.5 rounded text-[--ts-ink-600] hover:bg-[--ts-surface] hover:text-[--ts-ink-900]" title="Heading 2 (Ctrl+2)"><Heading2 size={16}/></button>
                <button onClick={toolbarActions.h3} className="p-1.5 rounded text-[--ts-ink-600] hover:bg-[--ts-surface] hover:text-[--ts-ink-900]" title="Heading 3 (Ctrl+3)"><Heading3 size={16}/></button>
                <div className="w-px h-4 bg-[--ts-border] mx-1" />
                <button onClick={toolbarActions.link} className="p-1.5 rounded text-[--ts-ink-600] hover:bg-[--ts-surface] hover:text-[--ts-ink-900]" title="Link (Ctrl+K)"><LinkIcon size={16}/></button>
                <button onClick={toolbarActions.image} className="p-1.5 rounded text-[--ts-ink-600] hover:bg-[--ts-surface] hover:text-[--ts-ink-900]" title="Image (Ctrl+Shift+I)"><ImageIcon size={16}/></button>
                <button onClick={toolbarActions.code} className="p-1.5 rounded text-[--ts-ink-600] hover:bg-[--ts-surface] hover:text-[--ts-ink-900]" title="Code (Ctrl+`)"><Code size={16}/></button>
                <button onClick={toolbarActions.codeBlock} className="p-1.5 rounded text-[--ts-ink-600] hover:bg-[--ts-surface] hover:text-[--ts-ink-900]" title="Code Block (Ctrl+Shift+K)"><SquareCode size={16}/></button>
                <button onClick={toolbarActions.table} className="p-1.5 rounded text-[--ts-ink-600] hover:bg-[--ts-surface] hover:text-[--ts-ink-900]" title="Table"><TableIcon size={16}/></button>
                <div className="w-px h-4 bg-[--ts-border] mx-1" />
                <button onClick={toolbarActions.quote} className="p-1.5 rounded text-[--ts-ink-600] hover:bg-[--ts-surface] hover:text-[--ts-ink-900]" title="Blockquote (Ctrl+Shift+.)"><Quote size={16}/></button>
                <button onClick={toolbarActions.list} className="p-1.5 rounded text-[--ts-ink-600] hover:bg-[--ts-surface] hover:text-[--ts-ink-900]" title="List (Ctrl+Shift+L)"><List size={16}/></button>
                <button onClick={toolbarActions.hr} className="p-1.5 rounded text-[--ts-ink-600] hover:bg-[--ts-surface] hover:text-[--ts-ink-900]" title="Divider"><Minus size={16}/></button>
              </div>
              <div className="flex items-center gap-2">
                {!markdown && (
                  <button onClick={() => setMarkdown(SAMPLE_MARKDOWN)} className="text-xs font-semibold text-[--ts-gold] hover:text-[--ts-ink-900] transition-colors mr-2">Load Sample</button>
                )}
                {markdown && (
                  <button onClick={() => setMarkdown('')} className="text-xs font-semibold text-[--ts-ink-400] hover:text-[--ts-error] transition-colors mr-2">Clear</button>
                )}
                <button 
                  onClick={() => setFocusMode(!focusMode)} 
                  className={`p-1.5 rounded ${focusMode ? 'bg-[--ts-ink-900] text-[--ts-bg]' : 'text-[--ts-ink-600] hover:bg-[--ts-surface] hover:text-[--ts-ink-900]'}`} 
                  title="Toggle Focus Mode"
                >
                  {focusMode ? <X size={16}/> : <Maximize size={16}/>}
                </button>
              </div>
            </div>

            {/* Editor Area */}
            <div className="flex flex-1 min-h-0 bg-white relative">
              {/* Left: Line Numbers */}
              <div 
                ref={lineNumbersRef}
                className="w-10 bg-[--ts-surface] border-r border-[--ts-border] text-right py-4 pr-2 select-none overflow-hidden text-[13px] font-mono leading-[24px] text-[--ts-ink-400] hidden md:block"
                style={{ scrollbarWidth: 'none' }}
              >
                {linesArray.map(n => (
                  <div key={n} className="opacity-50">{n}</div>
                ))}
              </div>

              {/* Middle: Textarea */}
              <div className="flex-1 relative flex min-h-0">
                <textarea
                  ref={editorRef}
                  value={markdown}
                  onChange={e => setMarkdown(e.target.value)}
                  onScroll={handleEditorScroll}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder="Start writing markdown..."
                  className="absolute inset-0 w-full h-full p-4 font-mono text-[13px] leading-[24px] text-[--ts-ink-900] resize-none outline-none bg-transparent"
                  spellCheck={false}
                />
              </div>

              {/* Right: Preview */}
              <div 
                ref={previewRef}
                onScroll={handlePreviewScroll}
                className="flex-1 border-l border-[--ts-border] p-6 bg-[--ts-bg] overflow-y-auto markdown-preview min-h-0"
                dangerouslySetInnerHTML={{ __html: preview }}
              />
            </div>

            {/* Status Bar */}
            {stats && (
              <div className="px-4 py-2 bg-[--ts-surface] border-t border-[--ts-border] flex items-center justify-between text-[11px] font-medium text-[--ts-ink-500] shrink-0">
                <div className="flex gap-4">
                  <span>{stats.words.toLocaleString()} words</span>
                  <span className="hidden sm:inline">{stats.readTime} min read</span>
                  <span className="hidden sm:inline">{stats.headings} headings</span>
                  <span className="hidden sm:inline">{stats.lines} lines</span>
                </div>
                <div>{stats.chars.toLocaleString()} chars</div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Table of Contents */}
        {activeTab === 'toc' && (
          <div className="p-6 bg-white flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-[--ts-ink-900]">Table of Contents</h2>
                <span className="badge">{headings.length} headings</span>
              </div>
              
              {headings.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-[--ts-border] rounded-xl text-[--ts-ink-500]">
                  No headings found. Add headings using # to generate a table of contents.
                </div>
              ) : (
                <div className="card bg-[--ts-surface] p-6">
                  <div className="flex flex-col gap-2">
                    {headings.map((h, i) => {
                      const getBullet = (level: number) => {
                        if (level === 1) return '●'
                        if (level === 2) return '○'
                        if (level === 3) return '■'
                        return '–'
                      }
                      return (
                        <div 
                          key={i} 
                          className="flex items-center gap-2 group cursor-pointer"
                          style={{ paddingLeft: `${(h.level - 1) * 1.5}rem` }}
                          onClick={() => scrollToHeading(h.line)}
                        >
                          <span className="text-xs text-[--ts-gold] select-none">{getBullet(h.level)}</span>
                          <span className="text-sm font-medium text-[--ts-ink-700] group-hover:text-[--ts-ink-900] group-hover:underline transition-colors">{h.text}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Document Stats */}
        {activeTab === 'stats' && stats && (
          <div className="p-6 bg-[--ts-bg] flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <div className="flex flex-col gap-4">
                <h3 className="section-label">Writing Statistics</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="card p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] uppercase font-bold text-[--ts-ink-400] mb-1">Words</span>
                    <span className="text-2xl font-bold text-[--ts-ink-900]">{stats.words.toLocaleString()}</span>
                  </div>
                  <div className="card p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] uppercase font-bold text-[--ts-ink-400] mb-1">Characters</span>
                    <span className="text-2xl font-bold text-[--ts-ink-900]">{stats.chars.toLocaleString()}</span>
                  </div>
                  <div className="card p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] uppercase font-bold text-[--ts-ink-400] mb-1">Sentences</span>
                    <span className="text-2xl font-bold text-[--ts-ink-900]">{stats.sentences.toLocaleString()}</span>
                  </div>
                  <div className="card p-4 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] uppercase font-bold text-[--ts-ink-400] mb-1">Paragraphs</span>
                    <span className="text-2xl font-bold text-[--ts-ink-900]">{stats.paragraphs.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <h3 className="section-label">Readability & Time</h3>
                <div className="grid grid-cols-1 gap-3">
                  <div className="card p-4 flex justify-between items-center">
                    <span className="text-sm font-semibold text-[--ts-ink-600]">Reading Time</span>
                    <span className="text-lg font-bold text-[--ts-ink-900]">{stats.readTime} min</span>
                  </div>
                  <div className="card p-4 flex justify-between items-center">
                    <span className="text-sm font-semibold text-[--ts-ink-600]">Speaking Time</span>
                    <span className="text-lg font-bold text-[--ts-ink-900]">{stats.speakTime} min</span>
                  </div>
                  <div className="card p-4 flex justify-between items-center">
                    <span className="text-sm font-semibold text-[--ts-ink-600]">Avg. Words / Sentence</span>
                    <span className="text-lg font-bold text-[--ts-ink-900]">{stats.avgWordsPerSentence}</span>
                  </div>
                  <div className="card p-4 flex justify-between items-center">
                    <span className="text-sm font-semibold text-[--ts-ink-600]">Avg. Word Length</span>
                    <span className="text-lg font-bold text-[--ts-ink-900]">{stats.avgWordLength}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <h3 className="section-label">Document Structure</h3>
                <div className="card p-0 overflow-hidden">
                  <div className="flex justify-between items-center px-4 py-2.5 border-b border-[--ts-border-soft] bg-[--ts-surface]">
                    <span className="text-xs font-semibold text-[--ts-ink-600]">H1 Headings</span>
                    <span className="font-mono text-xs font-bold text-[--ts-ink-900]">{stats.h1}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5 border-b border-[--ts-border-soft]">
                    <span className="text-xs font-semibold text-[--ts-ink-600]">H2 Headings</span>
                    <span className="font-mono text-xs font-bold text-[--ts-ink-900]">{stats.h2}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5 border-b border-[--ts-border-soft] bg-[--ts-surface]">
                    <span className="text-xs font-semibold text-[--ts-ink-600]">H3+ Headings</span>
                    <span className="font-mono text-xs font-bold text-[--ts-ink-900]">{stats.h3plus}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5 border-b border-[--ts-border-soft]">
                    <span className="text-xs font-semibold text-[--ts-ink-600]">Links</span>
                    <span className="font-mono text-xs font-bold text-[--ts-ink-900]">{stats.links}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5 border-b border-[--ts-border-soft] bg-[--ts-surface]">
                    <span className="text-xs font-semibold text-[--ts-ink-600]">Images</span>
                    <span className="font-mono text-xs font-bold text-[--ts-ink-900]">{stats.images}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5 border-b border-[--ts-border-soft]">
                    <span className="text-xs font-semibold text-[--ts-ink-600]">Code Blocks</span>
                    <span className="font-mono text-xs font-bold text-[--ts-ink-900]">{stats.codeBlocks}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5 border-b border-[--ts-border-soft] bg-[--ts-surface]">
                    <span className="text-xs font-semibold text-[--ts-ink-600]">Blockquotes</span>
                    <span className="font-mono text-xs font-bold text-[--ts-ink-900]">{stats.blockquotes}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5 border-b border-[--ts-border-soft]">
                    <span className="text-xs font-semibold text-[--ts-ink-600]">Tables</span>
                    <span className="font-mono text-xs font-bold text-[--ts-ink-900]">{stats.tables}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-2.5 bg-[--ts-surface]">
                    <span className="text-xs font-semibold text-[--ts-ink-600]">Tasks (Done/Open)</span>
                    <span className="font-mono text-xs font-bold text-[--ts-ink-900]">{stats.taskLists.checked} / {stats.taskLists.unchecked}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {!focusMode && <WorkflowBar toolId="markdown-preview" hasOutput={markdown.length > 0} />}
      {!focusMode && (
        <ExportBar 
          toolId="markdown-preview" 
          content={markdown}
          hasOutput={markdown.length > 0} 
        />
      )}

      {/* Action buttons override for ExportBar HTML export */}
      {!focusMode && markdown.length > 0 && (
        <div className="flex justify-end gap-2 mb-8 -mt-4 relative z-10 pr-4">
          <button onClick={handleExportHTML} className="btn text-xs px-3">
            Download HTML
          </button>
          <button 
            onClick={() => exportToPDF({ toolName: 'Markdown Preview', content: preview, format: 'prose' })} 
            className="btn btn-primary text-xs px-3"
          >
            Export PDF
          </button>
        </div>
      )}

      {!focusMode && (
        <div className="prose-sm max-w-none mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {FAQS.map(faq => (
              <div key={faq.q} className="rounded-xl border border-[--ts-border-soft] bg-[--ts-surface] p-4">
                <h3 className="text-sm font-semibold text-[--ts-ink-900] mb-1">{faq.q}</h3>
                <p className="text-xs text-[--ts-ink-500] leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </PageTransition>
  )
}
