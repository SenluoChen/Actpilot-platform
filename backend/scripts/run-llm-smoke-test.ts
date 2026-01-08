import "dotenv/config";
import { callLLM, isLLMConfigured } from "../lambda/usecases/llmClient";

// In a smoke test, fail loudly when LLM is configured but calls fail.
process.env.REQUIRE_LLM = "true";

async function run() {
  console.log("LLM configured:", isLLMConfigured());
  const out = await callLLM(
    "ANALYSIS: Say 'ok'.\nREWRITTEN: Say 'ok'.\n\nReturn exactly those two labeled lines."
  );
  console.log("OUTPUT:\n" + out);
}

run().catch((err) => {
  console.error("LLM SMOKE TEST FAILED:");
  console.error(err);
  process.exitCode = 1;
});
