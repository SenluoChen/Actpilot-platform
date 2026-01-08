const PDFDocument: any = require('pdfkit');
import { fieldDict } from "./annexStructure";

export function renderField(doc: any, key: string, value: any, lang: "en"|"fr"="en") {
  const label = (fieldDict as any)[key]?.[lang] ?? key;
  if (value == null) return;

  if (Array.isArray(value)) {
    if (value.length === 0) return;
    doc.fontSize(11).text(`${label}:`);
    value.forEach(v => doc.text(`  • ${String(v)}`));
  } else if (typeof value === "object") {
    doc.fontSize(11).text(`${label}:`);
    Object.entries(value).forEach(([k,v]) => doc.text(`  - ${k}: ${String(v)}`));
  } else {
    doc.fontSize(11).text(`${label}: ${String(value)}`);
  }
}
