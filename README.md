# Poker de Quinta — Temporada 2027

Site completo, responsivo e instalável (PWA) para o circuito amador **Poker de Quinta**. O projeto foi construído em HTML, CSS e JavaScript puro, sem etapa de build, com identidade visual própria baseada no design system fornecido (verde profundo, dourado e tipografia Space Grotesk).

## O que está incluído

- **Página inicial** com hero editorial, marquee, carrossel de destaques das 12 etapas, contagem regressiva, números da temporada, prévia do ranking e CTA de reserva.
- **Carrossel acessível** com autoplay, pausa, setas, teclado, swipe, dots de navegação e respeito a `prefers-reduced-motion`.
- **Menu inferior fixo** com Início, Ranking, Regulamento e Histórico.
- **Menu hambúrguer** para Loja, Localização, Sobre, Contato, atalhos e instalação do app.
- **Ranking completo** com pódio, busca, ordenação, filtro Top 8, movimentação e modal de perfil com desempenho etapa por etapa.
- **Regulamento** em acordeões, tabela de pontuação, premiação e download em PDF.
- **Histórico** por temporada (2027, 2026, 2025, 2024), filtros de etapas concluídas/próximas e modal de mesa final.
- **Loja funcional** com filtros, seleção de tamanho, sacola persistida em `localStorage` e finalização via WhatsApp.
- **Localização** com mapa ilustrativo em SVG, informações de chegada, horários e link para o Google Maps.
- **Sobre** e **Contato** completos, com formulário validado e envio pelo WhatsApp.
- **PWA**: manifest, ícones normais e maskable, screenshots, atalhos, service worker com cache do app shell, suporte offline, aviso de conexão e fluxo de atualização.
- **Calendário .ics** com as 12 etapas e **regulamento em PDF**.

## Como rodar

O projeto é estático, mas o service worker exige HTTP/HTTPS. Não abra `index.html` diretamente via `file://` se quiser testar a instalação e o modo offline.

```bash
# na raiz do projeto
python -m http.server 8099
```

Depois acesse **http://127.0.0.1:8099/**.

Também funciona em qualquer hospedagem estática (Netlify, Vercel, GitHub Pages, Cloudflare Pages). Como todos os caminhos são relativos, pode ser publicado na raiz ou em um subdiretório.

## Estrutura

```text
.
├── index.html                     # todas as páginas/rotas (SPA por hash)
├── css/styles.css                 # design system + layout + responsivo
├── js/data.js                     # dados de etapas, jogadores, loja e histórico
├── js/app.js                      # renderização e interações
├── manifest.webmanifest           # configuração PWA
├── service-worker.js              # cache, offline e atualização
├── offline.html                   # fallback offline
├── assets/
│   ├── icons/                     # favicon e ícones PWA
│   ├── img/                       # OG image e screenshots do manifest
│   ├── poker-de-quinta-2027.ics   # calendário da temporada
│   └── regulamento-poker-de-quinta-2027.pdf
├── tools/                         # geradores e scripts de QA/capturas
├── robots.txt
└── sitemap.xml
```

## Rotas

A navegação usa hash para funcionar em qualquer hospedagem estática:

- `#inicio`
- `#ranking`
- `#regulamento`
- `#historico`
- `#loja`
- `#localizacao`
- `#sobre`
- `#contato`

Os links do menu inferior e do rodapé usam essas rotas. O service worker serve o app shell para qualquer navegação dentro do escopo, inclusive offline.

## Personalização rápida

### Conteúdo e números

Todo o conteúdo estruturado está em **`js/data.js`**:

- `site`: WhatsApp, e-mail, endereço, buy-in, garantido, capacidade e próxima etapa.
- `players`: elenco, cidade, bio e melhor resultado.
- `stages`: calendário, status (`completed`, `next`, `upcoming`, `final`), resultados, arte e cores de acento.
- `pastSeasons`: campeões e resumo do arquivo.
- `shop`: produtos, preços, tamanhos e artes.

> Os nomes, resultados e pontuação atuais são **dados demonstrativos** da temporada. Substitua em `data.js` para publicar resultados reais. A pontuação é calculada automaticamente a partir da ordem em `stages[].results` usando `pointsByPosition`.

### Links e dados da casa

Antes de publicar, revise:

