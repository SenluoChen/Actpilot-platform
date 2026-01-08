import { APIGatewayProxyHandler } from "aws-lambda"
import parseTechnicalFiles from "../usecases/parser"
import rewriteSignalsToAnnex from "../usecases/annexRewriter"
import { llmExtractSignals } from "../usecases/llmExtractor"

type UploadedFile = { filename: string; relativePath?: string; content: string }

const parseMultipart = (body: string, contentType: string): UploadedFile[] => {
  const m = /boundary=(.+)$/.exec(contentType)
  if (!m) return []
  const boundary = `--${m[1]}`
  const parts = body.split(boundary).map(p => p.trim()).filter(Boolean)
  const files: UploadedFile[] = []

  for (const part of parts) {
    if (part === "--" || part === "--\r\n") continue
    const [rawHeaders, ...rest] = part.split("\r\n\r\n")
    if (!rawHeaders || rest.length === 0) continue

    const headers = rawHeaders.split("\r\n")
    const disposition = headers.find(h => /content-disposition/i.test(h)) || ""
    const fnMatch = /filename=\"?([^\";\n]+)\"?/.exec(disposition)
    const nameMatch = /name=\"?([^\";\n]+)\"?/.exec(disposition)
    const filename = fnMatch ? fnMatch[1] : (nameMatch ? nameMatch[1] : "unknown")

    const content = rest.join("\r\n\r\n").replace(/\r\n?--$/, "").replace(/\r\n$/, "")
    files.push({ filename, content })
  }

  return files
}

export const main: APIGatewayProxyHandler = async (event) => {
  try {
    const ct = (event.headers && (event.headers["content-type"] || event.headers["Content-Type"])) || ""
    let files: UploadedFile[] = []

    if (ct.includes("multipart/form-data") && event.body) {
      const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body
      files = parseMultipart(raw, ct)
    } else if (event.body) {
      const raw = event.isBase64Encoded ? Buffer.from(event.body, "base64").toString("utf8") : event.body
      const json = JSON.parse(raw)
      if (Array.isArray(json.files)) {
        files = json.files.map((f: any) => ({ filename: f.filename, relativePath: f.relativePath, content: f.content }))
      } else {
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid body; expected JSON {files: []}" }) }
      }
    } else {
      return { statusCode: 400, body: JSON.stringify({ error: "No body" }) }
    }

    const parsed = parseTechnicalFiles(files as any)

    let evidenceByKey: any = undefined
    // Always run LLM extraction for uploaded files so each file is read by OpenAI.
    // The LLM extractor itself processes per-file and returns merged signals/evidence.
    const llm = await llmExtractSignals(files as any)
    if (llm) {
      evidenceByKey = llm.evidence
      // Merge: only fill missing/empty heuristic signals.
      for (const k of Object.keys(llm.signals) as Array<keyof typeof parsed.signals>) {
        const current = (parsed.signals as any)[k]
        const candidate = (llm.signals as any)[k]
        if ((!current || !String(current).trim()) && candidate && String(candidate).trim()) {
          ;(parsed.signals as any)[k] = String(candidate).trim()
        }
      }
    }

    const rewritten = await rewriteSignalsToAnnex(parsed.signals as any, evidenceByKey)

    // Attach extraction evidence (if any) for transparency.
    const facts = rewritten.facts.map((f: any) => {
      const ev = evidenceByKey ? evidenceByKey[f.key] : undefined
      return ev ? { ...f, evidence: ev } : f
    })

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "POST,OPTIONS"
      },
      body: JSON.stringify({ facts })
    }
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "POST,OPTIONS"
      },
      body: JSON.stringify({ error: err?.message || "internal error" })
    }
  }
}

export default main
