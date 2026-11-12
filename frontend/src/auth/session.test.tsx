// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
const { settings } = vi.hoisted(() => ({ settings: vi.fn() }));
vi.mock('oidc-client-ts', () => ({
  InMemoryWebStorage: class {},
  WebStorageStateStore: class {},
  UserManager: class { constructor(config: unknown) { settings(config); } },
}));
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); settings.mockClear(); });
it('CA-03.2/T11 solicita access tokens para la audiencia API manteniendo Code + PKCE', async () => {
  vi.stubEnv('VITE_COGNITO_AUTHORITY', 'https://issuer.example');
  vi.stubEnv('VITE_COGNITO_CLIENT_ID', 'fictional-client');
  vi.stubEnv('VITE_COGNITO_DOMAIN', 'https://login.example');
  vi.stubEnv('VITE_API_AUDIENCE', '');
  await import('./session');
  const config = settings.mock.calls[0][0];
  expect(config.response_type).toBe('code');
  expect(config.disablePKCE).not.toBe(true);
  expect(config.extraQueryParams.resource).toBe('https://aqp-solidaria.example/api');
  expect(config.extraQueryParams.resource).not.toBe(config.client_id);
  expect(config.scope).toContain('api/donations.read');
});
