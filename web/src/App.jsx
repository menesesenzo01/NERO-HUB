import { useCallback, useEffect, useState } from 'react';
import { Loader2, ServerCrash } from 'lucide-react';
import Site from './components/Site.jsx';
import DownloadPage from './components/DownloadPage.jsx';
import StorePage from './components/StorePage.jsx';
import { BASE, api } from './api.js';

// /baixar/<app> é para onde o QR Code de cada app aponta; /m lista todos para o celular.
function route() {
  const path = '/' + location.pathname.slice(BASE.length);
  const m = path.match(/^\/baixar\/([\w-]+)/);
  if (m) return { page: 'download', slug: m[1] };
  if (/^\/m(\/|$)/.test(path)) return { page: 'download', slug: null };
  const loja = path.match(/^\/loja(?:\/([\w-]+))?/);
  if (loja) return { page: 'store', slug: loja[1] ?? null };
  return { page: 'site' };
}

export default function App() {
  const [info, setInfo] = useState(null);
  const [library, setLibrary] = useState(null);
  const [error, setError] = useState('');
  const [{ page, slug }] = useState(route);

  const reload = useCallback(async () => {
    try {
      const [i, l] = await Promise.all([api.info(), api.projects()]);
      setInfo(i);
      setLibrary(l);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    reload();
    // Mantém versões e QR Codes atualizados quando sai uma versão nova.
    const t = setInterval(reload, 15000);
    return () => clearInterval(t);
  }, [reload]);

  if (!library) {
    return (
      <div className="grid min-h-screen place-items-center bg-cream text-muted">
        {error ? (
          <div className="toon flex flex-col items-center gap-2 rounded-3xl p-8 text-center">
            <ServerCrash size={28} strokeWidth={2.5} />
            <p className="font-display text-lg font-bold text-ink">Não consegui falar com o servidor do Nero Hub.</p>
            <p className="text-sm">{error}</p>
          </div>
        ) : (
          <Loader2 className="animate-spin" />
        )}
      </div>
    );
  }

  if (page === 'store') return <StorePage info={info} library={library} slug={slug} />;
  return page === 'download' ? <DownloadPage library={library} slug={slug} /> : <Site info={info} library={library} setLibrary={setLibrary} />;
}
