import React, { useEffect, useMemo, useState } from 'react';
import styles from './LoginGate.module.css';
import {
  confirmSignUp,
  signIn,
  signUp,
  initiateForgotPassword,
  confirmForgotPassword,
  resendSignUpCode,
  saveTokens,
  type AuthTokens,
} from './cognito';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

type Screen = 'auth' | 'confirm' | 'signup' | 'forgot' | 'forgotConfirm';

export type LoginGateProps = {
  onSignedIn: (tokens: AuthTokens) => void;
};

function missingEnv(name: string): string | null {
  const v = (import.meta as any).env?.[name];
  return v ? null : `Missing env: ${name}`;
}

export default function LoginGate({ onSignedIn }: LoginGateProps) {
  const [screen, setScreen] = useState<Screen>('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownNow, setCooldownNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!cooldownUntil) return;
    const id = window.setInterval(() => setCooldownNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [cooldownUntil]);

  const hasCognitoClientId = useMemo(() => {
    const v = (import.meta as any).env?.VITE_COGNITO_CLIENT_ID;
    return Boolean(v);
  }, []);

  const envError = useMemo(() => {
    // Local dev mode is allowed when Cognito isn't configured.
    // Only require region when we intend to call real Cognito.
    if (hasCognitoClientId) {
      return missingEnv('VITE_AWS_REGION') || null;
    }
    return null;
  }, [hasCognitoClientId]);

  const formTitle =
    screen === 'confirm'
      ? 'Confirm account'
      : screen === 'signup'
      ? 'Create Account'
      : screen === 'forgot'
      ? 'Forgot password'
      : screen === 'forgotConfirm'
      ? 'Reset password'
      : 'Sign In';

  const finishSignIn = (tokens: AuthTokens) => {
    saveTokens(tokens);
    // Show the redirecting splash animation, then navigate.
    setRedirecting(true);
    // Respect prefers-reduced-motion; keep the overlay opaque until navigation.
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? 120 : 650;
    window.setTimeout(() => {
      onSignedIn(tokens);
    }, duration);
  };

  const describeError = (e: any): string => {
    const name = e?.name || e?.Code || e?.code;
    const msg = e?.message || String(e);
    return name ? `${name}: ${msg}` : msg;
  };

  const getErrorName = (e: any): string | null => {
    return e?.name || e?.Code || e?.code || null;
  };

  const startCooldown = (ms: number) => {
    setCooldownUntil(Date.now() + ms);
  };

  const cooldownRemainingMs = useMemo(() => {
    if (!cooldownUntil) return 0;
    return Math.max(0, cooldownUntil - cooldownNow);
  }, [cooldownUntil, cooldownNow]);

  const cooldownRemainingSec = Math.ceil(cooldownRemainingMs / 1000);

  const onSubmit = async (mode: 'signup' | 'signin' | 'confirm') => {
    setBusy(true);
    setError(null);
    let shouldStopBusy = true;
    try {
      if (envError) throw new Error(envError);

      if (cooldownRemainingMs > 0) {
        throw new Error(`Too many attempts. Please wait ${cooldownRemainingSec}s and try again.`);
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Basic client-side password validation to catch common AWS/Cognito errors
      if (mode === 'signup' || mode === 'signin') {
        // Don't trim the password (users may intentionally include spaces inside),
        // but disallow leading/trailing spaces which Cognito rejects with the pattern.
        if (!/^\S.*\S$/.test(password)) {
          throw new Error('Password must not start or end with a space.');
        }
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters long.');
        }
      }

      if (mode === 'signup') {
        const trimmedName = company.trim();
        if (!trimmedName) throw new Error('Please enter your name or company');
        await signUp(normalizedEmail, password, trimmedName);
        // Always require email confirmation before signing in.
        setScreen('confirm');
        return;
      }

      if (mode === 'confirm' || screen === 'confirm') {
        await confirmSignUp(normalizedEmail, code.trim());
        // after confirming, user can login immediately
        setScreen('auth');
        return;
      }

      // signin
      const tokens = await signIn(normalizedEmail, password);
      shouldStopBusy = false;
      finishSignIn(tokens);
    } catch (e: any) {
      const errName = getErrorName(e);
      // Common Cognito flows: guide the user to the right next step.
      if (errName === 'UserNotConfirmedException') {
        setScreen('confirm');
      }
      if (errName === 'PasswordResetRequiredException') {
        setScreen('forgot');
      }

      // Cognito throttling / attempt limits (common when retrying quickly)
      if (errName === 'LimitExceededException' || errName === 'TooManyRequestsException') {
        startCooldown(60_000);
      }
      setError(describeError(e));
    } finally {
      if (shouldStopBusy) setBusy(false);
    }
  };

  const onResendCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) throw new Error('Please enter your email first.');
      await resendSignUpCode(normalizedEmail);
      setError('Confirmation code resent. Please check your email.');
    } catch (e: any) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  const disabled = busy || redirecting || cooldownRemainingMs > 0;

  return (
    <div className={styles.root}>
      <div className={`${styles.card} ${redirecting ? styles.cardRedirecting : ''}`}>
        <div className={styles.header} />

        {redirecting ? (
          <div className={styles.splashOverlay} aria-live="polite">
            <div className={styles.splashBox}>
              <img src={'/actpilot logo (Black)22.png'} alt="ActPilot" className={styles.splashLogo} />
            </div>
          </div>
        ) : null}

        <div className={styles.body}>
          <div className={styles.grid}>
            <div className={styles.leftPane} aria-hidden="true">
              <div className={styles.leftTop}>
                <img
                  className={styles.leftLogo}
                  src={'/actpilot logo (Black)22.png'}
                  alt=""
                />
                <div className={styles.leftBrandText}>ActPilot</div>
              </div>

              <div className={styles.leftContent}>
                <div className={styles.leftHeadline}>Welcome</div>
                <div className={styles.leftSubhead}>Sign in to continue access</div>
              </div>

              <div className={styles.leftFooter}>www.actpilot.ai</div>
            </div>

            <div className={styles.rightPane}>
              <div className={styles.rightHeader}>
                <div className={styles.rightTitle}>{formTitle}</div>
              </div>

              <div className={styles.form}>
                <input
                  className={styles.input}
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={disabled}
                />

                {screen === 'confirm' ? (
                  <input
                    className={styles.input}
                    placeholder="Confirmation code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    inputMode="numeric"
                    disabled={disabled}
                  />
                ) : screen === 'forgot' ? (
                  <div>Enter your email and we'll send a reset code.</div>
                ) : screen === 'forgotConfirm' ? (
                  <>
                    <input
                      className={styles.input}
                      placeholder="Confirmation code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      inputMode="numeric"
                      disabled={disabled}
                    />
                    <div className={styles.inputRow}>
                      <input
                        className={styles.input}
                        placeholder="New password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={disabled}
                      />
                      <IconButton
                        size="small"
                        className={styles.iconBtn}
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        tabIndex={-1}
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.inputRow}>
                      <input
                        className={styles.input}
                        placeholder="Password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete={'current-password'}
                        disabled={disabled}
                      />
                      <IconButton
                        size="small"
                        className={styles.iconBtn}
                        onClick={() => setShowPassword((s) => !s)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        tabIndex={-1}
                      >
                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </div>

                    {screen === 'signup' ? (
                      <input
                        className={styles.input}
                        placeholder="Name / Company"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        disabled={disabled}
                      />
                    ) : null}
                  </>
                )}

                {screen === 'confirm' ? (
                  <button
                    className={styles.primaryBtn}
                    onClick={() => onSubmit('confirm')}
                    disabled={disabled}
                  >
                    {disabled ? 'Working...' : 'Confirm'}
                  </button>
                ) : screen === 'signup' ? (
                  <div className={styles.actions}>
                    <button
                      className={styles.primaryBtn}
                      onClick={() => onSubmit('signup')}
                      disabled={disabled}
                    >
                      {disabled ? 'Working...' : 'Create Account'}
                    </button>
                    <button
                      className={styles.secondaryBtn}
                      onClick={() => setScreen('auth')}
                      disabled={disabled}
                    >
                      Back
                    </button>
                  </div>
                ) : screen === 'forgot' ? (
                  <div className={styles.actions}>
                    <button
                      className={styles.primaryBtn}
                      onClick={async () => {
                        setBusy(true);
                        setError(null);
                        try {
                          await initiateForgotPassword(email.trim().toLowerCase());
                          setScreen('forgotConfirm');
                        } catch (e: any) {
                          const msg = describeError(e);
                          // Cognito often returns InvalidParameterException with this message when the user
                          // exists but has no verified delivery destination (e.g., UNCONFIRMED email).
                          if (
                            typeof msg === 'string' &&
                            msg.toLowerCase().includes('no registered/verified email')
                          ) {
                            setScreen('confirm');
                            setError(
                              'Your account is not confirmed yet. Please confirm your email first (use Resend code), then reset password.'
                            );
                          } else {
                            setError(msg);
                          }
                        } finally {
                          setBusy(false);
                        }
                      }}
                      disabled={disabled}
                    >
                      {disabled ? 'Working...' : 'Send reset code'}
                    </button>
                    <button
                      className={styles.secondaryBtn}
                      onClick={() => setScreen('auth')}
                      disabled={disabled}
                    >
                      Back
                    </button>
                  </div>
                ) : screen === 'forgotConfirm' ? (
                  <div className={styles.actions}>
                    <button
                      className={styles.primaryBtn}
                      onClick={async () => {
                        setBusy(true);
                        setError(null);
                        try {
                          if (!/^\S.*\S$/.test(password)) throw new Error('Password must not start or end with a space.');
                          if (password.length < 8) throw new Error('Password must be at least 8 characters long.');
                          await confirmForgotPassword(email.trim().toLowerCase(), code.trim(), password);
                          setScreen('auth');
                        } catch (e: any) {
                          setError(e?.message || String(e));
                        } finally {
                          setBusy(false);
                        }
                      }}
                      disabled={disabled}
                    >
                      {disabled ? 'Working...' : 'Reset password'}
                    </button>
                    <button
                      className={styles.secondaryBtn}
                      onClick={() => setScreen('auth')}
                      disabled={disabled}
                    >
                      Back
                    </button>
                  </div>
                ) : (
                  <div className={styles.actions}>
                    <button
                      className={styles.primaryBtn}
                      onClick={() => onSubmit('signin')}
                      disabled={disabled}
                    >
                      {disabled ? 'Working...' : 'Continue'}
                    </button>
                    <button
                      className={styles.secondaryBtn}
                      onClick={() => setScreen('signup')}
                      disabled={disabled}
                    >
                      {disabled ? 'Working...' : 'Create Account'}
                    </button>
                  </div>
                )}
              </div>

              <div className={styles.helperRow}>
                {screen === 'confirm' ? (
                  <>
                    <button
                      className={styles.linkBtn}
                      onClick={() => setScreen('auth')}
                      disabled={disabled}
                    >
                      Back
                    </button>
                    <button
                      className={styles.linkBtn}
                      onClick={onResendCode}
                      disabled={disabled}
                    >
                      Resend code
                    </button>
                  </>
                ) : screen === 'auth' ? (
                  <>
                    <button
                      className={styles.linkBtn}
                      onClick={() => setScreen('forgot')}
                      disabled={disabled}
                    >
                      Forgot password?
                    </button>
                    <span>Use the same fields for login or sign up.</span>
                  </>
                ) : (
                  <span>Use the same fields for login or sign up.</span>
                )}
              </div>

              {error ? <div className={styles.error}>{error}</div> : null}
              {envError ? <div className={styles.note}>{envError}</div> : null}
              {cooldownRemainingMs > 0 ? (
                <div className={styles.note}>Please wait {cooldownRemainingSec}s before trying again.</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
