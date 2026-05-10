'use client'
import { useState, useCallback, useEffect, useRef, useLayoutEffect } from 'react'
import PageTransition from '@/components/PageTransition'
import ToolHeader from '@/components/ToolHeader'
import WorkflowBar from '@/components/WorkflowBar'
import ExportBar from '@/components/ExportBar'
import { getToolById } from '@/lib/tools'
import { consumeIncomingContent, addRecentTool } from '@/lib/session'

// ── Types ──────────────────────────────────────────────────────────────────────
type Tab = 'tester' | 'reference' | 'export'

interface MatchDetail {
  index: number
  value: string
  start: number
  end: number
  groups: string[]
  namedGroups: Record<string, string>
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function highlightMatches(text: string, regex: RegExp): {
  html: string,
  matches: MatchDetail[]
} {
  const matches: MatchDetail[] = []
  let html = ''
  let lastIndex = 0
  let matchIndex = 0
  let match: RegExpExecArray | null

  // Clone regex to avoid mutation
  const r = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g')

  while ((match = r.exec(text)) !== null) {
    html += escapeHtml(text.slice(lastIndex, match.index))
    const colorClass = matchIndex % 2 === 0 ? 'match-even' : 'match-odd'
    html += `<mark class="regex-match ${colorClass}" data-index="${matchIndex}">${escapeHtml(match[0])}</mark>`

    matches.push({
      index: matchIndex,
      value: match[0],
      start: match.index,
      end: match.index + match[0].length,
      groups: match.slice(1),
      namedGroups: match.groups || {},
    })

    lastIndex = match.index + match[0].length
    matchIndex++

    if (match[0].length === 0) r.lastIndex++
  }
  html += escapeHtml(text.slice(lastIndex))
  return { html, matches }
}

function getFlagString(lang: string, flags: Set<string>): string {
  const flagStr = Array.from(flags).join('')
  if (lang === 'js' || lang === 'ts' || lang === 'php') return flagStr
  if (lang === 'python') {
    const pyFlags = []
    if (flags.has('i')) pyFlags.push('re.IGNORECASE')
    if (flags.has('m')) pyFlags.push('re.MULTILINE')
    if (flags.has('s')) pyFlags.push('re.DOTALL')
    if (flags.has('u')) pyFlags.push('re.UNICODE')
    return pyFlags.length ? ', ' + pyFlags.join(' | ') : ''
  }
  if (lang === 'go' || lang === 'rust') {
    let inline = ''
    if (flags.has('i')) inline += 'i'
    if (flags.has('m')) inline += 'm'
    if (flags.has('s')) inline += 's'
    return inline ? `(?${inline})` : ''
  }
  return ''
}

function generateCode(lang: string, pat: string, flags: Set<string>): string {
  if (!pat) return ''
  const escPat = pat.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  const flagStr = Array.from(flags).join('')
  
  switch(lang) {
    case 'js':
      return `const regex = /${pat.replace(/\//g, '\\/')}/${flagStr};\nconst matches = text.match(regex);\n// or\nconst result = regex.exec(text);`
    case 'ts':
      return `const regex: RegExp = /${pat.replace(/\//g, '\\/')}/${flagStr};\nconst matches: RegExpMatchArray | null = text.match(regex);`
    case 'python':
      const pyF = getFlagString('python', flags)
      return `import re\npattern = re.compile(r"${pat.replace(/"/g, '\\"')}"${pyF})\nmatches = pattern.findall(text)`
    case 'php':
      return `preg_match_all('/${pat.replace(/\//g, '\\/')}/${flagStr}', $text, $matches);`
    case 'go':
      const goInline = getFlagString('go', flags)
      return `import "regexp"\nre := regexp.MustCompile(\`${goInline}${pat.replace(/`/g, '` + "`" + `')}\`)\nmatches := re.FindAllString(text, -1)`
    case 'rust':
      const rsInline = getFlagString('rust', flags)
      return `use regex::Regex;\nlet re = Regex::new(r"${rsInline}${pat.replace(/"/g, '\\"')}").unwrap();\nlet matches: Vec<&str> = re.find_iter(&text).map(|m| m.as_str()).collect();`
    default:
      return ''
  }
}

