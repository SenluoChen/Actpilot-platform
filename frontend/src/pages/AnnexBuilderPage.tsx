import React, { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import AnnexForm from "../components/AnnexForm";
import AnnexPreview from "../components/AnnexPreview";
import ProgressBar from "../components/ProgressBar";
import topbarStyles from "../components/TopBar.module.css";
import FolderUpload from "../components/FolderUpload";
import { createInitialState, AnnexFormState } from "../annex/types";
import { applyFactsToState, mapToFacts } from "../annex/mapToFacts";
import { ANNEX_IV_SECTIONS } from "../annex/annexIvFields";
import { exportElementToA4Pdf } from "../exportPreviewPdf";
import RiskCheckerApp from "../riskChecker/RiskCheckerApp";
import { getJson, postJson } from "../api";
import { clearTokens, getCurrentUser, getEmailFromTokens, loadTokens, type AuthTokens } from "../auth/cognito";
import LoginGate from "../auth/LoginGate";

import styles from "./AnnexBuilderPage.module.css";
import { createRoot } from 'react-dom/client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

const AnnexBuilderPage: React.FC = () => {
  const [tokens, setTokens] = useState(() => loadTokens());
  const [postLoginSplash, setPostLoginSplash] = useState(false);

  const [state, setState] = useState<AnnexFormState>(createInitialState());
  const [pdfUrl, setPdfUrl] = useState<string | undefined>(undefined);
  const [exporting, setExporting] = useState(false);
  const [view, setView] = useState<'annex' | 'risk'>(() => {
    try {
      const v = localStorage.getItem('annex:view');
      return v === 'risk' ? 'risk' : 'annex';
    } catch (e) {
      return 'annex';
    }
  });

  // Persist the current view so a full page refresh restores the same panel
  useEffect(() => {
    try {
      localStorage.setItem('annex:view', view);
    } catch (e) {
      // ignore storage errors
    }
  }, [view]);
  const [suggestedKeys, setSuggestedKeys] = useState<Set<string>>(() => new Set());

  const a4Ref = useRef<HTMLDivElement | null>(null);
  const lastBlobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (lastBlobUrlRef.current) URL.revokeObjectURL(lastBlobUrlRef.current);
    };
  }, []);

  const suggestedKeysMemo = useMemo(() => suggestedKeys, [suggestedKeys]);

  const handleChange = (key: string, value: string | boolean) => {
    setState(prev => ({ ...prev, [key]: value }));
    setSuggestedKeys(prev => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  // Sidebar open/close state (restore toggle behavior).
  // Default: closed
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  useEffect(() => {
    const clsGlobal = 'sidebar-open';
    if (sidebarOpen) {
      document.documentElement.classList.add(clsGlobal);
    } else {
      document.documentElement.classList.remove(clsGlobal);
    }
    return () => document.documentElement.classList.remove(clsGlobal);
  }, [sidebarOpen]);

  const handleNavigate = (v: 'annex' | 'risk') => {
    setView(v);
  }

  const handleExportPDF = async () => {
    setExporting(true);
    let tempRoot: ReturnType<typeof createRoot> | null = null;
    let tempContainer: HTMLDivElement | null = null;
    try {
      let el = a4Ref.current;

      // If preview panel isn't rendered (no ref), render an offscreen preview and export from that.
      if (!el) {
        tempContainer = document.createElement('div');
        tempContainer.style.position = 'fixed';
        tempContainer.style.left = '-20000px';
        tempContainer.style.top = '0';
        tempContainer.style.width = '210mm';
        tempContainer.style.overflow = 'visible';
        document.body.appendChild(tempContainer);

        tempRoot = createRoot(tempContainer);
        // render AnnexPreview offscreen in exporting mode so it marks the a4 container
        tempRoot.render(<AnnexPreview state={state} exporting={true} />);

        // wait for layout/fonts/images to settle
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fontsReady = (document as any)?.fonts?.ready;
          if (fontsReady && typeof fontsReady.then === 'function') {
            await Promise.race([fontsReady, new Promise((res) => setTimeout(res, 800))]);
          }
        } catch {
          // ignore font readiness errors
        }

        await new Promise((res) => {
          requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(res, 150)));
        });

        // find the rendered a4 pages container inside tempContainer
        el = tempContainer.querySelector('[data-export="true"]') as HTMLDivElement | null;
      }

      const systemNameRaw = String((state as any).system_name || (state as any).intended_use_case || 'annex-iv');
      const safeName = systemNameRaw
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'annex-iv';

      const filename = `${safeName}-annex-iv.pdf`;
      if (!el) throw new Error('Preview element could not be found for export');
      const { blobUrl } = await exportElementToA4Pdf(el, filename, { scale: 2 });

      // Keep the preview panel unchanged (do not switch to iframe mode).
      // We still track and revoke the blob URL to avoid leaking memory.
      if (lastBlobUrlRef.current) URL.revokeObjectURL(lastBlobUrlRef.current);
      lastBlobUrlRef.current = blobUrl;
    } catch (e: any) {
      const msg = e?.message || (typeof e === 'string' ? e : 'Export failed');
      alert(msg);
    } finally {
      setExporting(false);
      // cleanup temporary offscreen root/container
      try {
        tempRoot?.unmount();
      } catch {
        // ignore unmount errors
      }
      try {
        tempContainer?.remove();
      } catch {
        // ignore removal errors
      }
      tempRoot = null;
      tempContainer = null;
    }
  };

  

  const handleFacts = (facts: Array<{ key: string; value: unknown; source?: string }>) => {
    // Use functional state update to avoid stale `state` closures.
    setState(prevState => {
      const { nextState, suggestedKeys: newlySuggested } = applyFactsToState(prevState, facts);
      setSuggestedKeys(prev => {
        const next = new Set(prev);
        for (const k of newlySuggested) next.add(k);
        return next;
      });
      return nextState;
    });
  };

  // Compute a conservative completion percentage based on ANNEX_IV_SECTIONS
  const { completionPct, filledCount, totalCount } = useMemo(() => {
    let total = 0;
    let filled = 0;
    for (const s of ANNEX_IV_SECTIONS) {
      for (const f of s.fields) {
        total += 1;
        const val = state[f.key];
        if (typeof val === "boolean") {
          if (val) filled += 1;
        } else if (typeof val === "string") {
          if (val.trim().length > 0) filled += 1;
        }
      }
    }
    const pct = total === 0 ? 0 : Math.round((filled / total) * 100);
    return { completionPct: pct, filledCount: filled, totalCount: total };
  }, [state]);

  const apiConfig = useMemo(
    () => ({
      baseUrl: API_BASE_URL || '',
      apiKey: API_KEY,
      bearerToken: tokens?.idToken,
    }),
    [tokens]
  );

  const currentUser = useMemo(() => {
    // Derive display info from stored tokens (keeps TopBar/Sidebar consistent)
    return getCurrentUser(tokens);
  }, [tokens]);

  const topBarUser = useMemo(() => {
    // If we are signed in but can't decode user info, attempt to show email from tokens.
    if (currentUser) return currentUser;
    if (tokens) {
      const email = getEmailFromTokens(tokens);
      if (email) return { email };
      return { name: 'Account' };
    }
    return null;
  }, [currentUser, tokens]);

  const handleLogout = () => {
    clearTokens();
    setTokens(null);
  };

  useEffect(() => {
    if (!postLoginSplash) return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const id = window.setTimeout(() => setPostLoginSplash(false), reduced ? 120 : 450);
    return () => window.clearTimeout(id);
  }, [postLoginSplash]);

  const handleSignedIn = (t: AuthTokens) => {
    setTokens(t);
    setPostLoginSplash(true);
  };

  const handleCreateUserRecord = async () => {
    try {
      await postJson(apiConfig, '/user/records', { type: 'note', payload: { text: 'hello' } });
      alert('Saved a user record.');
    } catch (e: any) {
      alert(e?.message || 'Save failed');
    }
  };

  const handleListUserRecords = async () => {
    try {
      const res = await getJson<{ items: any[] }>(apiConfig, '/user/records');
      alert(`Loaded ${res?.items?.length || 0} records.`);
    } catch (e: any) {
      alert(e?.message || 'Load failed');
    }
  };

  if (!tokens) {
    return <LoginGate onSignedIn={handleSignedIn} />;
  }

  return (
    <div className={`${styles.workspaceRoot} ${view === 'risk' ? styles.riskView : ''} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
      {postLoginSplash ? (
        <div className={styles.postLoginSplash} aria-hidden="true">
          <img
            src={'/actpilot logo (Black)22.png'}
            alt=""
            className={styles.postLoginSplashLogo}
          />
        </div>
      ) : null}
      <Sidebar active={view} onNavigate={handleNavigate} open={sidebarOpen} onLogout={handleLogout} />
      <div
        id="page-overlay"
        className={`${styles.pageOverlay} ${sidebarOpen ? styles.pageOverlayOpen : ''}`}
        onClick={sidebarOpen ? () => setSidebarOpen(false) : undefined}
        aria-hidden={sidebarOpen ? 'false' : 'true'}
      />
      <main className={styles.workspaceMain}>
        <TopBar
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          currentUser={topBarUser}
          onLogout={handleLogout}
        />

        <div className={styles.layout}>
          {view === 'annex' ? (
            <>
              <aside className={styles.workspace}>
                <FolderUpload apiBaseUrl={API_BASE_URL} onFacts={handleFacts} />
                <AnnexForm state={state} onChange={handleChange} suggestedKeys={suggestedKeysMemo} />
              </aside>

              <main className={styles.document}>
                <div className={styles.progressRow}>
                  <ProgressBar
                    percent={completionPct}
                    label={"Form Completion"}
                    actions={(
                      <button
                        className={`${topbarStyles.btn} ${topbarStyles.btnCompact} ${topbarStyles.btnPrimary}`}
                        onClick={handleExportPDF}
                        disabled={exporting}
                      >
                        {exporting ? 'Exporting...' : 'Export PDF'}
                      </button>
                    )}
                  />
                </div>
                <div className={styles.documentPreview}>
                  <AnnexPreview state={state} pdfUrl={pdfUrl} a4Ref={a4Ref} />
                </div>
              </main>
            </>
          ) : (
            <main className={styles.document}>
              <div className={styles.documentPreviewPlain}>
                <RiskCheckerApp />
              </div>
            </main>
          )}
        </div>
      </main>
    </div>
  );
};

export default AnnexBuilderPage;
