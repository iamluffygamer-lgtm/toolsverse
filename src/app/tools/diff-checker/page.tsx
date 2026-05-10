'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import PageTransition from '@/components/PageTransition'
import ToolHeader from '@/components/ToolHeader'
import WorkflowBar from '@/components/WorkflowBar'
import ExportBar from '@/components/ExportBar'
import { getToolById } from '@/lib/tools'
import { consumeIncomingContent, addRecentTool } from '@/lib/session'

// ── Types ──────────────────────────────────────────────────────────────────────
type Tab = 'text' | 'json' | 'options'
type DiffType = 'equal' | 'insert' | 'delete'

interface DiffLine {
  type: DiffType
  value: string
  lineOld?: number
  lineNew?: number
}

interface CharDiff {
  value: string
  type: DiffType
}

type JsonDiffType = 'added' | 'removed' | 'changed' | 'unchanged'
interface JsonDiffNode {
  key: string
  path: string
  type: JsonDiffType
  oldValue: unknown
  newValue: unknown
  children?: JsonDiffNode[]
}

interface DiffOptions {
  ignoreWhitespace: boolean
  ignoreCase: boolean
  contextLines: number
  showLineNumbers: boolean
  wrapLongLines: boolean
}

// ── LCS Diff Logic ─────────────────────────────────────────────────────────────
function diffLines(oldText: string, newText: string, options: DiffOptions): DiffLine[] {
  if (!oldText && !newText) return []
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  
  function process(line: string) {
    let res = line
    if (options.ignoreWhitespace) res = res.trim()
    if (options.ignoreCase) res = res.toLowerCase()
    return res
  }
  
  const oldProcessed = oldLines.map(process)
  const newProcessed = newLines.map(process)
  
  const n = oldProcessed.length
  const m = newProcessed.length
  
  if (n * m > 16000000) {
    const res: DiffLine[] = []
    oldLines.forEach((l, i) => res.push({ type: 'delete', value: l, lineOld: i + 1 }))
    newLines.forEach((l, i) => res.push({ type: 'insert', value: l, lineNew: i + 1 }))
    return res
  }
  
  const dp: Int32Array[] = Array(n + 1)
  for (let i = 0; i <= n; i++) dp[i] = new Int32Array(m + 1)
  
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (oldProcessed[i - 1] === newProcessed[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }
  
  let i = n, j = m
  const result: DiffLine[] = []
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldProcessed[i - 1] === newProcessed[j - 1]) {
      result.unshift({ type: 'equal', value: newLines[j - 1], lineOld: i, lineNew: j })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'insert', value: newLines[j - 1], lineNew: j })
      j--
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      result.unshift({ type: 'delete', value: oldLines[i - 1], lineOld: i })
      i--
    }
  }
  
  return result
}

function diffChars(oldLine: string, newLine: string): CharDiff[] {
  const n = oldLine.length
  const m = newLine.length
  
  if (n === 0 && m === 0) return []
  if (n === 0) return [{ type: 'insert', value: newLine }]
  if (m === 0) return [{ type: 'delete', value: oldLine }]
  
  if (n * m > 1000000) return [{ type: 'delete', value: oldLine }, { type: 'insert', value: newLine }]
  
  const dp: Int32Array[] = Array(n + 1)
  for (let i = 0; i <= n; i++) dp[i] = new Int32Array(m + 1)
  
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (oldLine[i - 1] === newLine[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  
  let i = n, j = m
  const result: CharDiff[] = []
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLine[i - 1] === newLine[j - 1]) {
      result.unshift({ type: 'equal', value: oldLine[i - 1] })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'insert', value: newLine[j - 1] })
      j--
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      result.unshift({ type: 'delete', value: oldLine[i - 1] })
      i--
    }
  }
  
  const collapsed: CharDiff[] = []
  for (const item of result) {
    const last = collapsed[collapsed.length - 1]
    if (last && last.type === item.type) last.value += item.value
    else collapsed.push(item)
  }
  
  return collapsed
}

