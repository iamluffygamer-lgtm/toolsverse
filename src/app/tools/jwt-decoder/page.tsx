'use client'
import { useState, useEffect, useCallback } from 'react'
import PageTransition from '@/components/PageTransition'
import ToolHeader from '@/components/ToolHeader'
import WorkflowBar from '@/components/WorkflowBar'
import ExportBar from '@/components/ExportBar'
import { getToolById } from '@/lib/tools'
import { consumeIncomingContent, addRecentTool } from '@/lib/session'
import { safeJsonExport } from '@/lib/export'
import { decodeBase64Url } from '@/lib/unicode'

// ── Types ──────────────────────────────────────────────────────────────────────
type Tab = 'decoder' | 'reference' | 'security'

type JWTValidationError =
  | 'EMPTY'
  | 'NOT_THREE_PARTS'
  | 'INVALID_HEADER_BASE64'
  | 'INVALID_PAYLOAD_BASE64'
  | 'INVALID_HEADER_JSON'
  | 'INVALID_PAYLOAD_JSON'
  | 'MISSING_ALG'

interface ValidationResult {
  valid: boolean
  error?: JWTValidationError
  message?: string
  parts?: { header: string; payload: string; signature: string; headerSize: number; payloadSize: number; sigSize: number }
  decoded?: { header: Record<string, unknown>; payload: Record<string, unknown> }
}

interface AuditResult {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'pass'
  title: string
  description: string
  recommendation?: string
}

// ── Constants ──────────────────────────────────────────────────────────────────
const CLAIM_EXPLANATIONS: Record<string, string> = {
  sub: 'Subject — the user or entity this token represents',
  iss: 'Issuer — the service that created this token',
  aud: 'Audience — the intended recipient(s) of this token',
  exp: 'Expiration — Unix timestamp when this token expires',
  iat: 'Issued At — Unix timestamp when this token was created',
  nbf: 'Not Before — token is invalid before this Unix timestamp',
  jti: 'JWT ID — unique identifier for this token (prevents replay)',
  name: 'Full name of the user',
  given_name: 'Given name(s) or first name',
  family_name: 'Surname(s) or last name',
  email: 'Email address of the user',
  email_verified: 'True if email address has been verified',
  role: 'Role or permission level of the user',
  roles: 'Roles or permission levels of the user',
  scope: 'OAuth 2.0 scopes granted to this token',
}

const SAMPLE_JWT = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtleS0xIn0.eyJzdWIiOiJ1c2VyXzEyMzQ1NiIsImlzcyI6Imh0dHBzOi8vYXV0aC50b29sc3RhY2suZGV2IiwiYXVkIjoiaHR0cHM6Ly90b29sc3RhY2suZGV2IiwiaWF0IjoxNzQ4NTEzMDAwLCJleHAiOjE3NDg1MjAwMDAsIm5iZiI6MTc0ODUxMzAwMCwianRpIjoiand0XzdhOGI5YzBkIiwibmFtZSI6IkFsZXggRGV2ZWxvcGVyIiwiZW1haWwiOiJhbGV4QHRvb2xzdGFjay5kZXYiLCJyb2xlIjoiZGV2ZWxvcGVyIiwic2NvcGUiOiJyZWFkOmFwaSB3cml0ZTphcGkifQ.signature_placeholder'

const FAQS = [
  { q: 'What is a JWT?', a: 'A JSON Web Token (JWT) is a compact, URL-safe token format used to securely transmit information between parties. It consists of three Base64URL-encoded parts separated by dots: a header (algorithm info), a payload (claims/data), and a signature.' },
  { q: 'Is it safe to paste my JWT here?', a: 'This tool decodes entirely in your browser — no data is sent to any server. That said, treat JWTs as sensitive credentials. Avoid pasting production tokens with real user data into any online tool. Use test or expired tokens for debugging.' },
  { q: 'Can this tool verify the JWT signature?', a: 'No, and by design. Signature verification requires your private/public key which you should never paste into an online tool. This decoder shows you the token structure and claims without verifying authenticity — useful for debugging the payload.' },
  { q: 'What is the difference between HS256 and RS256?', a: 'HS256 is symmetric — it uses the same secret key to both sign and verify tokens. RS256 is asymmetric — it uses a private key to sign and a public key to verify. RS256 is recommended for systems where multiple services verify tokens, as you only share the public key.' },
  { q: 'What does "exp" mean and why is it important?', a: 'exp (expiration) is a Unix timestamp indicating when the token expires. It is a critical security measure — expired tokens must be rejected by your server. Without exp, a compromised token would be valid forever.' },
  { q: 'What is the "alg: none" vulnerability?', a: 'Some JWT libraries historically accepted tokens with alg set to "none", meaning no signature verification was performed. Attackers could forge tokens by removing the signature and setting alg to none. Always validate the algorithm explicitly on your server.' },
]

