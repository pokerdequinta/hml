from pathlib import Path
from datetime import datetime, timedelta

stages = [
    (1, "2027-02-04", "A Mesa da Abertura", "Abertura da temporada 2027 do Poker de Quinta. 16 lugares, 30.000 fichas, níveis de 20 minutos."),
    (2, "2027-03-04", "Noite dos Ases", "Etapa 02 da temporada 2027. Uma noite dedicada aos ases, com estrutura deepstack."),
    (3, "2027-04-01", "O Clássico", "Etapa 03 da temporada 2027. O clássico da casa: campo profundo e blinds cadenciados."),
    (4, "2027-05-06", "A Virada", "Etapa 04 da temporada 2027. A noite das viradas: ninguém desiste até a última ficha."),
    (5, "2027-06-03", "Batida de Ouro", "Etapa 05 da temporada 2027. Edição especial com premiação extra para o melhor bluff."),
    (6, "2027-07-01", "Meia Temporada", "Etapa 06 da temporada 2027. Metade do caminho, ranking apertado."),
    (7, "2027-08-05", "Repique de Reis", "Etapa 07 da temporada 2027. Noite dos campeões, com bounty em dobro."),
    (8, "2027-09-02", "Noite de Instinto", "Etapa 08 da temporada 2027. Fichas voando, decisões em segundos e o teste definitivo de instinto."),
    (9, "2027-10-07", "Mesa dos Tubarões", "Etapa 09 da temporada 2027. A etapa mais seletiva do calendário: leitura afiada e cada decisão cobra o preço."),
    (10, "2027-11-04", "Clássico de Outono", "Etapa 10 da temporada 2027. Estrutura deepstack e jantar da casa para todos os jogadores."),
    (11, "2027-12-02", "Última Cartada", "Etapa 11 da temporada 2027. A penúltima chance de mudar o ranking antes da final."),
    (12, "2027-12-16", "Grande Final", "Grande Final da temporada 2027. Os 8 melhores da temporada disputam o título."),
]


def escape_ics(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\n", "\\n")
    )


def fold(line: str) -> list[str]:
    """RFC 5545 line folding at 73 octets, continuation starts with a space."""
    if len(line.encode("utf-8")) <= 73:
        return [line]
    out: list[str] = []
    current = ""
    for char in line:
        if len((current + char).encode("utf-8")) > 73:
            out.append(current)
            current = " " + char
        else:
            current += char
    if current:
        out.append(current)
    return out


lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Poker de Quinta//Temporada 2027//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Poker de Quinta — Temporada 2027",
    "X-WR-TIMEZONE:America/Sao_Paulo",
    "BEGIN:VTIMEZONE",
    "TZID:America/Sao_Paulo",
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:-0300",
    "TZOFFSETTO:-0300",
    "TZNAME:BRT",
    "END:STANDARD",
    "END:VTIMEZONE",
]

stamp = "20261030T190000Z"

for number, date, name, description in stages:
    start = datetime.fromisoformat(date + "T20:00:00")
    end = start + timedelta(hours=6)
    uid = f"etapa-{number:02d}-2027@pokerdequinta.com.br"
    summary = f"Poker de Quinta · Etapa {number:02d} — {name}"
    description_full = (
        description
        + " Buy-in: R$ 650. Casa Palmeira, Rua Harmonia, 321 — Vila Madalena, São Paulo."
    )
    lines += [
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{stamp}",
        f"DTSTART;TZID=America/Sao_Paulo:{start:%Y%m%dT%H%M%S}",
        f"DTEND;TZID=America/Sao_Paulo:{end:%Y%m%dT%H%M%S}",
        f"SUMMARY:{escape_ics(summary)}",
        f"DESCRIPTION:{escape_ics(description_full)}",
        "LOCATION:Casa Palmeira — Rua Harmonia\\, 321\\, Vila Madalena\\, São Paulo/SP",
        "STATUS:CONFIRMED",
        "TRANSP:OPAQUE",
        "BEGIN:VALARM",
        "TRIGGER:-P1D",
        "ACTION:DISPLAY",
        f"DESCRIPTION:{escape_ics('Amanhã tem ' + name + ' no Poker de Quinta.')}",
        "END:VALARM",
        "END:VEVENT",
    ]

lines.append("END:VCALENDAR")

output_lines: list[str] = []
for line in lines:
    output_lines.extend(fold(line))

content = "\r\n".join(output_lines) + "\r\n"
target = Path("assets/poker-de-quinta-2027.ics")
target.write_text(content, encoding="utf-8", newline="")
print(f"ICS gerado: {target} ({len(content)} bytes, {len(stages)} eventos)")
