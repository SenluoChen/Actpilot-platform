import { APIGatewayProxyHandler } from 'aws-lambda';
import { getStatementById } from '../infra/ddb';

export const main: APIGatewayProxyHandler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,GET',
    'Content-Type': 'application/json'
  };
  const method = (event.requestContext as any)?.http?.method || (event as any).httpMethod;
  if (method === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  try {
    const id = event.queryStringParameters?.id;
    const hash = event.queryStringParameters?.hash;
    if (!id) return { statusCode: 400, headers, body: JSON.stringify({ erreur: 'id requis' }) };

    const item = await getStatementById(id);
    if (!item) return { statusCode: 404, headers, body: JSON.stringify({ valid: false, erreur: 'introuvable' }) };

    const ok = hash ? (item.hash === hash) : true;
    return { statusCode: 200, headers, body: JSON.stringify({
      valid: ok, id, company: item.company, createdAt: item.createdAt, riskLevel: item.riskLevel, hash: item.hash
    }) };
  } catch (e: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ erreur: e?.message || String(e) }) };
  }
};
