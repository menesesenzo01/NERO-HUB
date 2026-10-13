import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Download, Upload } from 'lucide-react';
import { STATIC, downloadUrl, qrSvg } from '../api.js';
import { appContent } from '../content.js';
import { formatBytes } from '../format.js';

/** Endereço que o QR Code abre no celular: a página de download daquele app. */
export const appLink = (base, project) => `${base}/baixar/${project.slug}${STATIC ? '/' : ''}`;

export default function QrStation({ info, projects, sel, setSel, onUpload }) {
  const [copied, setCopied] = useState(false);
  const [ipIndex, setIpIndex] = useState(0);

  const real = info?.addresses.filter((a) => !a.virtual) ?? [];
  const address = real[ipIndex] ?? info?.primary;
  const cur = projects[sel];
  if (!cur) return null;
  const c = appContent(cur);
  const latest = cur.latest;
  const link = address ? appLink(address.url, cur) : null;
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let alive = true;
    if (link) qrSvg(link).then((s) => alive && setSvg(s));
    return () => {
      alive = false;
    };
  }, [link]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        {projects.map((p, i) => {
          const pc = appContent(p);
          const active = i === sel;
          return (
            <button
              key={p.id}
              onClick={() => setSel(i)}
              className={`relative flex w-full items-center gap-4 rounded-[20px] border-[3px] border-ink p-4 text-left shadow-[4px_4px_0_#0e0f1a] transition hover:-translate-x-0.5 hover:-translate-y-0.5 ${
                active ? 'bg-sun' : 'bg-white'
              }`}
            >
              <img src={pc.logo} alt="" className="logo-tile h-[54px] w-[54px] rounded-[14px]" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-display text-[17px] font-bold">{p.name}</span>
                <span className="text-[13px] text-muted">{p.tag || p.segment}</span>
              </span>
              <span className={`rounded-[10px] border-[2.5px] border-ink px-2 py-0.5 font-display text-sm font-bold ${latest && active ? 'bg-white' : 'bg-cream'}`}>
                {p.latest ? `v${p.latest.version}` : 'sem versão'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative overflow-hidden rounded-[30px] border-[3px] border-ink bg-sky p-7 shadow-[8px_8px_0_#0e0f1a]">
        <div className="flex items-center justify-between gap-3">
          <span className="font-display text-[15px] font-bold text-hub">QR Code Station</span>
          <span className="flex items-center gap-1.5 rounded-[10px] border-[2.5px] border-ink bg-white px-2.5 py-1 text-xs font-extrabold">
            {latest ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22c55e] opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22c55e]" />
                </span>
                Ao vivo · v{latest.version}
              </>
            ) : (
              'Sem versão ainda'
            )}
          </span>
        </div>

        <div className="mt-5 flex items-center gap-3.5">
          <img src={c.logo} alt="" className="logo-tile h-12 w-12 rounded-xl" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-display text-[22px] font-bold leading-tight">{cur.name}</span>
            <span className="text-[13px] text-muted">
              {cur.tag || cur.segment}
              {latest && ` · ${formatBytes(latest.size)}`}
            </span>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <div className="relative h-[260px] w-[260px] rounded-[26px] border-[3px] border-ink bg-white p-6">
            {[
              'left-2.5 top-2.5 border-l-[3px] border-t-[3px]',
              'right-2.5 top-2.5 border-r-[3px] border-t-[3px]',
              'left-2.5 bottom-2.5 border-l-[3px] border-b-[3px]',
              'right-2.5 bottom-2.5 border-r-[3px] border-b-[3px]',
            ].map((pos) => (
              <span key={pos} className={`absolute h-[30px] w-[30px] rounded-lg border-hub ${pos}`} />
            ))}
            <AnimatePresence mode="wait">
              {link && latest ? (
                <motion.div
                  key={link}
                  role="img"
                  aria-label={`QR Code para baixar ${cur.name}`}
                  className="h-full w-full [&>svg]:h-full [&>svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: svg }}
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
                />
              ) : (
                <motion.div key="empty" className="grid h-full w-full place-items-center text-center text-sm text-muted">
                  {link ? 'Publique uma versão para gerar o código.' : 'Conecte o PC ao Wi-Fi.'}
                </motion.div>
              )}
            </AnimatePresence>
            {link && latest && (
              <>
                <img src={c.logo} alt="" className="absolute left-1/2 top-1/2 h-[54px] w-[54px] -translate-x-1/2 -translate-y-1/2 rounded-[14px] border-[3px] border-ink bg-white object-cover" />
                <span className="anim-scan pointer-events-none absolute left-4 right-4 h-[3px] rounded-full border border-ink bg-bubble" />
              </>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4 rounded-[18px] border-[2.5px] border-ink bg-white px-4 py-4">
          <div className="grid h-16 w-11 flex-none place-items-center">
            <span className="anim-tilt block h-14 w-8 rounded-[9px] border-[3px] border-ink bg-sun" />
          </div>
          <div className="flex min-w-0 flex-col gap-1 text-sm leading-snug">
            <span className="font-display font-bold">Abra a câmera e aponte para o código</span>
            <span className="text-muted">
              {cur.platform === 'chrome'
                ? 'Baixa o ZIP da extensão mais nova. Instale no Chrome do computador.'
                : `Baixa o APK mais novo do ${c.short} direto no celular${STATIC ? '' : ', pelo Wi-Fi'}.`}
            </span>
          </div>
        </div>

        {link && (
          <button onClick={copy} className="mt-3 flex w-full items-center justify-between gap-3 rounded-[14px] border-[2.5px] border-ink bg-white px-3.5 py-2 text-left">
            <span className="truncate font-mono text-[13px]">{link.replace(/^https?:\/\//, '')}</span>
            {copied ? <Check size={16} strokeWidth={3} className="text-hub" /> : <Copy size={16} strokeWidth={2.5} />}
          </button>
        )}

        {real.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {real.map((a, i) => (
              <button
                key={a.address}
                onClick={() => setIpIndex(i)}
                className={`rounded-[10px] border-2 border-ink px-2.5 py-0.5 text-xs font-bold ${i === ipIndex ? 'bg-sun' : 'bg-white'}`}
              >
                {a.name}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3.5 flex gap-3">
          {latest && (
            <a href={downloadUrl(cur)} className="btn flex-1">
              <Download size={18} strokeWidth={2.5} /> Baixar neste aparelho
            </a>
          )}
          {info?.isAdmin && (
            <button onClick={() => onUpload(cur)} className={`btn btn-white ${latest ? '' : 'flex-1'}`} title="Publicar nova versão">
              <Upload size={18} strokeWidth={2.5} /> {latest ? '' : 'Publicar versão'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
