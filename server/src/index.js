import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import QRCode from 'qrcode';
import { getLanAddresses, isLocalRequest } from './network.js';
import { load, update, present, newId, slugify, APK_DIR, ICON_DIR } from './store.js';

const PORT = Number(process.env.PORT) || 5180;
const HOST = process.env.HOST || '0.0.0.0'; // todas as interfaces: o celular precisa enxergar o PC
const WEB_DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../web/dist');
const MAX_APK = 1024 * 1024 * 1024; // 1 GB
// APK para Android e ZIP para a extensão do Chrome; os dois começam com "PK".
const PACKAGE_TYPES = { '.apk': 'application/vnd.android.package-archive', '.zip': 'application/zip' };
const ICON_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

const app = Fastify({ logger: { level: process.env.LOG_LEVEL || 'warn' }, bodyLimit: 2 * 1024 * 1024 });
await app.register(multipart, { limits: { fileSize: MAX_APK, files: 1, fields: 10 } });

const urlFor = (address) => `http://${address}:${PORT}`;

/** Upload, criação e remoção só podem ser feitos no próprio PC. */
function adminOnly(request, reply, done) {
  if (isLocalRequest(request.ip)) return done();
  reply.code(403).send({ error: 'Gerenciamento só pelo PC onde o Nero Hub está rodando.' });
}

async function findProject(id) {
  const db = await load();
  return db.projects.find((p) => p.id === id || p.slug === id);
}

// ---------- Informações de rede ----------
app.get('/api/info', async (request) => {
  const addresses = getLanAddresses();
  const primary = addresses.find((a) => !a.virtual) ?? addresses[0];
  return {
    port: PORT,
    isAdmin: isLocalRequest(request.ip),
    primary: primary ? { ...primary, url: urlFor(primary.address) } : null,
    addresses: addresses.map((a) => ({ ...a, url: urlFor(a.address) })),
  };
});

// ---------- Biblioteca ----------
app.get('/api/projects', async () => {
  const db = await load();
  return { segments: db.segments, projects: db.projects.map(present) };
});

app.get('/api/projects/:id', async (request, reply) => {
  const project = await findProject(request.params.id);
  if (!project) return reply.code(404).send({ error: 'Projeto não encontrado' });
  return present(project);
});

app.post('/api/projects', { preHandler: adminOnly }, async (request, reply) => {
  const { name, segment, description = '', accent = '#4d6bff', packageName = '', tag = '', platform = 'android' } = request.body ?? {};
  if (!name?.trim() || !segment?.trim()) return reply.code(400).send({ error: 'Nome e segmento são obrigatórios' });
  const project = await update((db) => {
    const slug = slugify(name);
    if (db.projects.some((p) => p.slug === slug)) return null;
    if (!db.segments.includes(segment.trim())) db.segments.push(segment.trim());
    const p = {
      id: newId(),
      slug,
      name: name.trim(),
      segment: segment.trim(),
      description: description.trim(),
      accent,
      packageName: packageName.trim(),
      tag: tag.trim(),
      platform: platform === 'chrome' ? 'chrome' : 'android',
      icon: null,
      createdAt: new Date().toISOString(),
      versions: [],
    };
    db.projects.push(p);
    return p;
  });
  if (!project) return reply.code(409).send({ error: 'Já existe um projeto com esse nome' });
  return reply.code(201).send(present(project));
});

app.patch('/api/projects/:id', { preHandler: adminOnly }, async (request, reply) => {
  const allowed = ['name', 'segment', 'description', 'accent', 'packageName', 'tag', 'platform'];
  const patch = Object.fromEntries(Object.entries(request.body ?? {}).filter(([k]) => allowed.includes(k)));
  const project = await update((db) => {
    const p = db.projects.find((x) => x.id === request.params.id);
    if (!p) return null;
    Object.assign(p, patch);
    if (patch.segment && !db.segments.includes(patch.segment)) db.segments.push(patch.segment);
    return p;
  });
  if (!project) return reply.code(404).send({ error: 'Projeto não encontrado' });
  return present(project);
});

app.delete('/api/projects/:id', { preHandler: adminOnly }, async (request, reply) => {
  const removed = await update((db) => {
    const i = db.projects.findIndex((x) => x.id === request.params.id);
    return i < 0 ? null : db.projects.splice(i, 1)[0];
  });
  if (!removed) return reply.code(404).send({ error: 'Projeto não encontrado' });
  await fsp.rm(path.join(APK_DIR, removed.slug), { recursive: true, force: true });
  return { ok: true };
});

