import * as fs from 'fs';
import * as path from 'path';

// Import handlers
import { main as classify } from '../lambda/classify';
import { main as statement } from '../lambda/statement';

function ok(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function run() {
  console.log('Running local tests: classify -> statement (JSON) -> statement (PDF)');

  // 1) classify (JSON)
  const classifyEvent = require('../events/apigw-post.json');
  const cRes = await classify(classifyEvent);
  ok(cRes && cRes.statusCode === 200, 'classify did not return statusCode 200');
  const cBody = JSON.parse(cRes.body);
  ok(cBody.usage || cBody.classification, 'classify response body missing expected keys (usage/classification)');
  console.log('classify JSON OK');

  // 2) statement (JSON)
  const statementEvent = JSON.parse(JSON.stringify(require('../events/apigw-post.json')));
  const sRes = await statement(statementEvent);
  ok(sRes && sRes.statusCode === 200, 'statement (JSON) did not return statusCode 200');
  const sBody = JSON.parse(sRes.body);
  ok(sBody.company && sBody.useCase, 'statement JSON missing expected keys (company/useCase)');
  console.log('statement JSON OK');

  // 3) statement (PDF via Accept header)
  const pdfEvent = JSON.parse(JSON.stringify(require('../events/apigw-post.json')));
  pdfEvent.headers = pdfEvent.headers || {};
  pdfEvent.headers['Accept'] = 'application/pdf';
  const pdfRes = await statement(pdfEvent);

  // The handler may return isBase64Encoded for binary responses
  const isBase64 = (pdfRes && (pdfRes as any).isBase64Encoded) || false;
  ok(pdfRes && pdfRes.statusCode === 200, 'statement (PDF) did not return statusCode 200');
  ok(isBase64 === true, 'statement PDF response was not base64 encoded');

  const pdfBase64 = (pdfRes as any).body;
  ok(typeof pdfBase64 === 'string' && pdfBase64.length > 100, 'PDF body empty or too small');

  // write to tmp/statement.test.pdf
  const outDir = path.resolve(__dirname, '..', 'tmp');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'statement.test.pdf');
  fs.writeFileSync(outPath, Buffer.from(pdfBase64, 'base64'));
  console.log('Wrote PDF to', outPath);

  console.log('All local tests passed');
}

run().catch(err => {
  console.error('Test failed:', err && err.message ? err.message : err);
  process.exitCode = 2;
});
