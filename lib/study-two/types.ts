import type {Answer,Panel,Question,Role,Wave} from './instrument';
export type Form={answers:Record<string,Answer>;page:number;revision:number;startedAt:string;completedAt?:string;updatedAt?:string};
export type SavedPerson={id:string;panel:Panel;role:Role;speakerId?:string;instrumentVersion:string;isTest:boolean;createdAt:string;forms:Partial<Record<Wave,Form>>;questionnaires:Record<Wave,Question[]>};
