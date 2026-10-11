import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
await mkdir('tmp/feed-tests',{recursive:true});
await build({entryPoints:['tests/drivecentric-files.test.ts'],outfile:'tmp/feed-tests/test.mjs',bundle:true,platform:'node',format:'esm'});
const result=spawnSync(process.execPath,['--test','tmp/feed-tests/test.mjs'],{stdio:'inherit'});
process.exitCode=result.status??1;
