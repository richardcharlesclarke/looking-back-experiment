import { Pool } from 'pg';
import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Data } from './types';
import { CONTACT_DELETE_AT, RESEARCH_DELETE_AT } from './content';
const root = globalThis as typeof globalThis & { studyOneRuntime?: { queue: Promise<unknown>; pool?: Pool; retentionTimer?: NodeJS.Timeout } };
const runtime = root.studyOneRuntime ??= { queue: Promise.resolve() };
const directory = path.resolve(process.env.STUDY_ONE_STORE_DIR || '.local/brufest-study-one');
export const empty = (): Data => ({ research: { people: [] }, contacts: { contacts: [] } });
export function purgeExpired(data:Data,at=Date.now()) {
  if(at>=Date.parse(CONTACT_DELETE_AT))data.contacts.contacts=[];
  if(at>=Date.parse(RESEARCH_DELETE_AT))data.research.people=[];
}
// Independent research/contact tables, or separate files published together via an atomic pointer.
// No original experiment or earlier Brufest store is read or changed here.
export function transaction<T>(fn: (data: Data) => T | Promise<T>): Promise<T> {
  const work = async () => {
    if (process.env.STUDY_ONE_DATABASE_URL) {
      runtime.pool ??= new Pool({ connectionString: process.env.STUDY_ONE_DATABASE_URL });
      const db = await runtime.pool.connect();
      try {
        await db.query('BEGIN');
        await db.query('SELECT pg_advisory_xact_lock(197609071)');
        await db.query('CREATE TABLE IF NOT EXISTS study_one_research (id integer PRIMARY KEY, data jsonb NOT NULL)');
        await db.query('CREATE TABLE IF NOT EXISTS study_one_contacts (id integer PRIMARY KEY, data jsonb NOT NULL)');
        const research = await db.query('SELECT data FROM study_one_research WHERE id=1');
        const contacts = await db.query('SELECT data FROM study_one_contacts WHERE id=1');
        const data: Data = { research: research.rows[0]?.data ?? empty().research, contacts: contacts.rows[0]?.data ?? empty().contacts };
        purgeExpired(data);const result = await fn(data);
        for (const [table,value] of [['study_one_research',data.research],['study_one_contacts',data.contacts]] as const)
          await db.query(`INSERT INTO ${table}(id,data) VALUES(1,$1) ON CONFLICT(id) DO UPDATE SET data=$1`,[JSON.stringify(value)]);
        await db.query('COMMIT'); return result;
      } catch(e) { await db.query('ROLLBACK'); throw e; } finally { db.release(); }
    }
    if (process.env.NODE_ENV === 'production' && !process.env.STUDY_ONE_STORE_DIR) throw new Error('Study One storage is not configured.');
    let data = empty(), previous = '';
    try {
      previous = await readFile(path.join(directory,'current'),'utf8');
      if (!/^[a-f0-9-]{36}$/.test(previous)) throw new Error('Invalid Study One storage pointer.');
      data = { research: JSON.parse(await readFile(path.join(directory,previous,'research.json'),'utf8')), contacts: JSON.parse(await readFile(path.join(directory,previous,'contacts.json'),'utf8')) };
    } catch(e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT' || previous) throw e; }
    purgeExpired(data);const result = await fn(data);
    const revision = randomUUID(), folder = path.join(directory,revision);
    await mkdir(folder,{recursive:true,mode:0o700});
    await writeFile(path.join(folder,'research.json'),JSON.stringify(data.research),{mode:0o600});
    await writeFile(path.join(folder,'contacts.json'),JSON.stringify(data.contacts),{mode:0o600});
    await writeFile(path.join(directory,`${revision}.pointer`),revision,{mode:0o600});
    await rename(path.join(directory,`${revision}.pointer`),path.join(directory,'current'));
    if (previous) await rm(path.join(directory,previous),{recursive:true,force:true}).catch(()=>{});
    return result;
  };
  const result=runtime.queue.then(work,work);runtime.queue=result.catch(()=>{});return result;
}
if(!runtime.retentionTimer){runtime.retentionTimer=setInterval(()=>{void transaction(()=>{});},6*60*60*1000);runtime.retentionTimer.unref();}
