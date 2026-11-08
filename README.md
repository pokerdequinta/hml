# Poker de Quinta — Temporada 2027

Site oficial do circuito amador **Poker de Quinta** (Curitiba · desde 2015), com calendário, ranking, regulamento, histórico, confirmação de presença, loja e PWA instalável.

O visual e o CSS são os do projeto **hml2**. O ranking agora tem uma fonte única de dados (`js/ranking-data.js`) e uma ferramenta própria para lançar pontos (`admin.html`).

## O que mudou nesta versão

- **Ranking real e editável:** a classificação da Temporada 2026 foi importada do ranking oficial, com os pontos de cada etapa por jogador.
- **Controle do ranking:** `admin.html` permite escolher temporada/etapa, lançar pontos e KO, acompanhar a classificação em tempo real e baixar o `ranking-data.js` atualizado.
- **Sem `js/textos.js`:** os textos editoriais agora ficam direto no `index.html`. Não existe mais a camada de seletores que sobrescrevia o HTML.
- **Ranking por temporada:** abas 2027/2026 na página de ranking; a temporada padrão pode ser trocada pelo admin.
- **Tabela etapa por etapa:** cada coluna mostra os pontos do jogador naquela etapa, com troféu para o campeão, pontuação negativa em vermelho e total no fim.
- **Histórico calculado:** o Hall da Fama e o resumo das temporadas encerradas saem do próprio `ranking-data.js`.

## Se a página aparecer sem estilo

Isso significa que o `css/styles.css` não foi carregado. O motivo mais comum é abrir o `index.html` de dentro do ZIP ou copiar apenas o HTML, sem a pasta `css/`.

- Extraia o ZIP inteiro e abra o `index.html` de dentro da pasta extraída.
- A pasta precisa ter `index.html`, `css/`, `js/` e `assets/` no mesmo nível.
- No GitHub Pages, confirme que a pasta `css/` foi enviada.
- Leia também o **[COMECE-AQUI.txt](COMECE-AQUI.txt)**.

## Como rodar

O projeto é estático. Para testar o service worker e o modo offline, use HTTP:

```bash
python -m http.server 8099
```

Acesse **http://127.0.0.1:8099/**. Também funciona em GitHub Pages, Netlify, Vercel ou qualquer hospedagem estática.

## Estrutura

```text
.
├── index.html                  # site completo (SPA por hash)
├── admin.html                  # controle do ranking (ferramenta da organização)
├── css/
│   ├── styles.css              # design system + layout + ranking
│   └── admin.css               # estilos da ferramenta de ranking
├── js/
│   ├── ranking-data.js         # FONTE ÚNICA DO RANKING (jogadores, temporadas, pontos)
│   ├── admin-ranking.js        # lógica do controle do ranking
│   ├── data.js                 # conteúdo do site (etapas 2027, loja, textos de apoio)
│   ├── app.js                  # renderização e interações do site
│   ├── firebase-config.js      # configuração pública do Firebase
│   └── firebase-data.js        # leitura REST do Firebase + cache
├── assets/                     # ícones, imagens, PDF e calendário
├── manifest.webmanifest
├── service-worker.js
├── offline.html
├── robots.txt
└── sitemap.xml
```

## Acesso ao admin

Abra **`admin.html`** na pasta do projeto ou em `https://pokerdequinta.github.io/hml/admin.html` depois do deploy.

- **Senha:** `poker2027`
- A sessão fica ativa enquanto a aba estiver aberta. Use **Sair** para encerrar.
- A senha é uma trava de tela: fica no JavaScript e não é autenticação de servidor. A proteção real é o acesso ao repositório do GitHub.
- Para trocar a senha, edite `var PASSWORD = "poker2027";` no script de acesso no fim de `admin.html`.

Se a tela do admin aparecer com a trava e o painel juntos, o navegador/repositório está com o `admin.html` novo e o `css/admin.css`/`js/admin-ranking.js` antigos. Envie os três arquivos do ZIP, faça commit e recarregue com **Ctrl + F5**.

