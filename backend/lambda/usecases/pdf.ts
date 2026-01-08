// pdf.ts
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import stream from 'stream';
import { Statement } from './types';

/* ----------------- 你原本的函式，保留不動 ----------------- */
export async function generatePdfBuffer(stmt: Statement, hash: string, verifyUrl: string): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.font('Times-Roman');

  const chunks: Buffer[] = [];
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

  // 建議改用 'finish'，更穩定；你原本用 'end' 也能跑
  await new Promise<void>((resolve) => pass.on('finish', () => resolve()));
  return Buffer.concat(chunks);
}

/* ----------------- 新增：Annex IV Draft 產生器 ----------------- */

export type AnnexDraftInput = {
  orgName?: string;
  contactEmail?: string;
  systemName: string;
  intendedPurpose: string;
  deploymentSector: 'HR' | 'Health' | 'Education' | 'Critical Infrastructure' | 'Finance' | 'Other' | string;
  modelType?: string;
  trainingDataDesc?: string;
  evalProcedures?: string;
  humanOversight?: string;
  // 可選：沿用你的驗證/追蹤欄位
  id?: string;
  version?: string;
  verifyUrl?: string;
  hash?: string;
};

function classifyRisk(p: AnnexDraftInput): 'High Risk' | 'Limited Risk' | 'Minimal Risk' {
  const high = ['HR', 'Health', 'Education', 'Critical Infrastructure', 'Finance'];
  if (high.includes(p.deploymentSector)) return 'High Risk';
  if ((p.intendedPurpose || '').toLowerCase().includes('decision')) return 'Limited Risk';
  return 'Minimal Risk';
}

export async function generateAnnexIVPdfBuffer(input: AnnexDraftInput): Promise<Buffer> {
  const riskLevel = classifyRisk(input);

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  // ⚠ 若會含中文，請改用已註冊的 CJK 字型（見下方小提醒）
  doc.font('Times-Roman');

  const chunks: Buffer[] = [];
  const pass = new stream.PassThrough();
  doc.pipe(pass);
  pass.on('data', (c) => chunks.push(c));

  // Header
  doc.fontSize(18).text('EU AI Act - Annex IV Technical Documentation (Draft)', { align: 'left' });
  doc.moveDown(0.5);
  doc.fontSize(10).text('Generated automatically by ActPilot (draft for guidance only).');
  doc.moveDown();

  doc.fontSize(12)
    .text(`Organization: ${input.orgName || 'N/A'}`)
    .text(`Contact: ${input.contactEmail || 'N/A'}`)
    .text(`Generated on: ${new Date().toISOString()}`);
  doc.moveDown(1);

  // 1. Identification
  doc.fontSize(14).text('1. AI System Identification', { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(12)
    .text(`System Name: ${input.systemName}`)
    .text(`Intended Purpose: ${input.intendedPurpose}`)
    .text(`Deployment Sector: ${input.deploymentSector}`)
    .text(`Model Type / Method: ${input.modelType || 'N/A'}`);
  doc.moveDown(0.8);

  // 2. Data & Development
  doc.fontSize(14).text('2. Data & Development', { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(12)
    .text(`Training Data Description: ${input.trainingDataDesc || 'N/A'}`, { width: 500 })
    .text(`Evaluation Procedures: ${input.evalProcedures || 'N/A'}`, { width: 500 });
  doc.moveDown(0.8);

  // 3. Risk & Oversight
  doc.fontSize(14).text('3. Risk & Oversight', { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(12)
    .text(`Preliminary Risk Classification (non-binding): ${riskLevel}`)
    .text(`Human Oversight Measures: ${input.humanOversight || 'N/A'}`);
  doc.moveDown(0.8);

  // 4. Compliance Note
  doc.fontSize(14).text('4. Compliance Note', { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(11).text(
    'This is a preliminary draft structured against Annex IV items for early preparation. ' +
    'It does not constitute legal advice. Please consult qualified experts for a full compliance assessment.',
    { width: 500 }
  );
  doc.moveDown(0.8);

  // Verification（沿用你原本的 hash / QRCode）
  if (input.hash || input.verifyUrl || input.id || input.version) {
    doc.fontSize(14).text('Verification', { underline: true });
    doc.moveDown(0.3);
    if (input.hash) doc.fontSize(10).text(`Hash (SHA-256): ${input.hash}`);
    if (input.verifyUrl) {
      doc.fontSize(10).text(`Verify: ${input.verifyUrl}`);
      const qrDataUrl = await QRCode.toDataURL(input.verifyUrl);
      const base64 = qrDataUrl.split(',')[1];
      const img = Buffer.from(base64, 'base64');
      doc.image(img, { fit: [110, 110] });
    }
    doc.moveDown(0.3);
    doc.fontSize(9).text(`ID: ${input.id || '-'} | Version: ${input.version || '-'}`);
  }

  // （可選）頁碼
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    const pageNum = i + 1;
    doc.fontSize(9).text(`Page ${pageNum} / ${range.count}`, 50, doc.page.height - 40, {
      align: 'center',
      width: doc.page.width - 100
    });
  }

  doc.end();
  await new Promise<void>((resolve) => pass.on('finish', () => resolve()));
  return Buffer.concat(chunks);
}
