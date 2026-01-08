import "dotenv/config";
import handler from "../lambda/api/parser"

async function run() {
  const files = [
    { filename: "arch.md", content: "# System architecture\nThe system uses a frontend, API Gateway, and Lambdas. Docker on AWS." },
    { filename: "data.json", content: JSON.stringify({ datasets: ["s3://bucket/train.csv"], preprocessing: { steps: ["clean", "normalize"] } }, null, 2) },
    { filename: "model.txt", content: "Model type: transformer (BERT-like)\nEvaluation metrics: accuracy, f1" }
  ]

  const event: any = {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files }),
    isBase64Encoded: false
  }

  const resp = await handler(event as any, {} as any, () => {})
  console.log("HANDLER RESPONSE:", JSON.stringify(resp, null, 2))
}

run().catch(err => { console.error(err); process.exit(1) })
