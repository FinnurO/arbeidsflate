# Arbeidsflate med «Min oversikt»

Dette er en fork av [Altinn/dialogporten-frontend](https://github.com/Altinn/dialogporten-frontend) (Arbeidsflate)
med et konsept for **Min oversikt**: ett dashbord som viser en person det som gjelder dem og dem de handler for, på
tvers av livssituasjoner, og ett felles API som alle dashbordene leser fra.

Konseptet er en utforskning, ikke en del av Arbeidsflate. All data er oppdiktet.

**Prøv demoen:** https://finnuro.github.io/arbeidsflate/
**Les API-referansen:** https://finnuro.github.io/arbeidsflate/api/

## Familien i demoen

Nora Rahimi og Jonas Berg har sønnen Amir (12) og driver restauranten Lykke Bistro AS. Noras far, Reza Rahimi,
døde nylig. Samme person står da i tre livssituasjoner på én gang, og de påvirker hverandre:

- Reza var stedfortreder for restaurantens skjenkebevilling, så bevillingen mangler nå stedfortreder.
- Dødsboet eier 20 % av aksjene i restauranten.
- Skolen kan følge Amir opp ekstra, hvis Nora sier ja til å dele at bestefaren er død.

| Logg inn som | Lenke | Ser |
|---|---|---|
| Nora | [?playwrightId=rahimi-berg](https://finnuro.github.io/arbeidsflate/oversikt?mock=true&playwrightId=rahimi-berg) | seg selv, Amir (foresatt), Lykke Bistro AS (daglig leder) og dødsboet (arving) |
| Amir | [?playwrightId=rahimi-berg-amir](https://finnuro.github.io/arbeidsflate/oversikt?mock=true&playwrightId=rahimi-berg-amir) | bare seg selv, med tekst tilpasset ham og det foreldrene ikke ser |

## Hva konseptet viser

- **Én mal for alle livssituasjoner.** Skole, virksomhet og dødsbo vises av samme generiske dashbord. Bare dataene
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
