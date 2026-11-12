// Test double: never deployed, never used as authentication or production storage.
import { randomUUID } from 'node:crypto';
import type { AuditEvent, Donation, NewProject, Outcome, Project } from '../../shared/domain';
import { auditEvent } from '../src/audit/event';
import { conflict, notFound } from '../src/shared/errors';
import type { DonationRequest, Repository } from '../src/shared/repository';
export class MemoryRepository implements Repository {
  projectRows = new Map<string, Project>();
  donationRows = new Map<string, Donation>();
  keys = new Map<string, { hash: string; donation: Donation }>();
  events: AuditEvent[] = [];
  async projects() { return { items: [...this.projectRows.values()].filter(p => p.status === 'PUBLICADO') }; }
  async project(id: string) { return this.projectRows.get(id); }
  async createProject(input: NewProject, actor: string, requestId: string) {
    const now = new Date().toISOString();
    const p: Project = { ...input, projectId: randomUUID(), confirmedAmountCents: 0, currency: 'PEN', status: 'BORRADOR', createdAt: now, updatedAt: now };
    this.projectRows.set(p.projectId, p); this.events.push(auditEvent('PROJECT_CREATED', actor, p.projectId, requestId)); return p;
  }
  async publishProject(id: string, actor: string, requestId: string) {
    const p = this.projectRows.get(id); if (!p) throw notFound(); if (p.status !== 'BORRADOR') throw conflict();
    const updated: Project = { ...p, status: 'PUBLICADO', updatedAt: new Date().toISOString() };
    this.projectRows.set(id, updated); this.events.push(auditEvent('PROJECT_PUBLISHED', actor, id, requestId)); return updated;
  }
  async createDonation(r: DonationRequest) {
    const key = `${r.donorSub}#${r.key}`; const existing = this.keys.get(key);
    if (existing) { if (existing.hash !== r.payloadHash) throw conflict(); return existing.donation; }
    const p = this.projectRows.get(r.input.projectId); if (!p) throw notFound(); if (p.status !== 'PUBLICADO') throw conflict();
    const d: Donation = { ...r.input, donationId: randomUUID(), donorSub: r.donorSub, currency: 'PEN', status: 'PENDIENTE_SIMULACION', createdAt: r.now, updatedAt: r.now };
    this.donationRows.set(d.donationId, d); this.keys.set(key, { hash: r.payloadHash, donation: d }); this.events.push(auditEvent('DONATION_CREATED', r.donorSub, d.donationId, r.requestId)); return d;
  }
  async donation(id: string) { return this.donationRows.get(id); }
  async donations(sub: string) { return { items: [...this.donationRows.values()].filter(d => d.donorSub === sub) }; }
  async simulate(id: string, sub: string, outcome: Outcome, requestId: string) {
    const d = this.donationRows.get(id); if (!d || d.donorSub !== sub) throw notFound(); if (d.status !== 'PENDIENTE_SIMULACION') throw conflict();
    const updated: Donation = { ...d, status: outcome, updatedAt: new Date().toISOString() };
    if (outcome === 'CONFIRMADA_SIMULADA') { const p = this.projectRows.get(d.projectId)!; this.projectRows.set(p.projectId, { ...p, confirmedAmountCents: p.confirmedAmountCents + d.amountCents }); }
    this.donationRows.set(id, updated); this.events.push(auditEvent(outcome === 'CONFIRMADA_SIMULADA' ? 'DONATION_CONFIRMED' : 'DONATION_REJECTED', sub, id, requestId)); return updated;
  }
  async audit(type: string) { return { items: this.events.filter(e => e.eventType === type) }; }
}
