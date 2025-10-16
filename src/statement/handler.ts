import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { StatementSchema, PdfLaxSchema } from './schema';
import { mapPayloadToSections } from './mapper';
import { renderPdfKit } from './renderers/pdfkitRenderer';
import streamBuffers from 'stream-buffers';

export const main = async (event: any): Promise<any> => {
  const requestId = event?.requestContext?.requestId || event?.requestContext?.requestId || undefined;
  try {
    const method = (event?.httpMethod || event?.requestContext?.http?.method || '').toUpperCase();
    const wantsPdf = ((event?.headers?.Accept || event?.headers?.accept || '').toLowerCase().includes('application/pdf') || (event?.queryStringParameters?.format||'').toLowerCase() === 'pdf' || method === 'GET');
    const body = typeof event.body === 'string' ? (event.body ? JSON.parse(event.body) : {}) : (event.body || {});

    const parsed = wantsPdf ? PdfLaxSchema.safeParse(body) : StatementSchema.safeParse(body);
    if (!parsed.success) {
      return {
        statusCode: 422,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Accept,Authorization,x-api-key' },
        body: JSON.stringify({ ok: false, errors: parsed.error.format(), requestId })
      };
    }

    const input = parsed.data as any;
    if (!wantsPdf) {
      const { sections, missing } = mapPayloadToSections(input.payload || {}, input.locale || 'en', input.options || {});
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Accept,Authorization,x-api-key' },
        body: JSON.stringify({ ok: true, template: input.template, theme: input.theme, locale: input.locale, sections, missing })
      };
    }

    // PDF mode
    const { sections } = mapPayloadToSections(input.payload || {}, input.locale || 'en', input.options || {});

    const writable = new streamBuffers.WritableStreamBuffer();
    await renderPdfKit(sections, writable, { theme: input.theme });
    const buffer = writable.getContents ? writable.getContents() : null;
    if (!buffer) return { statusCode: 502, body: 'PDF generation failed' };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/pdf', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Accept,Authorization,x-api-key' },
      isBase64Encoded: true,
      body: buffer.toString('base64')
    };
  } catch (err: any) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: String(err) }) };
  }
};
