import type { AuditEvent, Donation, NewDonation, NewProject, Outcome, Page, Project } from '../../../shared/domain';

export type DonationRequest = { input: NewDonation; donorSub: string; key: string; payloadHash: string; now: string; requestId: string };
export interface Repository {
  projects(cursor?: string): Promise<Page<Project>>;
  project(id: string): Promise<Project | undefined>;
  createProject(input: NewProject, actor: string, requestId: string): Promise<Project>;
  publishProject(id: string, actor: string, requestId: string): Promise<Project>;
  createDonation(request: DonationRequest): Promise<Donation>;
  donation(id: string): Promise<Donation | undefined>;
  donations(sub: string, cursor?: string): Promise<Page<Donation>>;
  simulate(id: string, sub: string, outcome: Outcome, requestId: string): Promise<Donation>;
  audit(type: string, cursor?: string): Promise<Page<AuditEvent>>;
}
