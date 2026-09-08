import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { isAdmin } from '@/lib/brufest/server';
export const dynamic='force-dynamic';
export async function GET(){
  if(!await isAdmin())return new Response('Please sign in.',{status:401});
  return new Response(await readFile(path.join(process.cwd(),'docs/brufest/HELPER-RUN-SHEET.md'),'utf8'),{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
}
