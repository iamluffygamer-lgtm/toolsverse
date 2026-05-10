import type { DataType } from './tools'

export interface DetectionResult {
  type: DataType
  confidence: 'high' | 'medium' | 'low'
  toolId: string        // the best tool to handle this content
  label: string         // human-readable label e.g. "JSON detected"
  preview: string       // first 60 chars of content for the toast
}

// Pattern matchers — ordered by specificity
const detectors: Array<{
  type: DataType
  toolId: string
  label: string
  test: (text: string) => boolean
}> = [
  {
    type: 'jwt',
    toolId: 'jwt-decoder',
    label: 'JWT Token detected',
    test: (t) => /^eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(t.trim()),
  },
  {
    type: 'json',
    toolId: 'json-formatter',
    label: 'JSON detected',
    test: (t) => {
      const s = t.trim()
      if (!((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']')))) return false
      try { JSON.parse(s); return true } catch { return false }
    },
  },
  {
    type: 'yaml',
    toolId: 'yaml-converter',
    label: 'YAML detected',
    test: (t) => {
      const lines = t.trim().split('\n')
      return lines.length > 1 && lines.some(l => /^[\w-]+:\s+.+/.test(l))
    },
  },
  {
    type: 'csv',
    toolId: 'csv-viewer',
    label: 'CSV data detected',
    test: (t) => {
      const lines = t.trim().split('\n')
      if (lines.length < 2) return false
      const cols = lines[0].split(',').length
      return cols > 1 && lines.slice(1, 4).every(l => l.split(',').length === cols)
    },
  },
  {
    type: 'markdown',
    toolId: 'markdown-preview',
    label: 'Markdown detected',
    test: (t) =>
      /^#{1,6}\s/.test(t) ||
      /\*\*[^*]+\*\*/.test(t) ||
      /^[-*]\s/m.test(t) ||
      /\[.+\]\(.+\)/.test(t),
  },
  {
    type: 'base64',
    toolId: 'base64',
    label: 'Base64 string detected',
    test: (t) => {
      const s = t.trim().replace(/\s/g, '')
      return s.length > 16 && /^[A-Za-z0-9+/]+=*$/.test(s) && s.length % 4 === 0
    },
  },
  {
    type: 'url',
    toolId: 'url-encoder',
    label: 'URL detected',
    test: (t) => /^https?:\/\/[^\s]+/.test(t.trim()),
  },
  {
    type: 'color',
    toolId: 'color-converter',
    label: 'Color value detected',
    test: (t) => {
      const s = t.trim()
      return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s) ||
             /^rgb\(\d+,\s*\d+,\s*\d+\)$/.test(s) ||
             /^hsl\(\d+,\s*\d+%,\s*\d+%\)$/.test(s)
    },
  },
]

export function detectContentType(text: string): DetectionResult | null {
  if (!text || text.trim().length < 4) return null

  for (const detector of detectors) {
    if (detector.test(text)) {
      return {
        type: detector.type,
        toolId: detector.toolId,
        label: detector.label,
        confidence: 'high',
        preview: text.trim().slice(0, 60) + (text.length > 60 ? '...' : ''),
      }
    }
  }
  return null
}