// ── Helpers ────────────────────────────────────────────────────────────────────
function validateJWT(token: string): ValidationResult {
  if (!token.trim()) return { valid: false, error: 'EMPTY', message: 'Token is empty.' }
  
  const parts = token.split('.')
  if (parts.length !== 3) {
    return { valid: false, error: 'NOT_THREE_PARTS', message: 'A JWT must have exactly 3 parts separated by dots (header.payload.signature)' }
  }

  let headerJsonStr = ''
  let payloadJsonStr = ''

  try { headerJsonStr = decodeBase64Url(parts[0]) } catch { return { valid: false, error: 'INVALID_HEADER_BASE64', message: 'The header section is not valid Base64URL encoding' } }
  try { payloadJsonStr = decodeBase64Url(parts[1]) } catch { return { valid: false, error: 'INVALID_PAYLOAD_BASE64', message: 'The payload section is not valid Base64URL encoding' } }

  let headerObj: Record<string, unknown>
  let payloadObj: Record<string, unknown>

  try { headerObj = JSON.parse(headerJsonStr) } catch { return { valid: false, error: 'INVALID_HEADER_JSON', message: 'The header decoded successfully but is not valid JSON' } }
  try { payloadObj = JSON.parse(payloadJsonStr) } catch { return { valid: false, error: 'INVALID_PAYLOAD_JSON', message: 'The payload decoded successfully but is not valid JSON' } }

  if (!headerObj.alg) return { valid: false, error: 'MISSING_ALG', message: 'The header is missing the required "alg" (algorithm) field' }

  return {
    valid: true,
    parts: {
      header: parts[0], payload: parts[1], signature: parts[2],
      headerSize: new Blob([parts[0]]).size, payloadSize: new Blob([parts[1]]).size, sigSize: new Blob([parts[2]]).size
    },
    decoded: { header: headerObj, payload: payloadObj }
  }
}

function auditJWT(header: Record<string, unknown>, payload: Record<string, unknown>): AuditResult[] {
  const results: AuditResult[] = []
  const alg = String(header.alg || '')

  if (alg.toLowerCase() === 'none') {
    results.push({ id: 'ALG_NONE', severity: 'critical', title: 'No signature algorithm (alg: none)', description: 'This token has no signature. Any server accepting this token without verifying the algorithm is vulnerable to the "alg:none" attack.', recommendation: 'Always validate the algorithm on your server. Never accept alg:none tokens.' })
  } else if (['HS256','HS384','HS512'].includes(alg)) {
    results.push({ id: 'SYMMETRIC_ALG', severity: 'medium', title: 'Symmetric algorithm in use', description: 'HMAC algorithms require the same secret for signing and verifying. If this token is verified by multiple services, they all share the same secret.', recommendation: 'Consider asymmetric algorithms (RS256, ES256) for multi-service architectures.' })
  }

  const exp = typeof payload.exp === 'number' ? payload.exp : null
  const iat = typeof payload.iat === 'number' ? payload.iat : null

  if (!exp) {
    results.push({ id: 'NO_EXPIRY', severity: 'high', title: 'Token has no expiration (exp)', description: 'Tokens without an expiry claim are valid forever. If compromised, they cannot be invalidated by expiry alone.', recommendation: 'Always set a reasonable exp claim. Typical values: 15 minutes for access tokens, 7 days for refresh tokens.' })
  } else if (exp < Math.floor(Date.now() / 1000)) {
    results.push({ id: 'EXPIRED', severity: 'high', title: 'Token is expired', description: `This token expired on ${new Date(exp * 1000).toUTCString()}.`, recommendation: 'Do not use this token. Request a new one.' })
  }

  if (!payload.iss) {
    results.push({ id: 'NO_ISSUER', severity: 'low', title: 'No issuer claim (iss)', description: 'Without an issuer, it is harder to validate which service created this token.', recommendation: 'Include iss in your token payload to identify the token issuer.' })
  }

  if (exp && iat) {
    const lifetimeHours = (exp - iat) / 3600
    if (lifetimeHours > 24 * 30) {
      results.push({ id: 'LONG_EXPIRY', severity: 'medium', title: `Long token lifetime (${Math.round(lifetimeHours / 24)} days)`, description: 'Access tokens with very long lifetimes increase the risk window if compromised.', recommendation: 'Use short-lived access tokens (15–60 min) with refresh tokens for long sessions.' })
    }
  }

  const sensitiveKeys = ['password', 'secret', 'token', 'key', 'credit', 'card', 'ssn', 'cvv']
  const payloadStr = JSON.stringify(payload).toLowerCase()
  if (sensitiveKeys.some(k => payloadStr.includes(k))) {
    results.push({ id: 'SENSITIVE_DATA', severity: 'high', title: 'Potentially sensitive data in payload', description: 'JWT payloads are Base64-encoded, not encrypted. Anyone with the token can read its contents.', recommendation: 'Never store passwords, secrets, or sensitive PII in JWT payloads. Use opaque tokens for sensitive data.' })
  }

  if (results.length === 0) {
    results.push({ id: 'ALL_PASS', severity: 'pass', title: 'No issues found', description: 'This token passes all standard security checks.' })
  }

  return results
}

