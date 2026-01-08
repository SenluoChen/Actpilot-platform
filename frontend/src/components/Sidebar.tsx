import React from "react";
import styles from "./Sidebar.module.css";
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { getCurrentUser } from '../auth/cognito';

export interface SidebarProps {
  active?: 'annex' | 'risk'
  onNavigate?: (view: 'annex' | 'risk') => void
  open?: boolean
  onLogout?: () => void
}


const Sidebar: React.FC<SidebarProps> = ({ active = 'annex', onNavigate, open = true, onLogout }) => {
  // Read directly from storage each render so it updates after login/logout.
  const user = getCurrentUser();

  return (
    <aside id="app-sidebar" className={`${styles.sidebar} ${open ? '' : styles.sidebarClosed}`}>
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarBrandRow}>
          <div className={styles.sidebarBrandLeft}>
            <div className={styles.sidebarLogo}>
              <img className={styles.sidebarLogoImg} src="/actpilot logo (Black)22.png" alt="logo" />
            </div>
            <div>
              <div className={styles.sidebarBrand}>ACTPILOT</div>
              <div className={styles.sidebarBrandSub}>Compliance Workspace</div>
            </div>
          </div>
        </div>
      </div>

      {/* User header - shows when signed in */}
      {user ? (
        <Box className={styles.sidebarUser} sx={{ borderBottom: '1px solid var(--border)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, lineHeight: 1.1 }} noWrap>
                {user.name || user.email || 'User'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--text-muted)' }} noWrap>
                {user.email || ''}
              </Typography>
            </Box>

            <Button
              size="small"
              variant="outlined"
              onClick={onLogout}
              disabled={!onLogout}
              sx={{
                borderRadius: 999,
                textTransform: 'none',
                fontWeight: 800,
                borderColor: 'color-mix(in srgb, var(--primary) 35%, var(--border))',
                color: 'var(--primary)'
              }}
            >
              Logout
            </Button>
          </Box>
        </Box>
      ) : null}

      <nav className={styles.sidebarNav}>
        <ul>
          <li className={styles.sidebarSectionLabel}>CORE WORKSPACE</li>

          <li
            className={`${styles.sidebarItem} ${active === 'risk' ? styles.sidebarItemActive : ''}`}
            onClick={() => onNavigate && onNavigate('risk')}
            role="button"
            tabIndex={0}
          >
            <div className={styles.sidebarItemIcon} aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 3l7 4v6c0 4.4-3 7.9-7 8.9-4-1-7-4.5-7-8.9V7l7-4Z" stroke="currentColor" strokeWidth="2" />
                <path d="M9.2 12.1 11 13.9l3.8-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className={styles.sidebarItemText}>
              <div className={styles.sidebarItemTitle}>AI Risk Checker</div>
              <div className={styles.sidebarItemSubtitle}>Analyse and classify AI system risk profiles.</div>
            </div>
          </li>

          <li
            className={`${styles.sidebarItem} ${active === 'annex' ? styles.sidebarItemActive : ''}`}
            onClick={() => onNavigate && onNavigate('annex')}
            role="button"
            tabIndex={0}
          >
            <div className={styles.sidebarItemIcon} aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 3h7l3 3v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" />
                <path d="M14 3v4h4" stroke="currentColor" strokeWidth="2" />
                <path d="M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M8 16h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className={styles.sidebarItemText}>
              <div className={styles.sidebarItemTitle}>Annex IV</div>
              <div className={styles.sidebarItemSubtitle}>Generate compliant technical documentation packets.</div>
            </div>
          </li>

          <li className={`${styles.sidebarSectionLabel} ${styles.sidebarSectionLabelSpaced}`}>WORKFLOW</li>

          <li className={`${styles.sidebarItem} ${styles.sidebarItemDisabled}`}>
            <div className={styles.sidebarItemIcon} aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 4h8v4H8V4Z" stroke="currentColor" strokeWidth="2" />
                <path d="M6 10h12v10H6V10Z" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            <div className={styles.sidebarItemText}>
              <div className={styles.sidebarItemTitle}>Documents</div>
              <div className={styles.sidebarItemSubtitle}>Repository for evidence, audits, and supporting files.</div>
            </div>
            <div className={styles.sidebarSoon}>Soon</div>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