// ── JSON Diff Logic ────────────────────────────────────────────────────────────
function diffJson(oldObj: unknown, newObj: unknown, currentPath = ''): JsonDiffNode[] {
  const result: JsonDiffNode[] = []
  
  if (Array.isArray(oldObj) && Array.isArray(newObj)) {
    const maxLen = Math.max(oldObj.length, newObj.length)
    for (let i = 0; i < maxLen; i++) {
      const p = currentPath ? `${currentPath}[${i}]` : `[${i}]`
      const key = `[${i}]`
      
      if (i >= oldObj.length) {
        result.push({ key, path: p, type: 'added', oldValue: undefined, newValue: newObj[i] })
      } else if (i >= newObj.length) {
        result.push({ key, path: p, type: 'removed', oldValue: oldObj[i], newValue: undefined })
      } else {
        const oldV = oldObj[i]
        const newV = newObj[i]
        if (typeof oldV === 'object' && oldV !== null && typeof newV === 'object' && newV !== null) {
          const children = diffJson(oldV, newV, p)
          const isChanged = children.some(c => c.type !== 'unchanged')
          result.push({ key, path: p, type: isChanged ? 'changed' : 'unchanged', oldValue: oldV, newValue: newV, children })
        } else {
          if (oldV === newV) result.push({ key, path: p, type: 'unchanged', oldValue: oldV, newValue: newV })
          else result.push({ key, path: p, type: 'changed', oldValue: oldV, newValue: newV })
        }
      }
    }
    return result
  }
  
  if (typeof oldObj === 'object' && oldObj !== null && typeof newObj === 'object' && newObj !== null && !Array.isArray(oldObj) && !Array.isArray(newObj)) {
    const oldKeys = Object.keys(oldObj as Record<string, unknown>)
    const newKeys = Object.keys(newObj as Record<string, unknown>)
    const allKeys = Array.from(new Set([...oldKeys, ...newKeys]))
    
    for (const key of allKeys) {
      const p = currentPath ? `${currentPath}.${key}` : key
      const hasOld = oldKeys.includes(key)
      const hasNew = newKeys.includes(key)
      const oldV = (oldObj as Record<string, unknown>)[key]
      const newV = (newObj as Record<string, unknown>)[key]
      
      if (!hasOld) {
        result.push({ key, path: p, type: 'added', oldValue: undefined, newValue: newV })
      } else if (!hasNew) {
        result.push({ key, path: p, type: 'removed', oldValue: oldV, newValue: undefined })
      } else {
        if (typeof oldV === 'object' && oldV !== null && typeof newV === 'object' && newV !== null) {
          const children = diffJson(oldV, newV, p)
          const isChanged = children.some(c => c.type !== 'unchanged')
          result.push({ key, path: p, type: isChanged ? 'changed' : 'unchanged', oldValue: oldV, newValue: newV, children })
        } else {
          if (oldV === newV) result.push({ key, path: p, type: 'unchanged', oldValue: oldV, newValue: newV })
          else result.push({ key, path: p, type: 'changed', oldValue: oldV, newValue: newV })
        }
      }
    }
    return result
  }
  
  return []
}

function parseJsonSafe(val: string) {
  if (!val.trim()) return { val: undefined, err: null }
  try { return { val: JSON.parse(val), err: null } }
  catch (e) { return { val: undefined, err: (e as Error).message } }
}

const SAMPLE_ORIGINAL = `function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  return total;
}

const TAX_RATE = 0.08;
const discount = 0.10;`

const SAMPLE_MODIFIED = `function calculateTotal(items, taxRate = 0.08) {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  const tax = total * taxRate;
  return total + tax;
}

const TAX_RATE = 0.08;
const DISCOUNT_RATE = 0.15;`

const JSON_SAMPLE_ORIGINAL = JSON.stringify({
  name: "ToolStack",
  version: "1.0.0",
  tools: 28,
  features: ["format", "export"],
  meta: { free: true, premium: false }
}, null, 2)

const JSON_SAMPLE_MODIFIED = JSON.stringify({
  name: "ToolStack Pro",
  version: "1.1.0",
  tools: 35,
  features: ["format", "export", "dark mode", "cmd+k"],
  meta: { free: true, premium: true, launched: "2026" }
}, null, 2)

