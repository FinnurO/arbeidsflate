# Arbeidsflate med «Min oversikt»

Dette er en fork av [Altinn/dialogporten-frontend](https://github.com/Altinn/dialogporten-frontend) (Arbeidsflate)
med et konsept for **Min oversikt**: ett dashbord som viser en person det som gjelder dem og dem de handler for, på
tvers av livssituasjoner, og ett felles API som alle dashbordene leser fra.

Konseptet er en utforskning, ikke en del av Arbeidsflate. All data er oppdiktet.

- **Prøv demoen:** https://finnuro.github.io/arbeidsflate/
- **Les API-referansen:** https://finnuro.github.io/arbeidsflate/api/
- **Møt familien:** https://finnuro.github.io/arbeidsflate/docs/?side=familien ([i repoet](../packages/oversikt-api/docs/familien.md))
- **Se arkitekturen:** https://finnuro.github.io/arbeidsflate/docs/?side=arkitektur ([i repoet](../packages/oversikt-api/docs/arkitektur.md))

## Familien i demoen

Nora Rahimi og Jonas Berg har barna Amir (12) og Lea (5) og driver restauranten Lykke Bistro AS. Lea er alvorlig
syk og følges av barneavdelingen på sykehuset. Noras far, Reza Rahimi, døde nylig, og moren hennes, Parvin (78),
begynner å trenge hjelp i hverdagen og har gitt Nora fullmakt. Samme person står da i fem livssituasjoner på én
gang, og de påvirker hverandre:

- Reza var stedfortreder for restaurantens skjenkebevilling, så bevillingen mangler nå stedfortreder.
- Dødsboet eier 20 % av aksjene i restauranten.
- Nora er ansatt i eget AS, så restauranten må sende inntektsmeldingen før Nav kan behandle pleiepengene for Lea.
- Amir er søsken til et alvorlig sykt barn og har mistet bestefaren. Skolen kan følge ham opp hvis Nora sier ja.
- Parvin bor i boligen som er i dødsboet, og Nora er nå pårørende for både Lea og moren sin.

Personas for hver av dem står i [familien.md](../packages/oversikt-api/docs/familien.md).

### Alvorlig sykt barn

Foreldre til barn med sammensatte behov bruker i snitt 19 timer i uka (median 10) på å lete etter informasjon,
søke, klage og koordinere tjenester, ifølge Helsedirektoratets nullpunktsmåling fra 2021. Leas oversikt viser hvordan
én oversikt kan ta bort noe av det:

- Alle saker hos Nav, kommunen, sykehuset og barnehagen på ett sted, med frister.
- Gjenbruk: én legeerklæring brukes i flere søknader, og pleiepengesiden viser hva Nav allerede vet.
- Fast kontaktpunkt: barnekoordinatoren og teamet rundt Lea øverst.
- Vedtak mot levert («6 av 12 timer avlastning levert i november») og klageveiledning ved avslag.
- Rettigheter foreslått ut fra situasjonen, i stedet for at foreldrene må lete.

Diagnosen står ikke i dataene. Tjenestene trenger bare å vite at Lea følges av spesialisthelsetjenesten.

| Logg inn som | Lenke | Ser |
|---|---|---|
| Nora | [?playwrightId=rahimi-berg](https://finnuro.github.io/arbeidsflate/oversikt?mock=true&playwrightId=rahimi-berg) | seg selv, Amir og Lea (foresatt), Lykke Bistro AS (daglig leder), Parvin (fullmektig) og dødsboet (arving) |
| Amir | [?playwrightId=rahimi-berg-amir](https://finnuro.github.io/arbeidsflate/oversikt?mock=true&playwrightId=rahimi-berg-amir) | bare seg selv, med tekst tilpasset ham og det foreldrene ikke ser |

## Hva konseptet viser

- **Én mal for alle livssituasjoner.** Skole, virksomhet, dødsbo, alvorlig sykt barn og hjelp i
  hverdagen vises av samme generiske dashbord. Bare dataene
  er forskjellige.
- **Sammenhenger på tvers.** Den samlede oversikten viser hvordan livssituasjonene påvirker hverandre.
- **Opplysninger med kilde.** Hvert kort sier hvem som eier opplysningen og når den ble hentet, og siden sier fra
  når en kilde ikke svarer.
- **Gjenbruk i stedet for skjema.** Stegene viser hvilke opplysninger som er gjenbrukt, og tjenestesiden viser
  «Dette vet vi allerede».
- **Roller styrer hva som vises.** Foresatte og barnet ser ulike utsnitt av samme data, og barnet får enklere tekst.
- **Oppgaver og meldinger fra Dialogporten.** Oversikten peker til dialogene i innboksen i stedet for å lage egne.
- **Tjenestekatalogen som kilde.** Tjenestesiden viser hvilke felt Felles datakatalog har i dag, og hvilke som
  mangler for at konseptet skal virke.

## Hvor ting ligger

| Hva | Hvor |
|---|---|
| Oversikt-API: kontrakt, skjemaer, mockdata, validering | [`packages/oversikt-api`](../packages/oversikt-api) |
| Familien og personas | [`packages/oversikt-api/docs/familien.md`](../packages/oversikt-api/docs/familien.md) |
| Arkitektur og byggeklosser: lag, Felles datakatalog, utvidelse, hull | [`packages/oversikt-api/docs/arkitektur.md`](../packages/oversikt-api/docs/arkitektur.md) |
| API-guide: begreper, flyt, eksempler, nye domener | [`packages/oversikt-api/docs/guide.md`](../packages/oversikt-api/docs/guide.md) |
| Kontrakten (OpenAPI 3.1) | [`packages/oversikt-api/openapi.yaml`](../packages/oversikt-api/openapi.yaml) |
| Dashbordene i Arbeidsflate | [`packages/frontend/src/pages/Oversikt`](../packages/frontend/src/pages/Oversikt) |
| Mock av Oversikt-API og mockhistoriene | [`packages/frontend/src/mocks/oversikt`](../packages/frontend/src/mocks/oversikt), `mocks/data/stories/rahimi-berg*` |
| Statisk bygg for GitHub Pages | [`packages/frontend/vite/pagesStaticMock.ts`](../packages/frontend/vite/pagesStaticMock.ts), [`.github/workflows/pages-oversikt.yml`](workflows/pages-oversikt.yml) |

## Kjøre lokalt

Krever Node (repoet ber om 26, 24 fungerer med en advarsel) og pnpm via `corepack`.

1. `corepack pnpm install`
2. `corepack pnpm --filter frontend dev` og åpne `http://localhost:5173/?mock=true&playwrightId=rahimi-berg`.
   Velg «Min oversikt» i menyen.
3. Mockdataene redigeres i en egen app: `corepack pnpm --filter oversikt-api editor`, http://127.0.0.1:5391.
4. Kontrollér kontrakt og data: `corepack pnpm --filter oversikt-api validate`.

## Publisere demoen

`corepack pnpm --filter frontend build:pages` og `corepack pnpm --filter oversikt-api docs` lager det statiske
bygget og API-referansen. Arbeidsflyten `pages-oversikt.yml` gjør begge deler og publiserer dem, men krever at
Actions er slått på i forken. Til nå er demoen publisert ved å legge bygget på grenen `gh-pages`.

## Upstream

Alt utenfor de stedene som er nevnt over, er Arbeidsflate slik den er i Altinn. Se [Readme.md](../Readme.md) for
dokumentasjonen derfra.
