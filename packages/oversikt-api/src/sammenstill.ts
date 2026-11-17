// Setter sammen API-svarene fra kildedataene og filtrerer etter den innloggedes rolle.
// Brukes av MSW-mocken i Arbeidsflate og av scripts/validate.mjs.

import type { AktorId, Domenetype, Kildedata, Oversikt, Rolle, Sammenheng, Tilgang, Tjeneste } from './typer.ts';

const KREVER_HANDLING = new Set(['krever-handling', 'til-signering']);

const erSynlig = (element: { synligFor?: Rolle[] }, rolle: Rolle) =>
  !element.synligFor || element.synligFor.includes(rolle);

export const finnBruker = (kildedata: Kildedata, playwrightId: string | null) =>
  kildedata.brukere.find((bruker) => bruker.playwrightId === playwrightId);

const lagTilgang = (kildedata: Kildedata, bruker: AktorId, aktorId: AktorId): Tilgang | undefined => {
  const kilde = kildedata.tilganger.find((tilgang) => tilgang.bruker === bruker && tilgang.aktor === aktorId);
  const aktorkilde = kildedata.aktorer.find((aktor) => aktor.aktor.id === aktorId);
  if (!kilde || !aktorkilde) {
    return undefined;
  }
  const antallKreverHandling = aktorkilde.livssituasjoner
    .flatMap((livssituasjon) => livssituasjon.faser)
    .flatMap((fase) => fase.steg)
    .filter((steg) => erSynlig(steg, kilde.rolle) && KREVER_HANDLING.has(steg.status)).length;
  return {
    aktor: aktorkilde.aktor,
    rolle: kilde.rolle,
    rolletekst: kilde.rolletekst,
    hjemmel: kilde.hjemmel,
    antallKreverHandling,
  };
};

/** GET /aktorer: den innloggede selv først, deretter i rekkefølgen i tilganger.json. */
export const hentTilganger = (kildedata: Kildedata, bruker: AktorId): Tilgang[] =>
  kildedata.tilganger
    .filter((tilgang) => tilgang.bruker === bruker)
    .sort((a, b) => Number(b.aktor === bruker) - Number(a.aktor === bruker))
    .map((tilgang) => lagTilgang(kildedata, bruker, tilgang.aktor))
    .filter((tilgang): tilgang is Tilgang => Boolean(tilgang));

/** GET /sammenhenger */
export const hentSammenhenger = (kildedata: Kildedata, bruker: AktorId): Sammenheng[] =>
  kildedata.sammenhenger.filter((kilde) => kilde.bruker === bruker).map((kilde) => kilde.sammenheng);

export type OversiktSvar = { status: 200; oversikt: Oversikt } | { status: 403 | 404; melding: string };

/** GET /aktorer/{aktorId}/oversikt */
export const hentOversikt = (kildedata: Kildedata, bruker: AktorId, aktorId: AktorId): OversiktSvar => {
  if (!kildedata.aktorer.some((aktor) => aktor.aktor.id === aktorId)) {
    return { status: 404, melding: 'Fant ikke aktøren' };
  }
  const tilgang = lagTilgang(kildedata, bruker, aktorId);
  if (!tilgang) {
    return { status: 403, melding: 'Du har ikke tilgang til denne aktøren' };
  }
  const kilde = kildedata.aktorer.find((aktor) => aktor.aktor.id === aktorId);
  if (!kilde) {
    return { status: 404, melding: 'Fant ikke aktøren' };
  }
  const { rolle } = tilgang;
  return {
    status: 200,
    oversikt: {
      tilgang,
      livssituasjoner: kilde.livssituasjoner.map((livssituasjon) => ({
        ...livssituasjon,
        faser: livssituasjon.faser.map((fase) => ({
          ...fase,
          steg: fase.steg.filter((steg) => erSynlig(steg, rolle)),
        })),
      })),
      opplysninger: kilde.opplysninger.filter((opplysning) => erSynlig(opplysning, rolle)),
      tjenesteforslag: kilde.tjenesteforslag.filter((forslag) => erSynlig(forslag, rolle)),
      dialoger: kilde.dialoger.filter((dialog) => erSynlig(dialog, rolle)),
      sammenhenger: hentSammenhenger(kildedata, bruker).filter(
        (sammenheng) => sammenheng.fra === aktorId || sammenheng.til === aktorId,
      ),
    },
  };
};

/** GET /tjenester/{tjenesteId} */
export const hentTjeneste = (kildedata: Kildedata, tjenesteId: string): Tjeneste | undefined =>
  kildedata.tjenester.find((tjeneste) => tjeneste.id === tjenesteId);

/**
 * GET /domener: avledet av skjemafilene, så et nytt domene bare krever en ny fil i schemas/domener.
 * Nøkkelen i skjemaer er filnavnet uten .schema.json, f.eks. «skole».
 */
export const lagDomenetyper = (
  skjemaer: Record<string, { $defs?: Record<string, { title?: string }> }>,
  skjemaUrl: (domene: string, type: string) => string,
): Domenetype[] =>
  Object.entries(skjemaer).flatMap(([domene, skjema]) =>
    Object.entries(skjema.$defs ?? {}).map(([type, definisjon]) => ({
      id: `${domene}.${type}`,
      domene,
      tittel: definisjon.title ?? type,
      skjema: skjemaUrl(domene, type),
    })),
  );
