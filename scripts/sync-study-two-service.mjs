import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync('lib/study-two/instrument.ts','utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
fs.writeFileSync('services/study-two-store/instrument.mjs','// Generated from lib/study-two/instrument.ts by scripts/sync-study-two-service.mjs.\n'+js);