// ---------- Upload de nova versão ----------
app.post('/api/projects/:id/versions', { preHandler: adminOnly }, async (request, reply) => {
  const project = await findProject(request.params.id);
  if (!project) return reply.code(404).send({ error: 'Projeto não encontrado' });

  const dir = path.join(APK_DIR, project.slug);
  await fsp.mkdir(dir, { recursive: true });
  const fields = {};
  let tmpPath = null;
  let originalName = null;
  let ext = '.apk';

  try {
    for await (const part of request.parts()) {
      if (part.type === 'file') {
        ext = path.extname(part.filename).toLowerCase();
        if (!PACKAGE_TYPES[ext]) {
          part.file.resume();
          return reply.code(400).send({ error: 'Envie um arquivo .apk ou .zip' });
        }
        originalName = part.filename;
        tmpPath = path.join(dir, `.upload-${newId()}.tmp`);
        await pipeline(part.file, fs.createWriteStream(tmpPath));
        if (part.file.truncated) return reply.code(413).send({ error: 'Arquivo maior que 1 GB' });
      } else {
        fields[part.fieldname] = String(part.value ?? '');
      }
    }
    if (!tmpPath) return reply.code(400).send({ error: 'Nenhum arquivo enviado' });

    // APK e ZIP têm a assinatura "PK" no começo.
    const fh = await fsp.open(tmpPath, 'r');
    const { buffer } = await fh.read(Buffer.alloc(2), 0, 2, 0);
    await fh.close();
    if (buffer.toString('latin1') !== 'PK') return reply.code(400).send({ error: 'Esse arquivo não parece um APK ou ZIP válido' });

    const version = (fields.version || originalName.match(/(\d+(?:\.\d+)+)/)?.[1] || '').trim();
    if (!version) return reply.code(400).send({ error: 'Informe o número da versão' });
    if (project.versions.some((v) => v.version === version)) {
      return reply.code(409).send({ error: `A versão ${version} já existe neste projeto` });
    }

    const fileName = `${project.slug}-${version}${ext}`;
    await fsp.rename(tmpPath, path.join(dir, fileName));
    tmpPath = null;
    const { size } = await fsp.stat(path.join(dir, fileName));

    const entry = {
      id: newId(),
      version,
      changelog: (fields.changelog || '').trim(),
      fileName,
      originalName,
      size,
      downloads: 0,
      createdAt: new Date().toISOString(),
    };
    const saved = await update((db) => {
      const p = db.projects.find((x) => x.id === project.id);
      p.versions.push(entry);
      return p;
    });
    return reply.code(201).send(present(saved));
  } finally {
    if (tmpPath) await fsp.rm(tmpPath, { force: true });
  }
});

app.delete('/api/projects/:id/versions/:versionId', { preHandler: adminOnly }, async (request, reply) => {
  const removed = await update((db) => {
    const p = db.projects.find((x) => x.id === request.params.id);
    const i = p?.versions.findIndex((v) => v.id === request.params.versionId) ?? -1;
    if (i < 0) return null;
    const [v] = p.versions.splice(i, 1);
    return { p, v };
  });
  if (!removed) return reply.code(404).send({ error: 'Versão não encontrada' });
  await fsp.rm(path.join(APK_DIR, removed.p.slug, removed.v.fileName), { force: true });
  return present(removed.p);
});

// ---------- Ícone do projeto ----------
app.post('/api/projects/:id/icon', { preHandler: adminOnly }, async (request, reply) => {
  const project = await findProject(request.params.id);
  if (!project) return reply.code(404).send({ error: 'Projeto não encontrado' });
  const file = await request.file({ limits: { fileSize: 5 * 1024 * 1024 } });
  const ext = path.extname(file?.filename ?? '').toLowerCase();
  if (!file || !ICON_TYPES[ext]) return reply.code(400).send({ error: 'Envie PNG, JPG, WEBP ou SVG' });
  await fsp.mkdir(ICON_DIR, { recursive: true });
  const name = `${project.slug}${ext}`;
  await pipeline(file.file, fs.createWriteStream(path.join(ICON_DIR, name)));
  const saved = await update((db) => {
    const p = db.projects.find((x) => x.id === project.id);
    p.icon = `${name}?v=${Date.now()}`;
    return p;
  });
  return present(saved);
});

app.get('/icons/:name', async (request, reply) => {
  const name = path.basename(request.params.name);
  const type = ICON_TYPES[path.extname(name).toLowerCase()];
  const file = path.join(ICON_DIR, name);
  if (!type || !fs.existsSync(file)) return reply.code(404).send();
  return reply.type(type).header('Cache-Control', 'public, max-age=3600').send(fs.createReadStream(file));
});