## Onde editar cada coisa

### Ranking (jogadores, temporadas e pontos)

A fonte oficial é **`js/ranking-data.js`**. O jeito mais seguro de editar é abrir **`admin.html`**, lançar os pontos e baixar o arquivo pronto. O passo a passo está em [COMO-ATUALIZAR-RANKING.md](COMO-ATUALIZAR-RANKING.md).

Resumo da estrutura:

```js
window.PQ_RANKING = {
  versao: 1,
  atualizadoEm: "2026-11-07",
  temporadaPadrao: 2026,
  jogadores: [
    { id: "sergio", nome: "Sergio", apelido: "Sergio", foto: "https://..." }
  ],
  temporadas: [
    {
      ano: 2026,
      nome: "Temporada 2026",
      encerrada: true,
      etapas: [
        { numero: 1, nome: "Etapa 01", data: "", campeao: "sergio", pontos: { sergio: 31 }, ko: {} }
      ]
    }
  ]
};
```

Regras rápidas:

- Quem **não jogou** a etapa fica **fora** do mapa `pontos`. Não use `0` para “não jogou”; `0` é uma pontuação válida.
- `campeao` é o id de quem venceu a etapa. Se ficar vazio, o site usa quem fez mais pontos.
- `ko` é opcional e soma na coluna KO.
- `temporadaPadrao` define qual temporada aparece primeiro no site.
- Para criar uma temporada nova, use o botão **+ Temporada** no admin.

### Textos do site

Não existe mais `js/textos.js`. Edite o texto **direto no `index.html`** (ou no `js/app.js`, quando o texto é gerado por código, como mensagens de modal e estados do ranking).

Para achar uma frase, use **Ctrl + F** no `index.html` pelo texto atual. O conteúdo de etapas, loja e configurações gerais fica em `js/data.js`.

### Fotos dos jogadores

A foto principal vem do campo `foto` em `js/ranking-data.js`. O site também tenta complementar pelo Firebase (`/fotosJogadores`). Se a foto estiver vazia ou falhar, aparecem as iniciais.

### Etapas e conteúdo editorial

`js/data.js` guarda as 13 etapas da Temporada 2027, textos de apoio, loja e configurações da casa. Os pontos do ranking **não** ficam aqui.

## Como o ranking é calculado

1. Cada etapa tem um mapa `jogador -> pontos` e, opcionalmente, `jogador -> KO`.
2. A pontuação total é a soma de todas as etapas com pontos lançados.
3. A ordem é: **pontos totais**, depois **etapas jogadas**, depois **vitórias de etapa**, depois **KO** e, por fim, nome.
4. O Top 20 é destacado como zona de classificação para a Grande Final.
5. A temporada com `encerrada: true` aparece no Hall da Fama e no Histórico.

## Publicar no GitHub Pages

1. Baixe o `ranking-data.js` pelo admin.
2. Substitua `js/ranking-data.js` no repositório.
3. Faça commit e envie para o GitHub.
4. Abra o site e force a atualização com **Ctrl + F5** (o service worker guarda a versão anterior).
5. Se mudou CSS/JS do site, incremente `VERSION` no topo de `service-worker.js`.

## Firebase

O site lê o Realtime Database público configurado em `js/firebase-config.js` (temporada, configuração ao vivo e fotos). O ranking **não depende** do Firebase: ele funciona com o `ranking-data.js`. Se o Firebase estiver indisponível, o site usa o cache local e os dados do arquivo.

## PWA

O `manifest.webmanifest` e o `service-worker.js` deixam o site instalável e com fallback offline. A ferramenta `admin.html` também é cacheada, mas não é indexada (`noindex`).

## Observações

- `admin.html` é uma ferramenta **local**: ela não grava no servidor. As alterações ficam em rascunho no navegador até você baixar e publicar o arquivo.
- O rascunho é salvo em `localStorage` com a chave `pq-ranking-draft-v1`.
- Os dados de 2026 foram importados do ranking oficial publicado em `pokerdequinta.github.io/ranking`.
