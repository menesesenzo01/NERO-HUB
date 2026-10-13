import { STATIC, asset } from './api.js';

// Textos e telas de cada app do site. A versão, o tamanho e o download vêm do servidor;
// aqui fica só o que não muda a cada atualização. A chave é o slug do projeto.
export const APPS = {
  'nero-assistente': {
    anchor: 'assistente',
    logo: asset('/apps/assist-logo.png'),
    short: 'Nero Assistente',
    cta: 'Conhecer o Nero Assistente',
    lead: 'Seu assistente pessoal para organizar a rotina, acompanhar compromissos e cuidar das finanças em um só lugar.',
    body: 'Aplicativo Android com conversa por texto e entrada por voz. Há modo local e opção de IA configurável.',
    groups: [
      ['Rotina', ['Conversa por texto', 'Entrada por voz', 'Agenda', 'Lembretes', 'Tarefas', 'Listas', 'Documentos com validade', 'Memória']],
      ['Finanças', ['Movimentações', 'Contas fixas', 'Assinaturas', 'Cartões', 'Dívidas', 'Orçamentos', 'Metas', 'Previsão', 'Relatórios']],
    ],
    note: 'A análise de fotos depende do modo IA. Telas com dados de demonstração.',
    screens: [
      [asset('/apps/assist-conversa.webp'), 'Conversa'],
      [asset('/apps/assist-agenda.webp'), 'Agenda'],
      [asset('/apps/assist-financas.webp'), 'Finanças'],
    ],
    frame: 'phone',
  },
  'nero-docs': {
    anchor: 'docs',
    logo: asset('/apps/docs-logo.png'),
    short: 'Nero Docs',
    cta: 'Conhecer o Nero Docs',
    lead: 'Converta documentos, organize PDFs e trabalhe com seus arquivos diretamente no celular.',
    body: 'Conversões com direção definida, ferramentas para organizar PDFs e recursos extras no mesmo app.',
    groups: [
      ['Para PDF', ['Word → PDF', 'Excel → PDF', 'PowerPoint → PDF', 'Imagens → PDF', 'Texto → PDF', 'Página web → PDF']],
      ['De PDF', ['PDF → Word', 'PDF → JPG', 'PDF → Texto', 'PDF → Markdown']],
      ['Outras conversões', ['Word → PNG', 'PNG → Word', 'PowerPoint → Word']],
      ['Organizar PDF', ['Juntar', 'Dividir', 'Remover páginas', 'Girar páginas', 'Comprimir', 'Numerar', 'Marca d’água', 'Recortar', 'Proteger', 'Desbloquear']],
      ['Mais recursos', ['OCR', 'Tradução', 'Comparação', 'Reparo', 'Edição', 'Assinatura', 'Formulários', 'Digitalização']],
    ],
    note: 'Página web para PDF usa a impressão do Android. Imagens da versão 2.0.0.',
    screens: [
      [asset('/apps/docs-arquivos.webp'), 'Arquivos'],
      [asset('/apps/docs-ferramentas.webp'), 'Ferramentas'],
      [asset('/apps/docs-word-pdf.webp'), 'Word para PDF'],
      [asset('/apps/docs-concluida.webp'), 'Conversão concluída'],
      [asset('/apps/docs-leitor.webp'), 'Leitor de PDF'],
    ],
    frame: 'phone',
  },
  'nero-docs-chrome': {
    anchor: 'chrome',
    logo: asset('/apps/chrome-logo.png'),
    short: 'Extensão Chrome',
    cta: 'Conhecer a extensão',
    lead: 'Ferramentas de PDF direto no navegador, com processamento dos arquivos no computador.',
    body: 'A extensão possui um motor próprio no navegador. Tem busca e categorias de ferramentas, arrastar e soltar arquivos, abertura em aba e recebimento de arquivos do WhatsApp Web.',
    groups: [
      ['Conversões', ['Imagens → PDF', 'Texto → PDF', 'PDF → Word', 'PDF → JPG', 'PDF → Texto', 'PDF → Markdown']],
      ['Organizar PDF', ['Juntar', 'Dividir', 'Remover páginas', 'Girar páginas', 'Comprimir', 'Numerar', 'Marca d’água', 'Recortar']],
    ],
    note: '“Esta página para PDF” usa a impressão do Chrome e aparece no popup da extensão. Word, Excel e PowerPoint para PDF são exclusivos do app Android.',
    screens: [
      [asset('/apps/chrome-catalogo.webp'), 'Catálogo'],
      [asset('/apps/chrome-pdf-word.webp'), 'PDF para Word'],
      [asset('/apps/chrome-dividir.webp'), 'Dividir PDF'],
    ],
    frame: 'browser',
  },
};

/** Conteúdo do app, com um padrão para projetos novos criados pelo painel. */
export function appContent(project) {
  return (
    APPS[project.slug] ?? {
      anchor: project.slug,
      logo: project.icon && !STATIC ? `/icons/${project.icon}` : asset('/nero-hub-logo.png'),
      short: project.name,
      cta: `Conhecer o ${project.name}`,
      lead: project.description,
      body: '',
      groups: [],
      note: '',
      screens: [],
      frame: 'phone',
    }
  );
}

export const ORDER = ['nero-assistente', 'nero-docs', 'nero-docs-chrome'];

export function sortProjects(projects) {
  const rank = (p) => (ORDER.includes(p.slug) ? ORDER.indexOf(p.slug) : ORDER.length);
  return [...projects].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}
