# Oversikt-API

Felles API for «Min oversikt»-dashbordene i Arbeidsflate: ett dashbord for alle livssituasjoner, der
innholdet kommer fra én domeneuavhengig kontrakt. Status: konsept med mockdata.

## Innhold

| Sti | Hva |
|---|---|
| `openapi.yaml` | Kontrakten (OpenAPI 3.1), base `/api/oversikt/v1` |
| `schemas/kjerne.schema.json` | Kjernetypene: aktør, tilgang med hjemmel, livssituasjon/fase/steg, opplysning med kilde, tjenesteforslag, sammenheng |
| `schemas/domener/*.schema.json` | Én fil per domene (skole, virksomhet, dødsbo). Hver `$defs`-oppføring er én opplysningstype |
| `schemas/kildedata.schema.json` | Formatet til filene i `data/` |
| `data/` | Mockdata for familien Rahimi Berg |
| `src/sammenstill.ts` | Setter sammen API-svarene og filtrerer etter den innloggedes rolle |
| `scripts/validate.mjs` | Validerer kontrakt, data og alle API-svar mocken kan gi |
| `editor/`, `scripts/editor-server.mjs` | Redigeringsapp for mockdataene |

## Prinsipper

- **Kjernen kjenner ikke domenene.** En `Opplysning` har visningsfelt (tittel, hovedverdi, beskrivelse, merknad,
  kilde med hentet-tidspunkt) som er nok til å tegne et kort, og `domene` + `data` for detaljene.
- **Nytt domene = ny skjemafil.** Legg en fil i `schemas/domener/`. `GET /domener` og redigeringsappen finner
  typene automatisk. Kjernen og dashbordet endres ikke.
- **Oppgaver og meldinger er dialoger i Dialogporten.** Oversikt-API peker bare til dem (`dialogId`) og knytter
  dem til livssituasjon og steg. Tittel, status og frist hentes fra Dialogporten.
- **Rollen styrer hva som vises.** `synligFor` på steg, opplysninger, tjenesteforslag og dialogreferanser angir
  hvilke roller som ser elementet. Mangler feltet, ser alle med tilgang det. Slik ser Amir helsesamtalen, mens
  foresatte ikke gjør det.
- **Aktør-id er party-URN** som i Altinn, så aktørvelgeren i Arbeidsflate og oversikten henger sammen.
- **Tekst kan tilpasses rollen.** `Opplysning.rolletekster` gir for eksempel enklere tekst når barnet selv ser
  kortet. Tjenesten bytter inn teksten og fjerner feltet i svaret.
- **Det personlige ligger i aktørens oversikt, ikke i katalogen.** `GET /aktorer/{id}/tjenester/{tjenesteId}`
  gir tjenesten vurdert for aktøren: status, hva som allerede er kjent (med kilde) og hva som må gjøres.
- **Oversikten sier også hva den ikke vet.** `kildestatus` viser kilder som ikke svarte, `lagresTil` når
  opplysningene slettes, og `involverte` andre parter (for eksempel medarvinger som må signere).

## Kjøre

Fra rotmappen i repoet (pnpm via `corepack pnpm` hvis pnpm ikke er på PATH):

- Validere: `pnpm --filter oversikt-api validate`
- Redigeringsapp: `pnpm --filter oversikt-api editor`, åpne http://127.0.0.1:5391
- Dashbordene: `pnpm --filter frontend dev`, åpne `/?mock=true&playwrightId=rahimi-berg` (Nora) eller
  `/?mock=true&playwrightId=rahimi-berg-amir` (Amir), og velg «Min oversikt» i menyen. Gå inn via forsiden;
  direkte lasting av en underside med mock kan gi blank side.

Arbeidsflate-mocken leser `data/` direkte (`packages/frontend/src/mocks/oversikt`), også profil, parties og
dialoger for de to mockhistoriene. Endringer i redigeringsappen vises etter at siden lastes på nytt.

## GitHub Pages

`pnpm --filter frontend build:pages` lager et statisk mock-bygg (`vite build --mode pages`,
`packages/frontend/vite/pagesStaticMock.ts`): MSW er alltid på, appen ligger under `/<repo>/`, Nora er valgt
når adressen ikke sier noe annet, og `404.html` gjør at direkte lenker til undersider virker. Vanlige bygg
påvirkes ikke.

Publisering skjer med arbeidsflyten `.github/workflows/pages-oversikt.yml`, som bare kjøres manuelt. Slå først på
GitHub Pages i repoinnstillingene med kilde «GitHub Actions». Demoen blir da offentlig tilgjengelig, med de
oppdiktede dataene i `data/`. Bytt bruker med `?playwrightId=rahimi-berg-amir`.

## Kjente hull

- Tjenestekatalogen i Felles datakatalog har i dag ingen livshendelser, krav, resultater eller relasjoner mellom
  tjenester. Tjenesteinnholdet her er derfor modellert for hånd, og `katalogdekning` viser hva som mangler.
- Skjema-id-ene bruker `https://oversikt.local/…`, som ikke er et ekte navnerom.
- Ingen skriveoperasjoner (samtykke, deling av oppgaver); handlingene er lenker eller plassholdere.
