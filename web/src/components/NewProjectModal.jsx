import { useState } from 'react';
import Modal from './Modal.jsx';
import { api } from '../api.js';

const ACCENTS = ['#4d6bff', '#38c9a0', '#ff8fb1', '#ffd23f', '#6fe3ff', '#ff7a59'];

export default function NewProjectModal({ open, segments, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', segment: segments[0] ?? 'Aplicativos', platform: 'android', tag: '', description: '', accent: ACCENTS[0] });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      onCreated(await api.createProject(form));
      setForm((f) => ({ ...f, name: '', tag: '', description: '' }));
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo projeto" subtitle="Adicione um app ao ecossistema Nero">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-display font-semibold">Nome</span>
          <input className="field" value={form.name} onChange={set('name')} placeholder="ex.: Nero Finanças" required autoFocus />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="font-display font-semibold">Segmento</span>
            <input className="field" value={form.segment} onChange={set('segment')} list="segments" required />
            <datalist id="segments">
              {segments.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-display font-semibold">Tipo</span>
            <select className="field" value={form.platform} onChange={set('platform')}>
              <option value="android">App Android (APK)</option>
              <option value="chrome">Extensão Chrome (ZIP)</option>
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="font-display font-semibold">Etiqueta</span>
          <input className="field" value={form.tag} onChange={set('tag')} placeholder="ex.: Android · finanças" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-display font-semibold">Descrição</span>
          <input className="field" value={form.description} onChange={set('description')} placeholder="Uma linha sobre o app" />
        </label>
        <div className="flex flex-col gap-1.5">
          <span className="font-display font-semibold">Cor</span>
          <div className="flex gap-2">
            {ACCENTS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setForm((f) => ({ ...f, accent: c }))}
                className={`h-9 w-9 rounded-xl border-[2.5px] border-ink transition ${form.accent === c ? 'shadow-[3px_3px_0_#0e0f1a] -translate-y-0.5' : ''}`}
                style={{ background: c }}
                aria-label={`Cor ${c}`}
              />
            ))}
          </div>
        </div>
        {error && <p className="rounded-xl border-[2.5px] border-ink bg-bubble px-3 py-2 text-sm font-bold">{error}</p>}
        <button type="submit" disabled={saving} className="btn w-full">
          Criar projeto
        </button>
      </form>
    </Modal>
  );
}
