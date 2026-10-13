// Coloca na biblioteca os apps do ecossistema Nero e importa as versões que já estão no PC.
// Só copia (não mexe nas pastas originais). Pode rodar de novo: o que já existe é pulado
// e os dados de cada app (nome, descrição, ícone) são atualizados.
import fs from 'node:fs/promises';
import path from 'node:path';
import { load, update, newId, APK_DIR } from '../src/store.js';

const REVERSO = path.resolve(process.env.REVERSO_DIR || 'C:/Users/Usuario/Downloads/REVERSO/REVERSO');

const SEED = [
  {
    slug: 'nero-assistente',
    aliases: ['nero'], // nome antigo do projeto na biblioteca
    name: 'Nero Assistente',
    segment: 'Aplicativos',
    platform: 'android',
    tag: 'Android · rotina e finanças',
    description: 'Seu assistente pessoal para organizar a rotina, acompanhar compromissos e cuidar das finanças em um só lugar.',
    accent: '#38c9a0',
    icon: 'nero.png',
    versions: [
      {
        version: '3.5',
        file: 'NeroAssitente/Nero-3.5-arm64-v8a.apk',
        changelog: 'Versão atual do Nero (celulares 64 bits, arm64-v8a).',
      },
    ],
  },
  {
    slug: 'nero-docs',
    name: 'Nero Docs',
    segment: 'Ferramentas',
    platform: 'android',
    tag: 'Android · documentos',
    description: 'Converta documentos, organize PDFs e trabalhe com seus arquivos diretamente no celular.',
    accent: '#3b6cff',
    icon: 'nero-docs.png',
    versions: [
      {
        version: '2.1.1',
        file: 'PROJETOS01 ILOVE PDF/NERODOCS/NeroDocs-2.1.1.apk',
        changelog: 'Versão atual do Nero Docs importada para o Hub.',
      },
    ],
  },
  {
    slug: 'nero-docs-chrome',
    name: 'Nero Docs — Extensão para Chrome',
    segment: 'Extensões',
    platform: 'chrome',
    tag: 'Chrome · extensão',
    description: 'Ferramentas de PDF direto no navegador, com processamento dos arquivos no computador.',
    accent: '#1d3fe0',
    icon: 'nero-docs-chrome.png',
    versions: [], // o ZIP é publicado pelo próprio Hub (Nova versão)
  },
];

const INFO_KEYS = ['name', 'segment', 'platform', 'tag', 'description', 'accent', 'icon'];

await load();
for (const seed of SEED) {
  await update(async (db) => {
    let p = db.projects.find((x) => x.slug === seed.slug || seed.aliases?.includes(x.slug));
    if (!p) {
      p = { id: newId(), slug: seed.slug, createdAt: new Date().toISOString(), versions: [] };
      db.projects.push(p);
      console.log(`+ projeto ${seed.name}`);
    }
    if (p.slug !== seed.slug) {
      // Renomeia a pasta e os arquivos para o nome novo.
      const oldDir = path.join(APK_DIR, p.slug);
      const newDir = path.join(APK_DIR, seed.slug);
      await fs.mkdir(newDir, { recursive: true });
      for (const v of p.versions) {
        const fileName = v.fileName.replace(p.slug, seed.slug);
        await fs.rename(path.join(oldDir, v.fileName), path.join(newDir, fileName)).catch(() => {});
        v.fileName = fileName;
      }
      await fs.rm(oldDir, { recursive: true, force: true });
      console.log(`~ ${p.slug} agora é ${seed.slug}`);
      p.slug = seed.slug;
    }
    for (const k of INFO_KEYS) p[k] = seed[k];
    if (!db.segments.includes(seed.segment)) db.segments.push(seed.segment);
  });

  for (const v of seed.versions) {
    const src = path.join(REVERSO, v.file);
    const fileName = `${seed.slug}-${v.version}${path.extname(src)}`;
    const dest = path.join(APK_DIR, seed.slug, fileName);
    const project = (await load()).projects.find((p) => p.slug === seed.slug);
    if (project.versions.some((x) => x.version === v.version)) {
      console.log(`= ${seed.name} ${v.version} já está na biblioteca`);
      continue;
    }
    try {
      await fs.access(src);
    } catch {
      console.log(`! ${seed.name} ${v.version}: não achei ${src}`);
      continue;
    }
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(src, dest);
    const { size } = await fs.stat(dest);
    await update((d) => {
      d.projects.find((p) => p.slug === seed.slug).versions.push({
        id: newId(),
        version: v.version,
        changelog: v.changelog,
        fileName,
        originalName: path.basename(src),
        size,
        downloads: 0,
        createdAt: new Date().toISOString(),
      });
    });
    console.log(`+ ${seed.name} ${v.version} (${(size / 1048576).toFixed(1)} MB)`);
  }
}
console.log('Pronto.');