// ---------- Download ----------
async function sendApk(reply, project, version) {
  const file = path.join(APK_DIR, project.slug, version.fileName);
  let stat;
  try {
    stat = await fsp.stat(file);
  } catch {
    return reply.code(410).send({ error: 'Arquivo não está mais no PC' });
  }
  update((db) => {
    const v = db.projects.find((p) => p.id === project.id)?.versions.find((x) => x.id === version.id);
    if (v) v.downloads = (v.downloads ?? 0) + 1;
  }).catch(() => {});
  const ext = path.extname(version.fileName).toLowerCase();
  const downloadName = `${project.name.normalize('NFD').replace(/[^\w.-]+/g, '')}-${version.version}${ext}`;
  return reply
    .type(PACKAGE_TYPES[ext] ?? 'application/octet-stream')
    .header('Content-Length', stat.size)
    .header('Content-Disposition', `attachment; filename="${downloadName}"`)
    .header('Cache-Control', 'no-store')
    .send(fs.createReadStream(file));
}

app.get('/d/:id', async (request, reply) => {
  const project = await findProject(request.params.id);
  const latest = project && present(project).latest;
  if (!latest) return reply.code(404).send({ error: 'Nenhuma versão disponível' });
  return sendApk(reply, project, latest);
});

app.get('/d/:id/:versionId', async (request, reply) => {
  const project = await findProject(request.params.id);
  const version = project?.versions.find((v) => v.id === request.params.versionId || v.version === request.params.versionId);
  if (!version) return reply.code(404).send({ error: 'Versão não encontrada' });
  return sendApk(reply, project, version);
});

// ---------- Publicar no GitHub (site público) ----------
const PUBLISH_SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../scripts/publicar-github.mjs');
let publishing = null;
let lastPublish = null;

app.get('/api/publicar-github', { preHandler: adminOnly }, async () => ({ running: !!publishing, last: lastPublish }));

app.post('/api/publicar-github', { preHandler: adminOnly }, async () => {
  if (!publishing) {
    publishing = new Promise((resolve) => {
      execFile(process.execPath, [PUBLISH_SCRIPT], { cwd: path.dirname(PUBLISH_SCRIPT), timeout: 30 * 60 * 1000, maxBuffer: 4 << 20 }, (err, stdout, stderr) => {
        lastPublish = { ok: !err, at: new Date().toISOString(), log: `${stdout}${err ? `
${stderr || err.message}` : ''}`.trim() };
        publishing = null;
        resolve(lastPublish);
      });
    });
  }
  return publishing;
});

// ---------- Interface web (build do Vite) ----------
if (fs.existsSync(WEB_DIST)) {
  // wildcard: lê o disco a cada pedido, então um "npm run build" novo vale sem reiniciar.
  await app.register(fastifyStatic, { root: WEB_DIST });
  app.setNotFoundHandler((request, reply) => {
    if (request.method === 'GET' && !request.url.startsWith('/api/')) return reply.sendFile('index.html');
    return reply.code(404).send({ error: 'Rota não encontrada' });
  });
} else {
  app.get('/', async () => ({ ok: true, aviso: 'Interface ainda não compilada. Rode "npm run build" na pasta NERO HUB.' }));
}

// ---------- Início ----------
await app.listen({ port: PORT, host: HOST });

const addresses = getLanAddresses();
const primary = addresses.find((a) => !a.virtual) ?? addresses[0];
const line = '─'.repeat(52);
console.log(`\n  \x1b[38;5;141m▲ NERO HUB\x1b[0m  servidor ativo em ${HOST}:${PORT}\n  ${line}`);
console.log(`  Neste PC:        http://127.0.0.1:${PORT}`);
for (const a of addresses) {
  const tag = a === primary ? '\x1b[32m← use este no celular\x1b[0m' : a.virtual ? '(virtual)' : '';
  console.log(`  ${a.name.padEnd(16).slice(0, 16)} ${urlFor(a.address).padEnd(28)} ${tag}`);
}
if (!primary) console.log('  Nenhuma rede local encontrada. Conecte o PC ao Wi-Fi.');
console.log(`  ${line}`);
if (primary) {
  console.log('  Aponte a câmera do celular:\n');
  console.log(await QRCode.toString(`${urlFor(primary.address)}/m`, { type: 'terminal', small: true }));
}

const db = await load();
console.log(`  ${db.projects.length} projeto(s) na biblioteca. Ctrl+C para parar.\n`);
