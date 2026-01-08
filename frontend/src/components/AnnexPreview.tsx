import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ANNEX_IV_SECTIONS } from "../annex/annexIvFields";
import { AnnexFormState } from "../annex/types";

import styles from "./AnnexPreview.module.css";

interface AnnexPreviewProps {
  state: AnnexFormState;
  pdfUrl?: string;
  a4Ref?: React.Ref<HTMLDivElement>;
  exporting?: boolean;
}

function renderFieldValue(value: unknown) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === undefined || value === null) return "";
  return String(value);
}

type PagePlan = {
  blocks: Array<{ sectionId: string; fieldKeys: string[] }>;
};

type MeasureData = {
  availableHeightFirst: number;
  availableHeightRest: number;
  kvGap: number;
  sections: Array<{
    id: string;
    titleHeight: number;
    titleExtra: number;
    baseOverhead: number;
    rowHeights: Record<string, number>;
  }>;
};

function parsePx(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function getAvailableHeightForPage(measure: MeasureData, pageIndex: number): number {
  return pageIndex === 0 ? measure.availableHeightFirst : measure.availableHeightRest;
}

function buildMeasureData(root: HTMLElement): MeasureData | null {
  const firstBody = root.querySelector<HTMLElement>("[data-measure-page-body='first']");
  const restBody = root.querySelector<HTMLElement>("[data-measure-page-body='rest']");
  if (!firstBody || !restBody) return null;

  // IMPORTANT: clientHeight includes padding. Content can only occupy the content box,
  // so subtract padding to avoid packing rows into the footer area (divider overlap).
  const firstStyle = getComputedStyle(firstBody);
  const restStyle = getComputedStyle(restBody);
  const firstPadTop = parsePx(firstStyle.paddingTop);
  const firstPadBottom = parsePx(firstStyle.paddingBottom);
  const restPadTop = parsePx(restStyle.paddingTop);
  const restPadBottom = parsePx(restStyle.paddingBottom);

  const availableHeightFirst = Math.max(0, firstBody.clientHeight - firstPadTop - firstPadBottom);
  const availableHeightRest = Math.max(0, restBody.clientHeight - restPadTop - restPadBottom);
  if (!availableHeightFirst || availableHeightFirst < 100) return null;
  if (!availableHeightRest || availableHeightRest < 100) return null;

  // kv gap is defined in CSS (.a4-kv { gap: ... }). Keep in sync for accurate paging.
  const kvGap = 18;

  const sectionEls = Array.from(root.querySelectorAll<HTMLElement>("[data-measure-section-id]"));
  const sections = sectionEls
    .map((sectionEl) => {
      const sectionId = sectionEl.dataset.measureSectionId || "";
      if (!sectionId) return null;

      const style = getComputedStyle(sectionEl);
      const marginBottom = parsePx(style.marginBottom);

      const titleEl = sectionEl.querySelector<HTMLElement>("[data-measure-section-title-id]");
      const titleHeight = titleEl ? titleEl.offsetHeight : 0;
      let titleExtra = 0;
      if (titleEl) {
        const ts = getComputedStyle(titleEl);
        // offsetHeight already includes padding+border, but NOT margins.
        // When the title is hidden on continuation pages, we also lose its bottom margin
        // and its own underline/border spacing, so subtract these from the section overhead.
        const mb = parsePx(ts.marginBottom);
        const pb = parsePx(ts.paddingBottom);
        const bbw = parsePx(ts.borderBottomWidth);
        titleExtra = Math.max(0, mb + pb + bbw);
      }

      const rowEls = Array.from(sectionEl.querySelectorAll<HTMLElement>("[data-measure-field-key]"));
      const rowHeights: Record<string, number> = {};
      let rowsSum = 0;
      for (const el of rowEls) {
        const key = el.dataset.measureFieldKey || "";
        if (!key) continue;
        const h = el.offsetHeight;
        rowHeights[key] = h;
        rowsSum += h;
      }

      const rowCount = Object.keys(rowHeights).length;

      // Section height should include margin-bottom (offsetHeight excludes margins).
      const sectionTotal = sectionEl.offsetHeight + marginBottom;
      const gapsTotal = rowCount > 1 ? kvGap * (rowCount - 1) : 0;
      const baseOverhead = Math.max(0, sectionTotal - titleHeight - rowsSum - gapsTotal);

      return {
        id: sectionId,
        titleHeight,
        titleExtra,
        baseOverhead,
        rowHeights,
      };
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  return { availableHeightFirst, availableHeightRest, kvGap, sections };
}

function packFieldsIntoPages(measure: MeasureData, sectionOrder: string[]): PagePlan[] {
  const sectionById = new Map(measure.sections.map(s => [s.id, s] as const));

  const remainingBySection = new Map<string, string[]>();
  for (const id of sectionOrder) {
    const s = sectionById.get(id);
    if (!s) continue;
    remainingBySection.set(id, Object.keys(s.rowHeights));
  }

  const pages: PagePlan[] = [];
  let current: PagePlan = { blocks: [] };
  let pageIndex = 0;
  let remainingHeight = getAvailableHeightForPage(measure, pageIndex);

  const pushPage = () => {
    if (current.blocks.length > 0) pages.push(current);
    current = { blocks: [] };
    pageIndex = pages.length;
    remainingHeight = getAvailableHeightForPage(measure, pageIndex);
  };

  for (const sectionId of sectionOrder) {
    const section = sectionById.get(sectionId);
    if (!section) continue;

    let remainingKeys = remainingBySection.get(sectionId) || [];
    const orderedKeys = Object.keys(section.rowHeights);
    remainingKeys = orderedKeys.filter(k => remainingKeys.includes(k));

    while (remainingKeys.length > 0) {
      const firstKey = remainingKeys[0];
      const firstRowHeight = section.rowHeights[firstKey] ?? 0;

      // Detect whether this fragment is a continuation of the same section from a
      // previous page. If so, we don't need to account for the section title's
      // height because the title is suppressed on continuation pages.
      const lastPage = pages.length > 0 ? pages[pages.length - 1] : null;
      const lastBlockOfLastPage = lastPage && lastPage.blocks.length > 0 ? lastPage.blocks[lastPage.blocks.length - 1] : null;
      const isContinuation = !!lastBlockOfLastPage && lastBlockOfLastPage.sectionId === sectionId;

      const titleForFragment = isContinuation ? 0 : section.titleHeight;
      const overheadForFragment = isContinuation
        ? Math.max(0, section.baseOverhead - (section.titleExtra || 0))
        : section.baseOverhead;
      const minFragmentHeight = titleForFragment + overheadForFragment + firstRowHeight;

      // If the first row itself exceeds the remaining height on this page but would
      // fit on a fresh page, push a new page and let that single row start there.
      if (firstRowHeight > remainingHeight) {
        const pageCapacity = getAvailableHeightForPage(measure, pageIndex);
        if (firstRowHeight <= pageCapacity) {
          pushPage();
          continue;
        }
        // else the single row is larger than the page; allow it to be placed.
      }

      // If this is not a continuation (we need the title) and the min fragment
      // doesn't fit, or if it is a continuation but the fragment still doesn't
      // fit, then start a new page so we don't force moving previously-packed
      // content. This prevents an entire section from jumping to the next page
      // when only the last row doesn't fit.
      if (current.blocks.length > 0 && minFragmentHeight > remainingHeight) {
        pushPage();
      }

      let used = titleForFragment + overheadForFragment;
      const fitKeys: string[] = [];

      for (let i = 0; i < remainingKeys.length; i++) {
        const key = remainingKeys[i];
        const rowHeight = section.rowHeights[key] ?? 0;
        const extraGap = fitKeys.length > 0 ? measure.kvGap : 0;
        const nextUsed = used + extraGap + rowHeight;

        if (nextUsed <= remainingHeight) {
          fitKeys.push(key);
          used = nextUsed;
          continue;
        }

        // Row doesn't fully fit. If nothing has been added to this fragment yet,
        // either force it (if row is larger than an empty page) or move to next page.
        if (fitKeys.length === 0) {
          const pageAvail = getAvailableHeightForPage(measure, pageIndex);
          const needed = section.titleHeight + section.baseOverhead + rowHeight;
          if (needed > pageAvail) {
            // can't fit on empty page; include to avoid infinite loop
            fitKeys.push(key);
            used = nextUsed;
          } else {
            // try on the next page
            pushPage();
          }
        }

        break;
      }

      if (fitKeys.length === 0) {
        // nothing was packed (we moved to next page), retry packing
        continue;
      }

      current.blocks.push({ sectionId, fieldKeys: fitKeys });
      remainingHeight = Math.max(0, remainingHeight - used);
      remainingKeys = remainingKeys.slice(fitKeys.length);

      if (remainingKeys.length > 0) pushPage();
    }
  }

  if (current.blocks.length > 0) pages.push(current);
  return pages;
}

const AnnexPreview: React.FC<AnnexPreviewProps> = ({ state, pdfUrl, a4Ref, exporting }) => {
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [pages, setPages] = useState<PagePlan[] | null>(null);
  const [remeasureTick, setRemeasureTick] = useState(0);
  const isDev = import.meta.env.DEV;
  const [debugInfo, setDebugInfo] = useState<
    | null
    | {
        ok: boolean;
        foundFirst: boolean;
        foundRest: boolean;
        firstClientHeight: number;
        restClientHeight: number;
        firstScrollHeight: number;
        restScrollHeight: number;
        availableHeightFirst: number;
        availableHeightRest: number;
        packedPages: number;
        visibleSections: number;
      }
  >(null);

  const visibleSections = useMemo(() => {
    return ANNEX_IV_SECTIONS
      .map(section => {
        const visibleKeys = section.fields
          .filter(f => {
            const v = (state as any)[f.key];
            if (typeof v === 'boolean') return true;
            return v !== undefined && v !== null && String(v).trim() !== '';
          })
          .map(f => f.key);

        return { id: section.id, title: section.title, fieldKeys: visibleKeys };
      })
      .filter(s => s.fieldKeys.length > 0);
  }, [state]);

  // Helper: render a section's rows for a given set of keys
  const renderSectionRows = (sectionId: string, keys: string[]) => {
    const section = ANNEX_IV_SECTIONS.find(s => s.id === sectionId);
    if (!section) return null;
    return (
      <div className={styles["a4-kv"]}>
        {keys.map(k => {
          const field = section.fields.find(f => f.key === k);
          if (!field) return null;
          return (
            <div className={styles["a4-kv-row"]} data-measure-field-key={k} key={k}>
              <div className={styles["a4-k"]}>{field.label}</div>
              <div className={styles["a4-v"]}>{renderFieldValue((state as any)[k])}</div>
            </div>
          );
        })}
      </div>
    );
  };

  // Measure and compute pagination on layout changes
  useEffect(() => {
    const onResize = () => setRemeasureTick((t) => t + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useLayoutEffect(() => {
    if (!measureRef.current) return;

    // Build a temporary DOM inside measureRef to measure heights
    const root = measureRef.current;
    // Clear
    root.innerHTML = '';

    // Create two A4 pages for measurement: first page with header, rest pages without header.
    const mkMeasurePage = (kind: 'first' | 'rest') => {
      const page = document.createElement('div');
      page.className = `${styles['a4-page']} ${styles['a4-request-form']}`;
      if (kind === 'rest') page.className += ` ${styles['no-header']}`;

      const headerEl = document.createElement('header');
      headerEl.className = `${styles['a4-header']} ${styles['a4-request-header']}`;
      // Keep the header element present for layout (grid placement), but only render content on first page.
      if (kind === 'first') {
        headerEl.innerHTML = `
          <div class="${styles['a4-form-top']}">
            <div class="${styles['a4-form-header-text']}">
              <div class="${styles['a4-form-kicker']}">ANNEX IV</div>
              <div class="${styles['a4-form-title']}">EU AI Act</div>
              <div class="${styles['a4-form-subtitle']}">Access & Rectification Request Form</div>
            </div>
            <img class="${styles['a4-eu-flag-img']}" alt="" src="/Flag_of_Europe.svg.png" />
          </div>
          <div class="${styles['a4-form-rule']}" aria-hidden="true"></div>
        `;
      }

      const body = document.createElement('article');
      body.className = `${styles['a4-body']} ${styles['a4-request-body']}`;
      body.setAttribute('data-measure-page-body', kind);

      for (const section of visibleSections) {
        const secEl = document.createElement('section');
        secEl.className = styles['a4-section'];
        secEl.setAttribute('data-measure-section-id', section.id);

        const titleEl = document.createElement('div');
        titleEl.className = styles['a4-section-title'];
        titleEl.setAttribute('data-measure-section-title-id', section.id);
        titleEl.textContent = section.title;
        secEl.appendChild(titleEl);

        const kvEl = document.createElement('div');
        kvEl.className = styles['a4-kv'];

        const sectionDef = ANNEX_IV_SECTIONS.find(s => s.id === section.id);
        for (const key of section.fieldKeys) {
          const row = document.createElement('div');
          row.className = styles['a4-kv-row'];
          row.setAttribute('data-measure-field-key', key);

          const kEl = document.createElement('div');
          kEl.className = styles['a4-k'];
          const f = sectionDef?.fields.find(ff => ff.key === key);
          kEl.textContent = f ? f.label : key;

          const vEl = document.createElement('div');
          vEl.className = styles['a4-v'];
          vEl.textContent = renderFieldValue((state as any)[key]);

          row.appendChild(kEl);
          row.appendChild(vEl);
          kvEl.appendChild(row);
        }

        secEl.appendChild(kvEl);
        body.appendChild(secEl);
      }

      const footerEl = document.createElement('footer');
      footerEl.className = styles['a4-footer'];
      // include a page-number placeholder in measure DOM so footer height matches
      footerEl.innerHTML = `<div class="${styles['a4-page-number']}">${kind === 'first' ? '1 / 1' : '1 / 1'}</div>`;

      page.appendChild(headerEl);
      page.appendChild(body);
      page.appendChild(footerEl);
      return page;
    };

    root.appendChild(mkMeasurePage('first'));
    root.appendChild(mkMeasurePage('rest'));

    const compute = () => {
      const fb = root.querySelector<HTMLElement>("[data-measure-page-body='first']");
      const rb = root.querySelector<HTMLElement>("[data-measure-page-body='rest']");
      const firstClientHeight = fb?.clientHeight || 0;
      const restClientHeight = rb?.clientHeight || 0;
      const firstScrollHeight = fb?.scrollHeight || 0;
      const restScrollHeight = rb?.scrollHeight || 0;

      const measure = buildMeasureData(root);
      if (!measure) {
        setPages(null);
        if (isDev) {
          setDebugInfo({
            ok: false,
            foundFirst: Boolean(fb),
            foundRest: Boolean(rb),
            firstClientHeight,
            restClientHeight,
            firstScrollHeight,
            restScrollHeight,
            availableHeightFirst: 0,
            availableHeightRest: 0,
            packedPages: 0,
            visibleSections: visibleSections.length,
          });
        }
        return;
      }
      const sectionOrder = visibleSections.map(s => s.id);
      const packed = packFieldsIntoPages(measure, sectionOrder);
      setPages(packed);
      if (isDev) {
        setDebugInfo({
          ok: true,
          foundFirst: Boolean(fb),
          foundRest: Boolean(rb),
          firstClientHeight,
          restClientHeight,
          firstScrollHeight,
          restScrollHeight,
          availableHeightFirst: measure.availableHeightFirst,
          availableHeightRest: measure.availableHeightRest,
          packedPages: packed.length,
          visibleSections: visibleSections.length,
        });
      }
    };

    // Measure immediately (layout effects run after DOM mutations), then re-measure a few times
    // to account for font/image layout settling.
    compute();
    requestAnimationFrame(compute);
    const t1 = window.setTimeout(compute, 50);
    const t2 = window.setTimeout(compute, 250);

    // Recompute once fonts are ready (important for stable line-wrapping measurements).
    const fonts = (document as any).fonts;
    if (fonts?.ready?.then) {
      fonts.ready.then(() => compute()).catch(() => undefined);
    }

    // Recompute when any images inside the measure root load.
    const imgs = Array.from(root.querySelectorAll<HTMLImageElement>('img'));
    const onImgLoad = () => compute();
    for (const img of imgs) {
      img.addEventListener('load', onImgLoad);
      img.addEventListener('error', onImgLoad);
    }

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      for (const img of imgs) {
        img.removeEventListener('load', onImgLoad);
        img.removeEventListener('error', onImgLoad);
      }
    };

    // cleanup: leave measure DOM for subsequent measurements
  }, [state, remeasureTick]);

  const displayPages = useMemo(() => {
    if (!pages || pages.length === 0) return null;
    return pages.map((p, pageIndex) => {
      const prevPageLastSectionId =
        pageIndex > 0 ? pages[pageIndex - 1]?.blocks?.[pages[pageIndex - 1].blocks.length - 1]?.sectionId : undefined;

      const blocks = p.blocks.map((b, blockIndex) => {
        // Only hide the title when the next page is a continuation of the previous page’s last section.
        const isContinuation = pageIndex > 0 && blockIndex === 0 && prevPageLastSectionId === b.sectionId;
        return { ...b, showTitle: !isContinuation };
      });

      return { ...p, blocks };
    });
  }, [pages]);

  if (pdfUrl) {
    return (
      <div className={styles["annex-preview"]}>
        <div className={styles["pdf-preview"]}>
          <iframe className={styles["pdf-iframe"]} src={pdfUrl} title="Exported PDF preview" />
        </div>
      </div>
    );
  }

  // Render pages if computed, otherwise fall back to single full-page render
  return (
    <div className={styles["annex-preview"]}>
      {/* Dev debug badge removed */}

      <div className={styles["a4-preview-frame"]}>
        <div className={styles["a4-stack"]}>
          <div ref={measureRef} className={styles['a4-measure']} aria-hidden />

          <div
            ref={a4Ref}
            className={styles["a4-pages"]}
            {...(exporting ? { 'data-export': 'true' } : {})}
          >
            {(displayPages && displayPages.length > 0) ? (
              displayPages.map((p, idx) => (
                <div
                  key={idx}
                  data-a4-page="true"
                  className={`${styles["a4-page"]} ${styles["a4-request-form"]} ${idx > 0 ? styles['no-header'] : ''}`}
                >
                  {/* Keep header element present for grid placement; hide it on subsequent pages via CSS */}
                  <header className={`${styles["a4-header"]} ${styles["a4-request-header"]}`}>
                    {idx === 0 ? (
                      <>
                        <div className={styles["a4-form-top"]}>
                          <div className={styles["a4-form-header-text"]}>
                            <div className={styles["a4-form-kicker"]}>ANNEX IV</div>
                            <div className={styles["a4-form-title"]}>EU AI Act</div>
                            <div className={styles["a4-form-subtitle"]}>Access & Rectification Request Form</div>
                          </div>
                          <img src="/Flag_of_Europe.svg.png" alt="EU flag" className={styles["a4-eu-flag-img"]} />
                        </div>
                        <div className={styles["a4-form-rule"]} aria-hidden />
                      </>
                    ) : null}
                  </header>

                  <article className={`${styles["a4-body"]} ${styles["a4-request-body"]}`}>
                    {p.blocks.map(block => (
                      <section key={`${idx}-${block.sectionId}`} className={styles["a4-section"]}>
                        {block.showTitle ? (
                          <div className={styles["a4-section-title"]}>{ANNEX_IV_SECTIONS.find(s => s.id === block.sectionId)?.title}</div>
                        ) : null}
                        {renderSectionRows(block.sectionId, block.fieldKeys)}
                      </section>
                    ))}
                  </article>

                  <footer className={styles["a4-footer"]}>
                    <div className={styles["a4-page-number"]}>{`${idx + 1} / ${displayPages.length}`}</div>
                  </footer>
                </div>
              ))
            ) : (
            // fallback single page (previous behavior)
            <div data-a4-page="true" className={`${styles["a4-page"]} ${styles["a4-request-form"]}`}>
              <header className={`${styles["a4-header"]} ${styles["a4-request-header"]}`}>
                <div className={styles["a4-form-top"]}>
                  <div className={styles["a4-form-header-text"]}>
                    <div className={styles["a4-form-kicker"]}>ANNEX IV</div>
                    <div className={styles["a4-form-title"]}>EU AI Act</div>
                    <div className={styles["a4-form-subtitle"]}>Access & Rectification Request Form</div>
                  </div>
                  <img src="/Flag_of_Europe.svg.png" alt="EU flag" className={styles["a4-eu-flag-img"]} />
                </div>
                <div className={styles["a4-form-rule"]} aria-hidden />
              </header>
              <article className={`${styles["a4-body"]} ${styles["a4-request-body"]}`}>
                {ANNEX_IV_SECTIONS.map((section) => {
                  const visibleFields = section.fields.filter(f => {
                    const v = (state as any)[f.key];
                    if (typeof v === 'boolean') return true;
                    return v !== undefined && v !== null && String(v).trim() !== '';
                  });
                  if (visibleFields.length === 0) return null;

                  return (
                    <section key={section.id} className={styles["a4-section"]}>
                      <div className={styles["a4-section-title"]}>{section.title}</div>
                      <div className={styles["a4-kv"]}>
                        {visibleFields.map((field) => (
                          <div className={styles["a4-kv-row"]} key={field.key}>
                            <div className={styles["a4-k"]}>{field.label}</div>
                            <div className={styles["a4-v"]}>{renderFieldValue((state as any)[field.key])}</div>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </article>
              <footer className={styles["a4-footer"]}>
                <div className={styles["a4-page-number"]}>1 / 1</div>
              </footer>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnexPreview;
