import { HttpResponse, http } from 'msw';
import {
  finnBruker,
  hentOversikt,
  hentSammenhenger,
  hentTilganger,
  hentTjeneste,
  lagDomenetyper,
} from '../../../../oversikt-api/src/sammenstill.ts';
import { domeneskjemaer, kildedata } from './kildedata.ts';

// Mock av Oversikt-API (packages/oversikt-api/openapi.yaml). Den innloggede velges med playwrightId,
// slik resten av mockene i Arbeidsflate gjør.
const BASE = '/api/oversikt/v1';

const innlogget = () => {
  const playwrightId = new URLSearchParams(window.location.search).get('playwrightId');
  return finnBruker(kildedata, playwrightId);
};

const ikkeInnlogget = () =>
  HttpResponse.json({ melding: 'Ingen bruker i Oversikt-mocken for denne playwrightId' }, { status: 401 });

export const oversiktHandlers = [
  http.get(`${BASE}/aktorer`, () => {
    const bruker = innlogget();
    return bruker ? HttpResponse.json(hentTilganger(kildedata, bruker.aktorId)) : ikkeInnlogget();
  }),
  http.get(`${BASE}/aktorer/:aktorId/oversikt`, ({ params }) => {
    const bruker = innlogget();
    if (!bruker) {
      return ikkeInnlogget();
    }
    const svar = hentOversikt(kildedata, bruker.aktorId, decodeURIComponent(String(params.aktorId)));
    return svar.status === 200
      ? HttpResponse.json(svar.oversikt)
      : HttpResponse.json({ melding: svar.melding }, { status: svar.status });
  }),
  http.get(`${BASE}/sammenhenger`, () => {
    const bruker = innlogget();
    return bruker ? HttpResponse.json(hentSammenhenger(kildedata, bruker.aktorId)) : ikkeInnlogget();
  }),
  http.get(`${BASE}/tjenester/:tjenesteId`, ({ params }) => {
    const tjeneste = hentTjeneste(kildedata, String(params.tjenesteId));
    return tjeneste
      ? HttpResponse.json(tjeneste)
      : HttpResponse.json({ melding: 'Fant ikke tjenesten' }, { status: 404 });
  }),
  http.get(`${BASE}/domener`, () =>
    HttpResponse.json(
      lagDomenetyper(domeneskjemaer, (domene, type) => `${BASE}/skjema/domener/${domene}.schema.json#/$defs/${type}`),
    ),
  ),
];
