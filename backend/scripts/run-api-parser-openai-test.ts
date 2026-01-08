import "dotenv/config";
import handler from "../lambda/api/parser";

// Fail fast in this test if the LLM call fails.
process.env.REQUIRE_LLM = "true";

function keyStatus() {
  const key = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) return "missing";
  return `present (length=${key.length})`;
}

function endpointStatus() {
  const endpoint = process.env.LLM_ENDPOINT || (process.env.OPENAI_API_KEY ? "https://api.openai.com/v1/responses" : "");
  return endpoint || "(none)";
}

function modelStatus() {
  return process.env.LLM_MODEL || process.env.OPENAI_MODEL || "(default: gpt-4o-mini)";
}

function flagStatus() {
  const enableExtract = (process.env.ENABLE_LLM_EXTRACTION || "").toLowerCase() === "true";
  const requireLLM = (process.env.REQUIRE_LLM || "").toLowerCase() === "true";
  return { enableExtract, requireLLM };
}

async function run() {
  const files = [
    {
      filename: "README.md",
      content:
        "# System Overview\n\nThis AI system provides CV screening support. It runs a React frontend + API Gateway + Lambda backend.\n",
    },
    {
      filename: "training_logs.log",
      content:
        "Training: dataset=internal_hr_v3.csv; preprocessing=deduplicate, normalize; model=bert-base; metrics=accuracy 0.91 f1 0.87\n",
    },
    {
      filename: "config.yaml",
      content:
        "runtime_environment: AWS Lambda Node.js 20\nregion: eu-west-1\nlogging: cloudwatch\n",
    },
  ];

  const event: any = {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files }),
    isBase64Encoded: false,
  };

  const resp = await handler(event as any, {} as any, () => {});
  if (!resp) {
    throw new Error("Handler returned void. Ensure the handler returns a result (not only via callback).")
  }

  const result = resp as any;
  console.log("LLM endpoint:", endpointStatus());
  console.log("LLM model:", modelStatus());
  console.log("LLM key:", keyStatus());
  console.log("Flags:", flagStatus());
  console.log("STATUS:", result.statusCode);

  if (result.statusCode !== 200) {
    console.log("RAW BODY:", result.body);
    throw new Error(`Non-200 response: ${result.statusCode}`);
  }

  const body = JSON.parse(result.body as any);
  console.log("FACTS:");
  console.log(JSON.stringify(body?.facts, null, 2));
}

run().catch((err) => {
  console.error("TEST FAILED:");
  console.error(err);
  // Avoid hard exit on Windows; lets Node cleanly drain handles.
  process.exitCode = 1;
});
