import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  ResendConfirmationCodeCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const region = import.meta.env.VITE_AWS_REGION as string | undefined;
const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined;

function requireEnv(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function getClient() {
  // If region is missing, still return a client (some SDK calls will fail later).
  return new CognitoIdentityProviderClient({
    region: region || undefined,
  });
}

export type AuthTokens = {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
};

const STORAGE_KEY = 'auth:tokens';

export function loadTokens(): AuthTokens | null {
  try {
    // Use sessionStorage so a fresh app open requires login.
    // (Keeps the "must login when not logged in" rule, without persisting across browser restarts.)
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.idToken || !parsed?.accessToken) return null;
    return parsed as AuthTokens;
  } catch {
    return null;
  }
}

export function saveTokens(tokens: AuthTokens) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

export function clearTokens() {
  // Clear both storages (legacy + current)
  sessionStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY);
}

export type CurrentUser = {
  email?: string;
  name?: string;
  sub?: string;
};

function base64ToUtf8Json(b64: string): any | null {
  try {
    const bin = atob(b64);
    // atob returns a binary string; decode as UTF-8
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    if (typeof TextDecoder !== 'undefined') {
      const text = new TextDecoder().decode(bytes);
      return JSON.parse(text);
    }
    // No TextDecoder available (older environments) — try ASCII-compatible path.
    return JSON.parse(atob(b64));
  } catch {
    // Fallback to ASCII-compatible path (covers most JWT payloads)
    try {
      return JSON.parse(atob(b64));
    } catch {
      return null;
    }
  }
}

function tryParseJwtPayload(token: string | undefined): any | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = parts[1];
      // Cognito JWT uses base64url without padding; atob expects padded base64.
      let b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const pad = b64.length % 4;
      if (pad) b64 = b64 + '='.repeat(4 - pad);
      return base64ToUtf8Json(b64);
    }

    // handle local mock token format: local-id-token.<base64Email>.<ts>
    const parts2 = token.split('.');
    if (parts2.length >= 2 && parts2[0].startsWith('local-')) {
      try {
        const email = atob(parts2[1]);
        return { email };
      } catch {
        return null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function getCurrentUser(tokens?: AuthTokens | null): CurrentUser | null {
  const t = tokens ?? loadTokens();
  if (!t) return null;
  const payload = tryParseJwtPayload(t.idToken) || tryParseJwtPayload(t.accessToken);
  if (!payload) return null;
  return {
    email: payload.email || payload['cognito:username'] || undefined,
    name: payload.name || undefined,
    sub: payload.sub || undefined,
  };
}

export function getEmailFromTokens(tokens?: AuthTokens | null): string | null {
  const t = tokens ?? loadTokens();
  if (!t) return null;
  const payload = tryParseJwtPayload(t.idToken) || tryParseJwtPayload(t.accessToken);
  if (!payload) return null;
  return payload.email || payload['cognito:username'] || null;
}

export async function signUp(email: string, password: string, name?: string) {
  // If no client ID is configured, allow a local dev path (mock user creation)
  if (!clientId) {
    return { userSub: `local-${Date.now()}`, userConfirmed: true };
  }
  const c = getClient();
  const params: any = {
    ClientId: requireEnv('VITE_COGNITO_CLIENT_ID', clientId),
    Username: email,
    Password: password,
  };

  // IMPORTANT: set email attribute so Cognito can send confirm/reset codes.
  // Without this, ForgotPassword may fail with:
  // "Cannot reset password for the user as there is no registered/verified email or phone_number"
  const userAttributes: Array<{ Name: string; Value: string }> = [
    { Name: 'email', Value: email },
  ];
  if (name) userAttributes.push({ Name: 'name', Value: name });
  params.UserAttributes = userAttributes;

  const res = await c.send(new SignUpCommand(params));
  return { userSub: res.UserSub, userConfirmed: res.UserConfirmed };
}

export async function confirmSignUp(email: string, code: string) {
  if (!clientId) return; // nothing to confirm in local dev mode
  const c = getClient();
  await c.send(
    new ConfirmSignUpCommand({
      ClientId: requireEnv('VITE_COGNITO_CLIENT_ID', clientId),
      Username: email,
      ConfirmationCode: code,
    })
  );
}

export async function resendSignUpCode(email: string) {
  if (!clientId) return;
  const c = getClient();
  await c.send(
    new ResendConfirmationCodeCommand({
      ClientId: requireEnv('VITE_COGNITO_CLIENT_ID', clientId),
      Username: email,
    })
  );
}

export async function initiateForgotPassword(email: string) {
  if (!clientId) {
    // local dev: pretend a code was sent
    return { CodeDeliveryDetails: { Destination: `${email}`, DeliveryMedium: 'EMAIL', AttributeName: 'email' } };
  }
  const c = getClient();
  const res = await c.send(
    new ForgotPasswordCommand({
      ClientId: requireEnv('VITE_COGNITO_CLIENT_ID', clientId),
      Username: email,
    })
  );
  return res;
}

export async function confirmForgotPassword(email: string, code: string, newPassword: string) {
  if (!clientId) {
    // local dev: accept any code/password
    return;
  }
  const c = getClient();
  await c.send(
    new ConfirmForgotPasswordCommand({
      ClientId: requireEnv('VITE_COGNITO_CLIENT_ID', clientId),
      Username: email,
      ConfirmationCode: code,
      Password: newPassword,
    })
  );
}

export async function signIn(email: string, password: string): Promise<AuthTokens> {
  // Local dev fallback: return a fake token when Cognito client ID is not configured.
  if (!clientId) {
    const fake = {
      idToken: `local-id-token.${btoa(email)}.${Date.now()}`,
      accessToken: `local-access-token.${btoa(email)}.${Date.now()}`,
      refreshToken: undefined,
    };
    return fake;
  }

  const c = getClient();
  const res = await c.send(
    new InitiateAuthCommand({
      ClientId: requireEnv('VITE_COGNITO_CLIENT_ID', clientId),
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    })
  );

  const auth = res.AuthenticationResult;
  if (!auth?.IdToken || !auth?.AccessToken) {
    throw new Error('Login failed: missing token result');
  }

  return {
    idToken: auth.IdToken,
    accessToken: auth.AccessToken,
    refreshToken: auth.RefreshToken,
  };
}
