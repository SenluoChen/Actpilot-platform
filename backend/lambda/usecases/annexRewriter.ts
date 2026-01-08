type Signals = {
  system_architecture?: string
  data_sources?: string
  preprocessing_steps?: string
  model_type?: string
  evaluation_metrics?: string
  runtime_environment?: string
}

type Evidence = { filename: string; quote: string }

type EvidenceMap = Partial<Record<keyof Signals, Evidence[]>>

import { callLLM, isLLMConfigured } from "./llmClient"

type Fact = {
  key: string
  value: string | null
  raw_value?: string
  source?: "ai" | "original" | "missing"
  evidence?: Evidence[]
  analysis?: string
}

// Conservative keyword map per field to gate whether the excerpt actually contains the field
const FIELD_KEYWORDS: Record<keyof Signals, string[]> = {
  system_architecture: ["architecture", "microservice", "docker", "kubernetes", "cluster", "vm", "server", "instance", "load balancer", "service mesh"],
  data_sources: ["dataset", "datasets", "csv", "s3", "bucket", "database", "db", "data source", "data sources", "input data", "table"],
  preprocessing_steps: ["preprocess", "pre-processing", "preprocessing", "data cleaning", "feature engineering", "tokeniz", "normaliz", "scal", "imput"],
  model_type: ["transformer", "bert", "gpt", "xgboost", "random forest", "logistic regression", "cnn", "rnn", "lstm", "model type", "model architecture"],
  evaluation_metrics: ["accuracy", "precision", "recall", "f1", "auc", "roc", "mse", "mean squared", "rmse", "evaluation", "metrics", "performance"],
  runtime_environment: ["docker", "kubernetes", "k8s", "python", "node", "runtime", "gpu", "cuda", "cpu", "ubuntu", "centos"]
}

// Negative indicators that suggest the excerpt is *not* asserting a concrete fact for the field
const NEGATIVE_INDICATORS = ["may", "might", "could", "possible", "plan to", "to be decided", "tbd", "under development", "prototype"]

function normalizeText(s: string): string {
  return s.replace(/[\W_]+/g, " ").toLowerCase()
}

function tokens(s: string): string[] {
  return normalizeText(s).split(/\s+/).filter(Boolean)
}

function containsAnyKeyword(text: string, keywords: string[]): boolean {
  const t = normalizeText(text)
  for (const kw of keywords) {
    if (t.indexOf(kw) !== -1) return true
  }
  return false
}

function containsNegativeIndicator(text: string): boolean {
  const t = normalizeText(text)
  return NEGATIVE_INDICATORS.some((ni) => t.indexOf(ni) !== -1)
}

function hasSufficientOverlap(raw: string, rewritten: string): boolean {
  const a = tokens(raw)
  const b = tokens(rewritten)
  if (a.length === 0 || b.length === 0) return false
  const aset = new Set(a)
  let common = 0
  for (const w of b) if (aset.has(w)) common++
  // require at least 20% overlap of the shorter side
  const ratio = common / Math.min(a.length, b.length)
  return ratio >= 0.2
}

function legalSemanticGate(field: keyof Signals, raw: string | undefined, evidence?: Evidence[]): boolean {
  if (!raw || !raw.trim()) return false
  const text = raw

  // If negatives present, block
  if (containsNegativeIndicator(text)) return false

  const keywords = FIELD_KEYWORDS[field] || []

  // Check raw text for keywords
  if (containsAnyKeyword(text, keywords)) return true

  // Check evidence quotes if provided
  if (evidence && evidence.length) {
    for (const e of evidence) {
      if (containsAnyKeyword(e.quote || "", keywords) && !containsNegativeIndicator(e.quote || "")) return true
    }
  }

  // Conservative default: if no keyword found, do not allow
  return false
}

