import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import stream from 'stream';
import { Statement } from './types';

export async function generatePdfBuffer(stmt: Statement, hash: string, verifyUrl: string): Promise<Buffer> {
const doc = new PDFDocument({ size: 'A4', margin: 50 });
doc.font('Times-Roman');  const chunks: Buffer[] = [];
  const pass = new stream.PassThrough();
  doc.pipe(pass);
  pass.on('data', (c) => chunks.push(c));

  doc.fontSize(18).text('AI Act Professional Statement', { align: 'left' });
  doc.moveDown();
  doc.fontSize(12).text(`Company: ${stmt.company}`);
  doc.text(`Use Case: ${stmt.useCase}`);
  doc.text(`Risk Level: ${stmt.aiAct.level} (${stmt.aiAct.label})`);
  doc.text(`Submitted At: ${stmt.submittedAt}`);
  doc.moveDown();

  doc.fontSize(14).text('Checklist', { underline: true });
  doc.fontSize(11);
  stmt.aiAct.checklist.forEach((item: string) => {
    doc.text(`• ${item}`);
  });

  doc.moveDown();
  doc.fontSize(14).text('Data & Controls', { underline: true });
  doc.fontSize(11).text(`Data Source: ${stmt.dataSource}`);
  doc.text(`Human Supervision: ${stmt.hasHumanSupervision ? 'Yes' : 'No'}`);

  doc.moveDown();
  doc.fontSize(14).text('Verification', { underline: true });
  doc.fontSize(10).text(`Hash (SHA-256): ${hash}`);
  doc.fontSize(10).text(`Verify: ${verifyUrl}`);

  const qrDataUrl = await QRCode.toDataURL(verifyUrl);
  const base64 = qrDataUrl.split(',')[1];
  const img = Buffer.from(base64, 'base64');
  doc.image(img, { fit: [120, 120] });

  doc.moveDown();
  doc.fontSize(9).text(`ID: ${stmt.id} | Version: ${stmt.version}`);
  doc.end();

  await new Promise<void>((resolve) => pass.on('end', () => resolve()));
  return Buffer.concat(chunks);
}
