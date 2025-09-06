import { APIGatewayProxyHandler } from 'aws-lambda';
import { classify } from '../usecases/classify';
import { buildStatement } from '../usecases/statement';
import { generatePdfBuffer } from '../usecases/pdf';
import { sha256Hex, sanitizeCompany } from '../usecases/crypto';
import { putJson, putBuffer, presignGet } from '../infra/s3';
import { saveStatementMeta } from '../infra/ddb';
import { BUCKET } from '../infra/env';

type SubmitBody = {
  company: string;
  email: string;
  useCase: string;
  dataSource?: string;
  hasHumanSupervision?: boolean;
  [k: string]: unknown;
};

// 解析 body（支援 isBase64Encoded）
function parseJsonBody(event: any): SubmitBody {
  if (!event?.body) return {} as any;
  if (event.isBase64Encoded) {
    const raw = Buffer.from(event.body, 'base64').toString('utf8');
    return JSON.parse(raw);
  }
  return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
}

export const main: APIGatewayProxyHandler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,x-api-key',
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
    'Content-Type': 'application/json'
  };

  const method = (event as any)?.httpMethod || (event.requestContext as any)?.http?.method;
  if (method === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  try {
    // 1) 解析輸入 & 驗證
    let body: SubmitBody;
    try {
      body = parseJsonBody(event);
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ erreur: 'Invalid JSON body' }) };
    }

    const company = body?.company?.toString().trim();
    const email = body?.email?.toString().trim();
    const useCase = body?.useCase?.toString().trim();

    if (!company || !email || !useCase) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ erreur: 'Champs requis: company, email, useCase' })
      };
    }

    // 2) 分類 & 建立聲明
    const result = classify(useCase);
    const stmt = buildStatement(
      { ...body, company, email, useCase },
      result
    );

    // 3) 計算哈希、建立驗證連結
    const jsonBuffer = Buffer.from(JSON.stringify(stmt));
    const hash = sha256Hex(jsonBuffer);

    const host = event.headers?.['x-forwarded-host'] || event.headers?.host;
    const stage = (event.requestContext as any)?.stage || 'prod';
    const proto = (event.headers?.['x-forwarded-proto'] || 'https').split(',')[0];
    const baseUrl = `${proto}://${host}/${stage}`;
    const verifyUrl = `${baseUrl}/verify?id=${encodeURIComponent(stmt.id)}&hash=${hash}`;

    // 4) 產 PDF
    const pdfBuffer = await generatePdfBuffer(stmt, hash, verifyUrl);

    // 5) 上傳 S3（json + pdf）
    const folder = `${sanitizeCompany(company)}/${stmt.submittedAt.slice(0, 10)}/${stmt.id}`;
    const jsonKey = `${folder}/statement.json`;
    const pdfKey = `${folder}/statement.pdf`;

    await putJson(BUCKET, jsonKey, stmt);
    await putBuffer(BUCKET, pdfKey, pdfBuffer, 'application/pdf');

    // 6) 寫入 DDB metadata
    await saveStatementMeta({
      id: stmt.id,
      company: stmt.company,
      email: stmt.email,
      createdAt: stmt.submittedAt,
      riskLevel: result.classification,
      hash,
      jsonKey,
      pdfKey,
    });

    // 7) 回傳預簽名下載 URL（有效 600 秒）
    const pdfUrl = await presignGet(BUCKET, pdfKey, 600);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        statementId: stmt.id,
        pdfUrl,
        hash,
        risk: result.classification,
      }),
    };
  } catch (e: any) {
    // 以防錯誤訊息不是字串
    const msg = typeof e?.message === 'string' ? e.message : String(e);
    return { statusCode: 500, headers, body: JSON.stringify({ erreur: msg }) };
  }
};
