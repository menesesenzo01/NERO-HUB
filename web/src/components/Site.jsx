import { useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Globe, Loader2, Plus, TriangleAlert } from 'lucide-react';
import NeroMark from './NeroMark.jsx';
import QrStation from './QrStation.jsx';
import UploadModal from './UploadModal.jsx';
import NewProjectModal from './NewProjectModal.jsx';
import { appContent, sortProjects } from '../content.js';
import { formatDate } from '../format.js';
import { BASE, STATIC, api, asset } from '../api.js';

const TILTS = ['-1.5deg', '1deg', '-.8deg', '1.2deg'];
const SHOT_TILTS = ['-2deg', '1.5deg', '-.5deg'];

/** Aparece subindo quando entra na tela. */
function Reveal({ delay = 0, className = '', children, ...rest }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.9, delay: delay / 1000, ease: [0.2, 0.8, 0.2, 1] }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Botão que segue o mouse de leve. */
function Magnetic({ as: Tag = 'a', className = '', ...props }) {
  const ref = useRef(null);
  return (
    <Tag
      ref={ref}
      className={className}
      onMouseMove={(e) => {
        const r = ref.current.getBoundingClientRect();
        ref.current.style.translate = `${(e.clientX - r.left - r.width / 2) * 0.25}px ${(e.clientY - r.top - r.height / 2) * 0.35}px`;
      }}
      onMouseLeave={() => (ref.current.style.translate = '')}
      {...props}
    />
  );
}

function Frame({ kind, src, tilt, width }) {
  if (kind === 'browser') {
    return (
      <div className="browser" style={{ rotate: tilt, width }}>
        <div className="flex gap-1.5 border-b-[3px] border-ink bg-sun px-3 py-2.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-2.5 w-2.5 rounded-full border-2 border-ink bg-white" />
          ))}
        </div>
        <img src={src} alt="" className="block w-full" loading="lazy" />
      </div>
    );
  }
  return (
    <div className="phone" style={{ rotate: tilt, width }}>
      <img src={src} alt="" loading="lazy" />
    </div>
  );
}

/** Botão do PC que manda a versão mais nova de cada app para o site público (GitHub). */
function PublishButton() {
  const [state, setState] = useState('idle'); // idle | running | ok | error
  const [log, setLog] = useState('');
  async function publish() {
    setState('running');
    try {
      const r = await api.publishGithub();
      setLog(r.log);
      setState(r.ok ? 'ok' : 'error');
    } catch (err) {
      setLog(err.message);
      setState('error');
    }
  }
  const Icon = { idle: Globe, running: Loader2, ok: CheckCircle2, error: TriangleAlert }[state];
  return (
    <button
      onClick={publish}
      disabled={state === 'running'}
      title={log || 'Envia a versão mais nova de cada app para o site no GitHub'}
      className={`btn !px-3.5 !py-2.5 !text-[15px] ${state === 'error' ? '!bg-bubble' : 'btn-white'}`}
    >
      <Icon size={18} strokeWidth={2.5} className={state === 'running' ? 'animate-spin' : ''} />
      <span className="hidden sm:inline">{{ idle: 'Publicar no site', running: 'Publicando…', ok: 'Site atualizado', error: 'Falhou' }[state]}</span>
    </button>
  );
}

function SectionHead({ label, children, center }) {
  return (
    <Reveal className={`mb-12 flex flex-col gap-4 ${center ? 'items-center text-center' : ''}`}>
      <span className="label-tag">{label}</span>
      <h2 className="m-0 font-display text-[clamp(36px,5vw,60px)] font-bold leading-none text-balance">{children}</h2>
    </Reveal>
  );
}

