"""Build an allowlisted Study One review source tree; never copy environment or data files."""
from pathlib import Path
import shutil,json,hashlib,sys
root=Path(__file__).resolve().parents[1]
out=Path(sys.argv[1]).resolve()
if out.exists():
    raise SystemExit('Use a new empty output directory; refusing to overwrite an existing tree.')
out.mkdir(parents=True)
files=['tsconfig.json','next-env.d.ts','app/globals.css','app/brufest/layout.tsx','app/brufest/brufest.css','app/brufest/festival-journey.css','app/brufest/study-one-participant.css','app/brufest/FestivalParticipant.tsx','app/brufest/Question.tsx','app/brufest/ContinuousOrb.tsx','app/brufest/ConnectionCircles.tsx','app/looking-back/VectorDecoration.tsx','public/vector-decoration/profile-vector-new-1.svg','public/vector-decoration/profile-vector-new-2-open.svg','app/study-one/page.tsx','app/conflictbench/ConflictBenchVoiceTextarea.tsx','app/conflictbench/useConflictBenchLiveTranscription.ts','lib/conflictbench-transcription.ts','app/api/admin/login/route.ts','app/admin/brufest/festival/page.tsx','lib/admin.ts','lib/brufest/server.ts']
files += [str(p.relative_to(root)) for folder in ['lib/brufest/festival','app/api/brufest/festival'] for p in (root/folder).rglob('*') if p.is_file()]
for name in files:
    dest=out/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/name,dest)
for name in ['package.json','package-lock.json']:
    shutil.copy2(root/'docs/brufest'/('study-one-review-'+name),out/name)
# Preserve only Study One questionnaire construction and common validation in this deployment.
s=(root/'lib/brufest/instruments.ts').read_text()
s=s.replace("import { PAIR_VERSION, screeningQuestions } from './pair-topics';\n",'')
s=s[:s.index('export const STUDIES =')]+s[s.index('export const PROGRAMME ='):]
a=s.index('const topicChange =');b=s.index('const festivalCore =',a);s=s[:a]+s[b:]
a=s.index('const panelCore =');b=s.index('function q(',a);s=s[:a]+s[b:]
a=s.index('const process =');b=s.index('export function validFlow',a);s=s[:a]+s[b:]
a=s.index('export function validFlow');b=s.index('export function questions',a);s=s[:a]+'''export function validFlow(study: Study, role: Role, wave: Wave) {
  return study === 'festival' && role === 'attendee' && ['pre','post'].includes(wave);
}
'''+s[b:]
s=s.replace("  if (ctx.study === 'pairs' && ctx.wave === 'screen' && ctx.screeningBank === PAIR_VERSION) return screeningQuestions();\n",'')
s=s.replace('const { study, role, wave, session } = ctx;', 'const { study, role, wave } = ctx;')
a=s.index('\n  } else {',s.index('export function questions'));b=s.index('\nfunction resolve(',a)
s=s[:a]+'''\n  }
  return out.map((item) => resolve(item, ctx));
}
'''+s[b:]
(out/'lib/brufest/instruments.ts').write_text(s)
bank=json.loads((root/'lib/brufest/question-bank.json').read_text());(out/'lib/brufest/question-bank.json').write_text(json.dumps({k:v for k,v in bank.items() if k.startswith('E1_')},ensure_ascii=False,indent=2))
types=(root/'lib/brufest/types.ts').read_text();types=types[:types.index('export type State =')]+ 'export type State = { sessions: Session[]; submissions: Submission[] };\n';(out/'lib/brufest/types.ts').write_text(types)
exports=(root/'lib/brufest/export.ts').read_text();(out/'lib/brufest/export.ts').write_text(exports[exports.index('export function csv('):])
(out/'app/layout.tsx').write_text('''import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'How We Disagree · Big Brue',robots:{index:false,follow:false},referrer:'no-referrer'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
''')
(out/'app/brufest/festival').mkdir(parents=True)
(out/'app/brufest/festival/page.tsx').write_text("import FestivalParticipant from '../FestivalParticipant';\nexport default FestivalParticipant;\n")
(out/'app/page.tsx').write_text("import {redirect} from 'next/navigation';\nexport default function Home(){redirect('/study-one');}\n")
(out/'app/api/health').mkdir(parents=True)
(out/'app/api/health/route.ts').write_text("export async function GET(){return Response.json({ok:true,study:'one',mode:'live',realCollection:true});}\n")
(out/'next.config.ts').write_text("import type {NextConfig} from 'next';\nconst config:NextConfig={assetPrefix:'/study-one',poweredByHeader:false,async rewrites(){return [{source:'/study-one/api/:path*',destination:'/api/:path*'}]},async headers(){return [{source:'/:path*',headers:[{key:'Referrer-Policy',value:'no-referrer'},{key:'X-Robots-Tag',value:'noindex, nofollow'}]}]}};export default config;\n")
(out/'eslint.config.mjs').write_text("import {FlatCompat} from '@eslint/eslintrc';const compat=new FlatCompat({baseDirectory:process.cwd()});const config=[...compat.extends('next/core-web-vitals','next/typescript'),{ignores:['.next/**','next-env.d.ts']}];export default config;\n")
(out/'.gitignore').write_text('node_modules\n.next\n.local\n.env*\n*.log\n')
# Font assets only, no original experiment images or output files.
shutil.copytree(root/'public/fonts',out/'public/fonts')
manifest={str(p.relative_to(out)):hashlib.sha256(p.read_bytes()).hexdigest() for p in out.rglob('*') if p.is_file()}
(out/'STUDY-ONE-SOURCE-MANIFEST.json').write_text(json.dumps(manifest,indent=2))
print(f'Packaged {len(manifest)} allowlisted files at {out}; no original routes, pairs routes, data, or environment files.')
