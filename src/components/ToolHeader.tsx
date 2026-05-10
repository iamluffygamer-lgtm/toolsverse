import type { Tool } from '@/lib/tools'

interface ToolHeaderProps {
  tool: Tool
  outputReady?: boolean
}

export default function ToolHeader({ tool, outputReady }: ToolHeaderProps) {
  // Breadcrumb: All Tools > Developer Tools > JSON Formatter
  const categoryNames: Record<string, string> = {
    developer: 'Developer Tools',
    text: 'Text & Writing',
    seo: 'SEO & Marketing',
    image: 'Image & Color',
    math: 'Math & Calc',
    misc: 'Misc & Fun',
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2 text-[10px] text-[--ts-ink-400] font-medium tracking-wider uppercase">
        <span>All Tools</span>
        <span>›</span>
        <span>{categoryNames[tool.category] || tool.category}</span>
        <span>›</span>
        <span className="text-[--ts-ink-600]">{tool.name}</span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="pill capitalize">{tool.category}</span>
        <span className="badge">Tool</span>
        {tool.isNew && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[--ts-gold-light] text-[--ts-gold] leading-none">
            NEW
          </span>
        )}
      </div>

      <h1 className="text-2xl font-bold text-[--ts-ink-900] tracking-tight">{tool.name}</h1>
      
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        <p className="text-sm text-[--ts-ink-500]">{tool.description}</p>
        {tool.usageCount && (
          <>
            <span className="text-[--ts-ink-400] text-sm">·</span>
            <span className="text-xs text-[--ts-ink-400]">{tool.usageCount}</span>
          </>
        )}
      </div>
    </div>
  )
}
