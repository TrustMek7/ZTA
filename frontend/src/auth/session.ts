import { InMemoryWebStorage, UserManager, WebStorageStateStore, type User } from 'oidc-client-ts';

export const authConfigured = Boolean(import.meta.env.VITE_COGNITO_AUTHORITY && import.meta.env.VITE_COGNITO_CLIENT_ID && import.meta.env.VITE_COGNITO_DOMAIN);
const domain = import.meta.env.VITE_COGNITO_DOMAIN?.replace(/\/$/, '');
export const manager = authConfigured ? new UserManager({
  authority: import.meta.env.VITE_COGNITO_AUTHORITY,
  client_id: import.meta.env.VITE_COGNITO_CLIENT_ID,
  redirect_uri: `${window.location.origin}/auth/callback`,
  post_logout_redirect_uri: window.location.origin,
  response_type: 'code',
  scope: 'openid email api/projects.write api/donations.write api/donations.read api/audit.read',
  userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
  // Only the PKCE verifier and OAuth interaction state persist during redirect.
  stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
  automaticSilentRenew: true,
  revokeTokensOnSignout: true,
  metadata: {
    issuer: import.meta.env.VITE_COGNITO_AUTHORITY,
    authorization_endpoint: `${domain}/oauth2/authorize`,
    token_endpoint: `${domain}/oauth2/token`,
    revocation_endpoint: `${domain}/oauth2/revoke`,
    userinfo_endpoint: `${domain}/oauth2/userInfo`,
    jwks_uri: `${import.meta.env.VITE_COGNITO_AUTHORITY}/.well-known/jwks.json`,
  },
}) : null;

export async function accessToken() { const user = await manager?.getUser(); return user && !user.expired ? user.access_token : undefined; }
export function roles(user: User | null): string[] {
  if (!user || user.expired) return [];
  // UI hints only. The API verifies the actual token and permissions independently.
  try {
    const base64 = user.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(base64));
    return Array.isArray(claims['cognito:groups']) ? claims['cognito:groups'] : [];
  } catch { return []; }
}
let callback: Promise<User> | undefined;
export const finishLogin = () => callback ??= manager!.signinRedirectCallback();
export const login = () => manager?.signinRedirect();
export async function logout() {
  if (!manager) return;
  let failure = false;
  try { await manager.revokeTokens(['refresh_token']); } catch { failure = true; }
  finally { await manager.removeUser(); }
  if (failure) throw new Error('La sesión local se cerró, pero no se pudo revocar la sesión remota. El token de acceso expirará en un máximo de 15 minutos.');
  window.location.assign(`${domain}/logout?client_id=${encodeURIComponent(import.meta.env.VITE_COGNITO_CLIENT_ID)}&logout_uri=${encodeURIComponent(window.location.origin)}`);
}