// ContentEditable Caret Helpers
function getCaretPos(element: HTMLElement) {
  let caretOffset = 0;
  const doc = element.ownerDocument || document;
  const win = doc.defaultView || window;
  const sel = win.getSelection();
  if (sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    caretOffset = preCaretRange.toString().length;
  }
  return caretOffset;
}

function setCaretPosHelper(element: HTMLElement, offset: number) {
  let charIndex = 0;
  const range = document.createRange();
  range.setStart(element, 0);
  range.collapse(true);
  const nodeStack: Node[] = [element];
  let node: Node | undefined;
  let foundStart = false;
  let stop = false;

  while (!stop && (node = nodeStack.pop())) {
    if (node.nodeType === 3) {
      const nextCharIndex = charIndex + (node as Text).length;
      if (!foundStart && offset >= charIndex && offset <= nextCharIndex) {
        range.setStart(node, offset - charIndex);
        range.collapse(true);
        foundStart = true;
        stop = true;
      }
      charIndex = nextCharIndex;
    } else {
      let i = node.childNodes.length;
      while (i--) {
        nodeStack.push(node.childNodes[i]);
      }
    }
  }

  const sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

const SAMPLES = [
  {
    label: '📧 Email',
    pattern: '[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}',
    flags: new Set(['g', 'i']),
    testStr: 'Contact us at hello@toolstack.dev or support@example.com for help.\nInvalid: not-an-email@, @nodomain',
  },
  {
    label: '🔗 URL',
    pattern: 'https?:\\/\\/[^\\s/$.?#].[^\\s]*',
    flags: new Set(['g', 'i']),
    testStr: 'Visit https://toolstack.dev or http://example.com/path?q=1 for more info.',
  },
  {
    label: '🌐 IP',
    pattern: '\\b(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\b',
    flags: new Set(['g']),
    testStr: 'Server IPs: 192.168.1.1, 10.0.0.1, 255.255.255.0. Invalid: 999.1.1.1, 1.2.3',
  },
  {
    label: '🎨 Color',
    pattern: '#(?:[0-9a-fA-F]{3}){1,2}\\b',
    flags: new Set(['g', 'i']),
    testStr: 'Colors: #FFF, #0F0E0C, #C8973E, #abc123. Invalid: #GGGGGG, #12',
  },
]

const FAQS = [
  { q: 'What is a regular expression?', a: 'A regular expression (regex) is a sequence of characters that defines a search pattern. It is used to find, match, and manipulate text in strings. Regex is supported in nearly every programming language and text editor.' },
  { q: 'What does the global (g) flag do?', a: 'Without the global flag, a regex stops after the first match. With g enabled, it finds every match in the string. This is the most commonly used flag and is enabled by default in this tester.' },
  { q: 'What is a capture group?', a: 'A capture group is a part of the pattern wrapped in parentheses (abc). It "captures" the matched text so you can reference it later — in replacements as $1, $2, or in code via match[1], match[2].' },
  { q: 'What is the difference between greedy and lazy matching?', a: 'Greedy quantifiers (*, +, {n,m}) match as much as possible. Lazy quantifiers (*?, +?, {n,m}?) match as little as possible. For example, <.+> on "<a>text</a>" greedily matches the whole string, but <.+?> matches just "<a>".' },
  { q: 'Why is my regex not matching across multiple lines?', a: 'By default, . does not match newline characters and ^ / $ only match the start/end of the entire string. Enable the m (multiline) flag to make ^ and $ match line boundaries, and the s (dotall) flag to make . match newlines.' },
  { q: 'Is this regex tester safe to use with sensitive data?', a: 'Yes. All regex testing runs entirely in your browser using JavaScript\'s native RegExp engine. No data is sent to any server. Your test strings and patterns stay completely private.' },
]

// ── Component ──────────────────────────────────────────────────────────────────
export default function RegexTesterPage() {
  const tool = getToolById('regex-tester')!

  const [activeTab, setActiveTab] = useState<Tab>('tester')

  // State
  const [pattern, setPattern] = useState('')
  const [flags, setFlags] = useState<Set<string>>(new Set(['g']))
  const [patternError, setPatternError] = useState<string | null>(null)

  const [testStr, setTestStr] = useState('')
  const [highlightedHtml, setHighlightedHtml] = useState('')
  const [matches, setMatches] = useState<MatchDetail[]>([])
  const [activeMatch, setActiveMatch] = useState<number | null>(null)

  const [exportLang, setExportLang] = useState('js')

  const testZoneRef = useRef<HTMLDivElement>(null)
  const [caretPos, setCaretPos] = useState<number | null>(null)

  // Core processing
  const runRegex = useCallback((pat: string, str: string, flagSet: Set<string>) => {
    if (!pat) {
      setHighlightedHtml(escapeHtml(str))
      setMatches([])
      setPatternError(null)
      return
    }
    try {
      const flagStr = Array.from(flagSet).join('')
      const regex = new RegExp(pat, flagStr)
      const { html, matches } = highlightMatches(str, regex)
      setHighlightedHtml(html)
      setMatches(matches)
      setPatternError(null)
    } catch (e) {
      setPatternError((e as Error).message)
      setHighlightedHtml(escapeHtml(str))
      setMatches([])
    }
  }, [])

  // Handlers
  function handlePatternChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setPattern(val)
    runRegex(val, testStr, flags)
  }

  function handleFlagToggle(f: string) {
    const newFlags = new Set(flags)
    if (newFlags.has(f)) newFlags.delete(f)
    else newFlags.add(f)
    setFlags(newFlags)
    runRegex(pattern, testStr, newFlags)
  }

  function handleTestStringInput(e: React.FormEvent<HTMLDivElement>) {
    const el = e.currentTarget
    // Extract raw text preserving newlines
    let text = el.innerText || ''
    // Handle the quirk where ending newlines might be dropped
    if (text.endsWith('\n\n')) text = text.substring(0, text.length - 1)
    
    const pos = getCaretPos(el)
    setTestStr(text)
    setCaretPos(pos)
    runRegex(pattern, text, flags)
  }

  useLayoutEffect(() => {
    if (testZoneRef.current && caretPos !== null && document.activeElement === testZoneRef.current) {
      setCaretPosHelper(testZoneRef.current, caretPos)
    }
  }, [highlightedHtml, caretPos])

  function loadSample(sample: typeof SAMPLES[0]) {
    setPattern(sample.pattern)
    setFlags(sample.flags)
    setTestStr(sample.testStr)
    runRegex(sample.pattern, sample.testStr, sample.flags)
  }

  function handleClear() {
    setPattern('')
    setTestStr('')
    setPatternError(null)
    setHighlightedHtml('')
    setMatches([])
  }

  function trySyntax(syntax: string) {
    setPattern(syntax)
    setActiveTab('tester')
    runRegex(syntax, testStr, flags)
    setTimeout(() => {
      testZoneRef.current?.focus()
    }, 50)
  }

  useEffect(() => {
    addRecentTool('regex-tester')
    const incoming = consumeIncomingContent()
    if (incoming) {
      if (incoming.startsWith('/') || incoming.includes('(?') || incoming.includes('[')) {
        const pat = incoming.replace(/^\/|\/[gimsuy]*$/g, '')
        setPattern(pat)
        runRegex(pat, testStr, flags)
      } else {
        setTestStr(incoming)
        runRegex(pattern, incoming, flags)
      }
    }
    // Set initial empty html
    if (!highlightedHtml && !testStr) {
      setHighlightedHtml('')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const flagList = [
    { id: 'g', tip: 'Global — find all matches' },
    { id: 'i', tip: 'Case insensitive' },
    { id: 'm', tip: 'Multiline — ^ and $ match line boundaries' },
    { id: 's', tip: 'Dotall — . matches newlines' },
    { id: 'u', tip: 'Unicode — full Unicode support' },
  ]

  const captureGroupsCount = matches.length > 0 ? matches[0].groups.length : 0

  return (
    <PageTransition>
      <ToolHeader tool={tool} outputReady={matches.length > 0} />

      <div className="card p-0 overflow-hidden mb-6">
        {/* Tab Bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[--ts-surface] border-b border-[--ts-border] overflow-x-auto">
          {[
            { id: 'tester', label: 'Tester' },
            { id: 'reference', label: 'Reference' },
            { id: 'export', label: 'Code Export' },
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

        {/* Tab 1: Tester */}
        {activeTab === 'tester' && (
          <div className="flex flex-col min-h-[500px]">
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[--ts-surface] border-b border-[--ts-border] flex-wrap">
              <span className="text-xs font-semibold text-[--ts-ink-500] mr-2">Presets:</span>
              {SAMPLES.map(s => (
                <button key={s.label} onClick={() => loadSample(s)} className="btn text-xs py-1 px-2">{s.label}</button>
              ))}
              <div className="flex-1" />
              <button onClick={handleClear} className="btn text-xs text-[--ts-error] border-[--ts-error-bg]">Clear</button>
            </div>

            {/* Zone 1: Pattern Zone */}
            <div className="p-5 border-b border-[--ts-border] bg-white">
              <span className="section-label mb-2 block">Regular Expression</span>
              <div className={`flex items-center w-full px-3 py-2.5 rounded-lg border bg-[--ts-surface] transition-shadow ${patternError ? 'border-[--ts-error] ring-2 ring-[--ts-error]/20' : 'border-[--ts-border] focus-within:ring-2 focus-within:ring-[--ts-gold]/40'}`}>
                <span className="text-[--ts-ink-400] font-mono text-sm leading-none pt-0.5">/</span>
                <input
                  type="text"
                  value={pattern}
                  onChange={handlePatternChange}
                  placeholder="Enter regex pattern here..."
                  className="flex-1 bg-transparent border-none outline-none font-mono text-sm text-[--ts-ink-900] px-2"
                  spellCheck={false}
                />
                <span className="text-[--ts-ink-400] font-mono text-sm leading-none pt-0.5">/</span>
                <span className="text-[--ts-gold] font-mono text-sm font-medium leading-none pt-0.5 w-6">{Array.from(flags).join('')}</span>
              </div>
              {patternError && <span className="text-xs text-[--ts-error] mt-1 block font-medium">{patternError}</span>}
              
              <div className="mt-3 flex items-center gap-1.5">
                <span className="text-xs text-[--ts-ink-500] mr-1">Flags:</span>
                {flagList.map(f => (
                  <button
                    key={f.id}
                    title={f.tip}
                    onClick={() => handleFlagToggle(f.id)}
                    className={`w-7 h-7 rounded flex items-center justify-center font-mono text-xs font-medium transition-colors ${flags.has(f.id) ? 'bg-[--ts-ink-900] text-[--ts-bg]' : 'bg-[--ts-surface] text-[--ts-ink-500] border border-[--ts-border] hover:text-[--ts-ink-900]'}`}
                  >
                    {f.id}
                  </button>
                ))}
              </div>
            </div>

            {/* Zone 2: Test String Zone */}
            <div className="flex flex-col border-b border-[--ts-border] bg-white flex-1 min-h-[160px]">
              <div className="flex items-center justify-between px-5 py-2 border-b border-[--ts-border] bg-[--ts-surface]">
                <span className="section-label">Test String</span>
                <div className="flex items-center gap-3">
                  {captureGroupsCount > 0 && <span className="text-xs text-[--ts-ink-500]">{captureGroupsCount} capture groups</span>}
                  <span className={`text-xs font-medium ${matches.length > 0 ? 'text-[--ts-gold]' : 'text-[--ts-ink-400]'}`}>
                    {matches.length === 1 ? '1 match' : matches.length > 0 ? `${matches.length} matches` : 'No matches'}
                  </span>
                </div>
              </div>
              <div 
                className="relative flex-1 p-5 font-mono text-[13px] leading-relaxed break-all whitespace-pre-wrap outline-none text-[--ts-ink-900]"
                ref={testZoneRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleTestStringInput}
                dangerouslySetInnerHTML={{ __html: highlightedHtml }}
              />
            </div>

            {/* Zone 3: Match Details Zone */}
            <div className="flex flex-col bg-[--ts-surface] max-h-[300px] overflow-y-auto">
              <div className="sticky top-0 px-5 py-2 border-b border-[--ts-border] bg-[--ts-surface] z-10">
                <span className="section-label">Match Details</span>
              </div>
              
              {!pattern ? (
                <div className="p-8 text-center text-[--ts-ink-500] text-sm">Enter a regex pattern to start testing.</div>
              ) : matches.length === 0 ? (
                <div className="p-8 text-center text-[--ts-ink-500] text-sm">No matches yet. Adjust your pattern or test string.</div>
              ) : (
                <div className="flex flex-col">
                  {matches.slice(0, 50).map((m, i) => (
                    <div 
                      key={i} 
                      className="px-5 py-3 border-b border-[--ts-border-soft] hover:bg-white transition-colors cursor-default"
                      onMouseEnter={() => {
                        const marks = testZoneRef.current?.querySelectorAll('mark')
                        if (marks && marks[i]) marks[i].classList.add('active')
                      }}
                      onMouseLeave={() => {
                        const marks = testZoneRef.current?.querySelectorAll('mark')
                        if (marks && marks[i]) marks[i].classList.remove('active')
                      }}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-[--ts-ink-700]">Match {i + 1}</span>
                        <span className="text-xs text-[--ts-ink-400] font-mono">Index: {m.start} → {m.end}</span>
                      </div>
                      <div className="font-mono text-[13px] text-[--ts-ink-900] bg-[--ts-card-bg] border border-[--ts-border-soft] rounded p-1.5 mb-2 break-all">
                        {m.value}
                      </div>
                      {m.groups.length > 0 && (
                        <div className="pl-2 border-l-2 border-[--ts-border]">
                          {m.groups.map((g, gi) => (
                            <div key={gi} className="text-xs flex mb-0.5">
                              <span className="text-[--ts-ink-500] w-16 shrink-0">Group {gi + 1}:</span>
                              <span className="font-mono text-[--ts-ink-800] break-all">{g ?? '<undefined>'}</span>
                            </div>
                          ))}
                          {Object.entries(m.namedGroups).map(([name, val]) => (
                            <div key={name} className="text-xs flex mb-0.5">
                              <span className="text-[--ts-ink-500] w-16 shrink-0">{name}:</span>
                              <span className="font-mono text-[--ts-ink-800] break-all">{val ?? '<undefined>'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {matches.length > 50 && (
                    <div className="p-4 text-center text-[--ts-ink-500] text-sm">... and {matches.length - 50} more matches</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Reference */}
        {activeTab === 'reference' && (
          <div className="p-6 bg-white min-h-[500px]">
            <h2 className="text-lg font-semibold text-[--ts-ink-900] mb-6">Regex Syntax Reference</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="flex flex-col gap-6">
                {/* Character Classes */}
                <div className="rounded-xl border border-[--ts-border] overflow-hidden">
                  <div className="bg-[--ts-surface] px-4 py-2 border-b border-[--ts-border]">
                    <h3 className="text-sm font-semibold text-[--ts-ink-900]">Character Classes</h3>
                  </div>
                  <table className="w-full text-left text-sm">
                    <tbody>
                      {[
                        { s: '.', d: 'Any char except newline', ex: 'a.c' },
                        { s: '\\d', d: 'Any digit (0-9)', ex: '\\d+' },
                        { s: '\\D', d: 'Any non-digit', ex: '\\D+' },
                        { s: '\\w', d: 'Word character', ex: '\\w+' },
                        { s: '\\W', d: 'Non-word character', ex: '\\W' },
                        { s: '\\s', d: 'Whitespace', ex: '\\s+' },
                        { s: '\\S', d: 'Non-whitespace', ex: '\\S+' },
                        { s: '[abc]', d: 'Any of a, b, c', ex: '[aeiou]' },
                        { s: '[^abc]', d: 'Not a, b, or c', ex: '[^0-9]' },
                        { s: '[a-z]', d: 'Character range', ex: '[a-zA-Z]' },
                      ].map((r, i) => (
                        <tr key={i} className="border-b border-[--ts-border-soft] last:border-0 hover:bg-[--ts-surface]">
                          <td className="px-3 py-2 w-16"><span className="ref-syntax">{r.s}</span></td>
                          <td className="px-3 py-2 text-xs text-[--ts-ink-700]">{r.d}</td>
                          <td className="px-3 py-2 w-16 text-right"><button onClick={() => trySyntax(r.ex)} className="btn text-[10px] py-1 px-2 bg-white">Try it</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Flags */}
                <div className="rounded-xl border border-[--ts-border] overflow-hidden">
                  <div className="bg-[--ts-surface] px-4 py-2 border-b border-[--ts-border]">
                    <h3 className="text-sm font-semibold text-[--ts-ink-900]">Flags</h3>
                  </div>
                  <table className="w-full text-left text-sm">
                    <tbody>
                      {[
                        { s: 'g', d: 'Global — find all matches' },
                        { s: 'i', d: 'Case insensitive' },
                        { s: 'm', d: 'Multiline (^ and $)' },
                        { s: 's', d: 'Dotall (. matches \\n)' },
                        { s: 'u', d: 'Unicode mode' },
                      ].map((r, i) => (
                        <tr key={i} className="border-b border-[--ts-border-soft] last:border-0">
                          <td className="px-3 py-2 w-16"><span className="ref-syntax">{r.s}</span></td>
                          <td className="px-3 py-2 text-xs text-[--ts-ink-700]">{r.d}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                {/* Quantifiers */}
                <div className="rounded-xl border border-[--ts-border] overflow-hidden">
                  <div className="bg-[--ts-surface] px-4 py-2 border-b border-[--ts-border]">
                    <h3 className="text-sm font-semibold text-[--ts-ink-900]">Quantifiers</h3>
                  </div>
                  <table className="w-full text-left text-sm">
                    <tbody>
                      {[
                        { s: '*', d: '0 or more', ex: 'a*' },
                        { s: '+', d: '1 or more', ex: 'a+' },
                        { s: '?', d: '0 or 1 (optional)', ex: 'a?' },
                        { s: '{n}', d: 'Exactly n times', ex: 'a{3}' },
                        { s: '{n,}', d: 'n or more times', ex: 'a{3,}' },
                        { s: '{n,m}', d: 'Between n and m times', ex: 'a{3,5}' },
                        { s: '*?', d: 'Lazy (non-greedy) 0 or more', ex: '<.+?>' },
                      ].map((r, i) => (
                        <tr key={i} className="border-b border-[--ts-border-soft] last:border-0 hover:bg-[--ts-surface]">
                          <td className="px-3 py-2 w-20"><span className="ref-syntax">{r.s}</span></td>
                          <td className="px-3 py-2 text-xs text-[--ts-ink-700]">{r.d}</td>
                          <td className="px-3 py-2 w-16 text-right"><button onClick={() => trySyntax(r.ex)} className="btn text-[10px] py-1 px-2 bg-white">Try it</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Anchors */}
                <div className="rounded-xl border border-[--ts-border] overflow-hidden">
                  <div className="bg-[--ts-surface] px-4 py-2 border-b border-[--ts-border]">
                    <h3 className="text-sm font-semibold text-[--ts-ink-900]">Anchors</h3>
                  </div>
                  <table className="w-full text-left text-sm">
                    <tbody>
                      {[
                        { s: '^', d: 'Start of string/line', ex: '^abc' },
                        { s: '$', d: 'End of string/line', ex: 'abc$' },
                        { s: '\\b', d: 'Word boundary', ex: '\\bword\\b' },
                        { s: '\\B', d: 'Non-word boundary', ex: '\\Bword' },
                      ].map((r, i) => (
                        <tr key={i} className="border-b border-[--ts-border-soft] last:border-0 hover:bg-[--ts-surface]">
                          <td className="px-3 py-2 w-16"><span className="ref-syntax">{r.s}</span></td>
                          <td className="px-3 py-2 text-xs text-[--ts-ink-700]">{r.d}</td>
                          <td className="px-3 py-2 w-16 text-right"><button onClick={() => trySyntax(r.ex)} className="btn text-[10px] py-1 px-2 bg-white">Try it</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                {/* Groups & Lookaround */}
                <div className="rounded-xl border border-[--ts-border] overflow-hidden">
                  <div className="bg-[--ts-surface] px-4 py-2 border-b border-[--ts-border]">
                    <h3 className="text-sm font-semibold text-[--ts-ink-900]">Groups & Lookaround</h3>
                  </div>
                  <table className="w-full text-left text-sm">
                    <tbody>
                      {[
                        { s: '(abc)', d: 'Capture group', ex: '(abc)+' },
                        { s: '(?:abc)', d: 'Non-capture group', ex: '(?:abc)+' },
                        { s: '(?<name>abc)', d: 'Named capture group', ex: '(?<id>\\d+)' },
                        { s: '(?=abc)', d: 'Positive lookahead', ex: 'foo(?=bar)' },
                        { s: '(?!abc)', d: 'Negative lookahead', ex: 'foo(?!bar)' },
                        { s: '(?<=abc)', d: 'Positive lookbehind', ex: '(?<=foo)bar' },
                        { s: '(?<!abc)', d: 'Negative lookbehind', ex: '(?<!foo)bar' },
                      ].map((r, i) => (
                        <tr key={i} className="border-b border-[--ts-border-soft] last:border-0 hover:bg-[--ts-surface]">
                          <td className="px-3 py-2 w-28"><span className="ref-syntax">{r.s}</span></td>
                          <td className="px-3 py-2 text-xs text-[--ts-ink-700]">{r.d}</td>
                          <td className="px-3 py-2 w-16 text-right"><button onClick={() => trySyntax(r.ex)} className="btn text-[10px] py-1 px-2 bg-white">Try it</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 3: Code Export */}
        {activeTab === 'export' && (
          <div className="p-6 bg-white min-h-[500px]">
            {!pattern ? (
               <div className="flex flex-col items-center justify-center py-20 text-center">
                 <span className="text-sm font-medium text-[--ts-ink-900]">No Pattern</span>
                 <span className="text-xs text-[--ts-ink-500] mt-1">Enter a regex pattern in the Tester tab first.</span>
               </div>
            ) : (
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                  {[
                    { id: 'js', label: 'JavaScript' },
                    { id: 'ts', label: 'TypeScript' },
                    { id: 'python', label: 'Python' },
                    { id: 'php', label: 'PHP' },
                    { id: 'go', label: 'Go' },
                    { id: 'rust', label: 'Rust' },
                  ].map(lang => (
                    <button
                      key={lang.id}
                      onClick={() => setExportLang(lang.id)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${exportLang === lang.id
                        ? 'bg-[--ts-ink-900] text-[--ts-bg]'
                        : 'text-[--ts-ink-500] hover:text-[--ts-ink-900] bg-[--ts-surface] border border-[--ts-border]'
                        }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
                
                <div className="relative">
                  <button 
                    onClick={() => navigator.clipboard.writeText(generateCode(exportLang, pattern, flags))}
                    className="absolute top-4 right-4 btn bg-[--ts-surface] border-transparent hover:border-[--ts-border] text-xs"
                  >
                    Copy Code
                  </button>
                  <pre className="code-block">{generateCode(exportLang, pattern, flags)}</pre>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      <WorkflowBar toolId="regex-tester" hasOutput={matches.length > 0} contentToPass={matches.map((m, i) => `Match ${i + 1}: "${m.value}" at index ${m.start}-${m.end}`).join('\n')} />
      <ExportBar toolId="regex-tester" content={matches.map((m, i) => `Match ${i + 1}: "${m.value}" at index ${m.start}-${m.end}`).join('\n')} hasOutput={matches.length > 0} />

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