export default function Site({ info, library, setLibrary }) {
  const projects = useMemo(() => sortProjects(library.projects), [library.projects]);
  const [sel, setSel] = useState(0);
  const [uploadFor, setUploadFor] = useState(null);
  const [creating, setCreating] = useState(false);

  const isAdmin = info?.isAdmin;
  const replace = (updated) => {
    setLibrary((lib) => ({ ...lib, projects: lib.projects.map((p) => (p.id === updated.id ? updated : p)) }));
    setUploadFor((u) => (u && u.id === updated.id ? updated : u));
  };

  const updates = projects
    .flatMap((p) => p.versions.map((v, i) => ({ p, v, current: i === 0 })))
    .sort((a, b) => b.v.createdAt.localeCompare(a.v.createdAt))
    .slice(0, 8);


  const [a, b, c] = projects.map(appContent);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-cream">
      {/* Topo */}
      <header className="sticky top-0 z-50 flex justify-center border-b-[3px] border-ink bg-cream px-5 py-3.5">
        <nav className="flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-5">
          <a href="#top" className="flex items-center gap-2.5">
            <NeroMark size={36} />
            <span className="font-display text-[22px] font-bold">Nero Hub</span>
          </a>
          <div className="hidden gap-7 text-sm font-extrabold md:flex">
            <a href="#projetos" className="hover:text-hub">Projetos</a>
            <a href="#biblioteca" className="hover:text-hub">Biblioteca</a>
            <a href="#atualizacoes" className="hover:text-hub">Atualizações</a>
            <a href={`${BASE}loja${STATIC ? '/' : ''}`} className="hover:text-hub">Loja</a>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && <PublishButton />}
            {isAdmin && (
              <button onClick={() => setCreating(true)} className="btn btn-white !px-3.5 !py-2.5 !text-[15px]" title="Novo projeto">
                <Plus size={18} strokeWidth={3} /> <span className="hidden sm:inline">Projeto</span>
              </button>
            )}
            <Magnetic href={`${BASE}loja${STATIC ? '/' : ''}`} className="btn !py-2.5">
              Loja
            </Magnetic>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section id="top" className="relative overflow-hidden bg-hub px-5 pb-[120px] pt-[90px]">
        <div className="anim-drift absolute left-[6%] top-[70px] h-14 w-[150px] rounded-full border-[3px] border-ink bg-white">
          <div className="absolute left-6 -top-[30px] h-16 w-16 rotate-45 rounded-full border-[3px] border-ink border-b-transparent border-r-transparent bg-white" />
        </div>
        <div className="anim-drift absolute right-[7%] top-[150px] h-16 w-[190px] rounded-full border-[3px] border-ink bg-white [animation-direction:alternate-reverse] [animation-duration:11s]">
          <div className="absolute left-[60px] -top-[38px] h-20 w-20 rotate-45 rounded-full border-[3px] border-ink border-b-transparent border-r-transparent bg-white" />
        </div>
        <div className="scallop absolute inset-x-0 -bottom-px h-[60px]" />

        <div className="relative mx-auto flex max-w-[1000px] flex-col items-center gap-[22px] text-center">
          <span className="rotate-[-2deg] rounded-full border-[3px] border-ink bg-white px-3.5 py-1.5 text-sm font-extrabold">
            {projects.length === 3 ? 'Três produtos. Um ecossistema.' : `${projects.length} produtos. Um ecossistema.`}
          </span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
            className="hero-title m-0 font-display text-[clamp(56px,10vw,128px)] font-bold leading-[.9] tracking-[-.02em]"
          >
            Nero Hub
            <span className="hero-sub mt-[.22em] block text-[.32em] leading-[1.15]">ferramentas para sua rotina e seus documentos</span>
          </motion.h1>
          <p className="m-0 max-w-[560px] text-[19px] font-bold leading-relaxed text-white text-pretty">
            Nero Assistente, Nero Docs para Android e a extensão Nero Docs para Chrome.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Magnetic href="#projetos" className="btn">
              Explorar Hub
            </Magnetic>
            <Magnetic href="#biblioteca" className="btn btn-white">
              Biblioteca →
            </Magnetic>
          </div>
        </div>

        <div className="relative mx-auto mt-16 flex max-w-[1080px] items-end justify-center gap-[clamp(10px,2.5vw,28px)]">
          <div className="mb-[30px]">
            <Frame kind="phone" src={asset('/apps/docs-ferramentas.webp')} tilt="-7deg" width="clamp(110px,18vw,210px)" />
          </div>
          <Frame kind="phone" src={asset('/apps/assist-conversa.webp')} tilt="2deg" width="clamp(130px,22vw,250px)" />
          <div className="mb-5">
            <Frame kind="browser" src={asset('/apps/chrome-catalogo.webp')} tilt="4deg" width="clamp(200px,40vw,440px)" />
          </div>
          {[
            [asset('/apps/assist-logo.png'), 'left-[42%] -top-[50px]', '0s', '#fff'],
            [asset('/apps/docs-logo.png'), 'left-[4%] -top-[30px]', '.4s', '#fff'],
            [asset('/apps/chrome-logo.png'), 'right-[4%] -top-5', '.8s', '#1d3fe0'],
          ].map(([src, pos, delay, bg]) => (
            <img
              key={src}
              src={src}
              alt=""
              className={`anim-wob absolute h-[72px] w-[72px] rounded-[18px] border-[3px] border-ink object-cover shadow-[4px_4px_0_#0e0f1a] max-sm:h-14 max-sm:w-14 ${pos}`}
              style={{ animationDelay: delay, background: bg }}
            />
          ))}
        </div>
      </section>

      {/* Projetos */}
      <section id="projetos" className="relative bg-cream px-5 pb-[60px] pt-[110px]">
        <div className="mx-auto max-w-[1180px]">
          <SectionHead label="Projetos" center>
            {projects.length === 3 ? 'Três produtos.' : 'Os produtos.'} <span className="text-hub">Um ecossistema.</span>
          </SectionHead>
          <div className="grid gap-7 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
            {projects.map((p, i) => {
              const pc = appContent(p);
              return (
                <Reveal key={p.id} delay={i * 90} className="flex">
                  <article
                    className="toon relative flex w-full flex-col gap-3.5 overflow-hidden rounded-[28px] px-[26px] pt-[26px] shadow-[7px_7px_0_#0e0f1a] transition-[rotate,translate,box-shadow] duration-[450ms] ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-1.5 hover:!rotate-0 hover:shadow-[11px_11px_0_#0e0f1a]"
                    style={{ rotate: TILTS[i % TILTS.length] }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <img src={pc.logo} alt="" className="logo-tile h-[52px] w-[52px] rounded-[14px]" />
                      <span className="rounded-[10px] border-[2.5px] border-ink bg-aqua px-2.5 py-1 text-xs font-extrabold">{p.tag || p.segment}</span>
                    </div>
                    <h3 className="m-0 font-display text-[28px] font-bold leading-[1.05]">{p.name}</h3>
                    <p className="m-0 text-[15px] leading-normal text-muted">{p.description}</p>
                    <a
                      href={`#${pc.anchor}`}
                      className="font-display text-[15px] font-semibold underline decoration-sun decoration-[3px] underline-offset-4"
                    >
                      {pc.cta} →
                    </a>
                    {pc.screens[0] && (
                      <div className="relative -mx-[26px] mt-auto flex items-end justify-center overflow-hidden border-t-[3px] border-ink bg-hub px-6 pt-6">
                        <img
                          src={pc.screens[0][0]}
                          alt=""
                          loading="lazy"
                          className={`block rounded-t-[20px] border-[3px] border-b-0 border-ink ${pc.frame === 'browser' ? 'h-[300px] w-full object-cover object-top' : 'h-[300px] w-[56%] object-cover object-top'}`}
                        />
                      </div>
                    )}
                  </article>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Uma seção por app */}
      {projects.map((p, i) => {
        const pc = appContent(p);
        const sky = i % 2 === 1;
        return (
          <section key={p.id} id={pc.anchor} className={`relative px-5 py-[90px] ${sky ? 'border-y-[3px] border-ink bg-sky' : 'bg-cream'}`}>
            <div className="mx-auto flex max-w-[1180px] flex-col gap-10">
              <Reveal className="grid items-start gap-11 [grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr))]">
                <div className="flex flex-col gap-[18px]">
                  <span className="label-tag">{p.tag || p.segment}</span>
                  <div className="flex items-center gap-4">
                    <img src={pc.logo} alt="" className="logo-tile h-16 w-16 rounded-[17px]" />
                    <h2 className="m-0 font-display text-[clamp(36px,5vw,60px)] font-bold leading-none text-balance">{p.name}</h2>
                  </div>
                  <p className="m-0 text-xl font-extrabold leading-snug text-pretty">{pc.lead}</p>
                  {pc.body && <p className="m-0 text-[15px] leading-relaxed text-muted text-pretty">{pc.body}</p>}
                  <div className="flex flex-wrap gap-3">
                    <Magnetic href={`${BASE}loja/${p.slug}${STATIC ? '/' : ''}`} className="btn">
                      {p.latest ? `Baixar v${p.latest.version}` : pc.cta}
                    </Magnetic>
                  </div>
                </div>
                {pc.groups.length > 0 && (
                  <div className="toon flex flex-col gap-5 rounded-3xl p-[26px]">
                    {pc.groups.map(([title, items]) => (
                      <div key={title} className="flex flex-col gap-2.5">
                        <span className="font-display text-[15px] font-bold text-hub">{title}</span>
                        <div className="flex flex-wrap gap-2">
                          {items.map((it) => (
                            <span key={it} className="pill">
                              {it}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                    {pc.note && <span className="text-[13px] leading-normal text-muted">{pc.note}</span>}
                  </div>
                )}
              </Reveal>
              {pc.screens.length > 0 && (
                <Reveal className="no-scrollbar flex gap-5 overflow-x-auto px-1.5 pb-6 pt-3">
                  {pc.screens.map(([src, label], k) => (
                    <figure key={src} className="m-0 flex flex-none flex-col gap-3">
                      <Frame kind={pc.frame} src={src} tilt={SHOT_TILTS[k % SHOT_TILTS.length]} width={pc.frame === 'browser' ? 'min(540px,82vw)' : '200px'} />
                      <figcaption className="pl-1 text-[13px] font-extrabold">{label}</figcaption>
                    </figure>
                  ))}
                </Reveal>
              )}
            </div>
          </section>
        );
      })}

      {/* Biblioteca + QR Codes */}
      <section id="biblioteca" className="relative bg-cream px-5 py-[110px]">
        <div className="relative mx-auto max-w-[1180px]">
          <Reveal className="mb-11 flex flex-wrap items-end justify-between gap-6">
            <div className="flex max-w-[620px] flex-col gap-4">
              <span className="label-tag">Biblioteca</span>
              <h2 className="m-0 font-display text-[clamp(36px,5vw,60px)] font-bold leading-none text-balance">
                Escolha um app. <span className="text-hub">Aponte o celular.</span>
              </h2>
            </div>
            <p className="m-0 max-w-[380px] text-base leading-relaxed text-muted">
              Cada app tem o próprio QR Code, sempre com a versão mais nova.{STATIC ? ' Funciona de qualquer lugar com internet.' : ' O celular precisa estar no mesmo Wi-Fi deste PC.'}
            </p>
          </Reveal>
          <Reveal delay={120}>
            <QrStation info={info} projects={projects} sel={Math.min(sel, projects.length - 1)} setSel={setSel} onUpload={setUploadFor} />
          </Reveal>
        </div>
      </section>

      {/* Atualizações */}
      <section id="atualizacoes" className="relative border-y-[3px] border-ink bg-sky px-5 pb-[120px] pt-[100px]">
        <div className="mx-auto grid max-w-[1180px] gap-12 [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))]">
          <Reveal className="flex flex-col gap-4 self-start">
            <span className="label-tag">Versões</span>
            <h2 className="m-0 font-display text-[clamp(36px,5vw,60px)] font-bold leading-none">Atualizações</h2>
          </Reveal>
          <div className="flex flex-col gap-3.5">
            {updates.map(({ p, v, current }, i) => (
              <Reveal key={v.id} delay={i * 80}>
                <div className="flex items-start gap-[18px] rounded-[20px] border-[3px] border-ink bg-white px-[22px] py-5 shadow-[5px_5px_0_#0e0f1a]">
                  <span className="min-w-16 flex-none rounded-lg border-2 border-ink bg-sun px-2 py-0.5 text-center font-display text-[15px] font-bold">
                    v{v.version}
                  </span>
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="font-display text-[19px] font-bold">
                      {p.name}
                      {current && <span className="ml-2 rounded-md border-2 border-ink bg-aqua px-1.5 align-middle text-[11px] font-extrabold">atual</span>}
                    </span>
                    <span className="whitespace-pre-line text-[15px] leading-normal text-muted">{v.changelog || 'Sem notas para esta versão.'}</span>
                    <span className="text-xs text-muted/80">{formatDate(v.createdAt)}</span>
                  </div>
                </div>
              </Reveal>
            ))}
            {updates.length === 0 && <div className="toon rounded-[20px] p-6 text-muted">Nenhuma versão publicada ainda.</div>}
          </div>
        </div>
      </section>

      {/* Rodapé */}
      <footer className="relative bg-ink px-5 pb-8 pt-12 text-cream">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-8">
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div className="flex max-w-[320px] flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <NeroMark size={34} className="!border-cream" />
                <span className="font-display text-[22px] font-bold">Nero Hub</span>
              </div>
              <span className="text-sm leading-relaxed text-[#cfd1e0]">Ferramentas para sua rotina e seus documentos.</span>
            </div>
            <div className="flex flex-wrap gap-x-7 gap-y-3 text-sm">
              {[a, b, c].filter(Boolean).map((pc) => (
                <a key={pc.anchor} href={`#${pc.anchor}`} className="hover:text-sun">
                  {pc.short}
                </a>
              ))}
              <a href="#biblioteca" className="hover:text-sun">Biblioteca</a>
              <a href="#atualizacoes" className="hover:text-sun">Atualizações</a>
            </div>
          </div>
          <div className="flex flex-wrap justify-between gap-3 border-t-2 border-cream/20 pt-5 text-[13px] text-[#cfd1e0]">
            <span>© 2026 Nero Hub</span>
            {info?.primary && <span className="font-mono">{info.primary.url.replace(/^https?:\/\//, '')}</span>}
          </div>
        </div>
      </footer>

      <UploadModal project={uploadFor} onClose={() => setUploadFor(null)} onDone={replace} />
      <NewProjectModal
        open={creating}
        segments={library.segments}
        onClose={() => setCreating(false)}
        onCreated={(p) =>
          setLibrary((lib) => ({
            ...lib,
            projects: [...lib.projects, p],
            segments: lib.segments.includes(p.segment) ? lib.segments : [...lib.segments, p.segment],
          }))
        }
      />
    </div>
  );
}
