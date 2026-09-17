import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync('lib/study-two/instrument.ts','utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
fs.writeFileSync('services/study-two-store/instrument.mjs','// Generated from lib/study-two/instrument.ts by scripts/sync-study-two-service.mjs.\n'+js);

const participation=fs.readFileSync('lib/study-two/participation.ts','utf8');
fs.writeFileSync('services/study-two-store/participation.mjs','// Generated from lib/study-two/participation.ts.\n'+ts.transpileModule(participation,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);

const attempts=fs.readFileSync('lib/study-two/attempts.ts','utf8');
fs.writeFileSync('services/study-two-store/attempts.mjs','// Generated from lib/study-two/attempts.ts.\n'+ts.transpileModule(attempts,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText);
