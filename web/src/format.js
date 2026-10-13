export function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1).replace('.', ',')} MB`;
  return `${(bytes / 1073741824).toFixed(2).replace('.', ',')} GB`;
}

const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

export function timeAgo(iso) {
  const diff = (new Date(iso).getTime() - Date.now()) / 1000;
  const steps = [
    [60, 'second'],
    [3600, 'minute'],
    [86400, 'hour'],
    [604800, 'day'],
    [2629800, 'week'],
    [31557600, 'month'],
  ];
  let unit = 'year';
  let value = diff / 31557600;
  for (let i = 0; i < steps.length; i++) {
    if (Math.abs(diff) < steps[i][0]) {
      const div = i === 0 ? 1 : steps[i - 1][0];
      unit = steps[i][1];
      value = diff / div;
      break;
    }
  }
  return rtf.format(Math.round(value), unit);
}

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

/** Tira o número da versão do nome do arquivo: NeroDocs-2.1.1.apk -> 2.1.1 */
export const versionFromFileName = (name = '') => name.match(/(\d+(?:\.\d+)+)/)?.[1] ?? '';
