'use client'
import { useState, useCallback, useEffect } from 'react'
import AdSlot from '@/components/AdSlot'

// ── Types ──────────────────────────────────────────────────────────────────────
type OutputMode = 'formatted' | 'minified' | 'idle'

interface Stats {
  keys: number
  depth: number
  lines: number
  size: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtSize(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
}

function countKeys(obj: unknown, depth = 0): { keys: number; depth: number } {
  if (typeof obj !== 'object' || obj === null) return { keys: 0, depth }
  let keys = 0
  let maxDepth = depth
  for (const val of Object.values(obj as Record<string, unknown>)) {
    keys++
    const child = countKeys(val, depth + 1)
    keys += child.keys
    if (child.depth > maxDepth) maxDepth = child.depth
  }
  return { keys, depth: maxDepth }
}

// Syntax highlight JSON string → HTML
function highlight(json: string): string {
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(
      /("(?:[^"\\]|\\.)*")(\s*:)?|(\b-?\d+\.?\d*(?:[eE][+-]?\d+)?\b)|(true|false)|(null)|([{}[\],:])/g,
      (m, str, colon, num, bool, nul, punc) => {
        if (str && colon) return `<span class="sh-key">${str}</span><span class="sh-punc">:</span>`
        if (str) return `<span class="sh-str">${str}</span>`
        if (num != null) return `<span class="sh-num">${num}</span>`
        if (bool) return `<span class="sh-bool">${bool}</span>`
        if (nul) return `<span class="sh-null">${nul}</span>`
        if (punc) return `<span class="sh-punc">${punc}</span>`
        return m
      }
    )
}

const SAMPLE_JSON = JSON.stringify(
  {
    name: 'ToolStack',
    version: '1.0.0',
    tools: [
      { id: 'json-formatter', category: 'developer', active: true, rating: 4.9 },
      { id: 'base64', category: 'developer', active: false, rating: null },
    ],
    meta: { created: '2026-05-09', free: true, count: 100 },
  },
  null,
  2
)

// ── Component ──────────────────────────────────────────────────────────────────
import PageTransition from '@/components/PageTransition'
import ToolHeader from '@/components/ToolHeader'
import WorkflowBar from '@/components/WorkflowBar'
import ExportBar from '@/components/ExportBar'
import { getToolById } from '@/lib/tools'
import { consumeIncomingContent, addRecentTool } from '@/lib/session'
import SplitPane from '@/components/ui/SplitPane'

