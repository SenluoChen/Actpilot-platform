import { APIGatewayProxyHandler } from 'aws-lambda';
import { queryByCompany } from '../infra/ddb';

function decodeToken(t?: string) { if (!t) return undefined; try { return JSON.parse(Buffer.from(t, 'base64').toString('utf8')); } catch { return undefined; } }
function encodeToken(obj: any) { return Buffer.from(JSON.stringify(obj)).toString('base64'); }

export const main: APIGatewayProxyHandler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,x-api-key',
    'Access-Control-Allow-Methods': 'OPTIONS,GET',
    'Content-Type': 'application/json'
  };
  const method = (event.requestContext as any)?.http?.method || (event as any).httpMethod;
  if (method === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  try {
    const company = event.queryStringParameters?.company;
    const limit = Math.min(parseInt(event.queryStringParameters?.limit || '10', 10), 50);
    const next = decodeToken(event.queryStringParameters?.nextToken);
    if (!company) return { statusCode: 400, headers, body: JSON.stringify({ erreur: 'company requis' }) };

    const res = await queryByCompany(company, limit, next);
    return { statusCode: 200, headers, body: JSON.stringify({
      items: (res.Items || []).map(i => ({ id: i.id, company: i.company, createdAt: i.createdAt, riskLevel: i.riskLevel, pdfKey: i.pdfKey })),
      nextToken: res.LastEvaluatedKey ? encodeToken(res.LastEvaluatedKey) : null
    }) };
  } catch (e: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ erreur: e?.message || String(e) }) };
  }
};
