import type { Answers, Question, TopicReference } from '../types';
export type Wave = 'pre' | 'post';
export type Response = { id: string; wave: Wave; answers: Answers; questions: Question[]; startedAt: string; completedAt: string; instrumentVersion: string; programmeVersion: string };
export type Person = { questionnaireInstrument?: string; id: string; createdAt: string; isTest: boolean; consent: { at: string; version: string; text: string; information: {title:string;text:string}[]; beforeExposureConfirmed: boolean | null }; responses: Response[] };
export type Contact = { personId: string; firstHash: string; afterKey: string; email: string | null; permission: boolean; permissionAt?: string; permissionVersion?: string; permissionText?: string; contactChoiceSaved?: boolean; demoAfterOpen?: boolean; delivery: 'not_sent' | 'sent' | 'failed' | 'stopped'; sentAt?: string; deliveryNote?: string; events: {at:string;action:string}[] };
export type Research = { people: Person[] };
export type Contacts = { contacts: Contact[] };
export type Data = { research: Research; contacts: Contacts };
export type View = { topicReference?: TopicReference; responseInstrument?: string; id: string; mode: 'study'; step: 'pre' | 'contact' | 'waiting' | 'post' | 'complete' | 'stopped' | 'deleted'; message: string; contactChoiceSaved: boolean; permission: boolean; email: string | null; completed: Wave[] };
