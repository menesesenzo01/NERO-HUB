import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, FileUp, Loader2, Package, Trash2 } from 'lucide-react';
import Modal from './Modal.jsx';
import { api } from '../api.js';
import { formatBytes, formatDate, versionFromFileName } from '../format.js';

export default function UploadModal({ project, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [version, setVersion] = useState('');
  const [changelog, setChangelog] = useState('');
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [dragging, setDragging] = useState(false);
  const input = useRef(null);

  const isChrome = project?.platform === 'chrome';
  const ext = isChrome ? '.zip' : '.apk';

  useEffect(() => {
    setFile(null);
    setVersion('');
    setChangelog('');
    setProgress(null);
    setError('');
    setDone(false);
  }, [project?.id]);

  function pick(f) {
    if (!f) return;
    if (!/\.(apk|zip)$/i.test(f.name)) return setError(`Escolha um arquivo ${ext}`);
    setError('');
    setFile(f);
    if (!version) setVersion(versionFromFileName(f.name));
  }

  async function submit(e) {
    e.preventDefault();
    if (!file || !version.trim()) return;
    setError('');
    setProgress(0);
    try {
      const updated = await api.uploadVersion(project.id, { file, version: version.trim(), changelog }, setProgress);
      setDone(true);
      onDone(updated);
      setTimeout(onClose, 1100);
    } catch (err) {
      setError(err.message);
      setProgress(null);
    }
  }

  async function remove(v) {
    if (!confirm(`Apagar a versão ${v.version} de ${project.name}?`)) return;
    try {
      onDone(await api.deleteVersion(project.id, v.id));
    } catch (err) {
      setError(err.message);
    }
  }

  const sending = progress !== null && !done;

  return (
    <Modal open={!!project} onClose={sending ? () => {} : onClose} title="Nova versão" subtitle={project?.name}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div
          onClick={() => !sending && input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            pick(e.dataTransfer.files?.[0]);
          }}
          className={`relative cursor-pointer overflow-hidden rounded-[20px] border-[3px] border-dashed border-ink p-6 text-center transition ${
            dragging ? 'bg-sun' : 'bg-white hover:bg-sky'
          }`}
        >
          <input ref={input} type="file" accept={isChrome ? '.zip,application/zip' : '.apk,application/vnd.android.package-archive'} hidden onChange={(e) => pick(e.target.files?.[0])} />
          {file ? (
            <div className="flex items-center gap-3 text-left">
              <div className="grid h-11 w-11 place-items-center rounded-xl border-[2.5px] border-ink bg-aqua">
                <Package size={20} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <div className="truncate font-display text-lg font-semibold">{file.name}</div>
                <div className="text-sm text-muted">{formatBytes(file.size)}</div>
              </div>
            </div>
          ) : (
            <>
              <FileUp className="mx-auto" size={30} strokeWidth={2.5} />
              <div className="mt-2 font-display text-lg font-semibold">Arraste o {ext.slice(1).toUpperCase()} aqui</div>
              <div className="text-sm text-muted">ou clique para escolher</div>
            </>
          )}
          {progress !== null && (
            <div className="absolute inset-x-0 bottom-0 h-2 border-t-[2.5px] border-ink bg-cream">
              <motion.div className="h-full bg-hub" animate={{ width: `${Math.round(progress * 100)}%` }} transition={{ ease: 'easeOut', duration: 0.2 }} />
            </div>
          )}
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="font-display font-semibold">Versão</span>
          <input className="field" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="ex.: 2.2.0" required />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-display font-semibold">Notas da versão</span>
          <textarea className="field min-h-28 resize-y" value={changelog} onChange={(e) => setChangelog(e.target.value)} placeholder={'• O que mudou\n• O que foi corrigido'} />
        </label>

        {error && <p className="rounded-xl border-[2.5px] border-ink bg-bubble px-3 py-2 text-sm font-bold">{error}</p>}

        <button type="submit" disabled={!file || !version.trim() || sending || done} className="btn w-full">
          {done ? (
            <>
              <CheckCircle2 size={18} strokeWidth={2.5} /> Publicada
            </>
          ) : sending ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Enviando {Math.round(progress * 100)}%
            </>
          ) : (
            'Publicar versão'
          )}
        </button>

        {project?.versions.length > 0 && (
          <div className="flex flex-col gap-2 border-t-[2.5px] border-dashed border-ink/30 pt-4">
            <span className="font-display font-semibold">Versões publicadas</span>
            {project.versions.map((v, i) => (
              <div key={v.id} className="flex items-center gap-3 rounded-xl border-2 border-ink bg-white px-3 py-2 text-sm">
                <span className="rounded-lg border-2 border-ink bg-sun px-2 font-display font-bold">v{v.version}</span>
                <span className="flex-1 text-muted">
                  {formatDate(v.createdAt)} · {formatBytes(v.size)} {i === 0 && '· atual'}
                </span>
                <button type="button" onClick={() => remove(v)} className="rounded-lg p-1 hover:bg-bubble" aria-label={`Apagar v${v.version}`}>
                  <Trash2 size={16} strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
        )}
      </form>
    </Modal>
  );
}
