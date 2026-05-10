// Data types that tools can accept or produce
export type DataType =
  | 'json'
  | 'yaml'
  | 'csv'
  | 'markdown'
  | 'jwt'
  | 'text'
  | 'url'
  | 'html'
  | 'base64'
  | 'regex'
  | 'color'
  | 'binary'

// Export formats a tool can output
export type ExportFormat = 'pdf' | 'docx' | 'csv' | 'clipboard' | 'download' | 'html'

// Tool categories
export type ToolCategory =
  | 'developer'
  | 'text'
  | 'seo'
  | 'image'
  | 'math'
  | 'misc'

// Full tool interface
export interface Tool {
  id: string
  name: string
  description: string
  category: ToolCategory
  tags: string[]
  icon: string
  isNew?: boolean
  isPro?: boolean
  isFeatured?: boolean
  comingSoon?: boolean

  // --- NEW SYSTEM FIELDS ---
  // What content types this tool can accept as input
  accepts: DataType[]
  // What content types this tool produces as output
  produces: DataType[]
  // Tool IDs that are logical next steps after using this tool
  chainTo: string[]
  // Export formats this tool supports
  exportFormats: ExportFormat[]
  // Short usage tip shown in hover preview and workflow bar
  usageTip?: string
  // Fake-but-believable usage count for social proof
  usageCount?: string
}

