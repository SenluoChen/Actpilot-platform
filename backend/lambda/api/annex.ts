import { APIGatewayProxyHandler } from 'aws-lambda';
import { generateAnnexIVPdfBuffer, AnnexDraftInput } from '../usecases/pdf';

// Parse body and support base64-encoded payloads (similar to other handlers)
function parseJsonBody(event: any): any {
  if (!event?.body) return {};
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
    // Content-Type for binary responses is set on the proxy response below (and via isBase64Encoded)
  };

  const method = (event as any)?.httpMethod || (event.requestContext as any)?.http?.method;
  if (method === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  try {
    let body: AnnexDraftInput;
    try {
      body = parseJsonBody(event);
    } catch (err) {
      return { statusCode: 400, headers, body: JSON.stringify({ erreur: 'Invalid JSON body' }) };
    }

    // Minimal validation: require systemName and intendedPurpose
    if (!body || !body.systemName || !body.intendedPurpose || !body.deploymentSector) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ erreur: 'Required fields: systemName, intendedPurpose, deploymentSector' })
      };
    }

    const pdfBuffer = await generateAnnexIVPdfBuffer(body);

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/pdf' },
      isBase64Encoded: true,
      body: pdfBuffer.toString('base64')
    };
  } catch (e: any) {
    const msg = typeof e?.message === 'string' ? e.message : String(e);
    return { statusCode: 500, headers, body: JSON.stringify({ erreur: msg }) };
  }
};
