import { APIGatewayProxyHandler } from 'aws-lambda';
import { buildStatement } from '../usecases/statement';
import { ClassifyResult } from '../usecases/types';

export const main: APIGatewayProxyHandler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
    'Content-Type': 'application/json'
  };
  const method = (event.requestContext as any)?.http?.method || (event as any).httpMethod;
  if (method === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body ?? {});
    const cls: ClassifyResult = {
      classification: body.classification ?? 'Non précisé',
      label: body.label ?? 'N/A',
      explication: body.explication ?? '',
      checklist: body.checklist ?? []
    };
    const stmt = buildStatement(body, cls);
    return { statusCode: 200, headers, body: JSON.stringify(stmt) };
  } catch (e: any) {
    return { statusCode: 400, headers, body: JSON.stringify({ erreur: e?.message || String(e) }) };
  }
};
