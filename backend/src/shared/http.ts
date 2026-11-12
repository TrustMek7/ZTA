import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { ZodError, type ZodType } from 'zod';
import { ApiError } from './errors';
export type Event = APIGatewayProxyEventV2WithJWTAuthorizer;
export function body<T>(event: Event, schema: ZodType<T>): T {
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body ?? '', 'base64').toString('utf8') : event.body ?? '';
    if (Buffer.byteLength(raw) > 16384) throw new ApiError(400, 'INVALID_BODY', 'El contenido supera el límite permitido.');
    return schema.parse(JSON.parse(raw));
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(400, 'INVALID_BODY', 'Revisa los campos e importes enviados.');
  }
}
export function endpoint(action: string, run: (event: Event) => Promise<{ status?: number; data: unknown }>) {
  return async (event: Event): Promise<APIGatewayProxyStructuredResultV2> => {
    const start = Date.now();
    const requestId = event.requestContext.requestId;
    let statusCode: number; let data: unknown;
    try { const result = await run(event); statusCode = result.status ?? 200; data = result.data; }
    catch (error) {
      const known = error instanceof ApiError ? error : error instanceof ZodError ? new ApiError(400, 'INVALID_INPUT', 'Revisa los datos enviados.') : new ApiError(500, 'INTERNAL_ERROR', 'No pudimos completar la operación. Inténtalo de nuevo.');
      statusCode = known.status; data = { code: known.code, message: known.message, requestId };
    }
    console.log(JSON.stringify({ requestId, action, outcome: statusCode < 400 ? 'SUCCESS' : 'DENIED_OR_ERROR', statusCode, durationMs: Date.now() - start }));
    return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }, body: JSON.stringify(data) };
  };
}
