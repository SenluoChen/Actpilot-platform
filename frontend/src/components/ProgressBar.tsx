import React from "react";
import styles from "./ProgressBar.module.css";

interface Props {
  percent: number; // 0-100
  label?: string;
  sublabel?: string;
  actions?: React.ReactNode;
}

const ProgressBar: React.FC<Props> = ({ percent, label = "Completion", sublabel, actions }) => {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className={`${styles.progressWrap} progressWrap`} aria-hidden={false}>
      <div className={`${styles.progressLabel} progressLabel`}>
        <div>{label}</div>
        {sublabel ? <div className={`${styles.progressSub} progressSub`}>{sublabel}</div> : null}
      </div>
      <div className={`${styles.progressTrack} progressTrack`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className={`${styles.progressFill} progressFill`} style={{ width: `${pct}%` }} />
      </div>
      <div className={`${styles.progressPct} progressPct`}>{pct}%</div>
      {actions ? <div className={styles.progressActions}>{actions}</div> : null}
    </div>
  );
};

export default ProgressBar;
