import { APIGatewayProxyHandler } from 'aws-lambda';
import { classify } from '../usecases/classify';

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
    const result = classify(body.useCase || '');
    return { statusCode: 200, headers, body: JSON.stringify({
      entreprise: (body.company ?? '').trim(),
      email: (body.email ?? '').trim(),
      usage: (body.useCase ?? '').trim(),
      sourceDonnees: (body.dataSource ?? '').trim(),
      supervisionHumaine: body.hasHumanSupervision ? 'Oui' : 'Non',
      ...result
    }) };
  } catch (e: any) {
    return { statusCode: 400, headers, body: JSON.stringify({ erreur: e?.message || String(e) }) };
  }
};