const FAQS = [
  { q: 'What is a diff checker?', a: 'A diff checker compares two pieces of text and highlights the differences between them. It shows which lines were added, removed, or changed — making it easy to review edits, spot bugs, or track document changes.' },
  { q: 'What is the difference between unified and side-by-side diff?', a: 'Side-by-side view shows the original and modified text in two columns, making it easy to visually compare them. Unified view interleaves additions (+) and deletions (-) in a single column, which is more compact and familiar to developers from tools like Git.' },
  { q: 'Can I compare JSON with this tool?', a: 'Yes. The JSON Diff tab performs structural comparison — it understands JSON objects and arrays, so it shows changes at the key and value level rather than just comparing raw text lines. This makes it much easier to spot what actually changed in a config or API response.' },
  { q: 'What does "ignore whitespace" do?', a: 'When enabled, the diff treats lines that differ only in leading or trailing spaces as equal. This is useful when comparing code that has been reformatted or indented differently.' },
  { q: 'Is my text data sent to a server?', a: 'No. All diffing is performed entirely in your browser using JavaScript. Your text never leaves your device — making this tool safe for comparing sensitive code, configuration files, or private documents.' },
  { q: 'What is a unified diff format?', a: 'Unified diff is a standard format used by Git and patch tools to represent changes. Lines starting with + were added, lines starting with - were removed, and lines with a space are context (unchanged). The Export button downloads your diff in this format.' },
]

