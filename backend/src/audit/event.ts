import { createHash, randomUUID } from 'node:crypto';
import type { AuditEvent } from '../../../shared/domain';
export function auditEvent(action: string, actor: string, resourceRef: string, requestId: string): AuditEvent {
  const timestamp = new Date().toISOString();
  const eventId = randomUUID();
  return { eventType: action, sortKey: `${timestamp}#${eventId}`, eventId, timestamp, requestId,
    actorRef: createHash('sha256').update(actor).digest('hex'), action, resourceRef, outcome: 'SUCCESS' };
}
