import ANNEX4_V1 from './registry';

function getByPath(obj: any, path: string) {
  const parts = path.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

export function mapPayloadToSections(payload: any = {}, locale = 'en', opts: any = {}) {
  const missing: string[] = [];
  const sections = ANNEX4_V1.sections.map((s: any) => {
    const blocks = s.blocks.map((b: any) => {
      const fields = b.fields.map((f: any) => {
        const val = getByPath(payload, f.id);
        return { id: f.id, title: f.titles?.[locale] || f.id, weight: f.weight || 0, value: val };
      }).filter((ff: any) => ff.value !== undefined && ff.value !== null && ff.value !== '');
      return { id: b.id, title: b.titles?.[locale] || b.id, order: b.order, fields };
    }).filter((bb: any) => !(opts.collapseEmptySections && bb.fields.length === 0));
    return { id: s.id, title: s.titles?.[locale] || s.id, order: s.order, blocks };
  });

  // detect missing fields (declared but not in payload)
  ANNEX4_V1.sections.forEach((s: any) => s.blocks.forEach((b: any) => b.fields.forEach((f: any) => {
    const v = getByPath(payload, f.id);
    if (v === undefined || v === null || v === '') missing.push(f.id);
  })));

  // sorting
  sections.sort((a: any, b: any) => a.order - b.order);
  for (const s of sections) {
    s.blocks.sort((a: any, b: any) => a.order - b.order);
    for (const bl of s.blocks) bl.fields.sort((x: any, y: any) => (x.weight || 0) - (y.weight || 0));
  }

  return { sections, missing };
}
