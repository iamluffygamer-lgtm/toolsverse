'use client'
import { useState } from 'react'
import { getToolById } from '@/lib/tools'
import { exportToClipboard, exportAsDownload, exportToPDF } from '@/lib/export'
import { Copy, Download, FileText, File as FileIcon, Check, X, Loader2 } from 'lucide-react'

interface ExportBarProps {
  toolId: string
  content: string
  hasOutput: boolean
}

export default function ExportBar({ toolId, content, hasOutput }: ExportBarProps) {
  if (!hasOutput) return null
  
  const tool = getToolById(toolId)
  if (!tool || !tool.exportFormats || tool.exportFormats.length === 0) return null

  return (
    <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-[--ts-surface] border border-[--ts-border] rounded-xl flex-wrap">
      <span className="text-sm font-medium text-[--ts-ink-900] mr-2">Export</span>
      {tool.exportFormats.includes('clipboard') && (
        <ExportButton 
          icon={<Copy className="w-4 h-4" />} 
          label="Copy" 
          action={async () => await exportToClipboard(content)} 
          successLabel="Copied!" 
        />
      )}
      {tool.exportFormats.includes('download') && (
        <ExportButton 
          icon={<Download className="w-4 h-4" />} 
          label="Download" 
          action={async () => exportAsDownload(content, `toolstack-${toolId}.txt`)} 
          successLabel="Downloaded!" 
        />
      )}
      {tool.exportFormats.includes('html') && (
        <ExportButton 
          icon={<Download className="w-4 h-4" />} 
          label="HTML" 
          action={async () => exportAsDownload(content, `toolstack-${toolId}.html`, 'text/html')} 
          successLabel="Downloaded!" 
        />
      )}
      {tool.exportFormats.includes('csv') && (
        <ExportButton 
          icon={<Download className="w-4 h-4" />} 
          label="CSV" 
          action={async () => exportAsDownload(content, `toolstack-${toolId}.csv`, 'text/csv')} 
          successLabel="Downloaded!" 
        />
      )}
      {tool.exportFormats.includes('pdf') && (
        <ExportButton 
          icon={<FileText className="w-4 h-4" />} 
          label="PDF" 
          action={async () => await exportToPDF({ toolName: tool.name, content })} 
          successLabel="Exported!" 
        />
      )}
      {tool.exportFormats.includes('docx') && (
        <ExportButton 
          icon={<FileIcon className="w-4 h-4" />} 
          label="DOCX" 
          action={async () => exportAsDownload(content, `toolstack-${toolId}.docx`)} 
          successLabel="Exported!" 
        />
      )}
    </div>
  )
}

function ExportButton({ icon, label, action, successLabel }: { icon: React.ReactNode, label: string, action: () => Promise<void>, successLabel: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleClick = async () => {
    if (state === 'loading') return
    setState('loading')
    try {
      await action()
      setState('success')
      setTimeout(() => setState('idle'), 2000)
    } catch (e) {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={state === 'loading'}
      className={`btn text-sm px-3 py-1.5 transition-colors ${
        state === 'success' ? 'text-[--ts-success] border-[--ts-success] bg-[--ts-success]/10' :
        state === 'error' ? 'text-[--ts-error] border-[--ts-error] bg-[--ts-error-bg]' :
        ''
      }`}
    >
      {state === 'idle' && icon}
      {state === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
      {state === 'success' && <Check className="w-4 h-4" />}
      {state === 'error' && <X className="w-4 h-4" />}
      
      {state === 'success' ? successLabel : state === 'error' ? 'Failed' : label}
    </button>
  )
}
