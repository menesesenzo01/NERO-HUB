import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, ChevronDown, Download, Laptop, Wifi } from 'lucide-react';
import NeroMark from './NeroMark.jsx';
import { STATIC, downloadUrl } from '../api.js';
import { appContent, sortProjects } from '../content.js';
import { formatBytes, timeAgo } from '../format.js';

function AppCard({ project, index, autoStart }) {
  const c = appContent(project);
  const { latest } = project;
  const [started, setStarted] = useState(false);
  const [notes, setNotes] = useState(!!autoStart);
  const link = useRef(null);

  // Quem chegou pelo QR Code deste app já recebe o download sozinho.
  useEffect(() => {
    if (!autoStart || !latest) return;
    const t = setTimeout(() => {
      link.current?.click();
      setStarted(true);
    }, 700);
    return () => clearTimeout(t);
  }, [autoStart, latest?.id]);

  if (!latest) return null;
  const chrome = project.platform === 'chrome';

  return (
    <motion.li
      initial={{ opacity: 0, y: 24, rotate: index % 2 ? 1 : -1 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.5, delay: 0.08 * index, ease: [0.2, 0.8, 0.2, 1] }}
      className="toon overflow-hidden rounded-[26px] p-4"
    >
      <div className="flex items-center gap-3.5">
        <img src={c.logo} alt="" className="logo-tile h-[60px] w-[60px] rounded-2xl" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-xl font-bold leading-tight">{project.name}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
            <span className="rounded-md border-2 border-ink bg-sun px-1.5 font-display font-bold text-ink">v{latest.version}</span>
            {formatBytes(latest.size)} · {timeAgo(latest.createdAt)}
          </div>
        </div>
      </div>

      <a
        ref={link}
        href={downloadUrl(project)}
        onClick={() => {
          setStarted(true);
          setTimeout(() => setStarted(false), 5000);
        }}
        className="btn mt-4 h-14 w-full !text-lg"
      >
        <AnimatePresence mode="wait" initial={false}>
          {started ? (
            <motion.span key="ok" className="flex items-center gap-2" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }}>
              <CheckCircle2 size={20} strokeWidth={2.5} /> Baixando…
            </motion.span>
          ) : (
            <motion.span key="dl" className="flex items-center gap-2" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }}>
              <Download size={20} strokeWidth={2.5} /> {chrome ? 'Baixar ZIP' : 'Baixar APK'}
            </motion.span>
          )}
        </AnimatePresence>
      </a>

      {chrome && (
        <p className="mt-3 flex items-start gap-2 rounded-xl border-2 border-ink bg-sky px-3 py-2 text-[13px] leading-snug">
          <Laptop size={16} strokeWidth={2.5} className="mt-0.5 flex-none" />
          Extensão é para o Chrome do computador: descompacte, abra chrome://extensions, ligue o Modo do desenvolvedor e clique em Carregar sem compactação.
        </p>
      )}

      {latest.changelog && (
        <div className="mt-3">
          <button onClick={() => setNotes((n) => !n)} className="flex w-full items-center justify-between py-1 font-display font-semibold">
            Novidades da versão
            <motion.span animate={{ rotate: notes ? 180 : 0 }}>
              <ChevronDown size={18} strokeWidth={2.5} />
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {notes && (
              <motion.p
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden whitespace-pre-line text-sm leading-relaxed text-muted"
              >
                {latest.changelog}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.li>
  );
}

/** Tela do celular. Em /baixar/<app> mostra aquele app primeiro e já começa o download. */
export default function DownloadPage({ library, slug }) {
  const all = sortProjects(library.projects).filter((p) => p.latest);
  const target = slug ? all.find((p) => p.slug === slug) : null;
  const others = target ? all.filter((p) => p !== target) : all;
  const chrome = target?.platform === 'chrome';

  return (
    <div className="min-h-screen bg-cream">
      <header className="relative overflow-hidden border-b-[3px] border-ink bg-hub px-4 pb-14 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="anim-drift absolute right-[-30px] top-3 h-9 w-[120px] rounded-full border-[3px] border-ink bg-white" />
        <div className="relative flex items-center gap-3">
          <NeroMark size={40} />
          <div>
            <div className="font-display text-xl font-bold leading-tight text-white">Nero Hub</div>
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-sun">
              <Wifi size={12} strokeWidth={3} /> {STATIC ? 'Versões oficiais do ecossistema Nero' : 'Conectado ao PC pela rede local'}
            </div>
          </div>
        </div>
        <h1 className="hero-title relative mt-7 font-display text-[40px] font-bold leading-none">
          {target ? (chrome ? 'Baixando a extensão' : 'Baixando o app') : 'Toque para instalar'}
        </h1>
        <p className="relative mt-3 text-sm font-bold text-white">
          {target && !chrome
            ? 'Quando terminar, abra o arquivo e permita instalar de fontes desconhecidas se o Android pedir.'
            : target
              ? 'O ZIP vai para os downloads deste aparelho.'
              : 'Escolha um app. Depois do download, abra o arquivo para instalar.'}
        </p>
      </header>

      <main className="px-4 pb-12 pt-6">
        {target && (
          <ul className="flex flex-col gap-4">
            <AppCard project={target} index={0} autoStart />
          </ul>
        )}
        {slug && !target && (
          <div className="toon rounded-[22px] p-5 text-center text-muted">Esse app ainda não tem versão publicada no Hub.</div>
        )}

        {others.length > 0 && (
          <>
            {target && <h2 className="mb-3 mt-8 font-display text-xl font-bold">Outros apps do Nero</h2>}
            <ul className="flex flex-col gap-4">
              {others.map((p, i) => (
                <AppCard key={p.id} project={p} index={i + (target ? 1 : 0)} />
              ))}
            </ul>
          </>
        )}
        {all.length === 0 && <div className="toon rounded-[22px] p-8 text-center text-muted">Nenhum app publicado ainda.</div>}
      </main>
    </div>
  );
}
