# Poker de Quinta — Temporada 2027

Site completo, responsivo e instalável (PWA) para o circuito amador **Poker de Quinta**. Construído em HTML, CSS e JavaScript puro, sem etapa de build, com a identidade visual da casa (verde profundo, dourado e Space Grotesk).

A versão atual inclui a **logo oficial `logo pdq.png`**, fotos de jogadores com fallback, leitura do **Firebase Realtime Database** e uma página de **confirmação de presença** integrada à página oficial da casa.

## O que está incluído

- **Página inicial** com hero editorial, marquee, carrossel de destaques das 12 etapas, contagem regressiva, números da temporada, prévia do ranking e CTA de reserva.
- **Carrossel acessível** com autoplay, pausa, setas, teclado, swipe, dots de navegação e respeito a `prefers-reduced-motion`.
- **Menu inferior fixo** com Início, Ranking, Regulamento e Histórico.
- **Menu hambúrguer** para Confirmar presença, Loja, Localização, Sobre, Contato, atalhos e instalação do app.
- **Ranking completo** com pódio, busca sem acento, ordenação, filtro Top 8, movimentação e modal de perfil com desempenho etapa por etapa.
- **Fotos de jogadores** no pódio, leaders, tabela e modal, com fallback automático para iniciais quando a foto está vazia ou falha.
- **Regulamento** em acordeões, tabela de pontuação, premiação e download em PDF.
- **Histórico** por temporada (2027, 2026, 2025, 2024), filtros de etapas concluídas/próximas e modal de mesa final.
- **Confirmação de presença** com status da etapa sincronizado com o Firebase e a lista oficial da casa embutida.
- **Loja funcional** com filtros, seleção de tamanho, sacola persistida em `localStorage` e finalização via WhatsApp.
- **Localização** com mapa ilustrativo em SVG, informações de chegada, horários e link para o Google Maps.
- **Sobre** e **Contato** completos, com formulário validado e envio pelo WhatsApp.
- **PWA**: manifest, ícones normais e maskable, screenshots, atalhos, service worker com cache do app shell, suporte offline, aviso de conexão e fluxo de atualização.
- **Calendário .ics** com as 12 etapas, **regulamento em PDF** e imagem Open Graph oficial.

## Como rodar

O projeto é estático, mas o service worker exige HTTP/HTTPS. Não abra `index.html` diretamente via `file://` se quiser testar a instalação e o modo offline.

```bash
# na raiz do projeto
python -m http.server 8099
```

Depois acesse **http://127.0.0.1:8099/**.

Também funciona em qualquer hospedagem estática (GitHub Pages, Netlify, Vercel, Cloudflare Pages). Os caminhos de assets são relativos.

## Estrutura

```text
.
├── index.html                       # todas as páginas/rotas (SPA por hash)
├── css/styles.css                   # design system + layout + responsivo
├── js/data.js                       # jogadores, etapas, loja e histórico
├── js/app.js                        # renderização e interações
├── js/firebase-config.js            # configuração pública do Firebase
├── js/firebase-data.js              # leitura REST do Firebase + cache offline
├── logo pdq.png                     # logo oficial usada no site, cartas e ícones
├── manifest.webmanifest             # configuração PWA
├── service-worker.js                # cache, offline e atualização
├── offline.html                     # fallback offline
├── assets/
│   ├── icons/                       # favicon e ícones PWA gerados da logo
│   ├── img/                         # OG image e screenshots do manifest
│   ├── poker-de-quinta-2027.ics     # calendário da temporada
│   └── regulamento-poker-de-quinta-2027.pdf
├── firebase/
│   └── temporada-2027.example.json  # modelo para o nó /temporada2027
├── tools/                           # geradores e scripts de QA
├── robots.txt
└── sitemap.xml
```

## Rotas

A navegação usa hash para funcionar em qualquer hospedagem estática:

- `#inicio`
- `#ranking`
- `#regulamento`
- `#historico`
- `#confirmar`
- `#loja`
- `#localizacao`
- `#sobre`
- `#contato`

## Onde trocar os dados

### Jogadores, fotos e ranking

Os jogadores ficam em **`js/data.js`**, no array `players`. Cada objeto tem:

```js
{
  id: "p01",
  name: "Camila Duarte",
  photo: "",
  nickname: "Camila",
  city: "São Paulo",
  uf: "SP",
  since: 2021,
  bio: "...",
  best: "..."
}
```

- **Nome exibido:** altere `name`. O `id` deve continuar igual, pois ele é usado em `stages[].results`.
- **Foto:** preencha `photo` com a URL completa da imagem. Exemplos aceitos:
  - `https://github.com/pokerdequinta/fotos/blob/main/Amarildo.png?raw=true`
  - `https://raw.githubusercontent.com/pokerdequinta/fotos/main/Amarildo.png`
