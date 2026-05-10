'use client'
import { getChainedTools } from '@/lib/tools'
import { saveWorkflowContent } from '@/lib/session'
import Link from 'next/link'
import * as LucideIcons from 'lucide-react'

interface WorkflowBarProps {
  toolId: string
  hasOutput: boolean
  contentToPass?: string
}

export default function WorkflowBar({ toolId, hasOutput, contentToPass }: WorkflowBarProps) {
  if (!hasOutput) return null

  const chained = getChainedTools(toolId)
  if (!chained.length) return null

  return (
    <div 
      className="mt-6 border border-[--ts-border] rounded-xl p-4 bg-[--ts-surface]"
      style={{
        animation: 'slideUpFade 0.4s ease-out forwards',
      }}
    >
      <div className="text-xs font-medium text-[--ts-ink-500] uppercase tracking-wider mb-3">
        Continue your workflow →
      </div>
      <div className="flex flex-wrap gap-2">
        {chained.map(tool => {
          const Icon = (LucideIcons as any)[tool.icon] || LucideIcons.Code
          return (
            <Link
              key={tool.id}
              href={`/tools/${tool.id}/`}
              onClick={() => {
                if (contentToPass) {
                  saveWorkflowContent(contentToPass)
                }
              }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[--ts-border] text-sm bg-[--ts-card-bg] hover:bg-[--ts-surface] hover:border-[--ts-gold] transition-colors group"
            >
              <Icon className="w-4 h-4 text-[--ts-ink-500] group-hover:text-[--ts-gold] transition-colors" />
              <span className="text-[--ts-ink-900] font-medium">{tool.name}</span>
              <LucideIcons.ArrowRight className="w-4 h-4 text-[--ts-ink-400] group-hover:text-[--ts-ink-900] transition-colors" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
