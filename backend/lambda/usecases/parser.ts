type UploadedFile = {
  filename: string
  relativePath?: string
  content: string
}

type Signals = {
  system_architecture?: string
  data_sources?: string
  preprocessing_steps?: string
  model_type?: string
  evaluation_metrics?: string
  runtime_environment?: string
}

function normalizeExcerpt(s: string, maxLen = 1200) {
  let t = s.replace(/\r\n/g, "\n").trim()
  t = t.replace(/\n{3,}/g, "\n\n")
  if (t.length > maxLen) t = t.slice(0, maxLen) + ""
  return t
}

const signalKeywords: Record<keyof Signals, string[]> = {
  system_architecture: ["system architecture", "architecture", "system-architecture", "system design"],
  data_sources: ["data sources", "data source", "datasets", "dataset", "input data", "data inputs"],
  preprocessing_steps: ["preprocessing", "pre-processing", "data cleaning", "feature engineering", "preprocessing steps"],
  model_type: ["model type", "model", "architecture", "neural network", "transformer", "xgboost", "random forest", "logistic regression"],
  evaluation_metrics: ["evaluation", "metrics", "evaluation metrics", "performance metrics", "accuracy", "f1", "auc", "precision", "recall"],
  runtime_environment: ["runtime", "environment", "docker", "kubernetes", "python version", "node version", "runtime environment"]
}

function searchJsonForKey(obj: any, keyPatterns: string[], path = ""): string[] {
  const results: string[] = []
  if (obj === null || obj === undefined) return results
  if (typeof obj === "string" || typeof obj === "number" || typeof obj === "boolean") return results

  if (Array.isArray(obj)) {
    for (const v of obj) results.push(...searchJsonForKey(v, keyPatterns, path))
    return results
  }

  for (const k of Object.keys(obj)) {
    const lower = k.toLowerCase()
    for (const p of keyPatterns) {
      if (lower.includes(p.toLowerCase())) {
        try {
          const val = obj[k]
          const s = typeof val === "string" ? val : JSON.stringify(val, null, 2)
          results.push(normalizeExcerpt(s))
        } catch (e) {}
      }
    }
    results.push(...searchJsonForKey(obj[k], keyPatterns, path + "." + k))
  }

  return results
}

export function parseTechnicalFiles(files: UploadedFile[]): { signals: Signals } {
  const aggregated: Partial<Record<keyof Signals, string[]>> = {}

  for (const file of files) {
    const name = file.filename || file.relativePath || "unknown"
    const ext = (name.match(/\.([^.]+)$/) || [])[1]?.toLowerCase() || ""
    const content = file.content || ""

    const push = (signal: keyof Signals, excerpt: string | null) => {
      if (!excerpt) return
      const note = `From ${name}: ${excerpt}`
      aggregated[signal] = aggregated[signal] || []
      if (!aggregated[signal]!.includes(note)) aggregated[signal]!.push(note)
    }

    if (ext === "json") {
      try {
        const obj = JSON.parse(content)
        for (const sig of Object.keys(signalKeywords) as (keyof Signals)[]) {
          const patterns = signalKeywords[sig]
          const found = searchJsonForKey(obj, patterns)
          for (const f of found) push(sig, f)
        }
        continue
      } catch (e) {}
    }

    if (ext === "csv") {
      const firstLine = content.split(/\r?\n/)[0] || ""
      if (firstLine.trim()) {
        const cols = firstLine.split(",").map(c => c.trim()).filter(Boolean)
        if (cols.length) push("data_sources", `columns: ${cols.join(", ")}`)
      }
    }

    if (ext === "yaml" || ext === "yml") {
      const lines = content.split(/\r?\n/)
      for (const sig of Object.keys(signalKeywords) as (keyof Signals)[]) {
        const pats = signalKeywords[sig]
        for (const p of pats) {
          const re = new RegExp("^\\s*" + p.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + "\\s*:\\s*(.+)$", "i")
          for (const l of lines) {
            const m = l.match(re)
            if (m) push(sig, normalizeExcerpt(m[1]))
          }
        }
      }
    }

    const blocks: string[] = []
    const headerSplit = content.split(/(^#{1,6} .*?$)/m)
    if (headerSplit.length > 1) {
      for (let i = 0; i < headerSplit.length; i += 2) {
        const header = headerSplit[i].trim()
        const body = (headerSplit[i + 1] || "").trim()
        if (header) blocks.push(header + "\n" + body)
      }
    } else {
      blocks.push(...content.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean))
    }

    for (const sig of Object.keys(signalKeywords) as (keyof Signals)[]) {
      const pats = signalKeywords[sig]
      let matched = false

      for (const b of blocks) {
        for (const p of pats) {
          if (b.toLowerCase().includes(p.toLowerCase())) {
            push(sig, normalizeExcerpt(b))
            matched = true
            break
          }
        }
        if (matched) break
      }

      if (!matched) {
        for (const p of pats) {
          const labelRe = new RegExp("(?:^|\\n)\\s*" + p.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + "\\s*[:\\-]\\s*(.+)", "i")
          const m = content.match(labelRe)
          if (m && m[1]) {
            push(sig, normalizeExcerpt(m[1]))
            break
          }
        }
      }
    }
  }

  const signals: Signals = {}
  for (const k of Object.keys(signalKeywords) as (keyof Signals)[]) {
    const arr = aggregated[k]
    if (!arr || arr.length === 0) continue
    signals[k] = arr.join("\n\n---\n\n")
  }

  return { signals }
}

export default parseTechnicalFiles
