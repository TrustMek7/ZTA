import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('dist-backend', { recursive: true });
await build({ entryPoints: ['backend/src/lambda.ts'], outfile: 'dist-backend/lambda.js', bundle: true, platform: 'node', target: 'node24', format: 'cjs', minify: true, logLevel: 'info' });
await writeFile('dist-backend/package.json', JSON.stringify({ name: 'aqp-solidaria-lambda', version: '0.1.0', private: true, type: 'commonjs' }) + '\n');
