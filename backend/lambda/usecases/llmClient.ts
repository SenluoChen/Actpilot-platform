type LLMConfig = {
  apiKey?: string
  endpoint?: string
  model?: string
  requireLLM: boolean
}

import { fetch } from 'undici'

function getConfig(): LLMConfig {
  const requireLLM = (process.env.REQUIRE_LLM || "").toLowerCase() === "true"
  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY
  const endpoint =
    process.env.LLM_ENDPOINT ||
    (process.env.OPENAI_API_KEY ? "https://api.openai.com/v1/responses" : undefined)
  const model = process.env.LLM_MODEL || process.env.OPENAI_MODEL
  return { apiKey, endpoint, model, requireLLM }
}

function requireConfigured(cfg: LLMConfig) {
  // Enforce that OpenAI is always used and configured.
  if (cfg.apiKey && cfg.endpoint && cfg.endpoint.toLowerCase().includes("api.openai.com")) return
  throw new Error(
    "OpenAI is not configured. Set OPENAI_API_KEY and ensure LLM_ENDPOINT points to api.openai.com."
  )
}

export async function callLLM(prompt: string): Promise<string> {
  const cfg = getConfig()
  requireConfigured(cfg)

  // Debug: log the endpoint being used so we can verify OpenAI is targeted.
  try {
    console.log("LLM call endpoint:", cfg.endpoint)
  } catch (_) {}

  if (!cfg.endpoint || !cfg.apiKey) {
    // No fallback allowed: require OpenAI configuration.
    throw new Error("LLM not configured. Set OPENAI_API_KEY and LLM_ENDPOINT to api.openai.com")
  }

  const endpointLower = cfg.endpoint.toLowerCase()

  // OpenAI Responses API
  if (endpointLower.includes("api.openai.com") && endpointLower.includes("/v1/responses")) {
    const res = await fetch(cfg.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model: cfg.model || "gpt-4o-mini",
        input: prompt,
        temperature: 0
      })
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      throw new Error(`LLM error ${res.status}${errText ? `: ${errText.slice(0, 2000)}` : ""}`)
    }
    const data: any = await res.json()

    if (typeof data?.output_text === "string" && data.output_text.trim()) return data.output_text

    const output = data?.output
    if (Array.isArray(output)) {
      const chunks: string[] = []
      for (const item of output) {
        const content = item?.content
        if (!Array.isArray(content)) continue
        for (const c of content) {
          const t = c?.text
          if (typeof t === "string" && t.trim()) chunks.push(t)
        }
      }
      if (chunks.length) return chunks.join("\n").trim()
    }

    return data?.text || JSON.stringify(data)
  }

  // OpenAI Chat Completions API
  if (endpointLower.includes("api.openai.com") && endpointLower.includes("/v1/chat/completions")) {
    const res = await fetch(cfg.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({
        model: cfg.model || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0
      })
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => "")
      throw new Error(`LLM error ${res.status}${errText ? `: ${errText.slice(0, 2000)}` : ""}`)
    }
    const data: any = await res.json()
    const content = data?.choices?.[0]?.message?.content
    if (typeof content === "string" && content.trim()) return content
    return JSON.stringify(data)
  }

  // Generic gateway
  const res = await fetch(cfg.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({ prompt, max_tokens: 900, temperature: 0 })
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => "")
    throw new Error(`LLM error ${res.status}${errText ? `: ${errText.slice(0, 2000)}` : ""}`)
  }
  const data: any = await res.json()
  return data.text || (data.choices && data.choices[0] && data.choices[0].text) || JSON.stringify(data)
}

export function isLLMConfigured(): boolean {
  const cfg = getConfig()
  return Boolean(cfg.apiKey && cfg.endpoint && cfg.endpoint.toLowerCase().includes("api.openai.com"))
}

export function isExtractionEnabled(): boolean {
  return (process.env.ENABLE_LLM_EXTRACTION || "").toLowerCase() === "true"
}
