export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export const conflict = () => new ApiError(409, 'CONFLICT', 'El recurso cambió o la operación ya fue procesada.');
export const notFound = () => new ApiError(404, 'NOT_FOUND', 'El recurso no existe o no está disponible.');
