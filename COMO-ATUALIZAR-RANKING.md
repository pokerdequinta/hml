# Como atualizar o ranking

O ranking do site é lido de **um único arquivo**: `js/ranking-data.js`. Você pode editá-lo à mão, mas o caminho mais fácil é usar a ferramenta **`admin.html`**.

## Caminho rápido (recomendado)

1. Abra **`admin.html`** no navegador (no seu computador ou no site publicado).
2. Escolha a **temporada** e a **etapa** nos seletores.
3. Preencha os **pontos** de cada jogador que participou. Deixe em branco quem não jogou.
4. Confira o **Ranking ao vivo** na lateral.
5. Clique em **Baixar ranking-data.js**.
6. No repositório do GitHub, substitua `js/ranking-data.js` pelo arquivo baixado.
7. Faça commit e envie. No site, use **Ctrl + F5** para atualizar.

Pronto. O site recalcula o ranking sozinho: soma os pontos de todas as etapas, ordena, monta o pódio, a tabela e o Hall da Fama.

> A ferramenta não grava no servidor. Ela salva um rascunho no seu navegador e gera o arquivo para você publicar. É por isso que o passo 6 existe.

## Lançar uma etapa da temporada 2027

1. Em `admin.html`, selecione **2027**.
2. Selecione a etapa (a primeira sem pontos já vem aberta).
3. Preencha os pontos. Exemplo:

| Jogador | Pontos | KO |
| --- | ---: | ---: |
| Sergio | 31 | 2 |
| Gaspar | 28 | 1 |
| Cleversson | 22 | 0 |
| Robson | 5 | 0 |

4. O campo **KO** é opcional. Ele aparece na coluna KO do site e entra no desempate.
5. Ao terminar, clique em **Baixar ranking-data.js** e publique.

Se você lançar a primeira etapa de 2027 e quiser que 2027 vire a temporada principal do site, clique em **Usar como temporada padrão do site** e baixe o arquivo.

## Como os pontos entram no arquivo

Cada etapa tem um mapa `pontos` com o **id** do jogador e o valor. Quem não jogou fica de fora:

```js
{
  numero: 1,
  nome: "Etapa 01",
  data: "2027-01-28",
  campeao: "sergio",
  pontos: {
    sergio: 31,
    gaspar: 28,
    cleversson: 22,
    robson: 5
  },
  ko: {
    sergio: 2,
    gaspar: 1
  }
}
```

- **Não use `0` para “não jogou”.** Deixe a chave fora do mapa. `0` é uma pontuação válida e conta como etapa jogada.
- **Penalidades:** use números negativos, por exemplo `kastelo: -90`.
- **Campeão:** o campo `campeao` recebe o `id` de quem venceu. O admin preenche isso automaticamente com quem fez mais pontos; se houver empate ou uma regra especial, você pode ajustar no arquivo.
- **Etapa sem pontos:** deixe `pontos: {}`. O site mostra a coluna vazia e não soma nada.

## Criar uma temporada nova

No admin:

1. Clique em **+ Temporada**.
2. Informe o ano (ex.: `2028`) e o número de etapas (ex.: `13`).
3. A temporada é criada com todas as etapas vazias.
4. Lance os pontos normalmente.
5. Quando a temporada terminar, marque **Temporada encerrada**. Ela passa a aparecer no Hall da Fama e no Histórico.
6. Use **Usar como temporada padrão do site** para que ela seja a primeira exibida.

## Cadastrar um jogador novo

1. Abra a seção **Jogadores** em `admin.html`.
2. Preencha nome e, se quiser, a URL da foto.
3. Clique em **Adicionar jogador**.
4. O jogador passa a aparecer na lista de lançamento de todas as temporadas.

O `id` é gerado a partir do nome (sem acentos e em minúsculas). Se você renomear o jogador depois, o `id` continua o mesmo — os pontos já lançados não se perdem.

## Editar direto no `js/ranking-data.js`

Se preferir, edite o arquivo manualmente. A estrutura é:

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
        {
          numero: 1,
          nome: "Etapa 01",
          data: "2026-02-05",
          campeao: "sergio",
          pontos: { sergio: 31, gaspar: 28 },
          ko: { sergio: 2 }
        }
      ]
    }
  ]
};
```

Depois de editar, valide abrindo o site e conferindo:
- a aba da temporada aparece;
- o total do jogador confere com a soma das etapas;
- o pódio e o Hall da Fama atualizaram.

## Publicar no GitHub Pages

1. Baixe o `ranking-data.js` no admin.
2. No GitHub, abra `js/ranking-data.js` → **Edit** → cole o conteúdo novo (ou faça upload do arquivo).
3. Commit em `main`.
4. Aguarde o GitHub Pages publicar (1–2 minutos).
5. Abra o site com **Ctrl + F5**.

Se o site continuar mostrando o ranking antigo, o service worker pode estar com o cache anterior. Force a atualização com **Ctrl + Shift + R** ou limpe os dados do site nas configurações do navegador.

## Problemas comuns

**O jogador não aparece no ranking.**
Confira se o `id` dele no mapa `pontos` é exatamente o mesmo do cadastro em `jogadores`. O admin faz isso automaticamente.

**O total não confere.**
Veja se alguma etapa ficou com pontos em uma temporada errada ou se você usou `0` para quem não jogou. No admin, o **Ranking ao vivo** mostra a soma em tempo real.

**A temporada 2027 aparece vazia.**
É esperado enquanto nenhuma etapa de 2027 tiver pontos. A temporada 2026 continua disponível na aba dela. Depois da primeira etapa, use **Usar como temporada padrão** para 2027 virar a principal.

**O arquivo não baixa.**
Alguns navegadores bloqueiam downloads automáticos. Permita downloads para o site e use o botão **Baixar ranking-data.js**. O botão **Baixar JSON** serve apenas como backup; para publicar, o arquivo precisa da linha `window.PQ_RANKING = ...`.

**Perdi as alterações.**
O admin salva rascunho no navegador. Ao reabrir, aparece o aviso para **Restaurar rascunho**. Se você limpou os dados do navegador, o rascunho foi perdido; refaça o lançamento.

## Regras de cálculo

- Total = soma dos pontos de todas as etapas com pontos lançados.
- Ordem: pontos ↓, etapas jogadas ↓, vitórias de etapa ↓, KO ↓, nome ↑.
- Top 20 = zona de classificação para a Grande Final.
- O campeão da etapa é quem tem mais pontos; o campo `campeao` pode ser ajustado manualmente.
- O Hall da Fama usa o líder da temporada marcada como `encerrada: true`.

