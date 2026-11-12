import { z } from 'zod';

export const projectInput = z.object({
  title: z.string().trim().min(5).max(100),
  description: z.string().trim().min(30).max(4000),
  goalAmountCents: z.number().int().min(100).max(100_000_000),
}).strict();
export const donationInput = z.object({ projectId: z.string().uuid(), amountCents: z.number().int().min(100).max(100000) }).strict();
export const simulationInput = z.object({ outcome: z.enum(['CONFIRMADA_SIMULADA', 'RECHAZADA_SIMULADA']) }).strict();
export const idempotencyKey = z.string().uuid();
export type NewProject = z.infer<typeof projectInput>;
export type NewDonation = z.infer<typeof donationInput>;
export type Outcome = z.infer<typeof simulationInput>['outcome'];
export type Project = NewProject & { projectId: string; confirmedAmountCents: number; currency: 'PEN'; status: 'BORRADOR' | 'PUBLICADO'; createdAt: string; updatedAt: string };
export type Donation = NewDonation & { donationId: string; donorSub: string; currency: 'PEN'; status: 'PENDIENTE_SIMULACION' | Outcome; createdAt: string; updatedAt: string };
export type PublicDonation = Omit<Donation, 'donorSub'>;
export type AuditEvent = { eventType: string; sortKey: string; eventId: string; timestamp: string; requestId: string; actorRef: string; action: string; resourceRef: string; outcome: string };
export type Page<T> = { items: T[]; nextCursor?: string };

export const pen = (cents: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(cents / 100);
export function parsePEN(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, decimal = ''] = normalized.split('.');
  const cents = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
}
