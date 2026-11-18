// Setter sammen API-svarene fra kildedataene og filtrerer etter den innloggedes rolle.
// Brukes av MSW-mocken i Arbeidsflate og av scripts/validate.mjs.

import type {
  AktorId,
  Aktorkilde,
  Domenetype,
  Kildedata,
  Opplysning,
  Oversikt,
  Rolle,
  Sammenheng,
  Tilgang,
  Tjeneste,
  Tjenestevurdering,
} from './typer.ts';

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

type Feilsvar = { status: 403 | 404; melding: string };
export type OversiktSvar = { status: 200; oversikt: Oversikt } | Feilsvar;
export type TjenestevurderingSvar = { status: 200; vurdering: Tjenestevurdering } | Feilsvar;

const tilgangOgKilde = (
  kildedata: Kildedata,
  bruker: AktorId,
  aktorId: AktorId,
): { tilgang: Tilgang; kilde: Aktorkilde } | Feilsvar => {
  const kilde = kildedata.aktorer.find((aktor) => aktor.aktor.id === aktorId);
  if (!kilde) {
    return { status: 404, melding: 'Fant ikke aktøren' };
  }
  const tilgang = lagTilgang(kildedata, bruker, aktorId);
  return tilgang ? { tilgang, kilde } : { status: 403, melding: 'Du har ikke tilgang til denne aktøren' };
};

/** Bytter inn teksten for rollen og fjerner rolletekstene fra svaret. */
const tilpassTekst = ({ rolletekster, ...opplysning }: Opplysning, rolle: Rolle): Opplysning => ({
  ...opplysning,
  ...rolletekster?.[rolle],
});

const synlige = <T extends { synligFor?: Rolle[] }>(elementer: T[] | undefined, rolle: Rolle) =>
  elementer?.filter((element) => erSynlig(element, rolle));

/** GET /aktorer/{aktorId}/oversikt */
export const hentOversikt = (kildedata: Kildedata, bruker: AktorId, aktorId: AktorId): OversiktSvar => {
  const funnet = tilgangOgKilde(kildedata, bruker, aktorId);
  if ('status' in funnet) {
    return funnet;
  }
  const { tilgang, kilde } = funnet;
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
      opplysninger: kilde.opplysninger
        .filter((opplysning) => erSynlig(opplysning, rolle))
        .map((opplysning) => tilpassTekst(opplysning, rolle)),
      tjenesteforslag: kilde.tjenesteforslag.filter((forslag) => erSynlig(forslag, rolle)),
      dialoger: kilde.dialoger.filter((dialog) => erSynlig(dialog, rolle)),
      sammenhenger: hentSammenhenger(kildedata, bruker).filter(
        (sammenheng) => sammenheng.fra === aktorId || sammenheng.til === aktorId,
      ),
      involverte: synlige(kilde.involverte, rolle),
      kildestatus: synlige(kilde.kildestatus, rolle),
      hjelp: synlige(kilde.hjelp, rolle),
      lagresTil: kilde.lagresTil,
    },
  };
};

/** GET /aktorer/{aktorId}/tjenester/{tjenesteId} */
export const hentTjenestevurdering = (
  kildedata: Kildedata,
  bruker: AktorId,
  aktorId: AktorId,
  tjenesteId: string,
): TjenestevurderingSvar => {
  const funnet = tilgangOgKilde(kildedata, bruker, aktorId);
  if ('status' in funnet) {
    return funnet;
  }
  const { tilgang, kilde } = funnet;
  const vurdering = kilde.tjenestevurderinger?.find(
    (kandidat) => kandidat.tjenesteId === tjenesteId && erSynlig(kandidat, tilgang.rolle),
  );
  const tjeneste = hentTjeneste(kildedata, tjenesteId);
  if (!vurdering || !tjeneste) {
    return { status: 404, melding: 'Tjenesten er ikke vurdert for denne aktøren' };
  }
  const { tjenesteId: _, synligFor: __, ...resten } = vurdering;
  return { status: 200, vurdering: { ...resten, aktor: kilde.aktor, tjeneste } };
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
