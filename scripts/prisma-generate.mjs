import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function readDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (!existsSync('.env')) return '';

  const line = readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .find((entry) => /^\s*DATABASE_URL\s*=/.test(entry));

  if (!line) return '';
  const raw = line.replace(/^\s*DATABASE_URL\s*=\s*/, '').trim();
  return raw.replace(/^['"]|['"]$/g, '');
}

const databaseUrl = readDatabaseUrl();
const schema = /^mysql:\/\//i.test(databaseUrl)
  ? 'prisma/schema.mysql.prisma'
  : 'prisma/schema.prisma';

const localPrisma = join('node_modules', '.bin', process.platform === 'win32' ? 'prisma.cmd' : 'prisma');
const command = existsSync(localPrisma)
  ? localPrisma
  : process.platform === 'win32'
    ? 'npx.cmd'
    : 'npx';
const args = existsSync(localPrisma)
  ? ['generate', '--schema', schema]
  : ['prisma', 'generate', '--schema', schema];

console.log(`[prisma] generate using ${schema}`);

const result = spawnSync(command, args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);