// Full tool registry
export const TOOLS: Tool[] = [
  {
    id: 'json-formatter',
    name: 'JSON Formatter',
    description: 'Beautify, minify, and validate JSON with syntax highlighting.',
    category: 'developer',
    tags: ['json', 'format', 'beautify', 'minify', 'validate', 'parser'],
    icon: 'Braces',
    isNew: true,
    isFeatured: true,
    accepts: ['json', 'text'],
    produces: ['json'],
    chainTo: ['yaml-converter', 'jwt-decoder', 'diff-checker'],
    exportFormats: ['pdf', 'docx', 'clipboard', 'download'],
    usageTip: 'Paste any JSON and it auto-formats instantly.',
    usageCount: '3.2k uses today',
  },
  {
    id: 'base64',
    name: 'Base64 Encoder / Decoder',
    description: 'Encode and decode Base64 strings and files instantly.',
    category: 'developer',
    tags: ['base64', 'encode', 'decode', 'binary'],
    icon: 'Lock',
    isFeatured: true,
    accepts: ['text', 'binary', 'base64'],
    produces: ['base64', 'text'],
    chainTo: ['url-encoder', 'json-formatter'],
    exportFormats: ['clipboard', 'download'],
    usageTip: 'Works with strings, files, and image data URIs.',
    usageCount: '1.8k uses today',
  },
  {
    id: 'url-encoder',
    name: 'URL Encoder / Decoder',
    description: 'Encode or decode URL components and query strings.',
    category: 'developer',
    tags: ['url', 'encode', 'decode', 'percent', 'uri'],
    icon: 'Link',
    accepts: ['url', 'text'],
    produces: ['url', 'text'],
    chainTo: ['base64', 'json-formatter'],
    exportFormats: ['clipboard'],
    usageTip: 'Handles full URLs and individual query params.',
    usageCount: '980 uses today',
  },
  {
    id: 'regex-tester',
    name: 'Regex Tester',
    description: 'Test and debug regular expressions with live match highlighting.',
    category: 'developer',
    tags: ['regex', 'regexp', 'pattern', 'match', 'test'],
    icon: 'Regex',
    isFeatured: true,
    accepts: ['text', 'regex'],
    produces: ['text'],
    chainTo: ['diff-checker', 'json-formatter'],
    exportFormats: ['clipboard', 'download'],
    usageTip: 'Supports flags: g, i, m, s, u.',
    usageCount: '2.1k uses today',
  },
  {
    id: 'jwt-decoder',
    name: 'JWT Decoder',
    description: 'Decode and inspect JSON Web Tokens without a secret.',
    category: 'developer',
    tags: ['jwt', 'token', 'auth', 'decode', 'json'],
    icon: 'Shield',
    accepts: ['jwt', 'text'],
    produces: ['json'],
    chainTo: ['json-formatter', 'base64'],
    exportFormats: ['pdf', 'clipboard'],
    usageTip: 'Paste any JWT — header, payload, and expiry are decoded instantly.',
    usageCount: '1.4k uses today',
  },
  {
    id: 'diff-checker',
    name: 'Diff Checker',
    description: 'Compare two blocks of text and highlight the differences.',
    category: 'developer',
    tags: ['diff', 'compare', 'text', 'changes', 'patch'],
    icon: 'GitCompare',
    accepts: ['text', 'json', 'markdown'],
    produces: ['text'],
    chainTo: ['markdown-preview', 'json-formatter'],
    exportFormats: ['pdf', 'clipboard'],
    usageTip: 'Works with code, JSON, markdown, or any plain text.',
    usageCount: '760 uses today',
  },
  {
    id: 'yaml-converter',
    name: 'YAML ↔ JSON Converter',
    description: 'Convert between YAML and JSON formats instantly.',
    category: 'developer',
    tags: ['yaml', 'json', 'convert', 'config', 'devops'],
    icon: 'ArrowLeftRight',
    accepts: ['yaml', 'json'],
    produces: ['yaml', 'json'],
    chainTo: ['json-formatter', 'diff-checker'],
    exportFormats: ['clipboard', 'download'],
    usageTip: 'Bidirectional — paste either format and convert instantly.',
    usageCount: '1.1k uses today',
  },
  {
    id: 'markdown-preview',
    name: 'Markdown Editor & Preview',
    description: 'Write Markdown and preview the rendered output in real time.',
    category: 'text',
    tags: ['markdown', 'preview', 'render', 'md', 'html', 'editor'],
    icon: 'FileCode2',
    accepts: ['markdown', 'text'],
    produces: ['markdown', 'html'],
    chainTo: ['diff-checker'],
    exportFormats: ['pdf', 'html', 'docx', 'clipboard'],
    usageTip: 'Full GFM support — tables, code blocks, task lists.',
    usageCount: '890 uses today',
  },
  {
    id: 'color-converter',
    name: 'Color Converter',
    description: 'Convert between HEX, RGB, HSL, and CSS color formats.',
    category: 'developer',
    tags: ['color', 'hex', 'rgb', 'hsl', 'css', 'convert'],
    icon: 'Palette',
    accepts: ['color', 'text'],
    produces: ['color', 'text'],
    chainTo: [],
    exportFormats: ['css', 'clipboard'] as ExportFormat[],
    usageTip: 'Supports HEX, RGB, RGBA, HSL, HSLA, and named colors.',
    usageCount: '1.3k uses today',
  },
  {
    id: 'csv-viewer',
    name: 'CSV Viewer & Converter',
    description: 'Paste CSV data to view as a table, convert to JSON, or clean up.',
    category: 'developer',
    tags: ['csv', 'table', 'json', 'convert', 'data'],
    icon: 'Table',
    accepts: ['csv', 'text'],
    produces: ['csv', 'json'],
    chainTo: ['json-formatter', 'diff-checker'],
    exportFormats: ['csv', 'pdf', 'clipboard'],
    usageTip: 'Auto-detects delimiters — comma, semicolon, or tab.',
    usageCount: '640 uses today',
  },
  // --- Coming soon tools (minimal config for now) ---
  {
    id: 'hash-generator',
    name: 'Hash Generator',
    description: 'Generate MD5, SHA-1, SHA-256, and SHA-512 hashes.',
    category: 'developer',
    tags: ['hash', 'md5', 'sha', 'sha256', 'crypto', 'checksum'],
    icon: 'Hash',
    comingSoon: true,
    accepts: ['text'],
    produces: ['text'],
    chainTo: [],
    exportFormats: ['clipboard'],
  },
  {
    id: 'uuid-generator',
    name: 'UUID Generator',
    description: 'Generate v1, v4, and v5 UUIDs in bulk.',
    category: 'developer',
    tags: ['uuid', 'guid', 'generate', 'unique', 'id'],
    icon: 'Fingerprint',
    comingSoon: true,
    accepts: [],
    produces: ['text'],
    chainTo: [],
    exportFormats: ['clipboard', 'download'],
  },
  {
    id: 'timestamp',
    name: 'Unix Timestamp Converter',
    description: 'Convert Unix timestamps to human-readable dates and back.',
    category: 'developer',
    tags: ['unix', 'timestamp', 'epoch', 'date', 'time'],
    icon: 'Clock',
    comingSoon: true,
    accepts: ['text'],
    produces: ['text'],
    chainTo: [],
    exportFormats: ['clipboard'],
  },
  {
    id: 'word-counter',
    name: 'Word Counter',
    description: 'Count words, characters, sentences, paragraphs, and reading time.',
    category: 'text',
    tags: ['word', 'count', 'characters', 'reading time', 'text'],
    icon: 'AlignLeft',
    comingSoon: true,
    accepts: ['text', 'markdown'],
    produces: ['text'],
    chainTo: ['markdown-preview', 'diff-checker'],
    exportFormats: ['clipboard'],
  },
  {
    id: 'meta-tag-generator',
    name: 'Meta Tag Generator',
    description: 'Generate SEO meta tags, Open Graph, and Twitter Card tags.',
    category: 'seo',
    tags: ['meta', 'seo', 'og', 'twitter', 'tags', 'html'],
    icon: 'Tags',
    comingSoon: true,
    accepts: ['text'],
    produces: ['html'],
    chainTo: ['diff-checker'],
    exportFormats: ['clipboard', 'download'],
  },
  {
    id: 'qr-generator',
    name: 'QR Code Generator',
    description: 'Generate QR codes for URLs, text, WiFi, and more.',
    category: 'misc',
    tags: ['qr', 'code', 'generate', 'barcode', 'scan'],
    icon: 'QrCode',
    comingSoon: true,
    accepts: ['text', 'url'],
    produces: ['binary'],
    chainTo: [],
    exportFormats: ['download'],
  },
  {
    id: 'password-generator',
    name: 'Password Generator',
    description: 'Generate strong, secure passwords with custom rules.',
    category: 'misc',
    tags: ['password', 'generate', 'secure', 'random', 'strong'],
    icon: 'KeyRound',
    comingSoon: true,
    accepts: [],
    produces: ['text'],
    chainTo: ['base64', 'hash-generator'],
    exportFormats: ['clipboard'],
  },
]