function getAlgSecurity(alg: string) {
  if (['HS256', 'HS384', 'HS512'].includes(alg)) return { level: 'amber', icon: '⚠', label: 'Symmetric' }
  if (['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512', 'PS256', 'PS384', 'PS512'].includes(alg)) return { level: 'green', icon: '✓', label: 'Asymmetric' }
  if (alg.toLowerCase() === 'none') return { level: 'red', icon: '✗', label: 'None' }
  return { level: 'muted', icon: '?', label: 'Unknown' }
}

function highlightJson(obj: unknown): string {
  let json = JSON.stringify(obj, null, 2)
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
    let cls = 'sh-num'
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        return `<span class="sh-key">${match.slice(0, -1)}</span>:`
      } else {
        cls = 'sh-str'
      }
    } else if (/true|false/.test(match)) cls = 'sh-bool'
    else if (/null/.test(match)) cls = 'sh-null'
    return `<span class="${cls}">${match}</span>`
  })
}

function TokenTimeline({ iat, nbf, exp }: { iat?: number, nbf?: number, exp?: number }) {
  if (!exp && !iat) return null;
  const now = Math.floor(Date.now() / 1000);
  
  const minTime = Math.min(iat || now, nbf || now, exp || now, now);
  const maxTime = Math.max(iat || now, nbf || now, exp || now, now);
  const range = maxTime - minTime || 1;
  
  const getPct = (t: number) => ((t - minTime) / range) * 100;
  
  const iatPct = iat ? getPct(iat) : null;
  const nbfPct = nbf ? getPct(nbf) : null;
  const expPct = exp ? getPct(exp) : null;
  const nowPct = getPct(now);
  
  return (
    <div className="flex flex-col w-full relative pt-6 pb-10 px-4">
       <div className="absolute top-8 left-4 right-4 h-1.5 bg-[--ts-border] rounded-full overflow-hidden">
         <div 
           className="absolute top-0 bottom-0 bg-[--ts-ink-900]" 
           style={{ left: `${iatPct ?? 0}%`, width: `${Math.max(0, Math.min(nowPct, expPct ?? 100) - (iatPct ?? 0))}%` }}
         />
         {expPct !== null && nowPct > expPct && (
           <div 
             className="absolute top-0 bottom-0 bg-[--ts-error]" 
             style={{ left: `${expPct}%`, width: `${nowPct - expPct}%` }}
           />
         )}
       </div>
       
       {iat && (
         <div className="absolute top-8 w-px h-3 bg-[--ts-ink-400] -translate-x-1/2 -mt-0.5" style={{ left: `calc(1rem + ${iatPct}% * calc(100% - 2rem) / 100)` }}>
           <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
             <span className="text-[10px] font-bold text-[--ts-ink-900]">Issued</span>
             <span className="text-[10px] text-[--ts-ink-500] whitespace-nowrap">{new Date(iat * 1000).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
           </div>
         </div>
       )}
       {nbf && nbf !== iat && (
         <div className="absolute top-8 w-px h-3 bg-[--ts-ink-400] -translate-x-1/2 -mt-0.5" style={{ left: `calc(1rem + ${nbfPct}% * calc(100% - 2rem) / 100)` }}>
           <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
             <span className="text-[10px] font-bold text-[--ts-ink-900]">Not Before</span>
           </div>
         </div>
       )}
       {exp && (
         <div className="absolute top-8 w-px h-3 bg-[--ts-ink-400] -translate-x-1/2 -mt-0.5" style={{ left: `calc(1rem + ${expPct}% * calc(100% - 2rem) / 100)` }}>
           <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center">
             <span className="text-[10px] font-bold text-[--ts-ink-900]">Expires</span>
             <span className="text-[10px] text-[--ts-ink-500] whitespace-nowrap">{new Date(exp * 1000).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
           </div>
         </div>
       )}
       <div className="absolute top-8 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm -translate-x-1/2 -translate-y-1/2 z-10" 
            style={{ 
              left: `calc(1rem + ${nowPct}% * calc(100% - 2rem) / 100)`, 
              background: (exp && now > exp) ? 'var(--ts-error)' : 'var(--ts-ink-900)',
              borderColor: 'white'
            }}>
         <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
           <span className="text-[10px] font-bold" style={{ color: (exp && now > exp) ? 'var(--ts-error)' : 'var(--ts-ink-900)' }}>Now</span>
         </div>
       </div>
    </div>
  )
}

// ── Components ─────────────────────────────────────────────────────────────────
export default function JwtDecoderPage() {
  const tool = getToolById('jwt-decoder')!
  const [activeTab, setActiveTab] = useState<Tab>('decoder')

  const [input, setInput] = useState('')
  const [validation, setValidation] = useState<ValidationResult>({ valid: false, error: 'EMPTY' })
  const [timeLeft, setTimeLeft] = useState('')
  const [auditResults, setAuditResults] = useState<AuditResult[]>([])

  const handleInput = useCallback((val: string) => {
    let clean = val.trim()
    if (/^bearer\s+/i.test(clean)) clean = clean.replace(/^bearer\s+/i, '')
    setInput(clean)
    
    const result = validateJWT(clean)
    setValidation(result)
    
    if (result.valid && result.decoded) {
      setAuditResults(auditJWT(result.decoded.header, result.decoded.payload))
    } else {
      setAuditResults([])
    }
  }, [])

  useEffect(() => {
    addRecentTool('jwt-decoder')
    const incoming = consumeIncomingContent()
    if (incoming) {
      handleInput(incoming)
    }
  }, [handleInput])

  useEffect(() => {
    if (!validation.valid || !validation.decoded?.payload?.exp) {
      setTimeLeft('')
      return
    }
    const exp = validation.decoded.payload.exp as number
    
    const updateTime = () => {
      const now = Math.floor(Date.now() / 1000)
      const diff = exp - now
      if (diff <= 0) {
        const agoDiff = -diff
        const d = Math.floor(agoDiff / 86400)
        const h = Math.floor((agoDiff % 86400) / 3600)
        setTimeLeft(d > 0 ? `Expired ${d} days ago` : h > 0 ? `Expired ${h} hours ago` : `Expired`)
      } else {
        const d = Math.floor(diff / 86400)
        const h = Math.floor((diff % 86400) / 3600)
        const m = Math.floor((diff % 3600) / 60)
        const s = diff % 60
        setTimeLeft(d > 0 ? `Expires in ${d}d ${h}h` : h > 0 ? `Expires in ${h}h ${m}m` : `Expires in ${m}m ${s}s`)
      }
    }
    
    updateTime()
    const int = setInterval(updateTime, 1000)
    return () => clearInterval(int)
  }, [validation])

  const findClaim = (claim: string) => {
    setActiveTab('decoder')
    setTimeout(() => {
      const el = document.getElementById(`claim-row-${claim}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('bg-[--ts-gold-light]')
        setTimeout(() => el.classList.remove('bg-[--ts-gold-light]'), 2000)
      } else {
        alert('Claim not present in current token')
      }
    }, 100)
  }

  const { valid, error, message, parts, decoded } = validation

  return (
    <PageTransition>
      <ToolHeader tool={tool} outputReady={valid} />

      <div className="card p-0 overflow-hidden mb-6 flex flex-col">
        {/* Tab Bar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[--ts-surface] border-b border-[--ts-border] overflow-x-auto">
          {[
            { id: 'decoder', label: 'Decoder' },
            { id: 'reference', label: 'Claims Reference' },
            { id: 'security', label: 'Security Audit' },
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

        {activeTab === 'decoder' && (
          <div className="flex flex-col flex-1">
            {/* Input Zone */}
            <div className="p-4 border-b border-[--ts-border] bg-white relative">
              <div className="flex justify-between items-end mb-2">
                <span className="section-label">Paste JWT Token Here</span>
                {input && <button onClick={() => handleInput('')} className="text-xs font-semibold text-[--ts-ink-400] hover:text-[--ts-error]">Clear</button>}
              </div>
              <textarea
                value={input}
                onChange={e => handleInput(e.target.value)}
                placeholder={"Paste your JWT token here...\n\nExample: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIi... \n(auto-strips \"Bearer \" prefix)"}
                className="w-full min-h-[120px] p-3 border border-[--ts-border] rounded-lg font-mono text-sm leading-relaxed text-[--ts-ink-900] resize-y outline-none focus:ring-2 focus:ring-[--ts-gold]/40 break-all"
                spellCheck={false}
              />
            </div>

            {/* Status Bar */}
            {input && (
              <div className="px-4 py-3 border-b border-[--ts-border] bg-[--ts-surface] flex items-center flex-wrap gap-3">
                <div className={`px-3 py-1.5 rounded text-xs font-semibold border flex items-center gap-1.5 ${valid ? 'bg-[--ts-success-bg] text-[--ts-success] border-[--ts-success]/20' : 'bg-[--ts-error-bg] text-[--ts-error] border-[--ts-error]/20'}`}>
                  {valid ? '● Valid Structure' : '⚠ Invalid Structure'}
                </div>
                
                {valid && Boolean(decoded?.payload?.exp) && (
                  <div className={`px-3 py-1.5 rounded text-xs font-semibold border flex items-center gap-1.5 ${timeLeft.includes('Expired') ? 'bg-[--ts-error-bg] text-[--ts-error] border-[--ts-error]/20' : 'bg-[--ts-success-bg] text-[--ts-success] border-[--ts-success]/20'}`}>
                    {timeLeft.includes('Expired') ? '🔴' : '⏱'} {timeLeft}
                  </div>
                )}
                
                {valid && Boolean(decoded?.header?.alg) && (
                  <div className={`px-3 py-1.5 rounded text-xs font-semibold border flex items-center gap-1.5 ${getAlgSecurity(String(decoded?.header?.alg)).level === 'green' ? 'bg-[--ts-success-bg] text-[--ts-success] border-[--ts-success]/20' : getAlgSecurity(String(decoded?.header?.alg)).level === 'amber' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-[--ts-error-bg] text-[--ts-error] border-[--ts-error]/20'}`}>
                    {getAlgSecurity(String(decoded?.header?.alg)).icon} {String(decoded?.header?.alg)}
                  </div>
                )}
                
                {valid && parts && (
                  <div className="text-xs text-[--ts-ink-500] ml-auto font-medium">
                    Header: {parts.headerSize}B · Payload: {parts.payloadSize}B · Signature: {parts.sigSize}B
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {!valid && input && error !== 'EMPTY' && (
              <div className="p-8 text-center text-[--ts-error]">
                <span className="font-semibold block mb-2">{error}</span>
                <span className="text-sm">{message}</span>
              </div>
            )}

            {/* Three Columns & Timeline */}
            {valid && decoded && parts && (
              <div className="flex flex-col bg-white">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-[--ts-border] border-b border-[--ts-border]">
                  
                  {/* Column 1: Header */}
                  <div className="bg-white p-5 flex flex-col">
                    <h3 className="text-sm font-bold text-[--ts-ink-900] mb-4 flex items-center gap-2">
                      <span className="opacity-50">🔒</span> Header
                    </h3>
                    <div className="bg-[--ts-surface] rounded-lg p-3 font-mono text-[13px] leading-relaxed break-all whitespace-pre-wrap flex-1 min-h-[100px] border border-[--ts-border]"
                         dangerouslySetInnerHTML={{ __html: highlightJson(decoded.header) }} />
                    <div className="mt-4 pt-4 border-t border-[--ts-border-soft]">
                      <div className="text-xs mb-2">
                        <span className="font-semibold text-[--ts-ink-700]">alg:</span> <span className="font-mono text-[--ts-ink-500] ml-2">{String(decoded.header.alg || 'none')}</span>
                      </div>
                      {!!decoded.header.typ && (
                        <div className="text-xs mb-2">
                          <span className="font-semibold text-[--ts-ink-700]">typ:</span> <span className="font-mono text-[--ts-ink-500] ml-2">{String(decoded.header.typ)}</span>
                        </div>
                      )}
                      {!!decoded.header.kid && (
                        <div className="text-xs mb-2">
                          <span className="font-semibold text-[--ts-ink-700]">kid:</span> <span className="font-mono text-[--ts-ink-500] ml-2 break-all">{String(decoded.header.kid)}</span>
                          <div className="text-[10px] text-[--ts-ink-400] mt-0.5">Used to identify the signing key</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Column 2: Payload */}
                  <div className="bg-white p-5 flex flex-col">
                    <h3 className="text-sm font-bold text-[--ts-ink-900] mb-4 flex items-center gap-2">
                      <span className="opacity-50">📋</span> Payload
                    </h3>
                    <div className="bg-[--ts-surface] rounded-lg p-3 font-mono text-[13px] leading-relaxed break-all whitespace-pre-wrap border border-[--ts-border]"
                         dangerouslySetInnerHTML={{ __html: highlightJson(decoded.payload) }} />
                    
                    <div className="mt-5 border border-[--ts-border] rounded-lg overflow-hidden">
                      <div className="bg-[--ts-surface] px-3 py-2 border-b border-[--ts-border] text-xs font-semibold text-[--ts-ink-900]">Claim Annotations</div>
                      <div className="flex flex-col">
                        {Object.entries(decoded.payload).map(([key, val]) => (
                          <div id={`claim-row-${key}`} key={key} className="px-3 py-2.5 border-b border-[--ts-border-soft] last:border-0 hover:bg-[--ts-surface] transition-colors">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-mono text-xs font-bold text-[--ts-ink-900]">{key}</span>
                              <span className="text-[10px] text-[--ts-ink-500] bg-white border border-[--ts-border-soft] px-1.5 rounded">{typeof val}</span>
                            </div>
                            <div className="text-[11px] text-[--ts-ink-500] mb-1.5 leading-relaxed">
                              {CLAIM_EXPLANATIONS[key] || 'Custom claim'}
                            </div>
                            {Boolean(['exp', 'iat', 'nbf'].includes(key) && typeof val === 'number') && (
                              <div className="text-[11px] font-mono text-[--ts-ink-700] bg-white border border-[--ts-border-soft] px-1.5 py-0.5 rounded break-all inline-block">
                                {new Date((val as number) * 1000).toUTCString()}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Signature */}
                  <div className="bg-white p-5 flex flex-col">
                    <h3 className="text-sm font-bold text-[--ts-ink-900] mb-4 flex items-center gap-2">
                      <span className="opacity-50">🛡️</span> Signature
                    </h3>
                    <div className="bg-[--ts-surface] rounded-lg p-3 font-mono text-[13px] leading-relaxed break-all border border-[--ts-border] text-[--ts-ink-500]">
                      {parts.signature}
                    </div>
                    
                    <div className="mt-5 border border-[--ts-border] rounded-lg p-3 bg-[--ts-surface]">
                      <div className="text-xs font-semibold text-[--ts-ink-900] mb-2">Algorithm: {String(decoded.header.alg || 'none')}</div>
                      <div className="text-xs text-[--ts-ink-500] mb-1">Type: {getAlgSecurity(String(decoded.header.alg)).label}</div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-[--ts-gold-light] border border-[--ts-gold]/30 rounded-lg">
                      <div className="text-xs font-bold text-[--ts-gold] mb-1 flex items-center gap-1.5">⚠ Signature not verified</div>
                      <div className="text-[11px] text-[--ts-ink-600] leading-relaxed">
                        This tool decodes the token structure without verifying the signature. Never trust token claims in production without signature verification on your server.
                      </div>
                    </div>
                  </div>

                </div>

                {/* Timeline */}
                {Boolean(decoded.payload && (decoded.payload.iat || decoded.payload.nbf || decoded.payload.exp)) && (
                  <div className="bg-[--ts-surface] border-b border-[--ts-border]">
                    <div className="px-5 pt-3 pb-0 text-xs font-semibold text-[--ts-ink-900]">Token Timeline</div>
                    <TokenTimeline 
                      iat={typeof decoded.payload.iat === 'number' ? decoded.payload.iat : undefined}
                      nbf={typeof decoded.payload.nbf === 'number' ? decoded.payload.nbf : undefined}
                      exp={typeof decoded.payload.exp === 'number' ? decoded.payload.exp : undefined}
                    />
                  </div>
                )}

              </div>
            )}
          </div>
        )}

        {/* Tab 2: Claims Reference */}
        {activeTab === 'reference' && (
          <div className="p-6 bg-white min-h-[500px]">
            <h2 className="text-lg font-semibold text-[--ts-ink-900] mb-6">Standard JWT Claims</h2>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              
              <div className="flex flex-col gap-6">
                {/* RFC 7519 */}
                <div className="rounded-xl border border-[--ts-border] overflow-hidden">
                  <div className="bg-[--ts-surface] px-4 py-2 border-b border-[--ts-border]">
                    <h3 className="text-sm font-semibold text-[--ts-ink-900]">RFC 7519 Registered Claims</h3>
                  </div>
                  <table className="w-full text-left text-sm">
                    <tbody>
                      {[
                        { c: 'iss', n: 'Issuer', d: 'Identifies the principal that issued the JWT' },
                        { c: 'sub', n: 'Subject', d: 'Identifies the principal that is the subject of the JWT' },
                        { c: 'aud', n: 'Audience', d: 'Recipients the JWT is intended for' },
                        { c: 'exp', n: 'Expiration Time', d: 'Time after which the JWT must not be accepted' },
                        { c: 'nbf', n: 'Not Before', d: 'Time before which the JWT must not be accepted' },
                        { c: 'iat', n: 'Issued At', d: 'Time at which the JWT was issued' },
                        { c: 'jti', n: 'JWT ID', d: 'Unique identifier for the JWT' },
                      ].map((r, i) => (
                        <tr key={i} className="border-b border-[--ts-border-soft] last:border-0 hover:bg-[--ts-surface]">
                          <td className="px-3 py-2.5 w-16"><span className="font-mono text-[--ts-ink-900] font-bold">{r.c}</span></td>
                          <td className="px-3 py-2.5 w-32 text-xs font-semibold text-[--ts-ink-700]">{r.n}</td>
                          <td className="px-3 py-2.5 text-xs text-[--ts-ink-500]">{r.d}</td>
                          <td className="px-3 py-2.5 w-24 text-right"><button onClick={() => findClaim(r.c)} className="btn text-[10px] py-1 px-2 bg-white">Find in token</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col gap-6">
                {/* OpenID Connect */}
                <div className="rounded-xl border border-[--ts-border] overflow-hidden">
                  <div className="bg-[--ts-surface] px-4 py-2 border-b border-[--ts-border]">
                    <h3 className="text-sm font-semibold text-[--ts-ink-900]">OpenID Connect Claims</h3>
                  </div>
                  <table className="w-full text-left text-sm">
                    <tbody>
                      {[
                        { c: 'name', d: 'Full name' },
                        { c: 'given_name', d: 'Given name(s)' },
                        { c: 'family_name', d: 'Surname(s)' },
                        { c: 'email', d: 'Email address' },
                        { c: 'email_verified', d: 'True if email has been verified' },
                        { c: 'picture', d: 'Profile picture URL' },
                      ].map((r, i) => (
                        <tr key={i} className="border-b border-[--ts-border-soft] last:border-0 hover:bg-[--ts-surface]">
                          <td className="px-3 py-2 w-28"><span className="font-mono text-[--ts-ink-900] font-bold">{r.c}</span></td>
                          <td className="px-3 py-2 text-xs text-[--ts-ink-500]">{r.d}</td>
                          <td className="px-3 py-2 w-24 text-right"><button onClick={() => findClaim(r.c)} className="btn text-[10px] py-1 px-2 bg-white">Find in token</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Common Custom */}
                <div className="rounded-xl border border-[--ts-border] overflow-hidden">
                  <div className="bg-[--ts-surface] px-4 py-2 border-b border-[--ts-border]">
                    <h3 className="text-sm font-semibold text-[--ts-ink-900]">Common Custom Claims</h3>
                  </div>
                  <table className="w-full text-left text-sm">
                    <tbody>
                      {[
                        { c: 'role', d: 'User role for authorization' },
                        { c: 'scope', d: 'OAuth 2.0 permission scopes' },
                        { c: 'org_id', d: 'Organization identifier' },
                        { c: 'tenant_id', d: 'Multi-tenant identifier' },
                      ].map((r, i) => (
                        <tr key={i} className="border-b border-[--ts-border-soft] last:border-0 hover:bg-[--ts-surface]">
                          <td className="px-3 py-2 w-28"><span className="font-mono text-[--ts-ink-900] font-bold">{r.c}</span></td>
                          <td className="px-3 py-2 text-xs text-[--ts-ink-500]">{r.d}</td>
                          <td className="px-3 py-2 w-24 text-right"><button onClick={() => findClaim(r.c)} className="btn text-[10px] py-1 px-2 bg-white">Find in token</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 3: Security Audit */}
        {activeTab === 'security' && (
          <div className="p-6 bg-[--ts-surface] min-h-[500px]">
            {!valid ? (
               <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-[--ts-border] rounded-xl">
                 <span className="text-sm font-medium text-[--ts-ink-900]">No Token Analyzed</span>
                 <span className="text-xs text-[--ts-ink-500] mt-1">Paste a valid JWT token in the Decoder tab to run a security audit.</span>
               </div>
            ) : (
              <div className="max-w-3xl mx-auto flex flex-col gap-4">
                {auditResults.map(res => {
                  const colors = {
                    critical: 'border-red-500 bg-red-50',
                    high: 'border-orange-500 bg-orange-50',
                    medium: 'border-amber-500 bg-amber-50',
                    low: 'border-blue-500 bg-blue-50',
                    pass: 'border-green-500 bg-green-50',
                  }
                  const badgeColors = {
                    critical: 'bg-red-500 text-white',
                    high: 'bg-orange-500 text-white',
                    medium: 'bg-amber-500 text-white',
                    low: 'bg-blue-500 text-white',
                    pass: 'bg-green-500 text-white',
                  }
                  return (
                    <div key={res.id} className={`p-4 rounded-lg border border-l-4 shadow-sm bg-white ${colors[res.severity].split(' ')[0]}`}>
                      <div className="flex items-start gap-3">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shrink-0 ${badgeColors[res.severity]}`}>
                          {res.severity}
                        </span>
                        <div className="flex flex-col flex-1">
                          <span className="text-sm font-bold text-[--ts-ink-900] mb-1">{res.title}</span>
                          <span className="text-xs text-[--ts-ink-600] leading-relaxed mb-2">{res.description}</span>
                          {res.recommendation && (
                            <span className="text-xs font-medium text-[--ts-ink-800] bg-[--ts-surface] p-2 rounded">
                              <span className="opacity-60 mr-1">Recommendation:</span>{res.recommendation}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>

      <WorkflowBar toolId="jwt-decoder" hasOutput={valid} />
      <ExportBar 
        toolId="jwt-decoder" 
        content={valid && decoded ? safeJsonExport({ header: decoded.header, payload: decoded.payload, audit: auditResults }) : ''}
        hasOutput={valid} 
      />

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
