import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, ChevronDown, Download, QrCode, Share2, Smartphone } from 'lucide-react';
import NeroMark from './NeroMark.jsx';
import { BASE, STATIC, downloadUrl, qrSvg } from '../api.js';
import { appContent, sortProjects } from '../content.js';
import { formatBytes, formatDate } from '../format.js';

const isPhone = () => matchMedia('(max-width: 767px)').matches || /Android|iPhone/i.test(navigator.userAgent);

function Stat({ value, label }) {
  return (
    <div className="flex min-w-[92px] flex-none flex-col items-center gap-0.5 rounded-2xl border-[2.5px] border-ink bg-white px-3.5 py-2.5 text-ink">
      <span className="font-display text-lg font-bold leading-tight">{value}</span>
      <span className="text-xs font-bold text-muted">{label}</span>
    </div>
  );
}

function Qr({ link, logo }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let alive = true;
    qrSvg(link).then((s) => alive && setSvg(s));
    return () => {
      alive = false;
    };
  }, [link]);
  return (
    <div className="relative h-[250px] w-[250px] rounded-[26px] border-[3px] border-ink bg-white p-5 max-[360px]:h-[220px] max-[360px]:w-[220px]">
      <motion.div
        key={link}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        role="img"
        aria-label="QR Code para baixar"
        className="h-full w-full [&>svg]:h-full [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <img src={logo} alt="" className="absolute left-1/2 top-1/2 h-[54px] w-[54px] -translate-x-1/2 -translate-y-1/2 rounded-[14px] border-[3px] border-ink bg-white object-cover" />
      <span className="anim-scan pointer-events-none absolute left-4 right-4 h-1 rounded-full border border-ink bg-bubble" />
    </div>
  );
}