export async function rewriteSignalsToAnnex(signals: Signals, evidenceMap?: EvidenceMap): Promise<{ facts: Fact[] }> {
  const requireLLM = (process.env.REQUIRE_LLM || "").toLowerCase() === "true"
  const keys: Array<keyof Signals> = [
    "system_architecture",
    "data_sources",
    "preprocessing_steps",
    "model_type",
    "evaluation_metrics",
    "runtime_environment"
  ]

  const facts: Fact[] = []

  // Track which evidence/excerpts have been consumed to avoid reusing the same text across fields
  const usedExcerpts = new Set<string>()

  for (const k of keys) {
    const rawCombined = signals[k]
    const fieldEvidence = evidenceMap ? evidenceMap[k] : undefined

    // Build candidate excerpts for this field. Preference: evidence quotes first, then parser excerpts.
    const candidates: { text: string; evidence?: Evidence[] }[] = []

    if (fieldEvidence && fieldEvidence.length) {
      for (const ev of fieldEvidence) {
        const t = (ev.quote || "").trim()
        if (t) candidates.push({ text: t, evidence: [ev] })
      }
    }

    if (rawCombined && rawCombined.trim()) {
      // Parser concatenates snippets with a separator. Split on common separator used by parser.
      const parts = rawCombined.split(/\n\n---\n\n/).map(p => p.trim()).filter(Boolean)
      for (const p of parts) {
        // The parser's part may include a leading 'From <filename>: ' prefix — strip it for matching but keep original for raw_value
        const m = p.match(/^[^:]+:\s*(.*)$/s)
        const excerpt = m ? m[1].trim() : p
        if (excerpt) candidates.push({ text: excerpt })
      }
    }

    // Field-driven: examine each candidate and accept the first that passes the legal gate and uniqueness checks
    let accepted: { text: string; evidence?: Evidence[] } | null = null
    for (const cand of candidates) {
      const norm = normalizeText(cand.text)
      if (usedExcerpts.has(norm)) continue

      // Gate check for this single candidate
      if (!legalSemanticGate(k, cand.text, cand.evidence)) continue

      // Now LLM must be configured to rewrite; otherwise be conservative
      if (!isLLMConfigured()) break

      // Build prompt for this single candidate excerpt
      const prompt = `You are a regulatory writing assistant for the EU AI Act.\n\n` +
        `Task: Read the provided excerpt and produce TWO labeled parts exactly as shown:\n` +
        `ANALYSIS: (1-3 short sentences — list explicit facts found, any missing details, and confidence high/medium/low).\n` +
        `REWRITTEN: (a single concise paragraph, regulator-facing EU AI Act tone, preserving only facts explicitly stated in the excerpt; do NOT infer or invent).\n\n` +
        `If you cannot confidently produce a rewritten EU-AI-Act-style sentence that is strictly supported by the excerpt, output \"REWRITTEN: NULL\".\n\n` +
        `Excerpt:\n"""\n${cand.text}\n"""\n` +
        (cand.evidence && cand.evidence.length ? `\nEvidence quotes:\n${cand.evidence.map((e) => `- ${e.filename}: ${e.quote}`).join("\n")}\n` : "")

      try {
        const llmOut = await callLLM(prompt)
        const text = llmOut ? llmOut.trim() : ""

        let analysis: string | undefined = undefined
        let rewrittenText = text

        const labeledMatch = text.match(/ANALYSIS:\s*([\s\S]*?)\nREWRITTEN:\s*([\s\S]*)$/i)
        if (labeledMatch) {
          analysis = labeledMatch[1].trim()
          rewrittenText = labeledMatch[2].trim()
        } else {
          try {
            const p = JSON.parse(text)
            if (p && typeof p === "object") {
              if (p.analysis) analysis = String(p.analysis)
              if (p.rewritten) rewrittenText = String(p.rewritten)
            }
          } catch (_) {}
        }

        if (!rewrittenText || rewrittenText.toUpperCase() === "NULL") {
          // candidate didn't produce a valid rewrite; try next
          continue
        }

        if (!hasSufficientOverlap(cand.text, rewrittenText)) {
          // suspicious: rewritten content doesn't sufficiently overlap; reject
          continue
        }

        // Accept this candidate
        accepted = { text: cand.text, evidence: cand.evidence }
        // mark as used (normalized) so other fields won't reuse same text
        usedExcerpts.add(norm)

        facts.push({ key: k, value: rewrittenText, raw_value: cand.text, source: "ai", evidence: cand.evidence, analysis })
        break
      } catch (e) {
        if (requireLLM) throw e
        // on error, do not invent — move to next candidate
        continue
      }
    }

    if (!accepted) {
      // No candidate accepted for this field — return null for the field
      const rawPreview = rawCombined && rawCombined.trim() ? rawCombined : undefined
      facts.push({ key: k, value: null, raw_value: rawPreview, source: "missing", evidence: fieldEvidence })
    }
  }

  return { facts }
}

export default rewriteSignalsToAnnex
