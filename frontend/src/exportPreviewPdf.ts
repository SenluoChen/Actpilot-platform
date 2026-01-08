import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export type ExportPdfResult = {
  blob: Blob;
  blobUrl: string;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on a timer to avoid interfering with the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function exportElementToA4Pdf(
  el: HTMLElement,
  filename: string,
  opts?: { scale?: number }
): Promise<ExportPdfResult> {
  // A4 in mm
  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

  const pageWidth = pdf.internal.pageSize.getWidth(); // 210
  const pageHeight = pdf.internal.pageSize.getHeight(); // 297

  const scale = opts?.scale ?? 2;

  const pageNodes = (() => {
    if (el.matches?.('[data-a4-page="true"]')) return [el];
    const found = Array.from(el.querySelectorAll<HTMLElement>('[data-a4-page="true"]'));
    return found;
  })();

  // Preferred path: export page-by-page (matches the preview exactly and avoids blank trailing pages)
  if (pageNodes.length > 0) {
    let first = true;
    for (const pageEl of pageNodes) {
      const canvas = await html2canvas(pageEl, {
        scale,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      if (!first) pdf.addPage();
      first = false;

      // Fit-to-page (should already match A4, but keep safe against tiny rounding differences)
      const ratioW = pageWidth / canvas.width;
      const ratioH = pageHeight / canvas.height;
      const ratio = Math.min(ratioW, ratioH);
      const drawW = canvas.width * ratio;
      const drawH = canvas.height * ratio;
      pdf.addImage(imgData, 'JPEG', 0, 0, drawW, drawH, undefined, 'FAST');
    }

    const blob = pdf.output('blob');
    const blobUrl = URL.createObjectURL(blob);
    downloadBlob(blob, filename);
    return { blob, blobUrl };
  }

  // Legacy fallback: capture the entire element and slice into A4 pages.
  const canvas = await html2canvas(el, {
    scale,
    backgroundColor: '#ffffff',
    useCORS: true,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
  heightLeft -= pageHeight;

  // Use a small epsilon to avoid an extra blank last page due to floating point rounding.
  const epsilonMm = 0.5;
  while (heightLeft > epsilonMm) {
    pdf.addPage();
    position = heightLeft - imgHeight;
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;
  }

  const blob = pdf.output('blob');
  const blobUrl = URL.createObjectURL(blob);

  downloadBlob(blob, filename);

  return { blob, blobUrl };
}