export default function StorePage({ info, library, slug }) {
  const apps = useMemo(() => sortProjects(library.projects).filter((p) => p.latest), [library.projects]);
  const [sel, setSel] = useState(() => Math.max(0, apps.findIndex((p) => p.slug === slug)));
  const [phone] = useState(isPhone);
  const [showQr, setShowQr] = useState(!phone);
  const [shared, setShared] = useState(false);
  const [heroVisible, setHeroVisible] = useState(true);
  const heroBtn = useRef(null);
  const picker = useRef(null);

  const cur = apps[Math.min(sel, apps.length - 1)];
  const c = cur ? appContent(cur) : null;
  const chrome = cur?.platform === 'chrome';
  const ext = chrome ? 'ZIP' : 'APK';

  const base = info?.primary?.url ?? `${location.origin}${BASE.replace(/\/$/, '')}`;
  const link = cur ? `${base}/baixar/${cur.slug}${STATIC ? '/' : ''}` : '';

  // Mantém o app escolhido no endereço, para dar para compartilhar a página dele.
  useEffect(() => {
    if (cur) history.replaceState(null, '', `${BASE}loja/${cur.slug}${STATIC ? '/' : ''}`);
  }, [cur?.slug]);

  // Deixa o app escolhido visível na lista que rola para o lado (celular).
  useEffect(() => {
    picker.current?.querySelector('[data-active="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [cur?.slug]);

  // No celular, quando o botão grande sai da tela aparece a barra de download embaixo.
  useEffect(() => {
    if (!heroBtn.current) return;
    const io = new IntersectionObserver(([e]) => setHeroVisible(e.isIntersecting), { threshold: 0 });
    io.observe(heroBtn.current);
    return () => io.disconnect();
  }, [cur?.slug]);

  async function share() {
    const url = `${base}/loja/${cur.slug}${STATIC ? '/' : ''}`;
    try {
      if (navigator.share) await navigator.share({ title: cur.name, text: `Baixe o ${cur.name} no Nero Hub`, url });
      else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 1800);
      }
    } catch {}
  }

  if (!cur) {
    return <div className="grid min-h-screen place-items-center bg-cream text-muted">Nenhum app publicado ainda.</div>;
  }

  return (
    <div className="min-h-screen bg-cream pb-24 md:pb-0">
      {/* Topo */}
      <header className="sticky top-0 z-50 flex justify-center border-b-[3px] border-ink bg-cream px-4 py-3 sm:px-5">
        <nav className="flex w-full max-w-[1120px] items-center justify-between gap-3">
          <a href={BASE} className="flex items-center gap-2.5">
            <NeroMark size={38} />
            <span className="font-display text-[22px] font-bold">Nero Hub</span>
            <span className="rotate-[-3deg] rounded-[10px] border-[2.5px] border-ink bg-bubble px-2.5 py-0.5 text-xs font-extrabold">Loja</span>
          </a>
          <a href={BASE} className="flex items-center gap-1.5 rounded-[14px] border-[3px] border-ink bg-white px-3 py-2 font-display text-[15px] font-semibold shadow-[3px_3px_0_#0e0f1a] sm:px-4">
            <ArrowLeft size={16} strokeWidth={3} />
            <span className="hidden sm:inline">Voltar ao Hub</span>
          </a>
        </nav>
      </header>

      {/* Escolha do app: cartões em grade no PC, rolagem lateral no celular */}
      <section className="px-4 pt-7 sm:px-5 sm:pt-9">
        <div className="mx-auto flex max-w-[1120px] flex-col gap-3.5">
          <span className="font-display text-lg font-bold text-hub">Apps do Nero</span>
          <div ref={picker} className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:gap-4 sm:overflow-visible sm:px-0 sm:[grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
            {apps.map((p, i) => {
              const pc = appContent(p);
              const active = p === cur;
              return (
                <button
                  key={p.id}
                  data-active={active}
                  onClick={() => {
                    setSel(i);
                    if (phone) setShowQr(false);
                  }}
                  className={`relative flex w-[78vw] max-w-[320px] flex-none snap-start items-center gap-3.5 rounded-[22px] border-[3px] border-ink p-3.5 text-left shadow-[4px_4px_0_#0e0f1a] transition hover:-translate-x-0.5 hover:-translate-y-0.5 sm:w-auto sm:max-w-none ${
                    active ? 'bg-sun' : 'bg-white'
                  }`}
                >
                  <img src={pc.logo} alt="" className="logo-tile h-[58px] w-[58px] rounded-2xl" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-display text-[19px] font-bold leading-tight">{p.name}</span>
                    <span className="truncate text-[13px] font-bold text-muted">
                      {pc.plat} · v{p.latest.version}
                    </span>
                  </span>
                  <span className="flex-none rounded-[10px] border-[2.5px] border-ink bg-aqua px-2.5 py-1 text-xs font-extrabold">
                    {p.platform === 'chrome' ? 'ZIP' : 'APK'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* App escolhido + QR Code */}
      <section id="app" className="px-4 pt-6 sm:px-5 sm:pt-7">
        <AnimatePresence mode="wait">
          <motion.div
            key={cur.slug}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            className="mx-auto grid max-w-[1120px] items-stretch gap-6 md:grid-cols-[1.15fr_1fr]"
          >
            <div className="relative flex flex-col gap-5 overflow-hidden rounded-[30px] border-[3px] border-ink bg-hub p-6 text-white shadow-[8px_8px_0_#0e0f1a] sm:gap-[22px] sm:p-[30px]">
              <div className="absolute max-sm:hidden -right-10 top-6 h-[58px] w-[170px] rounded-full border-[3px] border-ink bg-white opacity-95" />
              <div className="relative flex items-center gap-4 sm:gap-5">
                <img
                  src={c.logo}
                  alt=""
                  className="anim-wob h-[84px] w-[84px] flex-none rounded-[22px] border-[3px] border-ink bg-white object-cover shadow-[5px_5px_0_#0e0f1a] sm:h-28 sm:w-28 sm:rounded-[28px]"
                  style={{ animationDuration: '4s' }}
                />
                <div className="flex min-w-0 flex-col gap-1.5">
                  <h1 className="hero-title m-0 font-display text-[clamp(28px,7vw,52px)] font-bold leading-none [-webkit-text-stroke-width:2px] [text-shadow:3px_3px_0_#0e0f1a]">
                    {cur.name}
                  </h1>
                  <span className="text-[15px] font-extrabold text-sun">Nero Hub</span>
                </div>
              </div>

              <div className="no-scrollbar relative -mx-6 flex gap-2.5 overflow-x-auto px-6 sm:mx-0 sm:flex-wrap sm:px-0">
                <Stat value={`v${cur.latest.version}`} label="Versão" />
                <Stat value={chrome ? 'Chrome' : 'Android'} label="Plataforma" />
                <Stat value={formatBytes(cur.latest.size)} label={ext} />
              </div>

              <p className="relative m-0 text-base font-bold leading-normal text-pretty sm:text-lg">{c.lead}</p>

              <div ref={heroBtn} className="relative mt-auto flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-3.5">
                <a href={downloadUrl(cur)} className="btn h-14 !rounded-[18px] !px-7 !text-xl !font-bold shadow-[5px_5px_0_#0e0f1a] sm:h-auto sm:!py-4">
                  <Download size={22} strokeWidth={2.75} /> Baixar {ext}
                </a>
                {phone ? (
                  <button onClick={share} className="btn btn-white !rounded-[18px] !py-3.5 shadow-[5px_5px_0_#0e0f1a]">
                    {shared ? <Check size={18} strokeWidth={3} /> : <Share2 size={18} strokeWidth={2.75} />} {shared ? 'Link copiado' : 'Compartilhar'}
                  </button>
                ) : (
                  <a href="#qr" className="btn btn-white !rounded-[18px] !py-4 shadow-[5px_5px_0_#0e0f1a]">
                    <Smartphone size={18} strokeWidth={2.75} /> Enviar para o celular
                  </a>
                )}
              </div>
              {chrome && (
                <p className="relative m-0 rounded-[14px] border-[2.5px] border-ink bg-white px-3.5 py-2.5 text-sm font-bold text-ink">
                  Instale no Chrome do computador: descompacte o ZIP, abra chrome://extensions, ligue o Modo do desenvolvedor e clique em Carregar sem compactação.
                </p>
              )}
            </div>

            <div id="qr" className="flex flex-col gap-4 rounded-[30px] border-[3px] border-ink bg-sky p-5 shadow-[8px_8px_0_#0e0f1a] sm:gap-[18px] sm:p-7">
              <button onClick={() => phone && setShowQr((s) => !s)} className={`flex items-center justify-between gap-3 text-left ${phone ? '' : 'cursor-default'}`}>
                <span className="flex items-center gap-2 font-display text-xl font-bold">
                  <QrCode size={22} strokeWidth={2.5} /> {phone ? 'QR Code para outro celular' : 'Escaneie para baixar'}
                </span>
                {phone ? (
                  <motion.span animate={{ rotate: showQr ? 180 : 0 }}>
                    <ChevronDown size={22} strokeWidth={2.75} />
                  </motion.span>
                ) : (
                  <span className="rounded-[10px] border-[2.5px] border-ink bg-white px-2.5 py-1 text-xs font-extrabold">v{cur.latest.version}</span>
                )}
              </button>
              <AnimatePresence initial={false}>
                {showQr && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex flex-col gap-4 overflow-hidden">
                    <div className="flex justify-center pt-1">
                      <Qr link={link} logo={c.logo} />
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {[
                        'Aponte a câmera do celular para o código.',
                        `Baixe o arquivo ${ext}.`,
                        chrome ? 'Descompacte e carregue no Chrome do computador.' : 'Abra o arquivo e permita a instalação, se o Android pedir.',
                      ].map((t, i) => (
                        <div key={t} className="flex items-start gap-3 rounded-2xl border-[2.5px] border-ink bg-white px-3.5 py-3">
                          <span className="grid h-7 w-7 flex-none place-items-center rounded-[9px] border-[2.5px] border-ink bg-sun font-display font-bold">{i + 1}</span>
                          <span className="text-sm font-bold leading-snug">{t}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Telas */}
      {c.screens.length > 0 && (
        <section className="px-4 pt-10 sm:px-5 sm:pt-12">
          <div className="mx-auto flex max-w-[1120px] flex-col gap-4">
            <h2 className="m-0 font-display text-[26px] font-bold sm:text-[30px]">Telas</h2>
            <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-6 pt-2 sm:mx-0 sm:gap-[22px] sm:px-1">
              {c.screens.map(([src, cap]) => (
                <figure key={src} className="m-0 flex flex-none snap-start flex-col gap-2.5">
                  <div
                    className={`rounded-[30px] border-[3px] border-ink bg-ink p-1.5 shadow-[6px_6px_0_#4d6bff] transition hover:-translate-y-1.5 hover:-rotate-1 ${
                      c.frame === 'browser' ? 'w-[min(420px,80vw)]' : 'w-[min(200px,44vw)]'
                    }`}
                  >
                    <img src={src} alt={cap} loading="lazy" className="block w-full rounded-[24px]" />
                  </div>
                  <figcaption className="pl-1 text-sm font-extrabold">{cap}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sobre e recursos */}
      <section className="px-4 pt-4 sm:px-5 sm:pt-6">
        <div className="mx-auto grid max-w-[1120px] items-start gap-6 md:grid-cols-2">
          <div className="toon flex flex-col gap-3.5 rounded-[26px] p-5 sm:p-[26px]">
            <h2 className="m-0 font-display text-2xl font-bold sm:text-[26px]">Sobre este app</h2>
            <p className="m-0 text-base font-extrabold leading-normal">{c.lead}</p>
            {c.body && <p className="m-0 text-[15px] leading-relaxed text-muted">{c.body}</p>}
            {c.note && <span className="text-[13px] leading-normal text-muted">{c.note}</span>}
            <div className="mt-1.5 flex flex-col gap-1.5 rounded-[18px] border-[2.5px] border-ink bg-cream p-4">
              <span className="font-display text-lg font-bold">Novidades</span>
              <span className="text-[15px] font-bold">
                <span className="mr-1.5 rounded-lg border-2 border-ink bg-sun px-2 font-display">v{cur.latest.version}</span>
                <span className="whitespace-pre-line">{cur.latest.changelog || 'Versão mais nova publicada no Nero Hub.'}</span>
              </span>
              <span className="text-xs text-muted">{formatDate(cur.latest.createdAt)}</span>
            </div>
          </div>
          {c.groups.length > 0 && (
            <div className="toon flex flex-col gap-[18px] rounded-[26px] p-5 sm:p-[26px]">
              <h2 className="m-0 font-display text-2xl font-bold sm:text-[26px]">Recursos</h2>
              {c.groups.map(([title, items]) => (
                <div key={title} className="flex flex-col gap-2.5">
                  <span className="font-display text-base font-bold text-hub">{title}</span>
                  <div className="flex flex-wrap gap-2">
                    {items.map((it) => (
                      <span key={it} className="pill">
                        {it}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="mt-16 bg-ink px-5 py-9 text-cream sm:mt-20">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <NeroMark size={34} className="!border-cream" />
            <span className="font-display text-xl font-bold">Nero Hub</span>
          </div>
          <a href={BASE} className="font-extrabold text-sun">
            Voltar ao Hub →
          </a>
          <span className="text-[13px] text-[#cfd1e0]">© 2026 Nero Hub</span>
        </div>
      </footer>

      {/* Barra de download no celular, estilo loja de apps */}
      <AnimatePresence>
        {!heroVisible && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-50 flex items-center gap-3 border-t-[3px] border-ink bg-cream px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
          >
            <img src={c.logo} alt="" className="logo-tile h-11 w-11 rounded-xl" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-base font-bold leading-tight">{cur.name}</span>
              <span className="text-xs font-bold text-muted">
                v{cur.latest.version} · {formatBytes(cur.latest.size)}
              </span>
            </span>
            <a href={downloadUrl(cur)} className="btn !px-4 !py-2.5 !text-base">
              <Download size={18} strokeWidth={2.75} /> Baixar
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