export default function JsonFormatterPage() {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [outputHL, setOutputHL] = useState('')   // highlighted HTML
  const [mode, setMode] = useState<OutputMode>('idle')
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)

  const tool = getToolById('json-formatter')!

  const inSize = fmtSize(new TextEncoder().encode(input).length)

  function applyOutput(json: string, parsed: unknown, m: OutputMode) {
    const lines = json.split('\n').length
    const outSize = fmtSize(new TextEncoder().encode(json).length)
    const { keys, depth } = countKeys(parsed)
    setOutput(json)
    setOutputHL(highlight(json))
    setMode(m)
    setStats({ keys, depth, lines, size: outSize })
    setError(null)
  }

  useEffect(() => {
    addRecentTool('json-formatter')
    const incoming = consumeIncomingContent()
    if (incoming) {
      setInput(incoming)
      try { const p = JSON.parse(incoming); applyOutput(JSON.stringify(p, null, 2), p, 'formatted') }
      catch { }
    }
  }, [])

  const handleFormat = useCallback(() => {
    try { const p = JSON.parse(input); applyOutput(JSON.stringify(p, null, 2), p, 'formatted') }
    catch (e) { setError(`Invalid JSON: ${(e as Error).message}`); setMode('idle') }
  }, [input])

  const handleMinify = useCallback(() => {
    try { const p = JSON.parse(input); applyOutput(JSON.stringify(p), p, 'minified') }
    catch (e) { setError(`Invalid JSON: ${(e as Error).message}`); setMode('idle') }
  }, [input])

  const handleValidate = useCallback(() => {
    if (!input.trim()) { setError('Paste some JSON first.'); return }
    try {
      JSON.parse(input)
      setError(null)
      setOutput(''); setOutputHL('')
      setMode('idle')
      setStats(null)
    } catch (e) {
      setError(`Invalid: ${(e as Error).message}`)
    }
  }, [input])

  function handleClear() {
    setInput(''); setOutput(''); setOutputHL('')
    setMode('idle'); setError(null); setStats(null)
  }

  function handleSample() {
    setInput(SAMPLE_JSON)
    try { const p = JSON.parse(SAMPLE_JSON); applyOutput(JSON.stringify(p, null, 2), p, 'formatted') }
    catch { }
  }

  // Live auto-format on input
  function handleInputChange(val: string) {
    setInput(val)
    if (!val.trim()) { setOutput(''); setOutputHL(''); setMode('idle'); setError(null); setStats(null); return }
    try { const p = JSON.parse(val); applyOutput(JSON.stringify(p, null, 2), p, 'formatted') }
    catch { }
  }

  const isValid = mode !== 'idle' && !error
  const showValid = !error && input.trim() && isValid

  return (
    <PageTransition>
      {/* Page header */}
      <ToolHeader tool={tool} outputReady={!!output} />

      {/* Main card */}
      <div className="card p-0 overflow-hidden mb-4">
        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-[--ts-surface] border-b border-[--ts-border] flex-wrap">
          <button onClick={handleFormat} className="btn-primary">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
            Beautify
          </button>
          <button onClick={handleMinify} className="btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" /></svg>
            Minify
          </button>
          <button onClick={handleValidate} className="btn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            Validate
          </button>

          <div className="flex-1" />

          {showValid && (
            <span className="text-xs font-medium text-[--ts-success] flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
              Valid JSON
            </span>
          )}
          <button onClick={handleSample} className="btn text-xs">Sample</button>
          <button onClick={handleClear} className="btn text-xs text-[--ts-error] border-[--ts-error-bg]">Clear</button>
        </div>

        {/* Panes */}
        <SplitPane
          minHeight={380}
          left={{
            label: 'Input',
            badge: <span className="badge">{inSize}</span>,
            children: (
              <textarea
                value={input}
                onChange={e => handleInputChange(e.target.value)}
                placeholder={'Paste your JSON here...\n\nTip: it auto-formats as you type.'}
                spellCheck={false}
                className="flex-1 resize-none border-none outline-none bg-white text-[--ts-ink-900] font-mono text-[12.5px] leading-relaxed p-4 w-full h-full"
                style={{ minHeight: 340 }}
              />
            )
          }}
          right={{
            label: 'Output',
            badge: stats ? <span className="badge">{stats.size}</span> : undefined,
            children: (
              <div
                className="flex-1 overflow-auto p-4 font-mono text-[12.5px] leading-relaxed bg-[--ts-card-bg] h-full"
                style={{ minHeight: 340, whiteSpace: 'pre' }}
              >
                {outputHL
                  ? <div dangerouslySetInnerHTML={{ __html: outputHL }} />
                  : <span className="text-[--ts-ink-400]">Formatted output will appear here.</span>
                }
              </div>
            )
          }}
        />

        {/* Error bar */}
        {error && (
          <div className="flex items-start gap-2 px-4 py-2.5 bg-[--ts-error-bg] border-t border-[color:var(--ts-error-bg)] text-[--ts-error] text-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 flex-shrink-0"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            {error}
          </div>
        )}

        {/* Stats bar */}
        <div className="flex items-center gap-5 px-4 py-2 bg-[--ts-surface] border-t border-[--ts-border]">
          <span className="text-xs text-[--ts-ink-500]">
            Keys: <span className="font-medium text-[--ts-ink-800]">{stats?.keys ?? '—'}</span>
          </span>
          <span className="text-xs text-[--ts-ink-500]">
            Depth: <span className="font-medium text-[--ts-ink-800]">{stats?.depth ?? '—'}</span>
          </span>
          <span className="text-xs text-[--ts-ink-500]">
            Lines: <span className="font-medium text-[--ts-ink-800]">{stats?.lines ?? '—'}</span>
          </span>
          <div className="flex-1" />
          <span className="text-xs text-[--ts-ink-400]">All processing is done in your browser — nothing is sent to any server.</span>
        </div>
      </div>

      {/* Mid-tool ad slot */}
      <div className="my-6 flex justify-center">
        <AdSlot size="rectangle" id="json-mid" />
      </div>

      <WorkflowBar toolId="json-formatter" hasOutput={!!output} contentToPass={output} />
      <ExportBar toolId="json-formatter" content={output} hasOutput={!!output} />

      {/* SEO content — critical for ranking */}
      <div className="prose-sm max-w-none mt-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {[
            { title: 'What is JSON?', body: 'JSON (JavaScript Object Notation) is a lightweight data-interchange format. It\'s easy for humans to read and write and easy for machines to parse and generate.' },
            { title: 'What does Beautify do?', body: 'Beautify (or pretty-print) adds indentation and line breaks to compact JSON, making it human-readable. Minify does the opposite — removing all unnecessary whitespace to reduce file size.' },
            { title: 'Is my data safe?', body: 'Yes. ToolStack processes all JSON entirely in your browser using JavaScript. Nothing you paste is ever sent to our servers.' },
            { title: 'What does Validate do?', body: 'Validates that your input is syntactically correct JSON. If there\'s an error, it shows you the exact position and reason so you can fix it fast.' },
          ].map(faq => (
            <div key={faq.title} className="rounded-xl border border-[--ts-border-soft] bg-[--ts-surface] p-4">
              <h3 className="text-sm font-semibold text-[--ts-ink-900] mb-1">{faq.title}</h3>
              <p className="text-xs text-[--ts-ink-500] leading-relaxed">{faq.body}</p>
            </div>
          ))}
        </div>
      </div>
    </PageTransition>
  )
}
