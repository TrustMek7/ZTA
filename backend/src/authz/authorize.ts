import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda';
import { ApiError } from '../shared/errors';

export type Role = 'DONANTE' | 'GESTOR' | 'AUDITOR';
export type Identity = { sub: string; groups: string[] };
export function groupsFromClaim(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value !== 'string') return [];
  try { const parsed: unknown = JSON.parse(value); if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === 'string'); } catch { /* HTTP API also serializes groups as [DONANTE]. */ }
  return value.replace(/^\[|\]$/g, '').split(',').map(v => v.trim()).filter(Boolean);
}
// The HTTP API JWT authorizer verifies signature, issuer, expiry and audience first.
// This function must never be used behind an unauthenticated public route.
export function authorize(event: APIGatewayProxyEventV2WithJWTAuthorizer, role: Role, scope: string): Identity {
  const claims = event.requestContext.authorizer?.jwt?.claims;
  if (!claims || typeof claims.sub !== 'string' || claims.token_use !== 'access' ||
      !process.env.COGNITO_CLIENT_ID || claims.client_id !== process.env.COGNITO_CLIENT_ID ||
      !process.env.API_AUDIENCE || claims.aud !== process.env.API_AUDIENCE ||
      Number(claims.exp) <= Date.now() / 1000 || !Number.isFinite(Number(claims.exp))) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Inicia sesión nuevamente para continuar.');
  }
  const scopes = typeof claims.scope === 'string' ? claims.scope.split(' ') : [];
  const groups = groupsFromClaim(claims['cognito:groups']);
  if (!scopes.includes(scope) || !groups.includes(role)) throw new ApiError(403, 'FORBIDDEN', 'No tienes permiso para realizar esta operación.');
  return { sub: claims.sub, groups };
}
