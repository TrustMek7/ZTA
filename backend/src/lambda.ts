import { handlers } from './app';
import { DynamoRepository } from './shared/dynamo';
const app = handlers(new DynamoRepository());
export const publicProjects = app.publicProjects;
export const manageProjects = app.manageProjects;
export const createDonation = app.createDonation;
export const history = app.history;
export const simulate = app.simulate;
export const audit = app.audit;
