// ── ToolStack Master Tool Registry ───────────────────────────────────────────
// Every tool lives here. Add a new entry and it auto-appears in:
//   - Homepage grid
//   - Sidebar navigation
//   - Search
//   - Sitemap (for SEO)

export type ToolCategory =
  | 'developer'
  | 'text'
  | 'seo'
  | 'image'
  | 'math'
  | 'misc'

export interface Tool {
  id: string            // URL slug: /tools/[id]
  name: string
  description: string   // shown in card + meta description
  category: ToolCategory
  tags: string[]        // for search
  icon: string          // lucide icon name
  isNew?: boolean
  isPro?: boolean       // future freemium gate
  comingSoon?: boolean
  isFeatured?: boolean
  usageCount?: string
}

export const TOOLS: Tool[] = [
  // ── Developer Tools ────────────────────────────────────────────────────────
  {
    id: 'json-formatter',
    name: 'JSON Formatter',
    description: 'Beautify, minify, and validate JSON with syntax highlighting.',
    category: 'developer',
    tags: ['json', 'format', 'beautify', 'minify', 'validate', 'parser'],
    icon: 'Braces',
    isNew: true,
    isFeatured: true,
    usageCount: '12.4k',
  },
  {
    id: 'base64',
    name: 'Base64 Encoder / Decoder',
    description: 'Encode and decode Base64 strings and files instantly.',
    category: 'developer',
    tags: ['base64', 'encode', 'decode', 'binary'],
    icon: 'Lock',
    comingSoon: true,
    isFeatured: true,
    usageCount: '8.2k',
  },
  {
    id: 'url-encoder',
    name: 'URL Encoder / Decoder',
    description: 'Encode or decode URL components and query strings.',
    category: 'developer',
    tags: ['url', 'encode', 'decode', 'percent', 'uri'],
    icon: 'Link',
    comingSoon: true,
  },
  {
    id: 'regex-tester',
    name: 'Regex Tester',
    description: 'Test and debug regular expressions with live match highlighting.',
    category: 'developer',
    tags: ['regex', 'regexp', 'pattern', 'match', 'test'],
    icon: 'Regex',
    comingSoon: true,
    isFeatured: true,
    usageCount: '5.1k',
  },
  {
    id: 'jwt-decoder',
    name: 'JWT Decoder',
    description: 'Decode and inspect JSON Web Tokens without a secret.',
    category: 'developer',
    tags: ['jwt', 'token', 'auth', 'decode', 'json'],
    icon: 'Shield',
    comingSoon: true,
  },
  {
    id: 'diff-checker',
    name: 'Diff Checker',
    description: 'Compare two blocks of text and highlight the differences.',
    category: 'developer',
    tags: ['diff', 'compare', 'text', 'changes', 'patch'],
    icon: 'GitCompare',
    comingSoon: true,
  },
  {
    id: 'color-converter',
    name: 'Color Converter',
    description: 'Convert between HEX, RGB, HSL, and CSS color formats.',
    category: 'developer',
    tags: ['color', 'hex', 'rgb', 'hsl', 'css', 'convert'],
    icon: 'Palette',
    comingSoon: true,
  },
  {
    id: 'timestamp',
    name: 'Unix Timestamp Converter',
    description: 'Convert Unix timestamps to human-readable dates and back.',
    category: 'developer',
    tags: ['unix', 'timestamp', 'epoch', 'date', 'time', 'convert'],
    icon: 'Clock',
    comingSoon: true,
  },
  {
    id: 'uuid-generator',
    name: 'UUID Generator',
    description: 'Generate v1, v4, and v5 UUIDs in bulk.',
    category: 'developer',
    tags: ['uuid', 'guid', 'generate', 'unique', 'id'],
    icon: 'Fingerprint',
    comingSoon: true,
  },
  {
    id: 'hash-generator',
    name: 'Hash Generator',
    description: 'Generate MD5, SHA-1, SHA-256, and SHA-512 hashes.',
    category: 'developer',
    tags: ['hash', 'md5', 'sha', 'sha256', 'crypto', 'checksum'],
    icon: 'Hash',
    comingSoon: true,
  },
  {
    id: 'html-entity',
    name: 'HTML Entity Encoder',
    description: 'Encode and decode HTML entities and special characters.',
    category: 'developer',
    tags: ['html', 'entity', 'encode', 'decode', 'escape', 'characters'],
    icon: 'Code',
    comingSoon: true,
  },
  {
    id: 'css-minifier',
    name: 'CSS Minifier',
    description: 'Minify CSS files to reduce file size for production.',
    category: 'developer',
    tags: ['css', 'minify', 'compress', 'optimize', 'style'],
    icon: 'Braces',
    comingSoon: true,
  },
  {
    id: 'js-minifier',
    name: 'JavaScript Minifier',
    description: 'Minify and compress JavaScript code for production.',
    category: 'developer',
    tags: ['javascript', 'js', 'minify', 'compress', 'optimize'],
    icon: 'FileCode',
    comingSoon: true,
  },
  {
    id: 'xml-formatter',
    name: 'XML Formatter',
    description: 'Beautify and validate XML documents with syntax highlighting.',
    category: 'developer',
    tags: ['xml', 'format', 'beautify', 'validate', 'pretty print'],
    icon: 'FileXml',
    comingSoon: true,
  },
  {
    id: 'cron-parser',
    name: 'Cron Expression Parser',
    description: 'Parse and explain cron expressions in plain English.',
    category: 'developer',
    tags: ['cron', 'schedule', 'job', 'expression', 'parse'],
    icon: 'Timer',
    comingSoon: true,
  },

  // ── Text & Writing Tools ────────────────────────────────────────────────────
  {
    id: 'word-counter',
    name: 'Word Counter',
    description: 'Count words, characters, sentences, paragraphs and reading time.',
    category: 'text',
    tags: ['word', 'count', 'characters', 'reading time', 'text'],
    icon: 'AlignLeft',
    comingSoon: true,
  },
  {
    id: 'case-converter',
    name: 'Case Converter',
    description: 'Convert text between camelCase, snake_case, UPPER, Title Case and more.',
    category: 'text',
    tags: ['case', 'camel', 'snake', 'upper', 'lower', 'convert', 'text'],
    icon: 'Type',
    comingSoon: true,
  },
  {
    id: 'lorem-ipsum',
    name: 'Lorem Ipsum Generator',
    description: 'Generate placeholder text in paragraphs, words, or sentences.',
    category: 'text',
    tags: ['lorem', 'ipsum', 'placeholder', 'dummy', 'text', 'generate'],
    icon: 'FileText',
    comingSoon: true,
  },
  {
    id: 'text-diff',
    name: 'Text Diff Checker',
    description: 'Find differences between two text blocks visually.',
    category: 'text',
    tags: ['diff', 'text', 'compare', 'difference'],
    icon: 'Columns2',
    comingSoon: true,
  },
  {
    id: 'markdown-preview',
    name: 'Markdown Previewer',
    description: 'Write Markdown and preview the rendered output in real time.',
    category: 'text',
    tags: ['markdown', 'preview', 'render', 'md', 'html'],
    icon: 'FileCode2',
    comingSoon: true,
  },

  // ── SEO & Marketing Tools ──────────────────────────────────────────────────
  {
    id: 'meta-tag-generator',
    name: 'Meta Tag Generator',
    description: 'Generate SEO meta tags, Open Graph, and Twitter Card tags.',
    category: 'seo',
    tags: ['meta', 'seo', 'og', 'twitter', 'tags', 'html'],
    icon: 'Tags',
    comingSoon: true,
  },
  {
    id: 'slug-generator',
    name: 'URL Slug Generator',
    description: 'Convert any title or text into an SEO-friendly URL slug.',
    category: 'seo',
    tags: ['slug', 'url', 'seo', 'permalink', 'generate'],
    icon: 'Link2',
    comingSoon: true,
  },
  {
    id: 'og-preview',
    name: 'Open Graph Preview',
    description: 'Preview how your page looks when shared on social media.',
    category: 'seo',
    tags: ['og', 'open graph', 'social', 'preview', 'twitter', 'facebook'],
    icon: 'Share2',
    comingSoon: true,
  },
  {
    id: 'robots-txt',
    name: 'Robots.txt Generator',
    description: 'Generate a robots.txt file for your website.',
    category: 'seo',
    tags: ['robots', 'txt', 'seo', 'crawl', 'spider'],
    icon: 'Bot',
    comingSoon: true,
  },

  // ── Math & Calculators ─────────────────────────────────────────────────────
  {
    id: 'percentage-calculator',
    name: 'Percentage Calculator',
    description: 'Calculate percentages, increases, decreases and differences.',
    category: 'math',
    tags: ['percentage', 'percent', 'calculate', 'math'],
    icon: 'Percent',
    comingSoon: true,
  },
  {
    id: 'unit-converter',
    name: 'Unit Converter',
    description: 'Convert between length, weight, temperature, volume, and more.',
    category: 'math',
    tags: ['unit', 'convert', 'length', 'weight', 'temperature', 'metric'],
    icon: 'ArrowLeftRight',
    comingSoon: true,
  },

  // ── Misc & Generators ─────────────────────────────────────────────────────
  {
    id: 'qr-generator',
    name: 'QR Code Generator',
    description: 'Generate QR codes for URLs, text, WiFi, and more.',
    category: 'misc',
    tags: ['qr', 'code', 'generate', 'barcode', 'scan'],
    icon: 'QrCode',
    comingSoon: true,
  },
  {
    id: 'password-generator',
    name: 'Password Generator',
    description: 'Generate strong, secure passwords with custom rules.',
    category: 'misc',
    tags: ['password', 'generate', 'secure', 'random', 'strong'],
    icon: 'KeyRound',
    comingSoon: true,
  },
]

// ── Helper functions ─────────────────────────────────────────────────────────

export function getToolsByCategory(category: ToolCategory): Tool[] {
  return TOOLS.filter(t => t.category === category)
}

export function getToolById(id: string): Tool | undefined {
  return TOOLS.find(t => t.id === id)
}

export function searchTools(query: string): Tool[] {
  const q = query.toLowerCase()
  return TOOLS.filter(t =>
    t.name.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    t.tags.some(tag => tag.includes(q))
  )
}

export const CATEGORIES: { id: ToolCategory; label: string; icon: string }[] = [
  { id: 'developer', label: 'Developer Tools', icon: 'Code2' },
  { id: 'text',      label: 'Text & Writing',  icon: 'AlignLeft' },
  { id: 'seo',       label: 'SEO & Marketing', icon: 'TrendingUp' },
  { id: 'image',     label: 'Image & Color',   icon: 'Image' },
  { id: 'math',      label: 'Math & Calc',     icon: 'Calculator' },
  { id: 'misc',      label: 'Misc & Fun',      icon: 'Sparkles' },
]
