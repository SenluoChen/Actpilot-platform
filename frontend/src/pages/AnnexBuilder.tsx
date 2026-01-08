
import Sidebar from '../components/Sidebar';
import AnnexForm from '../components/AnnexForm';
import AnnexPreview from '../components/AnnexPreview';
import { useState, useEffect } from 'react';
import { ApiError, postJson } from '../api';
import type { AnnexFormFields } from '../components/AnnexForm';

const API_BASE = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_BASE_URL ?? '');
const API_KEY = import.meta.env.VITE_API_KEY ?? '';

type ComposeResponse = {
  sections: any;
};

type RenderResponse = {
  pdfUrl: string;
};

export default function AnnexBuilder() {
  const [form, setForm] = useState<AnnexFormFields>({
    company: '',
    email: '',
    useCase: '',
    intendedPurpose: '',
    providerName: '',
    runtimeEnv: '',
    dataSources: '',
    dataPreprocessing: '',
    biasMitigation: '',
  });
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const sidebarEl = document.getElementById('app-sidebar');
      if (!sidebarEl) return;
      const toggleEl = document.getElementById('sidebar-toggle');
      const target = e.target as Node | null;
      if (!target) return;
      if (toggleEl && toggleEl.contains(target)) return;
      if (!sidebarEl.contains(target)) {
        setSidebarOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [sidebarOpen]);

  const canExport = Boolean(API_BASE) && Boolean(form.company.trim()) && Boolean(form.email.trim()) && Boolean(form.useCase.trim());

  function formatError(e: unknown): string {
    if (e instanceof ApiError) return `${e.message}\n\n${e.bodyText}`;
    if (e instanceof Error) return e.message;
    return String(e);
  }

  async function exportPdf() {
    if (!API_BASE) {
      setError('Missing VITE_API_BASE_URL. Please set it in frontend/.env');
      return;
    }

    setBusy(true);
    setError('');
    setPdfUrl(null);
    try {
      const cfg = { baseUrl: API_BASE, apiKey: API_KEY.trim() ? API_KEY.trim() : undefined };

      const compose = await postJson<ComposeResponse>(cfg, '/annex/compose', {
        facts: [
          { key: 'company', value: form.company },
          { key: 'email', value: form.email },
          { key: 'use_case', value: form.useCase },
          { key: 'intended_purpose', value: form.intendedPurpose },
          { key: 'provider_name', value: form.providerName },
          { key: 'runtime_environment', value: form.runtimeEnv },
          { key: 'data_sources', value: form.dataSources },
          { key: 'data_preprocessing', value: form.dataPreprocessing },
          { key: 'bias_mitigation_measures', value: form.biasMitigation },
        ],
      });

      const systemName = form.useCase;
      const rendered = await postJson<RenderResponse>(cfg, '/annex/render', {
        systemName,
        sections: compose.sections,
      });

      setPdfUrl(rendered.pdfUrl);
    } catch (e) {
      setError(formatError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`actpilot-root${sidebarOpen ? '' : ' sidebar-closed'}`}>
      <Sidebar open={sidebarOpen} />
      <main className="actpilot-main">
        <div className="actpilot-topbar">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle sidebar"
            style={{ marginRight: 16 }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="5" y="8" width="18" height="2.5" rx="1.2" fill="#222"/>
              <rect x="5" y="13" width="18" height="2.5" rx="1.2" fill="#222"/>
              <rect x="5" y="18" width="18" height="2.5" rx="1.2" fill="#222"/>
            </svg>
          </button>
          <button className="actpilot-btn" onClick={exportPdf} disabled={busy || !canExport}>Export PDF</button>
          <button className="actpilot-btn" disabled>Export DOCX</button>
        </div>
        {error ? <div className="actpilot-error">{error}</div> : null}
        <div className="actpilot-content">
          <AnnexForm value={form} onChange={setForm} disabled={busy} />
          <AnnexPreview value={form} pdfUrl={pdfUrl} />
        </div>
      </main>
    </div>
  );
}
