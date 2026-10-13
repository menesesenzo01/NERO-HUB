// Leva para o GitHub a versão mais nova de cada app da biblioteca do PC.
// - Cada versão vira um Release (tag <app>-v<versão>) com o APK/ZIP anexado.
// - Releases de versões que saíram do Hub são apagados (o site só oferece a mais nova).
// - Gera web/public/catalogo.json, monta o site estático e publica no branch gh-pages.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DB = path.join(ROOT, 'server', 'data', 'db.json');
const APKS = path.join(ROOT, 'server', 'storage', 'apks');
const CATALOG = path.join(ROOT, 'web', 'public', 'catalogo.json');

const GH = [process.env.GH_PATH, 'C:\\Program Files\\GitHub CLI\\gh.exe'].find((p) => p && fs.existsSync(p)) ?? 'gh';
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
const gh = (...args) => run(GH, args);
const git = (...args) => run('git', args);

function sortVersions(versions) {
  const parts = (v) => String(v).split(/[.-]/).map((n) => parseInt(n, 10) || 0);
  return [...versions].sort((a, b) => {
    const pa = parts(a.version);
    const pb = parts(b.version);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) if ((pb[i] ?? 0) !== (pa[i] ?? 0)) return (pb[i] ?? 0) - (pa[i] ?? 0);
    return b.createdAt.localeCompare(a.createdAt);
  });
}

const { nameWithOwner: repo } = JSON.parse(gh('repo', 'view', '--json', 'nameWithOwner'));
console.log(`Repositório: ${repo}`);

const db = JSON.parse(fs.readFileSync(DB, 'utf8'));
const releases = JSON.parse(gh('release', 'list', '--limit', '200', '--json', 'tagName')).map((r) => r.tagName);
const catalog = { segments: db.segments, updatedAt: new Date().toISOString(), projects: [] };

for (const p of db.projects) {
  const [latest] = sortVersions(p.versions);
  const entry = {
    id: p.id,
    slug: p.slug,
    name: p.name,
    segment: p.segment,
    platform: p.platform ?? 'android',
    tag: p.tag ?? '',
    description: p.description ?? '',
    accent: p.accent,
    downloads: 0,
    versions: [],
    latest: null,
  };

  if (latest) {
    const tag = `${p.slug}-v${latest.version}`;
    const file = path.join(APKS, p.slug, latest.fileName);
    if (!releases.includes(tag)) {
      console.log(`↑ Enviando ${p.name} ${latest.version}…`);
      gh('release', 'create', tag, file, '--title', `${p.name} ${latest.version}`, '--notes', latest.changelog || `${p.name} ${latest.version}`, '--latest=false');
    } else {
      console.log(`= ${p.name} ${latest.version} já está no GitHub`);
    }
    const version = {
      id: latest.id,
      version: latest.version,
      changelog: latest.changelog,
      fileName: latest.fileName,
      size: latest.size,
      createdAt: latest.createdAt,
      url: `https://github.com/${repo}/releases/download/${tag}/${latest.fileName}`,
    };
    entry.versions = [version];
    entry.latest = version;

    for (const old of releases.filter((t) => t.startsWith(`${p.slug}-v`) && t !== tag)) {
      gh('release', 'delete', old, '--cleanup-tag', '--yes');
      console.log(`× Versão antiga removida do GitHub: ${old}`);
    }
  }
  catalog.projects.push(entry);
}

fs.writeFileSync(CATALOG, JSON.stringify(catalog, null, 2) + '\n');

// Monta o site estático e publica no branch gh-pages (o GitHub Pages serve esse branch).
const [owner, repoName] = repo.split('/');
// Repositório <dono>.github.io vira o site principal (sem /<repo> no endereço).
const rootSite = repoName.toLowerCase() === `${owner.toLowerCase()}.github.io`;
const siteBase = rootSite ? '/' : `/${repoName}/`;
console.log('Montando o site…');
// Vai para web/dist-pages, para não trocar o build que o Hub do PC serve (web/dist).
const DIST = path.join(ROOT, 'web', 'dist-pages');
run(process.execPath, [path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), 'build', '--outDir', DIST, '--emptyOutDir'], {
  cwd: path.join(ROOT, 'web'),
  env: { ...process.env, VITE_STATIC: '1', VITE_BASE: siteBase },
});
run(process.execPath, [path.join(ROOT, 'web', 'scripts', 'paginas-estaticas.mjs'), DIST]);

const remote = git('remote', 'get-url', 'origin');
const inDist = (...args) => run('git', args, { cwd: DIST });
inDist('init', '-q');
inDist('checkout', '-q', '-B', 'gh-pages');
inDist('add', '-A');
inDist('-c', 'user.name=Nero Hub', '-c', 'user.email=nero-hub@users.noreply.github.com', 'commit', '-q', '-m', `Site ${catalog.updatedAt}`);
inDist('push', '-q', '-f', remote, 'gh-pages');
fs.rmSync(path.join(DIST, '.git'), { recursive: true, force: true });

console.log(`✓ Site publicado: https://${owner.toLowerCase()}.github.io${siteBase} (atualiza em 1 a 2 minutos)`);
