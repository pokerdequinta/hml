/* ============================================================
   RANKING — POKER DE QUINTA
   ------------------------------------------------------------
   ESTE É O ÚNICO ARQUIVO QUE VOCÊ PRECISA EDITAR PARA ATUALIZAR
   O RANKING. Prefira usar admin.html: ele monta este arquivo
   para você e baixa pronto para substituir esta versão.

   Estrutura:
   - jogadores: quem aparece no ranking.
   - temporadas: uma entrada por ano. Em cada etapa, "pontos" é
     um mapa jogador -> pontos. Quem não jogou fica de fora
     (não use zero; zero é uma pontuação válida).
   - campeao: id do jogador que venceu a etapa (opcional; se
     ficar vazio, o site usa quem fez mais pontos).
   - ko: mapa jogador -> pontos de KO (opcional).
   ============================================================ */

window.PQ_RANKING = {
  "versao": 1,
  "atualizadoEm": "2026-11-07",
  "temporadaPadrao": 2026,
  "jogadores": [
    {
      "id": "sergio",
      "nome": "Sergio",
      "apelido": "Sergio",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Sergio.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "gaspar",
      "nome": "Gaspar",
      "apelido": "Gaspar",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Gaspar.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "cleversson",
      "nome": "Cleversson",
      "apelido": "Cleversson",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Cleversson.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "robson",
      "nome": "Robson",
      "apelido": "Robson",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Robson.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "loreto",
      "nome": "Loreto",
      "apelido": "Loreto",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Loreto.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "solano",
      "nome": "Solano",
      "apelido": "Solano",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Solano.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "jean",
      "nome": "Jean",
      "apelido": "Jean",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Jean.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "van-van",
      "nome": "Van Van",
      "apelido": "Van",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Van%20Van.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "neto",
      "nome": "Neto",
      "apelido": "Neto",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Neto.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "matheus",
      "nome": "Matheus",
      "apelido": "Matheus",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Matheus.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "ricardo-matoso",
      "nome": "Ricardo Matoso",
      "apelido": "Ricardo",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/R%20Matoso.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "maykon",
      "nome": "Maykon",
      "apelido": "Maykon",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Maykon.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "guti",
      "nome": "Guti",
      "apelido": "Guti",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Guti.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "rafael",
      "nome": "Rafael",
      "apelido": "Rafael",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Rafael.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "izidio",
      "nome": "Izidio",
      "apelido": "Izidio",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Izidio.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "diego",
      "nome": "Diego",
      "apelido": "Diego",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Diego.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "jean-rebuy",
      "nome": "Jean Rebuy",
      "apelido": "Jean",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Jean%20Rebuy.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "buiu",
      "nome": "Buiu",
      "apelido": "Buiu",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/buiu.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "ricardo-linhares",
      "nome": "Ricardo Linhares",
      "apelido": "Ricardo",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/R%20Linhares.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "amarildo",
      "nome": "Amarildo",
      "apelido": "Amarildo",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Amarildo.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "daniel",
      "nome": "Daniel",
      "apelido": "Daniel",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Daniel.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "boy",
      "nome": "Boy",
      "apelido": "Boy",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Boy.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "marcelo",
      "nome": "Marcelo",
      "apelido": "Marcelo",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Marcelo.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "gera",
      "nome": "Gera",
      "apelido": "Gera",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/gera.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "ricardo-amarante",
      "nome": "Ricardo Amarante",
      "apelido": "Ricardo",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/R%20Amarante.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "tonimar",
      "nome": "Tonimar",
      "apelido": "Tonimar",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Tonimar.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "tigre",
      "nome": "Tigre",
      "apelido": "Tigre",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Tigre.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "dos-anjos",
      "nome": "Dos Anjos",
      "apelido": "Dos",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Dos%20Anjos.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "michel",
      "nome": "Michel",
      "apelido": "Michel",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Michel.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "roberto",
      "nome": "Roberto",
      "apelido": "Roberto",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Roberto.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "matheus-cunha",
      "nome": "Matheus Cunha",
      "apelido": "Matheus",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Matheus%20Cunha.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "rafael-rosa",
      "nome": "Rafael Rosa",
      "apelido": "Rafael",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Rafael%20Rosa.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "junior",
      "nome": "Junior",
      "apelido": "Junior",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Junior.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "deko",
      "nome": "Deko",
      "apelido": "Deko",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Deko.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "denir",
      "nome": "Denir",
      "apelido": "Denir",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Denir.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "gregory",
      "nome": "Gregory",
      "apelido": "Gregory",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/Gregory.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    },
    {
      "id": "kastelo",
      "nome": "Kastelo",
      "apelido": "Kastelo",
      "foto": "https://github.com/pokerdequinta/fotos/blob/main/kastelo.png?raw=true",
      "cidade": "",
      "uf": "",
      "desde": null,
      "bio": "",
      "melhor": ""
    }
  ],
  "temporadas": [
    {
      "ano": 2026,
      "nome": "Temporada 2026",
      "encerrada": true,
      "etapas": [
        {
          "numero": 1,
          "nome": "Etapa 01",
          "data": "",
          "campeao": "sergio",
          "pontos": {
            "sergio": 31,
            "gaspar": 5,
            "cleversson": 5,
            "robson": 26,
            "solano": 28,
            "jean": 5,
            "van-van": 13,
            "neto": 22,
            "matheus": 20,
            "ricardo-matoso": 7,
            "maykon": 11,
            "guti": 5,
            "izidio": 9,
            "jean-rebuy": 5,
            "ricardo-linhares": 5,
            "amarildo": 22,
            "boy": 7,
            "ricardo-amarante": 5,
            "dos-anjos": 17,
            "kastelo": 5
          },
          "ko": {}
        },
        {
          "numero": 2,
          "nome": "Etapa 02",
          "data": "",
          "campeao": "loreto",
          "pontos": {
            "sergio": 28,
            "gaspar": 5,
            "cleversson": 23,
            "robson": 20,
            "loreto": 33,
            "solano": 18,
            "jean": 19,
            "van-van": 5,
            "neto": 5,
            "ricardo-matoso": 6,
            "maykon": 25,
            "guti": 5,
            "izidio": 6,
            "jean-rebuy": 8,
            "ricardo-linhares": 12,
            "amarildo": 5,
            "boy": 13,
            "gera": 5,
            "ricardo-amarante": 5,
            "kastelo": 9
          },
          "ko": {}
        },
        {
          "numero": 3,
          "nome": "Etapa 03",
          "data": "",
          "campeao": "neto",
          "pontos": {
            "sergio": 7,
            "gaspar": 5,
            "cleversson": 5,
            "robson": 31,
            "loreto": 23,
            "solano": 24,
            "jean": 5,
            "van-van": 23,
            "neto": 31,
            "matheus": 18,
            "ricardo-matoso": 9,
            "maykon": 5,
            "guti": 5,
            "rafael": 5,
            "izidio": 8,
            "jean-rebuy": 13,
            "ricardo-linhares": 5,
            "boy": 11,
            "marcelo": 16,
            "kastelo": -90
          },
          "ko": {}
        },
        {
          "numero": 4,
          "nome": "Etapa 04",
          "data": "",
          "campeao": "sergio",
          "pontos": {
            "sergio": 31,
            "gaspar": 7,
            "cleversson": 5,
            "robson": 13,
            "loreto": 18,
            "jean": 28,
            "van-van": 19,
            "neto": 22,
            "matheus": 5,
            "ricardo-matoso": 9,
            "maykon": 5,
            "guti": 27,
            "rafael": 5,
            "izidio": 5,
            "diego": 7,
            "jean-rebuy": 14,
            "buiu": 5,
            "ricardo-linhares": 5,
            "ricardo-amarante": 5,
            "tigre": 19
          },
          "ko": {}
        },
        {
          "numero": 5,
          "nome": "Etapa 05",
          "data": "",
          "campeao": "rafael",
          "pontos": {
            "sergio": 22,
            "gaspar": 6,
            "cleversson": 20,
            "robson": 5,
            "loreto": 7,
            "jean": 15,
            "van-van": 14,
            "neto": 16,
            "matheus": 18,
            "ricardo-matoso": 28,
            "maykon": 5,
            "guti": 5,
            "rafael": 33,
            "izidio": 5,
            "diego": 27,
            "jean-rebuy": 5,
            "buiu": 11,
            "ricardo-linhares": 5,
            "amarildo": 5,
            "ricardo-amarante": 5
          },
          "ko": {}
        },
        {
          "numero": 6,
          "nome": "Etapa 06",
          "data": "",
          "campeao": "gaspar",
          "pontos": {
            "sergio": 5,
            "gaspar": 32,
            "cleversson": 28,
            "robson": 5,
            "loreto": 5,
            "solano": 22,
            "jean": 7,
            "van-van": 5,
            "neto": 6,
            "matheus": 15,
            "ricardo-matoso": 21,
            "maykon": 20,
            "guti": 9,
            "rafael": 12,
            "izidio": 6,
            "diego": 27,
            "buiu": 15,
            "ricardo-linhares": 5,
            "gera": 5,
            "ricardo-amarante": 5
          },
          "ko": {}
        },
        {
          "numero": 7,
          "nome": "Etapa 07",
          "data": "",
          "campeao": "sergio",
          "pontos": {
            "sergio": 34,
            "gaspar": 15,
            "cleversson": 5,
            "robson": 27,
            "loreto": 21,
            "solano": 19,
            "jean": 5,
            "van-van": 6,
            "matheus": 9,
            "ricardo-matoso": 26,
            "maykon": 5,
            "guti": 7,
            "rafael": 5,
            "izidio": 5,
            "diego": 5,
            "jean-rebuy": 16,
            "daniel": 13,
            "gera": 5,
            "tonimar": 21,
            "deko": 5
          },
          "ko": {}
        },
        {
          "numero": 8,
          "nome": "Etapa 08",
          "data": "",
          "campeao": "jean",
          "pontos": {
            "sergio": 5,
            "gaspar": 13,
            "cleversson": 29,
            "robson": 6,
            "loreto": 22,
            "solano": 9,
            "jean": 32,
            "van-van": 16,
            "neto": 5,
            "matheus": 5,
            "ricardo-matoso": 5,
            "maykon": 5,
            "guti": 12,
            "rafael": 25,
            "izidio": 19,
            "jean-rebuy": 8,
            "buiu": 23,
            "marcelo": 5,
            "denir": 5,
            "gregory": 5
          },
          "ko": {}
        },
        {
          "numero": 9,
          "nome": "Etapa 09",
          "data": "",
          "campeao": "cleversson",
          "pontos": {
            "sergio": 5,
            "gaspar": 22,
            "cleversson": 31,
            "robson": 11,
            "loreto": 16,
            "solano": 29,
            "van-van": 17,
            "neto": 7,
            "matheus": 26,
            "ricardo-matoso": 5,
            "maykon": 14,
            "rafael": 6,
            "izidio": 21,
            "diego": 5,
            "jean-rebuy": 8,
            "ricardo-linhares": 5,
            "daniel": 5,
            "roberto": 11,
            "matheus-cunha": 5,
            "rafael-rosa": 5
          },
          "ko": {}
        },
        {
          "numero": 10,
          "nome": "Etapa 10",
          "data": "",
          "campeao": "gaspar",
          "pontos": {
            "sergio": 28,
            "gaspar": 38,
            "cleversson": 22,
            "robson": 17,
            "loreto": 5,
            "solano": 5,
            "jean": 25,
            "van-van": 12,
            "neto": 15,
            "matheus": 7,
            "ricardo-matoso": 5,
            "guti": 22,
            "rafael": 5,
            "izidio": 5,
            "diego": 13,
            "ricardo-linhares": 10,
            "gera": 5,
            "matheus-cunha": 5,
            "junior": 6
          },
          "ko": {}
        },
        {
          "numero": 11,
          "nome": "Etapa 11",
          "data": "",
          "campeao": "gaspar",
          "pontos": {
            "sergio": 26,
            "gaspar": 33,
            "cleversson": 7,
            "robson": 16,
            "loreto": 14,
            "jean": 6,
            "van-van": 5,
            "neto": 5,
            "matheus": 5,
            "maykon": 17,
            "guti": 5,
            "jean-rebuy": 5,
            "buiu": 22,
            "ricardo-linhares": 10,
            "amarildo": 27,
            "daniel": 25,
            "marcelo": 5,
            "gera": 5,
            "michel": 11,
            "rafael-rosa": 5
          },
          "ko": {}
        },
        {
          "numero": 12,
          "nome": "Etapa 12",
          "data": "",
          "campeao": "",
          "pontos": {},
          "ko": {}
        }
      ]
    },
    {
      "ano": 2027,
      "nome": "Temporada 2027",
      "encerrada": false,
      "etapas": [
        {
          "numero": 1,
          "nome": "A Mesa da Abertura",
          "data": "2027-01-28",
          "campeao": "",
          "pontos": {},
          "ko": {}
        },
        {
          "numero": 2,
          "nome": "Noite dos Ases",
          "data": "2027-02-25",
          "campeao": "",
          "pontos": {},
          "ko": {}
        },
        {
          "numero": 3,
          "nome": "O Clássico",
          "data": "2027-03-25",
          "campeao": "",
          "pontos": {},
          "ko": {}
        },
        {
          "numero": 4,
          "nome": "A Virada",
          "data": "2027-04-29",
          "campeao": "",
          "pontos": {},
          "ko": {}
        },
        {
          "numero": 5,
          "nome": "Batida de Ouro",
          "data": "2027-05-20",
          "campeao": "",
          "pontos": {},
          "ko": {}
        },
        {
          "numero": 6,
          "nome": "Meia Temporada",
          "data": "2027-06-24",
          "campeao": "",
          "pontos": {},
          "ko": {}
        },
        {
          "numero": 7,
          "nome": "Repique de Reis",
          "data": "2027-07-29",
          "campeao": "",
          "pontos": {},
          "ko": {}
        },
        {
          "numero": 8,
          "nome": "Noite de Instinto",
          "data": "2027-08-26",
          "campeao": "",
          "pontos": {},
          "ko": {}
        },
        {
          "numero": 9,
          "nome": "Mesa dos Tubarões",
          "data": "2027-09-30",
          "campeao": "",
          "pontos": {},
          "ko": {}
        },
        {
          "numero": 10,
          "nome": "Clássico de Outono",
          "data": "2027-10-14",
          "campeao": "",
          "pontos": {},
          "ko": {}
        },
        {
          "numero": 11,
          "nome": "Última Cartada",
          "data": "2027-10-28",
          "campeao": "",
          "pontos": {},
          "ko": {}
        },
        {
          "numero": 12,
          "nome": "Penúltima Etapa",
          "data": "2027-11-25",
          "campeao": "",
          "pontos": {},
          "ko": {}
        },
        {
          "numero": 13,
          "nome": "Grande Final",
          "data": "2027-12-09",
          "campeao": "",
          "pontos": {},
          "ko": {}
        }
      ]
    }
  ]
};
