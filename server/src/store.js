import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_FILE = path.join(ROOT, 'data', 'db.json');
export const STORAGE_DIR = path.join(ROOT, 'storage');
export const APK_DIR = path.join(STORAGE_DIR, 'apks');
export const ICON_DIR = path.join(STORAGE_DIR, 'icons');

const EMPTY = { segments: ['Aplicativos', 'Ferramentas', 'Extensões'], projects: [] };

let cache = null;
let queue = Promise.resolve();

export async function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    cache = structuredClone(EMPTY);
  }
  return cache;
}

/** Aplica uma alteração e grava o JSON de forma atômica, uma de cada vez. */
export function update(mutator) {
  const run = queue.then(async () => {
    const db = await load();
    const result = await mutator(db);
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    const tmp = `${DATA_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db, null, 2));
    await fs.rename(tmp, DATA_FILE);
    return result;
  });
  queue = run.catch(() => {});
  return run;
}

export const newId = () => crypto.randomUUID().slice(0, 8);

export function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Compara versões tipo 2.10.1 > 2.9.0. */
export function compareVersions(a, b) {
  const pa = String(a).split(/[.-]/).map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split(/[.-]/).map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

/** Projeto com as versões ordenadas (mais nova primeiro) e a versão atual em `latest`. */
export function present(project) {
  const versions = [...project.versions].sort(
    (a, b) => compareVersions(b.version, a.version) || b.createdAt.localeCompare(a.createdAt),
  );
  const downloads = versions.reduce((n, v) => n + (v.downloads ?? 0), 0);
  return { ...project, versions, latest: versions[0] ?? null, downloads };
}