- **Fallback:** se `photo` estiver vazio ou a imagem falhar, o site mostra as iniciais em um avatar circular.
- **Onde a foto aparece:** pódio, cards de líderes, tabela de ranking e modal do jogador.
- **Firebase:** além de `photo`, o site tenta preencher automaticamente as fotos a partir do nó `/fotosJogadores`, comparando o nome do jogador. Se quiser usar outro nome de busca, adicione `photoKey` ao objeto.

Para trocar nomes sem quebrar o ranking, mantenha os `id` (`p01`, `p02`, ...) em `stages[].results`. O ranking é calculado automaticamente pela ordem de cada etapa.

### Etapas, datas e resultados

Também em **`js/data.js`**, no array `stages`:

- `name`, `kicker` e `description`: textos da etapa.
- `date`: data local de fallback em ISO, por exemplo `2027-10-07T20:00:00-03:00`.
- `status`: `completed`, `next`, `upcoming` ou `final`.
- `results`: ordem dos `id` dos jogadores na etapa. O primeiro é o campeão; a pontuação vem de `pointsByPosition`.
- `pastSeasons`: resumo das temporadas encerradas.
- `shop`: produtos e preços da loja.

> Os nomes e resultados atuais são **dados demonstrativos**. Não os publique como resultados oficiais sem atualizar `data.js`.

## Firebase

O site usa o **Realtime Database** do projeto `poker-de-quinta`, somente com leituras públicas e sem SDK externo. A configuração pública fica em **`js/firebase-config.js`**.

### Nós usados

| Nó | Uso |
| --- | --- |
| `/temporada2027` | datas e status das etapas da temporada 2027 (opcional, mas recomendado) |
| `/config` | etapa atual e status de inscrições usado na página de confirmação |
| `/fotosJogadores` | mapa `nome → URL da foto` usado para preencher os avatares |

O site **não lê** os nós com dados financeiros/Pix. Apenas os três caminhos acima são acessados.

### Como sincronizar as datas de 2027

Crie o nó `/temporada2027` no Realtime Database com esta estrutura:

```json
{
  "config": {
    "temporada": "2027",
    "proximaEtapa": 9,
    "inscricoesAbertas": true,
    "dataAbertura": "2027-10-04T10:00:00.000Z",
    "rankingUpdatedAfter": 8
  },
  "etapas": {
    "1": { "numero": 1, "data": "2027-02-04", "status": "completed" },
    "9": { "numero": 9, "data": "2027-10-07", "status": "next" }
  }
}
```

Há um modelo completo em [firebase/temporada-2027.example.json](firebase/temporada-2027.example.json). Você pode importá-lo pelo console do Firebase em **Realtime Database → Importar JSON**, dentro do nó `/temporada2027`.

Quando `/temporada2027` existe:

- as datas das etapas são sincronizadas;
- `proximaEtapa` define a próxima etapa e a contagem regressiva;
- `rankingUpdatedAfter` atualiza a etiqueta do ranking;
- status fornecidos em `etapas[].status` são respeitados.

Sem esse nó, o site usa as datas locais de `js/data.js`.

### `/config` e a confirmação

O nó `/config` do projeto atualmente aponta para a **12ª etapa de 2026**. Por isso a página de confirmação mostra a etapa vigente do sistema oficial, com data e status reais. O calendário editorial de 2027 continua usando `data.js` até que `/temporada2027` seja criado.

O site não escreve no Firebase. A confirmação efetiva continua sendo feita na página oficial já existente.

### Fotos dos jogadores

O mapa `/fotosJogadores` já contém URLs do repositório `pokerdequinta/fotos`. O site compara o nome normalizado do jogador em `data.js` com as chaves desse mapa. Exemplo:

```json
{
  "Amarildo": "https://github.com/pokerdequinta/fotos/blob/main/Amarildo.png?raw=true"
}
```

Se você usar nomes diferentes no site, preencha `photo` diretamente em `js/data.js` ou adicione:

```js
photoKey: "Amarildo",
```

para apontar para a chave correta.

## Página de confirmação de presença

A rota `#confirmar` exibe:

- etapa atual, data, abertura e status de inscrições vindos do Firebase;
- botão para abrir o sistema oficial;
- a página oficial `https://pokerdequinta.github.io/confirma/` embutida em um iframe;
- fallback visual quando o site está offline.

A página oficial continua sendo a fonte de escrita da lista de presença, lista de espera, cancelamentos e administração. O site novo não duplica essas regras para evitar conflito com o sistema que já está em uso.

O service worker **ignora todo o caminho `/confirma/`**. Isso é importante quando o site é publicado na raiz do mesmo domínio do GitHub Pages: o app novo não interfere no cache, nos scripts ou no Firebase da página oficial.

