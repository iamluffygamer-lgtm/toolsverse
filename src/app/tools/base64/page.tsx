'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import AdSlot from '@/components/AdSlot'
import PageTransition from '@/components/PageTransition'
import ToolHeader from '@/components/ToolHeader'
import WorkflowBar from '@/components/WorkflowBar'
import ExportBar from '@/components/ExportBar'
import { getToolById } from '@/lib/tools'
import { consumeIncomingContent, addRecentTool } from '@/lib/session'

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`
}

function encodeToBase64(text: string): string {
  return btoa(
    encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    )
  )
}

function decodeFromBase64(base64: string): string {
  const clean = base64.replace(/\s/g, '')
  return decodeURIComponent(
    atob(clean)
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  )
}

function isBase64(str: string): boolean {
  const clean = str.replace(/\s/g, '')
  return clean.length > 0 && clean.length % 4 === 0 && /^[A-Za-z0-9+/]+=*$/.test(clean)
}

function detectImageMime(base64: string): string {
  if (base64.startsWith('iVBORw0KGgo')) return 'image/png'
  if (base64.startsWith('/9j/')) return 'image/jpeg'
  if (base64.startsWith('R0lGOD')) return 'image/gif'
  if (base64.startsWith('UklGR')) return 'image/webp'
  if (base64.includes('PHN2Zy')) return 'image/svg+xml'
  if (base64.startsWith('Qk')) return 'image/bmp'
  if (base64.startsWith('AAABAA')) return 'image/x-icon'
  return 'image/png'
}

const SAMPLE_TEXT = `Hello, ToolStack! 🚀
This is a sample text to demonstrate Base64 encoding.
It supports Unicode characters like: café, naïve, 日本語`

const FAQS = [
  {
    q: 'What is Base64 encoding?',
    a: 'Base64 is a binary-to-text encoding scheme that converts binary data into a set of 64 printable ASCII characters. It is commonly used to embed binary data in text-based formats like JSON, XML, HTML, and email.'
  },
  {
    q: 'When should I use Base64?',
    a: 'Use Base64 when you need to transmit binary data (images, files) through a medium designed for text, such as embedding images in CSS/HTML as data URIs, storing binary data in JSON, or sending files in email attachments.'
  },
  {
    q: 'Does Base64 encrypt my data?',
    a: 'No. Base64 is encoding, not encryption. It is completely reversible and provides zero security. Anyone can decode a Base64 string instantly. For security, use proper encryption like AES.'
  },
  {
    q: 'Is my data sent to a server?',
    a: 'Never. All Base64 encoding and decoding on ToolStack happens entirely in your browser using JavaScript. Your data never leaves your device.'
  },
  {
    q: 'Why is Base64 output larger than the input?',
    a: 'Base64 encodes every 3 bytes of input into 4 ASCII characters, making the output approximately 33% larger than the original. This is a trade-off for text compatibility.'
  },
  {
    q: 'What is a Base64 data URI?',
    a: 'A data URI is a Base64-encoded file embedded directly in HTML or CSS. Example: src="data:image/png;base64,iVBORw..." — this lets you embed images without a separate file request.'
  },
]

// ── Component ──────────────────────────────────────────────────────────────────
export default function Base64Page() {
  const tool = getToolById('base64')!

  // Tab state
  const [activeTab, setActiveTab] = useState<'text' | 'file' | 'image'>('text')

  // Text mode state
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [mode, setMode] = useState<'encode' | 'decode'>('encode')
  const [error, setError] = useState<string | null>(null)

  // File mode state
  const [file, setFile] = useState<File | null>(null)
  const [fileOutput, setFileOutput] = useState('')
  const [showDataUri, setShowDataUri] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Image preview state
  const [imageInput, setImageInput] = useState('')
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageDimensions, setImageDimensions] = useState<{ w: number, h: number } | null>(null)
  const [imageError, setImageError] = useState(false)
  const [bgIsTransparent, setBgIsTransparent] = useState(true)
  const [showEmbedSnippet, setShowEmbedSnippet] = useState(false)

  // Text Mode Logic
  function processText(val: string, currentMode: 'encode' | 'decode') {
    if (!val.trim()) {
      setOutput('')
      setError(null)
      return
    }
    try {
      if (currentMode === 'encode') {
        setOutput(encodeToBase64(val))
        setError(null)
      } else {
        setOutput(decodeFromBase64(val))
        setError(null)
      }
    } catch (e) {
      setOutput('')
      setError('Invalid Base64 — input contains characters outside the Base64 alphabet')
    }
  }

  function handleInputChange(val: string) {
    setInput(val)
    let newMode = mode
    if (val.length > 8 && isBase64(val) && mode === 'encode') {
      newMode = 'decode'
      setMode(newMode)
    }
    processText(val, newMode)
  }

  function toggleMode(newMode: 'encode' | 'decode') {
    setMode(newMode)
    processText(input, newMode)
  }

  function handleClear() {
    setInput('')
    setOutput('')
    setError(null)
  }

  function handleSample() {
    setInput(SAMPLE_TEXT)
    setMode('encode')
    processText(SAMPLE_TEXT, 'encode')
  }

  // File Mode Logic
  function handleFile(f: File) {
    if (f.size > 5 * 1024 * 1024) {
      setFileError('File size exceeds 5MB limit.')
      return
    }
    setFileError(null)
    setFile(f)
    setIsUploading(true)
    setUploadProgress(0)

    const reader = new FileReader()
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        setUploadProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    reader.onload = (e) => {
      setFileOutput(e.target?.result as string)
      setIsUploading(false)
    }
    reader.readAsDataURL(f)
  }

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false) }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0])
  }

  const finalFileOutput = showDataUri ? fileOutput : fileOutput.split(',')[1] || ''

  // Common Output
  const activeOutput = activeTab === 'text' ? output : activeTab === 'file' ? finalFileOutput : ''

  useEffect(() => {
    addRecentTool('base64')
    const incoming = consumeIncomingContent()
    if (incoming) {
      setInput(incoming)
      if (isBase64(incoming)) {
        setMode('decode')
        processText(incoming, 'decode')
      } else {
        setMode('encode')
        processText(incoming, 'encode')
      }
    }
  }, [])

  // Stats Logic for Text Mode
  const inSize = new TextEncoder().encode(input).length
  const outSize = new TextEncoder().encode(output).length
  const inSizeStr = fmtSize(inSize)
  const outSizeStr = fmtSize(outSize)
  
  let compressionRatio = 0
  if (inSize > 0) {
    compressionRatio = ((outSize - inSize) / inSize) * 100
  }
  const compressionStr = inSize > 0 && output 
    ? (compressionRatio > 0 ? `+${compressionRatio.toFixed(1)}% larger` : `${Math.abs(compressionRatio).toFixed(1)}% smaller`) 
    : '—'

  // Image Mode Auto-detect
  const detectedMime = imageInput.startsWith('data:') 
    ? (imageInput.match(/^data:([^;]+);/) || [])[1] || 'image/png'
    : imageInput ? detectImageMime(imageInput.replace(/\s/g, '')) : ''

  const imageDataUri = imageInput.startsWith('data:')
    ? imageInput
    : imageInput ? `data:${detectedMime};base64,${imageInput.replace(/\s/g, '')}` : ''

  function downloadDecodedImage() {
    if (!imageDataUri) return
    fetch(imageDataUri)
      .then(res => res.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `decoded_image.${detectedMime.split('/')[1] || 'png'}`
        a.click()
        URL.revokeObjectURL(url)
      })
  }

  const embedSnippet = `<img src="${imageDataUri}" alt="Base64 Image" />`

  // Export Stats Card Logic
  let statsCard = null
  if (activeTab === 'text' && input && output) {
    statsCard = {
      encodedSize: outSizeStr,
      originalEstimate: inSizeStr,
      overhead: compressionRatio > 0 ? `+${compressionRatio.toFixed(1)}%` : `${compressionRatio.toFixed(1)}%`,
      mime: 'text/plain'
    }
  } else if (activeTab === 'file' && file && fileOutput) {
    const rawBase64 = fileOutput.split(',')[1] || ''
    const outBytes = new TextEncoder().encode(rawBase64).length
    statsCard = {
      encodedSize: fmtSize(outBytes),
      originalEstimate: fmtSize(file.size),
      overhead: file.size > 0 ? `+${(((outBytes - file.size) / file.size) * 100).toFixed(1)}%` : '0%',
      mime: file.type || 'unknown'
    }
  } else if (activeTab === 'image' && imageInput && imageDataUri && !imageError) {
    const rawBase64 = imageDataUri.split(',')[1] || ''
    const outBytes = new TextEncoder().encode(rawBase64).length
    const originalBytes = Math.floor((rawBase64.length * 3) / 4)
    statsCard = {
      encodedSize: fmtSize(outBytes),
      originalEstimate: fmtSize(originalBytes),
      overhead: originalBytes > 0 ? `+${(((outBytes - originalBytes) / originalBytes) * 100).toFixed(1)}%` : '0%',
      mime: detectedMime
    }
  }

  return (
    <PageTransition>
      <ToolHeader tool={tool} outputReady={!!activeOutput} />

      <div className="card p-0 overflow-hidden mb-4">
        {/* Tab Bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[--ts-surface] border-b border-[--ts-border] overflow-x-auto">
          {[
            { id: 'text', label: 'Text ↔ Base64' },
            { id: 'file', label: 'File → Base64' },
            { id: 'image', label: 'Image Preview' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'text' | 'file' | 'image')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === tab.id
                ? 'bg-[--ts-ink-900] text-[--ts-bg]'
                : 'text-[--ts-ink-500] hover:text-[--ts-ink-900] bg-transparent'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content: Text */}
        {activeTab === 'text' && (
          <>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[--ts-surface] border-b border-[--ts-border] flex-wrap">
              <div className="flex items-center bg-[--ts-card-bg] rounded-lg p-1 border border-[--ts-border]">
                <button
                  onClick={() => toggleMode('encode')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${mode === 'encode' ? 'bg-white shadow-sm text-[--ts-ink-900]' : 'text-[--ts-ink-500] hover:text-[--ts-ink-900]'}`}
                >
                  Encode
                </button>
                <button
                  onClick={() => toggleMode('decode')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${mode === 'decode' ? 'bg-white shadow-sm text-[--ts-ink-900]' : 'text-[--ts-ink-500] hover:text-[--ts-ink-900]'}`}
                >
                  Decode
                </button>
              </div>

              <div className="flex-1" />

              <button onClick={handleSample} className="btn text-xs">Sample</button>
              <button onClick={handleClear} className="btn text-xs text-[--ts-error] border-[--ts-error-bg]">Clear</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2" style={{ minHeight: 380 }}>
              <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-[--ts-border]">
                <div className="flex items-center justify-between px-4 py-2 border-b border-[--ts-border] bg-[--ts-surface]">
                  <span className="section-label">Input</span>
                  <div className="flex items-center gap-2">
                    {input.length > 0 && <span className="badge">{input.length} chars</span>}
                    <span className="badge">{inSizeStr}</span>
                  </div>
                </div>
                <textarea
                  value={input}
                  onChange={e => handleInputChange(e.target.value)}
                  placeholder={mode === 'encode' ? 'Type or paste plain text here...' : 'Paste Base64 here...'}
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
                    {output.length > 0 && <span className="badge">{outSizeStr}</span>}
                  </div>
                </div>
                <textarea
                  value={output}
                  readOnly
                  placeholder="Result will appear here..."
                  className="flex-1 resize-none border-none outline-none bg-[--ts-card-bg] text-[--ts-ink-900] font-mono text-[12.5px] leading-relaxed p-4"
                  style={{ minHeight: 340 }}
                />
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
                {mode === 'encode' ? 'Encode' : 'Decode'}
              </span>
              <span className="text-xs text-[--ts-ink-500]">
                Input: <span className="font-medium text-[--ts-ink-800]">{input.length} chars</span>
              </span>
              <span className="text-xs text-[--ts-ink-500]">
                Output: <span className="font-medium text-[--ts-ink-800]">{output.length} chars</span>
              </span>
              {mode === 'decode' && input && (
                <span className="text-xs text-[--ts-ink-500]">
                  Valid Base64: <span className={`font-medium ${!error ? 'text-[--ts-success]' : 'text-[--ts-error]'}`}>{!error ? '✓ Yes' : '✗ No'}</span>
                </span>
              )}
              <span className="text-xs text-[--ts-ink-500]">
                Compression: <span className="font-medium text-[--ts-ink-800]">{compressionStr}</span>
              </span>
            </div>
          </>
        )}

        {/* Tab Content: File */}
        {activeTab === 'file' && (
          <div className="p-6">
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center justify-center p-12 rounded-xl cursor-pointer transition-all duration-300 border-2 ${isDragging ? 'border-[--ts-gold] bg-[--ts-gold-light] shadow-[0_0_15px_rgba(var(--ts-gold-rgb),0.2)]' : 'border-[--ts-border] border-dashed hover:border-[--ts-ink-400] bg-[--ts-surface]'}`}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={`mb-4 transition-transform duration-300 ${isDragging ? 'text-[--ts-gold] scale-110' : 'text-[--ts-ink-400]'} ${!file && !isDragging && !isUploading ? 'animate-pulse' : ''}`}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
              <span className="text-sm font-medium text-[--ts-ink-800]">{isDragging ? 'Release to encode file' : 'Drop a file or click to browse'}</span>
              <span className="text-xs text-[--ts-ink-500] mt-2">{!file && !isDragging && !isUploading ? 'PNG · JPG · PDF · ZIP · MP4' : 'Any file type, max 5MB'}</span>
              <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              {fileError && (
                <span className="text-sm font-medium text-[--ts-error] mt-3">{fileError}</span>
              )}
              {isUploading && (
                <div className="w-full max-w-xs mt-4">
                  <div className="h-1.5 w-full bg-[--ts-border] rounded-full overflow-hidden">
                    <div className="h-full bg-[--ts-ink-900] transition-all duration-200" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                  <div className="text-xs text-center mt-2 font-medium text-[--ts-ink-700] animate-pulse">
                    Encoding file... {uploadProgress}%
                  </div>
                </div>
              )}
            </div>

            {file && !fileError && !isUploading && (
              <div className="mt-6">
                <div className="flex items-start gap-4 mb-4">
                  {file.type.startsWith('image/') && fileOutput && (
                    <img src={fileOutput} className="w-20 h-20 object-cover rounded-lg border border-[--ts-border] shrink-0" alt="Thumbnail" />
                  )}
                  <div className="flex-1 bg-[--ts-surface] border border-[--ts-border-soft] rounded-xl p-4 flex flex-col justify-center">
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                      <div className="text-xs text-[--ts-ink-500]">Filename: <span className="font-medium text-[--ts-ink-900]">{file.name}</span></div>
                      <div className="text-xs text-[--ts-ink-500]">Type: <span className="font-medium text-[--ts-ink-900]">{file.type || 'unknown'}</span></div>
                      <div className="text-xs text-[--ts-ink-500]">Size: <span className="font-medium text-[--ts-ink-900]">{fmtSize(file.size)}</span></div>
                      <div className="text-xs text-[--ts-ink-500]">Last Modified: <span className="font-medium text-[--ts-ink-900]">{new Date(file.lastModified).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-[--ts-ink-700] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showDataUri}
                      onChange={e => setShowDataUri(e.target.checked)}
                      className="rounded border-[--ts-border] text-[--ts-ink-900] focus:ring-[--ts-ink-900]"
                    />
                    Include Data URI
                  </label>
                  <button onClick={() => navigator.clipboard.writeText(fileOutput)} className="btn text-xs bg-white shadow-sm">
                    Copy Data URI
                  </button>
                </div>
                <div className="relative">
                  <textarea
                    value={finalFileOutput}
                    readOnly
                    className="w-full resize-y border border-[--ts-border] rounded-xl bg-[--ts-card-bg] text-[--ts-ink-900] font-mono text-[12.5px] leading-relaxed p-4"
                    style={{ minHeight: 200 }}
                  />
                  {finalFileOutput && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(finalFileOutput)
                      }}
                      className="absolute top-3 right-3 btn bg-white shadow-sm"
                    >
                      Copy Output
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Image */}
        {activeTab === 'image' && (
          <div className="grid grid-cols-1 lg:grid-cols-2" style={{ minHeight: 380 }}>
            <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-[--ts-border]">
              <div className="flex items-center justify-between px-4 py-2 border-b border-[--ts-border] bg-[--ts-surface]">
                <span className="section-label">Base64 Image Input</span>
              </div>
              <textarea
                value={imageInput}
                onChange={e => {
                  setImageInput(e.target.value)
                  setImageLoaded(false)
                  setImageError(false)
                  setImageDimensions(null)
                  setShowEmbedSnippet(false)
                }}
                placeholder='Paste raw Base64 string or data URI here...'
                spellCheck={false}
                className="flex-1 resize-none border-none outline-none bg-white text-[--ts-ink-900] font-mono text-[12.5px] leading-relaxed p-4"
                style={{ minHeight: 340 }}
              />
            </div>
            <div className="flex flex-col bg-[--ts-card-bg]">
              <div className="flex items-center justify-between px-4 py-2 border-b border-[--ts-border] bg-[--ts-surface]">
                <div className="flex items-center gap-2">
                  <span className="section-label">Preview</span>
                  {detectedMime && imageInput && <span className="badge">{detectedMime.split('/')[1].toUpperCase()}</span>}
                  {imageInput && (
                    <span className={`text-xs font-medium flex items-center gap-1 ${imageError ? 'text-[--ts-error]' : 'text-[--ts-success]'}`}>
                      {!imageError ? '✓ Valid image' : '✗ Invalid image'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setBgIsTransparent(!bgIsTransparent)}
                    className="btn text-[10px] py-1 bg-white shadow-sm"
                  >
                    {bgIsTransparent ? 'Solid BG' : 'Transparent BG'}
                  </button>
                  {imageDimensions && (
                    <span className="badge">{imageDimensions.w} &times; {imageDimensions.h} px</span>
                  )}
                </div>
              </div>
              <div className="flex-1 flex flex-col p-6 min-h-[340px]">
                <div className="flex-1 flex items-center justify-center relative">
                  {!imageInput ? (
                    <span className="text-[--ts-ink-400]">Paste an image string to preview.</span>
                  ) : imageError ? (
                    <span className="text-[--ts-error]">Invalid image data.</span>
                  ) : (
                    <img
                      src={imageDataUri}
                      alt="Preview"
                      className={`max-w-full max-h-[400px] object-contain rounded-lg border border-[--ts-border] shadow-sm ${bgIsTransparent ? 'checkerboard-bg bg-white' : 'bg-white'}`}
                      onLoad={e => {
                        setImageLoaded(true)
                        setImageError(false)
                        setImageDimensions({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
                      }}
                      onError={() => {
                        setImageLoaded(false)
                        setImageError(true)
                        setImageDimensions(null)
                      }}
                    />
                  )}
                </div>
                {imageDataUri && !imageError && imageLoaded && (
                  <>
                    <div className="mt-6 flex flex-wrap gap-2 w-full">
                      <button onClick={() => navigator.clipboard.writeText(imageDataUri)} className="btn shadow-sm bg-white text-xs">
                        Copy Data URI
                      </button>
                      <button onClick={downloadDecodedImage} className="btn-primary shadow-sm text-xs">
                        Download Decoded Image
                      </button>
                      <button onClick={() => setShowEmbedSnippet(!showEmbedSnippet)} className="btn shadow-sm bg-white text-xs">
                        {showEmbedSnippet ? 'Hide Embed Snippet' : 'Generate Embed Snippet'}
                      </button>
                    </div>
                    {showEmbedSnippet && (
                      <div className="mt-3 w-full bg-[--ts-surface] border border-[--ts-border] rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-semibold text-[--ts-ink-800]">HTML Embed Snippet</span>
                          <div className="flex gap-2">
                            <button onClick={() => navigator.clipboard.writeText(embedSnippet)} className="text-[10px] btn bg-white shadow-sm py-1">
                              Copy Snippet
                            </button>
                            <button 
                              onClick={() => {
                                const blob = new Blob([embedSnippet], { type: 'text/html' })
                                const url = URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = 'embed.html'
                                a.click()
                                URL.revokeObjectURL(url)
                              }}
                              className="text-[10px] btn bg-white shadow-sm py-1"
                            >
                              Download .html
                            </button>
                          </div>
                        </div>
                        <textarea readOnly value={embedSnippet} className="w-full text-[11px] text-[--ts-ink-900] font-mono bg-white border border-[--ts-border] rounded p-2 h-16 resize-none outline-none focus:border-[--ts-ink-400]" />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="my-6 flex justify-center">
        <AdSlot size="rectangle" id="base64-mid" />
      </div>

      <WorkflowBar toolId="base64" hasOutput={!!activeOutput} contentToPass={activeOutput} />
      <ExportBar toolId="base64" content={activeOutput} hasOutput={!!activeOutput} />

      {/* Export Stats Card */}
      {statsCard && (
        <div className="mt-4 rounded-xl border border-[--ts-border-soft] bg-[--ts-surface] p-5">
          <h3 className="text-sm font-semibold text-[--ts-ink-900] mb-3">Export Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col">
              <span className="text-[11px] text-[--ts-ink-500] uppercase tracking-wider font-semibold mb-1">Encoded Size</span>
              <span className="text-sm font-medium text-[--ts-ink-900]">{statsCard.encodedSize}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-[--ts-ink-500] uppercase tracking-wider font-semibold mb-1">Original Estimate</span>
              <span className="text-sm font-medium text-[--ts-ink-900]">{statsCard.originalEstimate}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-[--ts-ink-500] uppercase tracking-wider font-semibold mb-1">Base64 Overhead</span>
              <span className="text-sm font-medium text-[--ts-ink-900]">{statsCard.overhead}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] text-[--ts-ink-500] uppercase tracking-wider font-semibold mb-1">MIME Type</span>
              <span className="text-sm font-medium text-[--ts-ink-900]">{statsCard.mime}</span>
            </div>
          </div>
        </div>
      )}

      <div className="prose-sm max-w-none mt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {FAQS.map(faq => (
            <div key={faq.q} className="rounded-xl border border-[--ts-border-soft] bg-[--ts-surface] p-4">
              <h3 className="text-sm font-semibold text-[--ts-ink-900] mb-1">{faq.q}</h3>
              <p className="text-xs text-[--ts-ink-500] leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .checkerboard-bg {
          background-image: linear-gradient(45deg, #f0f0f0 25%, transparent 25%), 
            linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), 
            linear-gradient(45deg, transparent 75%, #f0f0f0 75%), 
            linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
        }
      `}} />
    </PageTransition>
  )
}
