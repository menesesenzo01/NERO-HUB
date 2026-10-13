import QRCode from 'qrcode';

/**
 * O mesmo site roda de dois jeitos:
 * - no PC (servidor Fastify): API completa, upload e download pela rede local;
 * - no GitHub Pages (VITE_STATIC=1): só leitura, lendo catalogo.json, com os arquivos no GitHub Releases.
 */
export const STATIC = import.meta.env.VITE_STATIC === '1';
export const BASE = import.meta.env.BASE_URL; // "/" no PC, "/NERO-HUB/" no GitHub Pages

/** Caminho de um arquivo da pasta public/, respeitando a base do site. */
export const asset = (path) => `${BASE}${path.replace(/^\//, '')}`;

async function json(res) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Erro ${res.status}`);
  return body;
}

const siteUrl = () => `${location.origin}${BASE.replace(/\/$/, '')}`;

export const api = {
  info: () =>
    STATIC
      ? Promise.resolve({ isAdmin: false, online: true, primary: { name: 'Internet', url: siteUrl() }, addresses: [] })
      : fetch('/api/info').then(json),
  projects: () => (STATIC ? fetch(asset('catalogo.json'), { cache: 'no-store' }) : fetch('/api/projects')).then(json),
  createProject: (data) =>
    fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(json),
  deleteVersion: (projectId, versionId) =>
    fetch(`/api/projects/${projectId}/versions/${versionId}`, { method: 'DELETE' }).then(json),
  publishGithub: () => fetch('/api/publicar-github', { method: 'POST' }).then(json),
  githubStatus: () => fetch('/api/publicar-github').then(json),

  /** Envia o arquivo com progresso (fetch não informa progresso de upload). */
  uploadVersion(projectId, { file, version, changelog }, onProgress) {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      form.append('version', version);
      form.append('changelog', changelog);
      form.append('apk', file);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/projects/${projectId}/versions`);
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
      xhr.onload = () => {
        let body = {};
        try {
          body = JSON.parse(xhr.responseText);
        } catch {}
        xhr.status < 300 ? resolve(body) : reject(new Error(body.error || `Erro ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error('Falha de conexão com o servidor'));
      xhr.send(form);
    });
  },
};

/** QR Code em SVG gerado no navegador (H aguenta o logo do app por cima do centro). */
export const qrSvg = (text) =>
  QRCode.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'H', color: { dark: '#0e0f1a', light: '#ffffff' } });

/** Link de download: no PC passa pelo servidor; no GitHub vai direto para o arquivo do Release. */
export const downloadUrl = (project, version) => {
  const v = version ?? project.latest;
  if (STATIC) return v?.url;
  return version ? `/d/${project.slug}/${version.id}` : `/d/${project.slug}`;
};
