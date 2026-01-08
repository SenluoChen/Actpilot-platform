import React, { useMemo, useState } from "react";
import MenuIcon from '@mui/icons-material/Menu';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';

import styles from "./TopBar.module.css";


export type TopBarUser = {
  name?: string;
  email?: string;
};

interface TopBarProps {
  onToggleSidebar?: () => void;
  currentUser?: TopBarUser | null;
  onLogout?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar, currentUser, onLogout }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const initials = useMemo(() => {
    const s = (currentUser?.name || currentUser?.email || '').trim();
    if (!s) return '?';
    return s.charAt(0).toUpperCase();
  }, [currentUser?.name, currentUser?.email]);

  return (
    <header className={`topbar ${styles.topbar}`}>
      <div className={styles.topbarLeft}>
        <button id="sidebar-toggle" className={styles.sidebarToggle} onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <MenuIcon fontSize="small" color="inherit" />
        </button>

        <div className={styles.topbarHeading}>
          <img src={'/actpilot logo (Black)22.png'} alt="ActPilot" className={styles.topbarLogo} />
          <div>
            <div className={styles.topbarTitle}>ActPilot</div>
            <div className={styles.topbarSubtitle}>Compliance workspace</div>
          </div>
        </div>
      </div>

      <div className={styles.topbarActions}>
        {currentUser ? (
          <>
            <IconButton
              className={styles.userIconBtn}
              onClick={(e) => setAnchorEl(e.currentTarget)}
              size="small"
              aria-label="User menu"
              aria-controls={open ? 'topbar-user-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : undefined}
            >
              <Avatar sx={{ bgcolor: 'var(--primary)', width: 34, height: 34, fontWeight: 900 }}>
                {initials}
              </Avatar>
            </IconButton>

            {/* Avatar only in the topbar; details are shown in the menu on click */}

            <Menu
              id="topbar-user-menu"
              anchorEl={anchorEl}
              open={open}
              onClose={() => setAnchorEl(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              PaperProps={{
                className: styles.userMenuPaper,
              }}
            >
              <Box className={styles.userMenuHeader} sx={{ padding: '10px 12px', display: 'flex', gap: 2, alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'var(--primary)', width: 48, height: 48, fontWeight: 900 }}>
                  {initials}
                </Avatar>
                <div style={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 900, lineHeight: 1.15, fontSize: '0.95rem' }} noWrap>
                    {currentUser.name || currentUser.email || 'User'}
                  </Typography>
                  {/* 'Signed in as' line removed per UI preference */}
                </div>
              </Box>
              <Divider />
              <MenuItem
                onClick={() => {
                  setAnchorEl(null);
                  onLogout?.();
                }}
                disabled={!onLogout}
                sx={{ fontWeight: 800, px: 3, py: 1.5, '&:hover': { background: 'color-mix(in srgb, var(--primary) 8%, transparent)' } }}
              >
                Log out
              </MenuItem>
            </Menu>
          </>
        ) : null}
      </div>
    </header>
  );
};

export default TopBar;
