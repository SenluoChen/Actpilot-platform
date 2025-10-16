import PDFDocument from 'pdfkit';
import { Writable } from 'stream';

export async function renderPdfKit(sections: any[], writable: Writable, opts: any = {}) {
  const doc = new PDFDocument({ size: 'A4', margin: 48 });
  doc.pipe(writable);

  const titleColor = '#2A5DE9';
  const subtitleColor = '#6C33E9';

  doc.fontSize(18).fillColor(titleColor).text('Annex IV — Technical Summary');
  doc.moveDown();

  for (const s of sections) {
    doc.addPageIfNeeded && doc.addPage && doc.moveDown();
    doc.fontSize(14).fillColor(subtitleColor).text(s.title);
    for (const b of s.blocks) {
      doc.fontSize(12).fillColor('black').text(b.title, { underline: true });
      for (const f of b.fields) {
        const label = f.title || f.id;
        const value = (Array.isArray(f.value) ? f.value.join(', ') : String(f.value ?? ''));
        doc.fontSize(10).text(`${label}: ${value}`);
      }
      doc.moveDown(0.5);
    }
    doc.moveDown();
  }

  // page numbers
  // pdfkit doesn't provide simple event after pages; omit complex pagination here

  doc.end();
}