- `WHATSAPP`: em `js/data.js`, campo `site.whatsapp` (formato `55DDDNÚMERO`).
- Instagram e e-mail em `index.html`, `js/data.js` e no rodapé.
- Endereço e link do Google Maps.
- Domínio nos metadados Open Graph, `canonical`, `sitemap.xml` e `robots.txt` (`pokerdequinta.com.br` é placeholder).
- Textos institucionais, valores de buy-in e regulamento.

### Cores e tipografia

O bloco `:root` em `css/styles.css` mantém os tokens do design system (cores, gradientes, tipografia, espaçamento, raios, sombras, transições e z-index). Ajustes globais devem partir dali.

## PWA

O manifest inclui:

- nome, nome curto, descrição em português;
- `start_url` e `scope` relativos;
- ícones 192, 512 e maskable 512;
- screenshots mobile e desktop;
- atalhos para Ranking, Histórico e Loja.

O service worker usa três estratégias:

1. **Navegação:** network-first com fallback para o `index.html` em cache e, em última instância, `offline.html`.
2. **Assets do app:** cache-first com atualização de cache.
3. **Fontes:** stale-while-revalidate para Google Fonts.

### Atualizações

Ao alterar arquivos do app, incremente `VERSION` no topo de `service-worker.js` (por exemplo, `pq-2027-v1.0.1`). O site mostra um toast com a ação **Atualizar** quando uma nova versão estiver pronta.

### Como validar

1. Abra o site via `http://127.0.0.1:8099`.
2. No Chrome DevTools → Application:
   - confira o manifest em **Manifest**;
   - confira o service worker em **Service Workers**;
   - simule offline em **Network → Offline** e recarregue.
3. Use **Lighthouse → PWA/Installable** para conferir os critérios de instalação.
4. No celular, use “Adicionar à tela inicial” / “Instalar aplicativo”. Em iOS, o botão de instalação mostra instruções manuais quando o prompt nativo não existe.

## Geradores incluídos

Os arquivos em `tools/` são utilitários de desenvolvimento, não necessários em produção.

### Calendário `.ics`

```bash
python tools/generate_calendar.py
```

Gera `assets/poker-de-quinta-2027.ics` com fuso `America/Sao_Paulo`, 12 eventos e alarme de 1 dia antes. Atualize as datas no script se o calendário mudar.

### Regulamento em PDF

O PDF foi impresso a partir de `tools/regulamento-print.html` com o Chrome headless:

```bash
chrome --headless=new --no-sandbox --no-pdf-header-footer \
  --print-to-pdf=assets/regulamento-poker-de-quinta-2027.pdf \
  --print-to-pdf-no-header tools/regulamento-print.html
```

No Windows, use o caminho completo do `chrome.exe`. Se o texto do regulamento mudar, atualize também o HTML de impressão e regenere o PDF.

### Imagens

- `tools/icon-source.svg` e `tools/icon-maskable-source.svg` geram os ícones PWA.
- `tools/og.html` gera a imagem Open Graph (`assets/img/og-cover.png`).
- `tools/capture.mjs`, `tools/capture-extra.mjs`, `tools/test-pwa.mjs` e `tools/diagnose*.mjs` são scripts de QA usados durante o desenvolvimento. Eles exigem uma instância do Chrome com `--remote-debugging-port` e o servidor local rodando.

## Acessibilidade e responsividade

- Estrutura semântica com `header`, `nav`, `main`, `section`, `footer` e hierarquia de títulos.
- Skip link, foco visível, suporte a teclado no carrossel e trap de foco em drawers/modais.
- `aria-expanded`, `aria-pressed`, `aria-current`, `aria-live` e rótulos descritivos.
- Modais fecham com `Esc`, clique no fundo e botão dedicado.
- Respeito a `prefers-reduced-motion`; autoplay é desativado por padrão nesse modo.
- Layout testado em larguras de 320 a 1440 px, sem overflow horizontal.
- Textos de apoio em português com acentuação correta.

## Notas

- O site não processa pagamentos. A loja monta o pedido e abre o WhatsApp da organização.
- O formulário de contato também abre o WhatsApp com a mensagem validada.
- O mapa é ilustrativo e usa SVG local, mantendo o funcionamento offline; o botão “Abrir no Google Maps” abre a rota real.
- O projeto inclui avisos de **+18** e jogo responsável no rodapé, regulamento e modal dedicado.
- Nenhuma biblioteca de front-end, bundler ou framework é necessária.
