const KEYS = {
  PASTE_CONTENT:    'toolstack_paste_content',
  WORKFLOW_CONTENT: 'toolstack_workflow_content',
  RECENT_TOOLS:     'toolstack_recent_tools',
} as const

// Save content from smart paste or workflow chaining
export function saveIncomingContent(content: string): void {
  sessionStorage.setItem(KEYS.PASTE_CONTENT, content)
}

// Read and immediately clear — so it only pre-populates once
export function consumeIncomingContent(): string | null {
  const val = sessionStorage.getItem(KEYS.PASTE_CONTENT)
    || sessionStorage.getItem(KEYS.WORKFLOW_CONTENT)
  sessionStorage.removeItem(KEYS.PASTE_CONTENT)
  sessionStorage.removeItem(KEYS.WORKFLOW_CONTENT)
  return val
}

// Save workflow output before navigating to next tool
export function saveWorkflowContent(content: string): void {
  sessionStorage.setItem(KEYS.WORKFLOW_CONTENT, content)
}

// Recent tools — for command palette
export function addRecentTool(toolId: string): void {
  const recent = getRecentTools().filter(id => id !== toolId)
  recent.unshift(toolId)
  sessionStorage.setItem(KEYS.RECENT_TOOLS, JSON.stringify(recent.slice(0, 5)))
}

export function getRecentTools(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(KEYS.RECENT_TOOLS) || '[]')
  } catch {
    return []
  }
}
