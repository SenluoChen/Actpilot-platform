import { callLLM } from "./llmClient"

type UploadedFile = { filename: string; relativePath?: string; content: string }

type Signals = {
  system_architecture?: string
  data_sources?: string
  preprocessing_steps?: string
  model_type?: string
  evaluation_metrics?: string
  runtime_environment?: string
}

export type Evidence = {
  filename: string
  quote: string
}

export type LLMExtractResult = {
  signals: Partial<Record<keyof Signals, string>>
  evidence: Partial<Record<keyof Signals, Evidence[]>>
}

const SIGNAL_KEYS: Array<keyof Signals> = [
  "system_architecture",
  "data_sources",
  "preprocessing_steps",
  "model_type",
  "evaluation_metrics",
  "runtime_environment"
]

function clip(s: string, maxLen: number) {
  const t = (s || "").replace(/\r\n/g, "\n")
  if (t.length <= maxLen) return t
  return t.slice(0, maxLen) + "\n...TRUNCATED..."
}

function fileLabel(f: UploadedFile): string {
  return f.relativePath || f.filename || "unknown"
}

function normalizeValueFromFile(label: string, value: string): string {
  const v = (value || "").trim()
  if (!v) return ""
  return `From ${label}: ${v}`
}

function uniquePush(arr: Evidence[], item: Evidence) {
  const key = `${item.filename}::${item.quote}`
  const seen = new Set(arr.map((e) => `${e.filename}::${e.quote}`))
  if (!seen.has(key)) arr.push(item)
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (it: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let nextIndex = 0

  const workers = new Array(Math.max(1, limit)).fill(0).map(async () => {
    while (true) {
      const i = nextIndex++
      if (i >= items.length) return
      out[i] = await fn(items[i], i)
    }
  })

  await Promise.all(workers)
  return out
}

function extractJsonObject(text: string): any | null {
  const first = text.indexOf("{")
  const last = text.lastIndexOf("}")
  if (first < 0 || last <= first) return null
  const slice = text.slice(first, last + 1)
  try {
    return JSON.parse(slice)
  } catch {
    return null
  }
}

function isEvidenceArray(v: any): v is Evidence[] {
  if (!Array.isArray(v)) return false
  for (const it of v) {
    if (!it || typeof it !== "object") return false
    if (typeof it.filename !== "string") return false
    if (typeof it.quote !== "string") return false
  }
  return true
}

export async function llmExtractSignals(files: UploadedFile[]): Promise<LLMExtractResult | null> {
  const schemaHint = `Return JSON only, matching this schema exactly (no extra keys):\n\n{
  "system_architecture": {"value": string|null, "evidence": [{"filename": string, "quote": string}]},
  "data_sources": {"value": string|null, "evidence": [{"filename": string, "quote": string}]},
  "preprocessing_steps": {"value": string|null, "evidence": [{"filename": string, "quote": string}]},
  "model_type": {"value": string|null, "evidence": [{"filename": string, "quote": string}]},
  "evaluation_metrics": {"value": string|null, "evidence": [{"filename": string, "quote": string}]},
  "runtime_environment": {"value": string|null, "evidence": [{"filename": string, "quote": string}]}
}`

  // Per-file extraction: ensure each file is read by OpenAI.
  const maxFiles = 20
  const maxCharsPerFile = 4500
  const concurrency = 3

  const used = files.slice(0, maxFiles)
  if (!used.length) return { signals: {}, evidence: {} }

  type PerFileResult = { label: string; obj: any | null }

  const perFile = await mapLimit(used, concurrency, async (f): Promise<PerFileResult> => {
    const label = fileLabel(f)
    const fileText = clip(f.content || "", maxCharsPerFile)

    const prompt = `You are an information extraction system.

Task:
- Extract ONLY information explicitly stated in the provided file.
- Do NOT add, infer, guess, or improve any information.
- If a field is not explicitly stated, set its value to null and evidence to an empty array.
- Evidence quotes MUST be verbatim snippets from the provided file.
- Keep values concise. Preserve numbers, versions, regions, and names exactly.

${schemaHint}

FILE: ${label}
"""
${fileText}
"""`

    const out = await callLLM(prompt)
    const obj = extractJsonObject(out)
    return { label, obj }
  })

  const signals: Partial<Record<keyof Signals, string>> = {}
  const evidence: Partial<Record<keyof Signals, Evidence[]>> = {}

  for (const { label, obj } of perFile) {
    if (!obj || typeof obj !== "object") continue

    for (const key of SIGNAL_KEYS) {
      const entry = (obj as any)[key]
      if (!entry || typeof entry !== "object") continue

      const value = (entry as any).value
      const ev = (entry as any).evidence
      if (value !== null && typeof value !== "string") continue
      if (!isEvidenceArray(ev)) continue

      if (typeof value === "string" && value.trim()) {
        const normalized = normalizeValueFromFile(label, value)
        if (normalized) {
          const cur = (signals as any)[key] as string | undefined
          if (!cur) {
            ;(signals as any)[key] = normalized
          } else if (!cur.includes(normalized)) {
            ;(signals as any)[key] = `${cur}\n\n---\n\n${normalized}`
          }
        }
      }

      if (ev.length) {
        const arr = ((evidence as any)[key] as Evidence[] | undefined) || []
        for (const e of ev) {
          uniquePush(arr, { filename: e.filename || label, quote: e.quote })
        }
        if (arr.length) {
          ;(evidence as any)[key] = arr
        }
      }
    }
  }

  return { signals, evidence }
}
