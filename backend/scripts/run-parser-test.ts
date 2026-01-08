import { parseTechnicalFiles } from "../lambda/usecases/parser"

async function run() {
  const files = [
    { filename: "arch.md", content: "# System architecture\nThe system uses a frontend, API Gateway, and Lambdas. Docker on AWS." },
    { filename: "data.json", content: JSON.stringify({ datasets: ["s3://bucket/train.csv"], preprocessing: { steps: ["clean", "normalize"] } }, null, 2) },
    { filename: "model.txt", content: "Model type: transformer (BERT-like)\nEvaluation metrics: accuracy, f1" }
  ]

  const result = parseTechnicalFiles(files as any)
  console.log("PARSED SIGNALS:\n", JSON.stringify(result, null, 2))
}

run().catch(err => { console.error(err); process.exit(1) })
