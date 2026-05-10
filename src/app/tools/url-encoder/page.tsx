'use client'
import { useState, useCallback, useEffect } from 'react'
import PageTransition from '@/components/PageTransition'
import ToolHeader from '@/components/ToolHeader'
import WorkflowBar from '@/components/WorkflowBar'
import ExportBar from '@/components/ExportBar'
import { getToolById } from '@/lib/tools'
import { consumeIncomingContent, addRecentTool } from '@/lib/session'

type Tab = 'encode' | 'query' | 'analyzer'
type EncodeMode = 'component' | 'full' | 'aggressive'
type Mode = 'encode' | 'decode'

// ── Helpers ────────────────────────────────────────────────────────────────────
function encode(text: string, mode: EncodeMode): string {
  if (!text) return ''
  switch (mode) {
    case 'component': return encodeURIComponent(text)
    case 'full': return encodeURI(text)
    case 'aggressive': return encodeURIComponent(text)
      .replace(/!/g, '%21')
      .replace(/'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
      .replace(/\*/g, '%2A')
  }
  return ''
}

function decode(text: string): string {
  if (!text) return ''
  try {
    return decodeURIComponent(text.replace(/\+/g, ' '))
  } catch {
    try { return decodeURI(text) }
    catch { throw new Error('Invalid percent-encoding — contains malformed sequences') }
  }
}

function highlightEncoded(str: string): string {
  return str.replace(
    /(%[0-9A-Fa-f]{2})+/g,
    match => `<span class="sh-encoded">${match}</span>`
  )
}

function parseQueryString(input: string): Array<{ key: string, decoded: string, raw: string }> {
  let qs = input.trim()
  if (qs.includes('?')) qs = qs.split('?')[1] || ''
  if (qs.includes('#')) qs = qs.split('#')[0] || ''

  return qs.split('&').filter(Boolean).map(pair => {
    const [rawKey, rawVal = ''] = pair.split('=')
    return {
      key: decodeURIComponent(rawKey.replace(/\+/g, ' ')),
      decoded: decodeURIComponent(rawVal.replace(/\+/g, ' ')),
      raw: rawVal,
    }
  })
}

interface UrlParts {
  protocol: string
  host: string
  port: string
  pathname: string
  search: string
  hash: string
  username?: string
  password?: string
  origin: string
  href: string
}

function analyzeUrl(input: string): UrlParts | null {
  if (!input) return null
  try {
    const url = new URL(input.trim().startsWith('http') ? input : 'https://' + input)
    return {
      protocol: url.protocol.replace(':', ''),
      host: url.hostname,
      port: url.port || getDefaultPort(url.protocol),
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      username: url.username,
      password: url.password,
      origin: url.origin,
      href: url.href,
    }
  } catch {
    return null
  }
}

function getDefaultPort(protocol: string): string {
  return protocol === 'https:' ? '443 (default)' : protocol === 'http:' ? '80 (default)' : ''
}

const SAMPLES = {
  encode: `https://example.com/search?q=hello world&lang=en&price=<100&tags=[javascript, typescript]`,
  decode: `https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Dhello%20world%26lang%3Den%26price%3D%3C100`,
  fullUrl: `https://example.com/path/to page/résumé.pdf?name=John Doe&city=São Paulo`,
}

const FAQS = [
  {
    q: 'What is URL encoding?',
    a: 'URL encoding (percent-encoding) converts characters that are not allowed in URLs into a format that can be safely transmitted. Special characters are replaced with a % followed by their hexadecimal ASCII code — for example, a space becomes %20.'
  },
  {
    q: 'What is the difference between encodeURI and encodeURIComponent?',
    a: 'encodeURI encodes a full URL and preserves characters like /, ?, &, and = that have structural meaning. encodeURIComponent encodes a single value and converts all special characters including /, ?, and &. Use encodeURIComponent for individual query parameter values.'
  },
  {
    q: 'Why does a space become %20 or +?',
    a: 'In standard percent-encoding (RFC 3986), spaces become %20. In application/x-www-form-urlencoded format (used in HTML forms), spaces become +. ToolStack handles both — the decoder converts + to spaces before decoding.'
  },
  {
    q: 'What characters must be encoded in a URL?',
    a: 'The RFC 3986 standard defines unreserved characters (A-Z, a-z, 0-9, -, _, ., ~) as safe. All other characters — including spaces, <, >, #, %, {, }, |, \\, ^, [ ], and ` — must be percent-encoded when used in query strings or path segments.'
  },
  {
    q: 'Is my data sent to any server?',
    a: 'No. All URL encoding and decoding on ToolStack is performed entirely in your browser using JavaScript\'s built-in encodeURIComponent and decodeURIComponent functions. Your data never leaves your device.'
  },
  {
    q: 'What is a query string?',
    a: 'A query string is the part of a URL after the ? character. It contains key-value pairs separated by & symbols, used to pass data to a web server. Example: ?search=hello&page=2&sort=asc.'
  },
]

// ── Component ──────────────────────────────────────────────────────────────────
export default function UrlEncoderPage() {
  const tool = getToolById('url-encoder')!

  const [activeTab, setActiveTab] = useState<Tab>('encode')

  // Tab 1 state
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [mode, setMode] = useState<Mode>('encode')
  const [encodeMode, setEncodeMode] = useState<EncodeMode>('component')
  const [error, setError] = useState<string | null>(null)

  // Tab 2 state
  const [queryInput, setQueryInput] = useState('')
  
  // Tab 3 state
  const [analyzerInput, setAnalyzerInput] = useState('')
  const [revealPassword, setRevealPassword] = useState(false)

  function processText(val: string, currentMode: Mode, currentEncodeMode: EncodeMode) {
    if (!val.trim()) {
      setOutput('')
      setError(null)
      return
    }
    try {
      if (currentMode === 'encode') {
        setOutput(encode(val, currentEncodeMode))
        setError(null)
      } else {
        setOutput(decode(val))
        setError(null)
      }
    } catch (e) {
      setOutput('')
      setError((e as Error).message)
    }
  }

  function handleInputChange(val: string) {
    setInput(val)
    let newMode = mode
    let newEncodeMode = encodeMode
    // Auto detect mode
    if (/%[0-9A-Fa-f]{2}/.test(val) && mode === 'encode') {
      newMode = 'decode'
      setMode(newMode)
    } else if (/^https?:\/\//.test(val) && mode === 'encode' && encodeMode === 'component') {
      newEncodeMode = 'full'
      setEncodeMode(newEncodeMode)
    }
    processText(val, newMode, newEncodeMode)
    
    // Auto populate Tab 2 & 3 if looks like URL
    if (val.includes('?')) setQueryInput(val)
    if (/^https?:\/\//.test(val)) setAnalyzerInput(val)
  }

  function handleModeChange(m: Mode) {
    setMode(m)
    processText(input, m, encodeMode)
  }

  function handleEncodeModeChange(em: EncodeMode) {
    setEncodeMode(em)
    processText(input, mode, em)
  }

  function handleSample() {
    setInput(SAMPLES.encode)
    setMode('encode')
    setEncodeMode('component')
    processText(SAMPLES.encode, 'encode', 'component')
    setQueryInput(SAMPLES.encode)
    setAnalyzerInput(SAMPLES.encode)
  }

  function handleClear() {
    setInput('')
    setOutput('')
    setError(null)
    setQueryInput('')
    setAnalyzerInput('')
  }

  useEffect(() => {
    addRecentTool('url-encoder')
    const incoming = consumeIncomingContent()
    if (incoming) {
      setInput(incoming)
      let initialMode: Mode = 'encode'
      let initialEncodeMode: EncodeMode = 'component'
      
      if (/%[0-9A-Fa-f]{2}/.test(incoming)) {
        initialMode = 'decode'
      } else if (/^https?:\/\//.test(incoming)) {
        initialEncodeMode = 'full'
      }
      
      setMode(initialMode)
      setEncodeMode(initialEncodeMode)
      
      if (incoming.includes('?')) {
        setQueryInput(incoming)
        setActiveTab('query')
      } else if (/^https?:\/\//.test(incoming)) {
        setAnalyzerInput(incoming)
        setActiveTab('analyzer')
      }
      processText(incoming, initialMode, initialEncodeMode)
    }
  }, [])

  // Tab 1 Stats
  const inLen = input.length
  const outLen = output.length
  const encCount = (output.match(/(%[0-9A-Fa-f]{2})/g) || []).length
  const diffPct = inLen > 0 ? (((outLen - inLen) / inLen) * 100) : 0
  const diffStr = diffPct > 0 ? `+${diffPct.toFixed(1)}%` : diffPct < 0 ? `${diffPct.toFixed(1)}%` : '0%'

  // Tab 2 logic
  const parsedQuery = parseQueryString(queryInput)

  // Tab 3 logic
  const urlParts = analyzeUrl(analyzerInput)
  const validationChecks = []
  if (urlParts) {
    validationChecks.push({ ok: true, msg: 'Valid URL structure' })
    if (urlParts.protocol === 'https') {
      validationChecks.push({ ok: true, msg: 'HTTPS (secure)' })
    } else {
      validationChecks.push({ ok: false, msg: 'Not HTTPS (insecure)' })
    }
    if (urlParts.search) {
      validationChecks.push({ ok: true, msg: 'Contains query parameters' })
    } else {
      validationChecks.push({ ok: false, msg: 'No query parameters' })
    }
    if (urlParts.username || urlParts.password) {
      validationChecks.push({ ok: false, msg: 'Credentials exposed in URL' })
    } else {
      validationChecks.push({ ok: true, msg: 'No credentials exposed' })
    }
    if (urlParts.port && !urlParts.port.includes('default')) {
      validationChecks.push({ ok: false, msg: `Non-standard port (${urlParts.port})` })
    } else {
      validationChecks.push({ ok: true, msg: 'Standard port' })
    }
  }

  const hasOutput = activeTab === 'encode' ? !!output : activeTab === 'query' ? parsedQuery.length > 0 : !!urlParts

  return (
    <PageTransition>
      <ToolHeader tool={tool} outputReady={hasOutput} />

      <div className="card p-0 overflow-hidden mb-6">
        {/* Tab Bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[--ts-surface] border-b border-[--ts-border] overflow-x-auto">
          {[
            { id: 'encode', label: 'Encode / Decode' },
            { id: 'query', label: 'Query String Parser' },
            { id: 'analyzer', label: 'URL Analyzer' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === tab.id
                ? 'bg-[--ts-ink-900] text-[--ts-bg]'
                : 'text-[--ts-ink-500] hover:text-[--ts-ink-900] bg-transparent'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Encode / Decode */}
        {activeTab === 'encode' && (
          <>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[--ts-surface] border-b border-[--ts-border] flex-wrap">
              <div className="flex items-center bg-[--ts-card-bg] rounded-lg p-1 border border-[--ts-border]">
                <button
                  onClick={() => handleModeChange('encode')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${mode === 'encode' ? 'bg-white shadow-sm text-[--ts-ink-900]' : 'text-[--ts-ink-500] hover:text-[--ts-ink-900]'}`}
                >
                  Encode
                </button>
                <button
                  onClick={() => handleModeChange('decode')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${mode === 'decode' ? 'bg-white shadow-sm text-[--ts-ink-900]' : 'text-[--ts-ink-500] hover:text-[--ts-ink-900]'}`}
                >
                  Decode
                </button>
              </div>

              {mode === 'encode' && (
                <div className="flex items-center bg-[--ts-card-bg] rounded-lg p-1 border border-[--ts-border] ml-2 hidden sm:flex">
                  <button
                    onClick={() => handleEncodeModeChange('component')}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${encodeMode === 'component' ? 'bg-white shadow-sm text-[--ts-ink-900]' : 'text-[--ts-ink-500] hover:text-[--ts-ink-900]'}`}
                  >
                    Component
                  </button>
                  <button
                    onClick={() => handleEncodeModeChange('full')}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${encodeMode === 'full' ? 'bg-white shadow-sm text-[--ts-ink-900]' : 'text-[--ts-ink-500] hover:text-[--ts-ink-900]'}`}
                  >
                    Full URL
                  </button>
                  <button
                    onClick={() => handleEncodeModeChange('aggressive')}
                    className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${encodeMode === 'aggressive' ? 'bg-white shadow-sm text-[--ts-ink-900]' : 'text-[--ts-ink-500] hover:text-[--ts-ink-900]'}`}
                  >
                    Aggressive
                  </button>
                </div>
              )}

              <div className="flex-1" />
              <button onClick={handleSample} className="btn text-xs">Sample</button>
              <button onClick={handleClear} className="btn text-xs text-[--ts-error] border-[--ts-error-bg]">Clear</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2" style={{ minHeight: 380 }}>
              <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-[--ts-border]">
                <div className="flex items-center justify-between px-4 py-2 border-b border-[--ts-border] bg-[--ts-surface]">
                  <span className="section-label">Input</span>
                  {input.length > 0 && <span className="badge">{input.length} chars</span>}
                </div>
                <textarea
                  value={input}
                  onChange={e => handleInputChange(e.target.value)}
                  placeholder={mode === 'encode' ? 'Type or paste a URL or string here...' : 'Paste percent-encoded text here...'}
                  spellCheck={false}
                  className="flex-1 resize-none border-none outline-none bg-white text-[--ts-ink-900] font-mono text-[12.5px] leading-relaxed p-4"
                  style={{ minHeight: 340 }}
                />
              </div>

              <div className="flex flex-col">
                <div className="flex items-center justify-between px-4 py-2 border-b border-[--ts-border] bg-[--ts-surface]">
                  <span className="section-label">Output</span>
                  <div className="flex items-center gap-2">
                    {output.length > 0 && <span className="badge">{output.length} chars</span>}
                  </div>
                </div>
                <div className="flex-1 relative bg-[--ts-card-bg]">
                  <div
                    className="absolute inset-0 overflow-auto p-4 font-mono text-[12.5px] leading-relaxed break-all whitespace-pre-wrap text-[--ts-ink-900]"
                    dangerouslySetInnerHTML={{ __html: output ? highlightEncoded(output) : '<span class="text-[--ts-ink-400]">Result will appear here...</span>' }}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 px-4 py-2.5 bg-[--ts-error-bg] border-t border-[color:var(--ts-error-bg)] text-[--ts-error] text-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 flex-shrink-0"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                {error}
              </div>
            )}

            <div className="flex items-center gap-5 px-4 py-2 bg-[--ts-surface] border-t border-[--ts-border] overflow-x-auto">
              <span className="flex items-center gap-1.5 text-xs text-[--ts-ink-800] font-medium">
                <span className={`w-2 h-2 rounded-full ${mode === 'encode' ? 'bg-[--ts-success]' : 'bg-[#3b82f6]'}`}></span>
                Mode: {mode === 'encode' ? `Encode (${encodeMode === 'component' ? 'Component' : encodeMode === 'full' ? 'Full URL' : 'Aggressive'})` : 'Decode'}
              </span>
              <span className="text-xs text-[--ts-ink-500]">
                Encoded sequences: <span className="font-medium text-[--ts-ink-800]">{encCount}</span>
              </span>
              <span className="text-xs text-[--ts-ink-500]">
                Size change: <span className="font-medium text-[--ts-ink-800]">{diffStr}</span>
              </span>
            </div>
          </>
        )}

        {/* Tab 2: Query String Parser */}
        {activeTab === 'query' && (
          <div className="flex flex-col min-h-[420px]">
            <div className="p-4 border-b border-[--ts-border] bg-[--ts-surface]">
              <textarea
                value={queryInput}
                onChange={e => setQueryInput(e.target.value)}
                placeholder="Paste a full URL or query string... e.g. ?key=value&foo=bar"
                spellCheck={false}
                className="w-full resize-none rounded-lg border border-[--ts-border] bg-white text-[--ts-ink-900] font-mono text-[12.5px] leading-relaxed p-3 focus:outline-none focus:ring-2 focus:ring-[--ts-gold] transition-shadow"
                rows={2}
              />
            </div>
            
            <div className="flex-1 bg-white">
              {parsedQuery.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-full bg-[--ts-surface] border border-[--ts-border-soft] flex items-center justify-center mb-4 text-[--ts-ink-400]">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                  </div>
                  <span className="text-sm font-medium text-[--ts-ink-900]">No Query Parameters</span>
                  <span className="text-xs text-[--ts-ink-500] mt-1">Paste a URL above to parse its query string.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[--ts-surface] border-b border-[--ts-border]">
                        <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[--ts-ink-500] border-r border-[--ts-border-soft] w-1/4">Key</th>
                        <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[--ts-ink-500] border-r border-[--ts-border-soft] w-2/4">Value (Decoded)</th>
                        <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[--ts-ink-500] border-r border-[--ts-border-soft] w-1/4">Raw Value</th>
                        <th className="px-4 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedQuery.map((pair, idx) => (
                        <tr key={idx} className={`border-b border-[--ts-border-soft] hover:bg-[--ts-surface] transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA] dark:bg-[--ts-card-bg]'}`}>
                          <td className="px-4 py-2.5 font-mono text-[13px] font-medium text-[--ts-gold] border-r border-[--ts-border-soft] align-top break-all">
                            {pair.key}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[13px] text-[--ts-ink-700] border-r border-[--ts-border-soft] align-top break-all">
                            {pair.decoded}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-[--ts-ink-400] border-r border-[--ts-border-soft] align-top break-all">
                            {pair.raw}
                          </td>
                          <td className="px-3 py-2.5 align-top">
                            <button
                              onClick={() => navigator.clipboard.writeText(`${pair.key}=${pair.raw}`)}
                              className="text-[--ts-ink-400] hover:text-[--ts-ink-900] transition-colors"
                              title="Copy pair"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  <div className="p-4 border-t border-[--ts-border] bg-[--ts-surface] flex gap-2">
                    <button 
                      onClick={() => {
                        const obj = Object.fromEntries(parsedQuery.map(p => [p.key, p.decoded]))
                        navigator.clipboard.writeText(JSON.stringify(obj, null, 2))
                      }}
                      className="btn text-xs bg-white"
                    >
                      Copy as JSON
                    </button>
                    <button 
                      onClick={() => {
                        const args = parsedQuery.map(p => `--data-urlencode "${p.key}=${p.decoded}"`).join(' ')
                        navigator.clipboard.writeText(args)
                      }}
                      className="btn text-xs bg-white"
                    >
                      Copy as cURL params
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: URL Analyzer */}
        {activeTab === 'analyzer' && (
          <div className="flex flex-col min-h-[420px]">
            <div className="p-4 border-b border-[--ts-border] bg-[--ts-surface]">
              <input
                type="text"
                value={analyzerInput}
                onChange={e => setAnalyzerInput(e.target.value)}
                placeholder="https://user:pass@example.com:8080/path?q=1#section"
                spellCheck={false}
                className="w-full rounded-lg border border-[--ts-border] bg-white text-[--ts-ink-900] font-mono text-[13px] leading-relaxed p-3 focus:outline-none focus:ring-2 focus:ring-[--ts-gold] transition-shadow"
              />
            </div>
            
            <div className="flex-1 bg-white p-6">
              {!urlParts ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <span className="text-sm font-medium text-[--ts-ink-900]">Invalid or missing URL</span>
                  <span className="text-xs text-[--ts-ink-500] mt-1">Enter a complete URL to analyze its structure.</span>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto space-y-8">
                  {/* Visual Anatomy Breakdown */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-[--ts-ink-400] mb-3">Anatomy Breakdown</h3>
                    <div className="p-4 rounded-xl border border-[--ts-border] bg-[--ts-surface] font-mono text-sm leading-8 break-all shadow-sm">
                      <span className="url-part url-part-protocol mr-0.5">{urlParts.protocol}</span>
                      <span className="text-[--ts-ink-400]">://</span>
                      {(urlParts.username || urlParts.password) && (
                        <span className="mx-0.5 bg-white border border-[--ts-border-soft] rounded px-1 text-[--ts-ink-700]">
                          {urlParts.username}
                          {urlParts.password ? `:${revealPassword ? urlParts.password : '••••••'}` : ''}
                          <span className="text-[--ts-ink-400]">@</span>
                        </span>
                      )}
                      <span className="url-part url-part-host mx-0.5">{urlParts.host}</span>
                      {urlParts.port && !urlParts.port.includes('default') && (
                        <>
                          <span className="text-[--ts-ink-400]">:</span>
                          <span className="url-part url-part-port mx-0.5">{urlParts.port}</span>
                        </>
                      )}
                      {urlParts.pathname && urlParts.pathname !== '/' && (
                        <span className="url-part url-part-path mx-0.5">{urlParts.pathname}</span>
                      )}
                      {urlParts.pathname === '/' && (
                        <span className="url-part url-part-path mx-0.5 opacity-50">/</span>
                      )}
                      {urlParts.search && (
                        <span className="url-part url-part-query mx-0.5">{urlParts.search}</span>
                      )}
                      {urlParts.hash && (
                        <span className="url-part url-part-hash ml-0.5">{urlParts.hash}</span>
                      )}
                    </div>
                  </div>

                  {/* Table Breakdown */}
                  <div className="rounded-xl border border-[--ts-border] overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <tbody>
                        {[
                          { label: 'Protocol', value: urlParts.protocol, class: 'url-part-protocol' },
                          { label: 'Host', value: urlParts.host, class: 'url-part-host' },
                          { label: 'Port', value: urlParts.port, class: 'url-part-port' },
                          { label: 'Pathname', value: urlParts.pathname, class: 'url-part-path' },
                          { label: 'Search (Query)', value: urlParts.search, class: 'url-part-query' },
                          { label: 'Hash (Fragment)', value: urlParts.hash, class: 'url-part-hash' },
                          urlParts.username ? { label: 'Username', value: urlParts.username, class: '' } : null,
                          urlParts.password ? { label: 'Password', value: urlParts.password, class: '', isPassword: true } : null,
                        ].filter(Boolean).map((row: any, i) => (
                          <tr key={row.label} className={`border-b border-[--ts-border-soft] last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA] dark:bg-[--ts-surface]'}`}>
                            <td className="px-4 py-3 font-semibold text-[--ts-ink-700] w-1/3">{row.label}</td>
                            <td className="px-4 py-3 font-mono text-[13px] text-[--ts-ink-900]">
                              {row.value ? (
                                <span className={row.class ? `url-part ${row.class}` : ''}>
                                  {row.isPassword && !revealPassword ? '••••••' : row.value}
                                </span>
                              ) : (
                                <span className="text-[--ts-ink-400] italic">none</span>
                              )}
                              {row.isPassword && (
                                <button 
                                  onClick={() => setRevealPassword(!revealPassword)}
                                  className="ml-3 text-xs text-[--ts-info] hover:underline"
                                >
                                  {revealPassword ? 'Hide' : 'Reveal'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Validation Checklist */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-widest text-[--ts-ink-400] mb-3">Validation Checklist</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {validationChecks.map((check, i) => (
                        <div key={i} className={`flex items-start gap-2.5 p-3 rounded-lg border ${check.ok ? 'bg-[--ts-success-bg] border-[color:var(--ts-success-bg)] text-[--ts-success]' : 'bg-[--ts-gold-light] border-[color:var(--ts-gold-light)] text-[--ts-gold]'}`}>
                          {check.ok ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 mt-0.5"><polyline points="20 6 9 17 4 12" /></svg>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 mt-0.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          )}
                          <span className="text-sm font-medium">{check.msg}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <WorkflowBar toolId="url-encoder" hasOutput={hasOutput} contentToPass={activeTab === 'encode' ? output : ''} />
      <ExportBar toolId="url-encoder" content={activeTab === 'encode' ? output : ''} hasOutput={hasOutput} />

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
    </PageTransition>
  )
}
