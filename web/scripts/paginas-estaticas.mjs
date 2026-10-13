// No GitHub Pages não há servidor para responder /baixar/<app>.
// Então, depois do build, cada app ganha a própria pasta com uma cópia do index.html,
// e o 404.html também carrega o site (para qualquer outro caminho).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.resolve(process.argv[2] || path.join(WEB, 'dist'));
const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const { projects } = JSON.parse(fs.readFileSync(path.join(WEB, 'public', 'catalogo.json'), 'utf8'));

const pages = ['m', 'loja', ...projects.flatMap((p) => [path.join('baixar', p.slug), path.join('loja', p.slug)])];
for (const dir of pages) {
  fs.mkdirSync(path.join(DIST, dir), { recursive: true });
  fs.writeFileSync(path.join(DIST, dir, 'index.html'), html);
}
fs.writeFileSync(path.join(DIST, '404.html'), html);
fs.writeFileSync(path.join(DIST, '.nojekyll'), '');
console.log(`Páginas criadas: ${pages.join(', ')}`);
