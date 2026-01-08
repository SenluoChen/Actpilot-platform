import { APIGatewayProxyHandler } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { listUserRecords, putUserRecord } from '../infra/userRecordsDdb';

function decodeToken(t?: string) {
  if (!t) return undefined;
  try {
    return JSON.parse(Buffer.from(t, 'base64').toString('utf8'));
  } catch {
    return undefined;
  }
}

function encodeToken(obj: any) {
  return Buffer.from(JSON.stringify(obj)).toString('base64');
}

function getUserSub(event: any): string | undefined {
  const claims = event?.requestContext?.authorizer?.claims;
  const sub = claims?.sub;
  return typeof sub === 'string' && sub.length > 0 ? sub : undefined;
}

function parseJsonBody(event: any): any {
  if (!event?.body) return undefined;
  if (event.isBase64Encoded) {
    const raw = Buffer.from(event.body, 'base64').toString('utf8');
    return JSON.parse(raw);
  }
  return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
}

export const main: APIGatewayProxyHandler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-api-key',
    'Access-Control-Allow-Methods': 'OPTIONS,GET,POST',
    'Content-Type': 'application/json',
  };

  const method = (event.requestContext as any)?.http?.method || (event as any).httpMethod;
  if (method === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  const userSub = getUserSub(event);
  if (!userSub) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  try {
    if (method === 'GET') {
      const limit = Math.min(parseInt(event.queryStringParameters?.limit || '20', 10), 50);
      const next = decodeToken(event.queryStringParameters?.nextToken);
      const res = await listUserRecords(userSub, limit, next);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          items: (res.Items || []).map((i: any) => ({
            recordId: i.recordId,
            createdAt: i.createdAt,
            type: i.type,
            payload: i.payload,
          })),
          nextToken: res.LastEvaluatedKey ? encodeToken(res.LastEvaluatedKey) : null,
        }),
      };
    }

    if (method === 'POST') {
      let body: any;
      try {
        body = parseJsonBody(event) || {};
      } catch {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON body' }) };
      }

      const recordId = uuidv4();
      const createdAt = new Date().toISOString();
      const type = typeof body?.type === 'string' ? body.type : undefined;
      const payload = body?.payload;

      await putUserRecord({
        userSub,
        recordId,
        createdAt,
        ...(type ? { type } : {}),
        ...(payload !== undefined ? { payload } : {}),
      });

      return { statusCode: 200, headers, body: JSON.stringify({ recordId, createdAt }) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (e: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e?.message || String(e) }) };
  }
};