// --- Helper functions ---

export function getToolsByCategory(category: ToolCategory): Tool[] {
  return TOOLS.filter(t => t.category === category)
}

export function getToolById(id: string): Tool | undefined {
  return TOOLS.find(t => t.id === id)
}

export function searchTools(query: string): Tool[] {
  const q = query.toLowerCase().trim()
  if (!q) return []
  return TOOLS.filter(t =>
    t.name.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    t.tags.some(tag => tag.includes(q))
  )
}

export function getChainedTools(toolId: string): Tool[] {
  const tool = getToolById(toolId)
  if (!tool) return []
  return tool.chainTo
    .map(id => getToolById(id))
    .filter((t): t is Tool => !!t && !t.comingSoon)
}

export function getFeaturedTools(): Tool[] {
  return TOOLS.filter(t => t.isFeatured && !t.comingSoon)
}

export function getToolsByDataType(type: DataType): Tool[] {
  return TOOLS.filter(t => t.accepts.includes(type) && !t.comingSoon)
}

export const CATEGORIES: { id: ToolCategory; label: string; icon: string }[] = [
  { id: 'developer', label: 'Developer Tools', icon: 'Code2' },
  { id: 'text',      label: 'Text & Writing',  icon: 'AlignLeft' },
  { id: 'seo',       label: 'SEO & Marketing', icon: 'TrendingUp' },
  { id: 'image',     label: 'Image & Color',   icon: 'Image' },
  { id: 'math',      label: 'Math & Calc',     icon: 'Calculator' },
  { id: 'misc',      label: 'Misc & Fun',      icon: 'Sparkles' },
]
