import type {ParticipationRecord,ResearchConsent} from './participation';
import type {Answer,Panel,Question,Role,Wave} from './instrument';
export type Form={answers:Record<string,Answer>;page:number;revision:number;attempt?:number;beforeAttempt?:number;startedAt:string;completedAt?:string;updatedAt?:string};
export type SavedPerson={id:string;panel:Panel;role:Role;speakerId?:string;instrumentVersion:string;isTest:boolean;participation?:ParticipationRecord;consent?:ResearchConsent;collectionVersion?:string;priorRecordId?:string;panelContext?:'invitation'|'unspecified';withdrawnAt?:string;createdAt:string;attempts?:Record<Wave,number>;resetVersion?:number;lastReset?:{at:string;waves:Wave[]};pairing?:{beforeAttempt:number;afterBeforeAttempt:number|null;matched:boolean;staleAfter:boolean};history?:ResetHistory[];forms:Partial<Record<Wave,Form>>;questionnaires:Record<Wave,Question[]>};

export type ResetHistory={requestId:string;resetVersion:number;at:string;waves:Wave[];attempts:Record<Wave,number>;forms:Partial<Record<Wave,Form>>;instrumentVersion:string;questionnaires:Record<Wave,Question[]>;consent?:ResearchConsent;participation?:ParticipationRecord};