## Logo, favicon e compartilhamento

A logo oficial é **`logo pdq.png`** (na raiz). Ela é usada em:

- header, rodapé e menu lateral;
- cartas da página inicial, carta de trás, rei, rainha, cards de CTA e cartas do carrossel;
- favicon, Apple Touch Icon e ícones do PWA;
- imagem de compartilhamento Open Graph.

O arquivo **`assets/img/og-pdq.png`** é a imagem 1200 × 630 usada em `og:image` e `twitter:image`. Ela contém a logo oficial em destaque e é o preview exibido ao compartilhar o link.

### Se trocar a logo

1. Substitua `logo pdq.png` na raiz.
2. Regenere os ícones:

```bash
python tools/generate_icons.py
```

3. Regenere a imagem Open Graph:

```bash
chrome --headless=new --no-sandbox --hide-scrollbars \
  --window-size=1200,630 --default-background-color=1a2e1fff \
  --screenshot=assets/img/og-pdq.png tools/og.html
```

4. Incremente a versão no service worker.

## Personalização de links e domínio

Antes de publicar, revise:

- `site.whatsapp` em `js/data.js` (formato `55DDDNÚMERO`);
- Instagram e e-mail;
- endereço e link do Google Maps;
- domínio em `og:url`, `og:image`, `canonical`, JSON-LD, `sitemap.xml` e `robots.txt` — atualmente `https://pokerdequinta.github.io/`;
- textos institucionais, buy-in e regulamento.

## PWA

O manifest inclui nome, ícones 192/512, ícone maskable, screenshots e atalhos. O service worker usa:

1. **Navegação:** network-first com fallback para `index.html` e `offline.html`.
2. **Assets:** cache-first.
3. **Fontes:** stale-while-revalidate.

O Firebase usa cache em `localStorage` por 5 minutos; se a rede falhar, a última leitura é reaproveitada.

### Atualizações

Ao alterar arquivos do app, incremente `VERSION` no topo de `service-worker.js`. O site mostra um toast com a ação **Atualizar** quando uma nova versão estiver pronta.

### Como validar

1. Abra o site via `http://127.0.0.1:8099`.
2. No Chrome DevTools → Application:
   - confira o manifest em **Manifest**;
   - confira o service worker em **Service Workers**;
   - simule offline em **Network → Offline** e recarregue.
3. Use **Lighthouse → PWA/Installable**.
4. No celular, use “Adicionar à tela inicial” / “Instalar aplicativo”. Em iOS, o botão de instalação mostra instruções manuais quando o prompt nativo não existe.

## Geradores incluídos

### Calendário `.ics`

```bash
python tools/generate_calendar.py
```

Gera `assets/poker-de-quinta-2027.ics` com fuso `America/Sao_Paulo`, 12 eventos e alarme de 1 dia antes.

### Regulamento em PDF

```bash
chrome --headless=new --no-sandbox --no-pdf-header-footer \
  --print-to-pdf=assets/regulamento-poker-de-quinta-2027.pdf \
  --print-to-pdf-no-header tools/regulamento-print.html
```

No Windows, use o caminho completo do `chrome.exe`.

### Imagens

- `tools/generate_icons.py` gera todos os ícones PWA a partir de `logo pdq.png`.
- `tools/og.html` gera a imagem Open Graph `assets/img/og-pdq.png`.
- `tools/capture.mjs`, `tools/capture-extra.mjs`, `tools/test-pwa.mjs` e `tools/test-round2.mjs` são scripts de QA; exigem servidor local e Chrome com `--remote-debugging-port`.

## Acessibilidade e responsividade

- Estrutura semântica com `header`, `nav`, `main`, `section`, `footer`.
- Skip link, foco visível, teclado no carrossel e trap de foco em drawers/modais.
- `aria-expanded`, `aria-pressed`, `aria-current`, `aria-live` e rótulos descritivos.
- Modais fecham com `Esc`, clique no fundo e botão dedicado.
- Respeito a `prefers-reduced-motion`.
- Layout testado em larguras de 320 a 1440 px, sem overflow horizontal.
- Fotos com fallback de iniciais e `alt` vazio quando o nome já está no texto ao lado.

## Notas

- O site não processa pagamentos. A loja monta o pedido e abre o WhatsApp.
- O formulário de contato abre o WhatsApp com a mensagem validada.
- O mapa é ilustrativo e usa SVG local; o botão “Abrir no Google Maps” abre a rota real.
- A confirmação de presença depende de conexão com a internet e do sistema oficial.
- O projeto inclui avisos de **+18** e jogo responsável no rodapé, regulamento e modal dedicado.
- Nenhuma biblioteca de front-end, bundler ou framework é necessária.