// ── Components ─────────────────────────────────────────────────────────────────
export default function DiffCheckerPage() {
  const tool = getToolById('diff-checker')!
  const [activeTab, setActiveTab] = useState<Tab>('text')

  const [original, setOriginal] = useState('')
  const [modified, setModified] = useState('')
  const [viewMode, setViewMode] = useState<'sidebyside' | 'unified'>('sidebyside')

  const [jsonOriginal, setJsonOriginal] = useState('')
  const [jsonModified, setJsonModified] = useState('')

  const [options, setOptions] = useState<DiffOptions>({
    ignoreWhitespace: false,
    ignoreCase: false,
    contextLines: 3,
    showLineNumbers: true,
    wrapLongLines: false,
  })

  // Synchronized scrolling for textareas
  const leftRef = useRef<HTMLTextAreaElement>(null)
  const rightRef = useRef<HTMLTextAreaElement>(null)
  
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>, targetRef: React.RefObject<HTMLTextAreaElement|null>) => {
    if (targetRef.current) {
      targetRef.current.scrollTop = e.currentTarget.scrollTop
      targetRef.current.scrollLeft = e.currentTarget.scrollLeft
    }
  }

  useEffect(() => {
    addRecentTool('diff-checker')
    const incoming = consumeIncomingContent()
    if (incoming) {
      try {
        JSON.parse(incoming)
        setJsonOriginal(incoming)
        setActiveTab('json')
      } catch {
        setOriginal(incoming)
      }
    }
  }, [])

  // Text Diff Computed
  const diffResult = useMemo(() => {
    if (!original && !modified) return []
    return diffLines(original, modified, options)
  }, [original, modified, options])

  const { sideBySideRows, unifiedRows, added, removed, unchanged } = useMemo(() => {
    let added = 0, removed = 0, unchanged = 0
    diffResult.forEach(l => {
      if (l.type === 'insert') added++
      if (l.type === 'delete') removed++
      if (l.type === 'equal') unchanged++
    })

    const rows: Array<{ left: DiffLine | null, right: DiffLine | null, leftChars?: CharDiff[], rightChars?: CharDiff[] }> = []
    const uniRows: Array<{ line: DiffLine, chars?: CharDiff[] }> = []
    
    let i = 0
    while (i < diffResult.length) {
      const line = diffResult[i]
      if (line.type === 'equal') {
        rows.push({ left: line, right: line })
        uniRows.push({ line })
        i++
      } else if (line.type === 'delete') {
        if (i + 1 < diffResult.length && diffResult[i + 1].type === 'insert') {
          const nextLine = diffResult[i + 1]
          const chars = diffChars(line.value, nextLine.value)
          const equals = chars.filter(c => c.type === 'equal').reduce((acc, c) => acc + c.value.length, 0)
          const maxLen = Math.max(line.value.length, nextLine.value.length)
          const similar = (maxLen === 0) || (equals / maxLen > 0.5)
          
          const leftChars = similar ? chars.filter(c => c.type !== 'insert') : undefined
          const rightChars = similar ? chars.filter(c => c.type !== 'delete') : undefined

          rows.push({ left: line, right: nextLine, leftChars, rightChars })
          uniRows.push({ line, chars: leftChars })
          uniRows.push({ line: nextLine, chars: rightChars })
          i += 2
        } else {
          rows.push({ left: line, right: null })
          uniRows.push({ line })
          i++
        }
      } else if (line.type === 'insert') {
        rows.push({ left: null, right: line })
        uniRows.push({ line })
        i++
      }
    }
    
    // Apply context line filtering
    function applyContext<T extends { left?: DiffLine|null, right?: DiffLine|null, line?: DiffLine }>(arr: T[]): Array<{ item?: T, isSeparator?: boolean, visible?: boolean }> {
      if (options.contextLines >= 100) return arr.map(item => ({ item, visible: true, isSeparator: false }))
      
      const visible = new Array(arr.length).fill(false)
      for (let k = 0; k < arr.length; k++) {
        const item = arr[k]
        const isChange = (item.left && item.left.type !== 'equal') || (item.right && item.right.type !== 'equal') || (item.line && item.line.type !== 'equal')
        if (isChange) {
          for (let j = Math.max(0, k - options.contextLines); j <= Math.min(arr.length - 1, k + options.contextLines); j++) {
            visible[j] = true
          }
        }
      }
      
      const res: Array<{ item?: T, isSeparator?: boolean, visible?: boolean }> = []
      let lastVisible = false
      for (let k = 0; k < arr.length; k++) {
        if (visible[k]) {
          res.push({ item: arr[k], visible: true })
          lastVisible = true
        } else {
          if (lastVisible) {
            res.push({ isSeparator: true })
            lastVisible = false
          }
        }
      }
      return res
    }

    return { 
      sideBySideRows: applyContext(rows), 
      unifiedRows: applyContext(uniRows), 
      added, removed, unchanged 
    }
  }, [diffResult, options.contextLines])

  // JSON Diff Computed
  const { jsonDiffTree, jErrLeft, jErrRight } = useMemo(() => {
    if (!jsonOriginal && !jsonModified) return { jsonDiffTree: [], jErrLeft: null, jErrRight: null }
    const left = parseJsonSafe(jsonOriginal)
    const right = parseJsonSafe(jsonModified)
    
    let diffs: JsonDiffNode[] = []
    if (!left.err && !right.err && left.val !== undefined && right.val !== undefined) {
      diffs = diffJson(left.val, right.val)
    }
    return { jsonDiffTree: diffs, jErrLeft: left.err, jErrRight: right.err }
  }, [jsonOriginal, jsonModified])

  // UI Handlers
  const handleSwap = () => {
    if (activeTab === 'text') {
      const temp = original
      setOriginal(modified)
      setModified(temp)
    } else if (activeTab === 'json') {
      const temp = jsonOriginal
      setJsonOriginal(jsonModified)
      setJsonModified(temp)
    }
  }

  const handleClear = () => {
    if (activeTab === 'text') {
      setOriginal(''); setModified('')
    } else if (activeTab === 'json') {
      setJsonOriginal(''); setJsonModified('')
    }
  }

  const loadSample = () => {
    if (activeTab === 'text') {
      setOriginal(SAMPLE_ORIGINAL)
      setModified(SAMPLE_MODIFIED)
    } else if (activeTab === 'json') {
      setJsonOriginal(JSON_SAMPLE_ORIGINAL)
      setJsonModified(JSON_SAMPLE_MODIFIED)
    }
  }

  const renderCharDiff = (chars: CharDiff[], baseType: 'insert' | 'delete') => {
    return chars.map((c, idx) => (
      <span key={idx} className={c.type === baseType ? `diff-char-${baseType}` : ''}>
        {c.value}
      </span>
    ))
  }

  const renderJsonNode = (node: JsonDiffNode, depth: number) => {
    const isAdded = node.type === 'added'
    const isRemoved = node.type === 'removed'
    const isChanged = node.type === 'changed'
    const isUnchanged = node.type === 'unchanged'

    const colorClass = isAdded ? 'json-diff-added' : isRemoved ? 'json-diff-removed' : isChanged ? 'json-diff-changed' : 'json-diff-equal'
    const icon = isAdded ? '✚' : isRemoved ? '✖' : isChanged ? '→' : '━'

    return (
      <div key={node.path} className="font-mono text-[13px] leading-relaxed">
        <div className={`flex items-start ${colorClass}`} style={{ paddingLeft: `${depth * 16}px` }}>
          <span className="w-5 shrink-0 opacity-70 text-[10px] pt-1">{icon}</span>
          <span className="font-semibold mr-2 shrink-0">{node.key}:</span>
          <div className="break-all flex-1">
            {isChanged && typeof node.oldValue !== 'object' && (
              <span className="opacity-50 line-through mr-2">{String(node.oldValue)}</span>
            )}
            {!isRemoved && typeof node.newValue !== 'object' && <span>{String(node.newValue)}</span>}
            {isRemoved && typeof node.oldValue !== 'object' && <span>{String(node.oldValue)}</span>}
            
            {node.children && (
              <span className="opacity-60 text-xs italic ml-2">
                ( {node.children.filter(c => c.type !== 'unchanged').length} changes )
              </span>
            )}
          </div>
        </div>
        {node.children && node.type !== 'unchanged' && (
          <div>{node.children.map(c => renderJsonNode(c, depth + 1))}</div>
        )}
      </div>
    )
  }

  return (
    <PageTransition>
      <ToolHeader tool={tool} outputReady={diffResult.length > 0 || jsonDiffTree.length > 0} />

      <div className="card p-0 overflow-hidden mb-6">
        {/* Tab Bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[--ts-surface] border-b border-[--ts-border] overflow-x-auto">
          {[
            { id: 'text', label: 'Text Diff' },
            { id: 'json', label: 'JSON Diff' },
            { id: 'options', label: 'Options' },
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

        {/* Tab 1 & Tab 2 Input Panes */}
        {activeTab !== 'options' && (
          <div className="flex flex-col border-b border-[--ts-border]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[--ts-border]">
              {/* Original Pane */}
              <div className="bg-white flex flex-col min-h-[200px] max-h-[400px]">
                <div className="px-4 py-2 border-b border-[--ts-border-soft] flex justify-between items-center bg-[--ts-surface]">
                  <span className="text-xs font-semibold uppercase tracking-widest text-[--ts-ink-400]">Original</span>
                  <span className="text-xs text-[--ts-ink-400]">
                    {activeTab === 'text' ? `${original.split('\n').length} lines` : ''}
                  </span>
                </div>
                <textarea
                  ref={leftRef}
                  value={activeTab === 'text' ? original : jsonOriginal}
                  onChange={e => activeTab === 'text' ? setOriginal(e.target.value) : setJsonOriginal(e.target.value)}
                  onScroll={e => handleScroll(e, rightRef)}
                  placeholder={activeTab === 'text' ? "Paste original text here..." : "Paste original JSON here..."}
                  className="flex-1 w-full p-4 resize-none outline-none font-mono text-sm leading-relaxed text-[--ts-ink-900] whitespace-pre"
                  spellCheck={false}
                />
                {activeTab === 'json' && jErrLeft && <div className="px-4 py-1.5 bg-[--ts-error-bg] text-[--ts-error] text-xs font-medium border-t border-[--ts-border]">{jErrLeft}</div>}
              </div>

              {/* Modified Pane */}
              <div className="bg-white flex flex-col min-h-[200px] max-h-[400px]">
                <div className="px-4 py-2 border-b border-[--ts-border-soft] flex justify-between items-center bg-[--ts-surface]">
                  <span className="text-xs font-semibold uppercase tracking-widest text-[--ts-ink-400]">Modified</span>
                  <span className="text-xs text-[--ts-ink-400]">
                    {activeTab === 'text' ? `${modified.split('\n').length} lines` : ''}
                  </span>
                </div>
                <textarea
                  ref={rightRef}
                  value={activeTab === 'text' ? modified : jsonModified}
                  onChange={e => activeTab === 'text' ? setModified(e.target.value) : setJsonModified(e.target.value)}
                  onScroll={e => handleScroll(e, leftRef)}
                  placeholder={activeTab === 'text' ? "Paste modified text here..." : "Paste modified JSON here..."}
                  className="flex-1 w-full p-4 resize-none outline-none font-mono text-sm leading-relaxed text-[--ts-ink-900] whitespace-pre"
                  spellCheck={false}
                />
                {activeTab === 'json' && jErrRight && <div className="px-4 py-1.5 bg-[--ts-error-bg] text-[--ts-error] text-xs font-medium border-t border-[--ts-border]">{jErrRight}</div>}
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[--ts-surface] flex-wrap gap-2">
              <div className="flex items-center gap-1 bg-white border border-[--ts-border] rounded-md p-1">
                <button
                  onClick={() => setViewMode('sidebyside')}
                  className={`px-3 py-1 text-xs font-medium rounded ${viewMode === 'sidebyside' ? 'bg-[--ts-ink-900] text-[--ts-bg]' : 'text-[--ts-ink-500] hover:text-[--ts-ink-900]'}`}
                >
                  Side by Side
                </button>
                <button
                  onClick={() => setViewMode('unified')}
                  className={`px-3 py-1 text-xs font-medium rounded ${viewMode === 'unified' ? 'bg-[--ts-ink-900] text-[--ts-bg]' : 'text-[--ts-ink-500] hover:text-[--ts-ink-900]'}`}
                >
                  Unified
                </button>
              </div>
              
              <div className="flex items-center gap-2">
                <button onClick={loadSample} className="btn text-xs px-2 py-1">Sample</button>
                <button onClick={handleSwap} className="btn text-xs px-2 py-1">Swap</button>
                <button onClick={handleClear} className="btn text-xs px-2 py-1 text-[--ts-error] hover:bg-[--ts-error-bg] border-transparent">Clear</button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: Text Diff Output */}
        {activeTab === 'text' && (
          <div className="flex flex-col bg-white min-h-[300px]">
            {/* Summary Bar */}
            {(original || modified) && (
              <div className="px-4 py-2 border-b border-[--ts-border] bg-[--ts-surface] flex items-center justify-center animate-slide-up">
                {added === 0 && removed === 0 ? (
                  <span className="text-sm font-semibold text-[--ts-gold]">Identical — no differences found</span>
                ) : (
                  <div className="flex gap-4 text-sm font-medium">
                    <span className="text-[--ts-success]">✚ {added} added</span>
                    <span className="text-[--ts-error]">✖ {removed} removed</span>
                    <span className="text-[--ts-ink-400]">━ {unchanged} unchanged</span>
                    <span className="text-[--ts-ink-900] ml-2">{diffResult.length} total</span>
                  </div>
                )}
              </div>
            )}

            {/* Output */}
            <div className={`flex-1 p-4 overflow-x-auto ${options.wrapLongLines ? 'whitespace-pre-wrap' : 'whitespace-pre'}`}>
              {viewMode === 'sidebyside' ? (
                <div className="min-w-[600px] w-full text-sm font-mono leading-relaxed grid grid-cols-2 gap-px bg-[--ts-border]">
                  {sideBySideRows.map((row, i) => {
                    if (row.isSeparator) return <div key={i} className="col-span-2 text-center py-2 text-xs text-[--ts-ink-400] bg-[--ts-surface]">--- collapsed ---</div>
                    const { left, right, leftChars, rightChars } = row.item!
                    return (
                      <div key={i} className="contents">
                        {/* Left */}
                        <div className={`flex bg-white ${left?.type === 'delete' ? 'diff-removed' : ''}`}>
                          {options.showLineNumbers && <div className="diff-line-num pt-0.5">{left?.lineOld || ''}</div>}
                          <div className="flex-1 pr-4 min-h-[1.5rem]">
                            {leftChars ? renderCharDiff(leftChars, 'delete') : left?.value}
                          </div>
                        </div>
                        {/* Right */}
                        <div className={`flex bg-white ${right?.type === 'insert' ? 'diff-added' : ''}`}>
                          {options.showLineNumbers && <div className="diff-line-num pt-0.5">{right?.lineNew || ''}</div>}
                          <div className="flex-1 pr-4 min-h-[1.5rem]">
                            {rightChars ? renderCharDiff(rightChars, 'insert') : right?.value}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="min-w-full text-sm font-mono leading-relaxed flex flex-col">
                  {unifiedRows.map((row, i) => {
                    if (row.isSeparator) return <div key={i} className="text-center py-2 text-xs text-[--ts-ink-400] bg-[--ts-surface]">--- collapsed ---</div>
                    const { line, chars } = row.item!
                    const isAdd = line.type === 'insert'
                    const isDel = line.type === 'delete'
                    const cls = isAdd ? 'diff-added' : isDel ? 'diff-removed' : ''
                    const icon = isAdd ? '+' : isDel ? '-' : ' '
                    return (
                      <div key={i} className={`flex ${cls}`}>
                        {options.showLineNumbers && (
                          <div className="diff-line-num w-12 pt-0.5 text-right opacity-50 select-none">
                            {isDel ? line.lineOld : isAdd ? line.lineNew : line.lineOld}
                          </div>
                        )}
                        <div className={`px-2 select-none font-bold ${isAdd ? 'text-[--ts-success]' : isDel ? 'text-[--ts-error]' : 'opacity-0'}`}>
                          {icon}
                        </div>
                        <div className="flex-1">
                          {chars ? renderCharDiff(chars, isAdd ? 'insert' : 'delete') : line.value}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: JSON Diff Output */}
        {activeTab === 'json' && (
          <div className="flex flex-col bg-white min-h-[300px]">
             {jsonDiffTree.length === 0 ? (
                <div className="p-8 text-center text-[--ts-ink-500] text-sm">Valid JSON required in both panes to see structural diff.</div>
             ) : (
               <div className="p-6 overflow-x-auto">
                 {jsonDiffTree.every(n => n.type === 'unchanged') ? (
                    <div className="text-sm font-semibold text-[--ts-gold] mb-4">Identical JSON objects — no structural differences found.</div>
                 ) : null}
                 {jsonDiffTree.map(node => renderJsonNode(node, 0))}
               </div>
             )}
          </div>
        )}

        {/* Tab 3: Options */}
        {activeTab === 'options' && (
          <div className="p-6 bg-white min-h-[500px]">
            <div className="max-w-2xl mx-auto flex flex-col gap-4">
              {[
                { key: 'ignoreWhitespace', label: 'Ignore whitespace', desc: 'Treats leading/trailing spaces as equal' },
                { key: 'ignoreCase', label: 'Ignore case', desc: 'Case-insensitive comparison' },
                { key: 'showLineNumbers', label: 'Show line numbers', desc: 'Display line numbers in gutter' },
                { key: 'wrapLongLines', label: 'Wrap long lines', desc: 'Wrap text instead of horizontal scroll' },
              ].map(opt => (
                <div key={opt.key} className="flex items-center justify-between p-4 rounded-xl border border-[--ts-border] bg-[--ts-surface]">
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm text-[--ts-ink-900]">{opt.label}</span>
                    <span className="text-xs text-[--ts-ink-500] mt-0.5">{opt.desc}</span>
                  </div>
                  <button
                    onClick={() => setOptions(o => ({ ...o, [opt.key]: !o[opt.key as keyof DiffOptions] }))}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 focus:outline-none ${options[opt.key as keyof DiffOptions] ? 'bg-[--ts-ink-900]' : 'bg-[--ts-border]'}`}
                  >
                    <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${options[opt.key as keyof DiffOptions] ? 'translate-x-1.5' : '-translate-x-1.5'}`} />
                  </button>
                </div>
              ))}
              
              <div className="flex items-center justify-between p-4 rounded-xl border border-[--ts-border] bg-[--ts-surface]">
                <div className="flex flex-col">
                  <span className="font-semibold text-sm text-[--ts-ink-900]">Context lines</span>
                  <span className="text-xs text-[--ts-ink-500] mt-0.5">Lines of context shown around each change</span>
                </div>
                <div className="flex items-center gap-3 bg-white border border-[--ts-border] rounded-md px-2 py-1">
                  <button onClick={() => setOptions(o => ({...o, contextLines: Math.max(0, o.contextLines - 1)}))} className="text-[--ts-ink-500] hover:text-[--ts-ink-900] px-1 font-mono">−</button>
                  <span className="text-sm font-medium w-6 text-center">{options.contextLines >= 100 ? 'All' : options.contextLines}</span>
                  <button onClick={() => setOptions(o => ({...o, contextLines: o.contextLines >= 100 ? 100 : o.contextLines + 1}))} className="text-[--ts-ink-500] hover:text-[--ts-ink-900] px-1 font-mono">+</button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {activeTab === 'text' && (
        <WorkflowBar toolId="diff-checker" hasOutput={diffResult.length > 0} />
      )}
      {activeTab === 'text' && (
        <ExportBar 
          toolId="diff-checker" 
          content={diffResult.map(line => {
            if (line.type === 'insert') return `+ ${line.value}`
            if (line.type === 'delete') return `- ${line.value}`
            return `  ${line.value}`
          }).join('\n')}
          hasOutput={diffResult.length > 0} 
        />
      )}

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
