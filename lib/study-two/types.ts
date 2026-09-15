import type {ParticipationRecord,ResearchConsent} from './participation';
import type {Answer,Panel,Question,Role,Wave} from './instrument';
export type Form={answers:Record<string,Answer>;page:number;revision:number;startedAt:string;completedAt?:string;updatedAt?:string};
export type SavedPerson={id:string;panel:Panel;role:Role;speakerId?:string;instrumentVersion:string;isTest:boolean;participation?:ParticipationRecord;consent?:ResearchConsent;collectionVersion?:string;priorRecordId?:string;panelContext?:'invitation'|'unspecified';withdrawnAt?:string;createdAt:string;forms:Partial<Record<Wave,Form>>;questionnaires:Record<Wave,Question[]>};
