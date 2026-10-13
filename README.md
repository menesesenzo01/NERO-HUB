# Nero Hub

Site e biblioteca do ecossistema Nero (Nero Assistente, Nero Docs e a extensão Nero Docs para Chrome). Você publica versões no PC e baixa no celular pela rede local, sem nuvem.

Cada app tem o próprio QR Code na seção **Biblioteca**. Ele abre `http://<IP>:5180/baixar/<app>` e o download da versão mais nova começa sozinho.

## Como usar

Dê dois cliques em `iniciar.bat`. Na primeira vez ele instala tudo, importa o Nero Docs 2.1.1 e o Nero 3.5, monta a interface e abre `http://localhost:5180`.

No celular (mesmo Wi-Fi), aponte a câmera para o QR Code do app ou abra `http://<IP>:5180/m` para ver todos.

Na primeira vez o Windows pergunta se o Node.js pode usar a rede. Marque **Redes privadas** e clique em **Permitir**, senão o celular não enxerga o PC.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm start` | Compila a interface e sobe o servidor (porta 5180) |
| `npm run dev` | Modo desenvolvimento: servidor com recarga + Vite em `:5173` |
| `npm run importar` | Cria os 3 apps na biblioteca e copia as versões que já estão no PC |

A porta muda com a variável `PORT`.

## Estrutura

```
NERO HUB/
├── iniciar.bat            atalho: instala, compila e abre
├── package.json           workspaces (server + web)
├── server/                Node + Fastify, escuta em 0.0.0.0
│   ├── src/index.js       API, upload, download, QR Code, serve a interface
│   ├── src/network.js     descobre o IP da rede local
│   ├── src/store.js       histórico de versões em JSON
│   ├── scripts/importar.js
│   ├── data/db.json       projetos e versões (criado sozinho)
│   └── storage/           apks/<projeto>/  e  icons/
└── web/                   Vite + React + Tailwind + Framer Motion
    ├── public/apps/       logos e telas de cada app
    └── src/
        ├── content.js     textos e telas de cada app
        └── components/    Site, QrStation, DownloadPage, Upload
```

## API

| Método | Rota | Uso |
| --- | --- | --- |
| GET | `/api/info` | IPs da rede, porta e se quem acessa é o PC |
| GET | `/api/projects` | Biblioteca com versões (mais nova primeiro) |
| POST | `/api/projects` | Cria projeto (só no PC) |
| POST | `/api/projects/:id/versions` | Envia APK ou ZIP + versão + notas (só no PC) |
| DELETE | `/api/projects/:id/versions/:versionId` | Apaga uma versão (só no PC) |
| POST | `/api/projects/:id/icon` | Troca o ícone (só no PC) |
| GET | `/baixar/:projeto` | Página do celular que já baixa a versão mais nova (destino do QR) |
| GET | `/d/:projeto` | Baixa direto o arquivo mais novo (APK ou ZIP) |
| GET | `/d/:projeto/:versao` | Baixa uma versão específica |
| GET | `/api/qr?text=&ecl=H` | QR Code em SVG (`H` aguenta o logo no centro) |

Upload e gerenciamento só funcionam no próprio PC. Quem entra pela rede (celular) só vê e baixa.
