import { APIGatewayProxyHandler } from 'aws-lambda';
import PDFDocument from 'pdfkit';
import stream from 'stream';
import { v4 as uuidv4 } from 'uuid';

import { sanitizeCompany } from '../usecases/crypto';
import { putBuffer, presignGet } from '../infra/s3';
import { BUCKET } from '../infra/env';

type ComposedItem = { key: string; label: string; value: string };
type ComposedSection = { id: string; title: string; items: ComposedItem[] };

type RenderBody = {
  systemName?: string;
  sections?: ComposedSection[];
};

function parseJsonBody(event: any): any {
  if (!event?.body) return {};
  if (event.isBase64Encoded) {
    const raw = Buffer.from(event.body, 'base64').toString('utf8');
    return JSON.parse(raw);
  }
  return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
}

async function generateSectionsPdfBuffer(systemName: string, sections: ComposedSection[]): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
  doc.font('Times-Roman');

  const chunks: Buffer[] = [];
  const pass = new stream.PassThrough();
  doc.pipe(pass);
  pass.on('data', (c) => chunks.push(c));

  doc.fontSize(18).text('EU AI Act - Annex IV Technical Documentation (Draft)', { align: 'left' });
  doc.moveDown(0.5);
  doc.fontSize(10).text('Generated automatically by ActPilot (draft for guidance only).');
  doc.moveDown();

  doc.fontSize(12).text(`System Name: ${systemName}`);
  doc.fontSize(10).text(`Generated on: ${new Date().toISOString()}`);
  doc.moveDown(1);

  for (const section of sections) {
    const title = (section?.title ?? '').toString().trim();
    const items = Array.isArray(section?.items) ? section.items : [];
    if (!title && items.length === 0) continue;

    doc.fontSize(14).text(title || 'Section', { underline: true });
    doc.moveDown(0.3);

    if (items.length === 0) {
      doc.fontSize(11).text('-');
      doc.moveDown(0.8);
      continue;
    }

    for (const item of items) {
      const label = (item?.label ?? item?.key ?? '').toString().trim() || 'Field';
      const value = (item?.value ?? '').toString();
      if (!value.trim()) continue;

      doc.fontSize(11).text(label, { continued: false });
      doc.fontSize(11).fillColor('#111').text(value, { width: 500 });
      doc.fillColor('black');
      doc.moveDown(0.4);
    }

    doc.moveDown(0.6);
  }

  // Footer page numbers
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    const pageNum = i + 1;
    doc.fontSize(9).text(`Page ${pageNum} / ${range.count}`, 50, doc.page.height - 40, {
      align: 'center',
      width: doc.page.width - 100,
    });
  }

  doc.end();
  await new Promise<void>((resolve) => pass.on('finish', () => resolve()));
  return Buffer.concat(chunks);
}

export const main: APIGatewayProxyHandler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,x-api-key',
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
    'Content-Type': 'application/json',
  };

  const method = (event as any)?.httpMethod || (event.requestContext as any)?.http?.method;
  if (method === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  try {
    let body: RenderBody;
    try {
      body = parseJsonBody(event);
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ erreur: 'Invalid JSON body' }) };
    }

    const systemName = (body?.systemName ?? '').toString().trim();
    const sections = Array.isArray(body?.sections) ? body.sections : [];

    if (!systemName) {
      return { statusCode: 400, headers, body: JSON.stringify({ erreur: 'Required field: systemName' }) };
    }

    const pdfBuffer = await generateSectionsPdfBuffer(systemName, sections);

    const day = new Date().toISOString().slice(0, 10);
    const safe = sanitizeCompany(systemName);
    const key = `annex/${day}/${safe}-${uuidv4()}.pdf`;

    await putBuffer(BUCKET, key, pdfBuffer, 'application/pdf');
    const pdfUrl = await presignGet(BUCKET, key, 600);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ pdfUrl }),
    };
  } catch (e: any) {
    const msg = typeof e?.message === 'string' ? e.message : String(e);
    return { statusCode: 500, headers, body: JSON.stringify({ erreur: msg }) };
  }
};
