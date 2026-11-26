// Samler openapi.yaml til én fil for dokumentasjon: skjemaene fra schemas/ legges inn under
// components.schemas, og hvert endepunkt får eksempelsvar laget av mocken (familien Rahimi Berg).
// Kjør: pnpm --filter oversikt-api docs  →  dist/openapi.json + dist/index.html
// Legger også Markdown-dokumentene med visningssiden i dist/docs/ (docs/visning.html → dist/docs/index.html).
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import {
  hentOversikt,
  hentSammenhenger,
  hentTilganger,
  hentTjeneste,
  hentTjenestevurdering,
  lagDomenetyper,
} from '../src/sammenstill.ts';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
const les = (sti) => JSON.parse(readFileSync(join(rot, sti), 'utf8'));
const ut = join(rot, 'dist');

const openapi = parse(readFileSync(join(rot, 'openapi.yaml'), 'utf8'));
const kjerne = les('schemas/kjerne.schema.json');
const domener = Object.fromEntries(
  readdirSync(join(rot, 'schemas/domener'))
    .filter((fil) => fil.endsWith('.schema.json'))
    .map((fil) => [fil.replace('.schema.json', ''), les(`schemas/domener/${fil}`)]),
);

// Pekere til kjerneskjemaet og interne $defs-pekere blir pekere til components.schemas.
const pekTil = (node, oversett) => {
  if (Array.isArray(node)) return node.map((del) => pekTil(del, oversett));
  if (node && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node).map(([nokkel, verdi]) => [
        nokkel,
        nokkel === '$ref' && typeof verdi === 'string' ? oversett(verdi) : pekTil(verdi, oversett),
      ]),
    );
  }
  return node;
};
const tilKomponent = (navn) => `#/components/schemas/${navn}`;
const fraKjerne = (ref) => {
  const treff = ref.match(/kjerne\.schema\.json#\/\$defs\/(.+)$/) ?? ref.match(/^#\/\$defs\/(.+)$/);
  return treff ? tilKomponent(treff[1]) : ref;
};

const skjemaer = Object.fromEntries(
  Object.entries(kjerne.$defs).map(([navn, skjema]) => [navn, pekTil(skjema, fraKjerne)]),
);
// Domenetypene får navn som «skole.fravaer», slik de heter i Opplysning.domene.
for (const [domene, skjema] of Object.entries(domener)) {
  for (const [type, definisjon] of Object.entries(skjema.$defs ?? {})) {
    skjemaer[`${domene}.${type}`] = {
      ...pekTil(definisjon, (ref) => ref.replace(/^#\/\$defs\/(.+)$/, (_, navn) => tilKomponent(`${domene}.${navn}`))),
      description:
        `${definisjon.description ?? definisjon.title ?? ''} Brukes i Opplysning.data når domene er «${domene}.${type}».`.trim(),
    };
  }
}

const samlet = pekTil(openapi, fraKjerne);
samlet.components = { ...samlet.components, schemas: skjemaer };

// Eksempelsvar fra mocken.
const kildedata = {
  brukere: les('data/brukere.json'),
  tilganger: les('data/tilganger.json'),
  sammenhenger: les('data/sammenhenger.json'),
  tjenester: les('data/tjenester.json'),
  dialoger: les('data/dialoger.json'),
  aktorer: readdirSync(join(rot, 'data/aktorer'))
    .filter((fil) => fil.endsWith('.json'))
    .map((fil) => les(`data/aktorer/${fil}`)),
};
const bruker = (id) => kildedata.brukere.find((kandidat) => kandidat.id === id).aktorId;
const aktor = (slug) => kildedata.aktorer.find((kilde) => kilde.aktor.id.endsWith(`:${slug}`)).aktor.id;
const [nora, amir] = [bruker('nora'), bruker('amir')];

const eksempler = {
  '/aktorer': {
    nora: { summary: 'Nora: seg selv, Amir, restauranten og dødsboet', value: hentTilganger(kildedata, nora) },
    amir: { summary: 'Amir: bare seg selv', value: hentTilganger(kildedata, amir) },
  },
  '/aktorer/{aktorId}/oversikt': {
    foresatt: {
      summary: 'Nora ser Amir (rolle foresatt)',
      value: hentOversikt(kildedata, nora, aktor('amir-rahimi')).oversikt,
    },
    selv: {
      summary: 'Amir ser seg selv (rolle selv)',
      value: hentOversikt(kildedata, amir, aktor('amir-rahimi')).oversikt,
    },
    virksomhet: {
      summary: 'Nora ser Lykke Bistro AS (rolle daglig-leder)',
      value: hentOversikt(kildedata, nora, aktor('lykke-bistro')).oversikt,
    },
    dodsbo: {
      summary: 'Nora ser dødsboet (rolle arving)',
      value: hentOversikt(kildedata, nora, aktor('dodsbo-reza-rahimi')).oversikt,
    },
    alvorligSyktBarn: {
      summary: 'Nora ser Lea, alvorlig sykt barn (rolle foresatt)',
      value: hentOversikt(kildedata, nora, aktor('lea-rahimi')).oversikt,
    },
  },
  '/aktorer/{aktorId}/tjenester/{tjenesteId}': {
    skoleskyss: {
      summary: 'Skoleskyss vurdert for Amir, sett av Nora',
      value: hentTjenestevurdering(kildedata, nora, aktor('amir-rahimi'), 'skoleskyss').vurdering,
    },
    pleiepenger: {
      summary: 'Pleiepenger for Lea, sett av Nora',
      value: hentTjenestevurdering(kildedata, nora, aktor('lea-rahimi'), 'pleiepenger').vurdering,
    },
  },
  '/sammenhenger': { nora: { summary: 'Noras sammenhenger', value: hentSammenhenger(kildedata, nora) } },
  '/tjenester/{tjenesteId}': { skoleskyss: { summary: 'Skoleskyss', value: hentTjeneste(kildedata, 'skoleskyss') } },
  '/domener': {
    alle: {
      summary: 'Alle domenetyper',
      value: lagDomenetyper(domener, (domene, type) => `#/components/schemas/${domene}.${type}`),
    },
  },
};
for (const [sti, eksempel] of Object.entries(eksempler)) {
  const innhold = samlet.paths[sti]?.get?.responses?.['200']?.content?.['application/json'];
  if (!innhold) throw new Error(`Fant ikke 200-svar for ${sti} i openapi.yaml`);
  innhold.examples = eksempel;
}

mkdirSync(ut, { recursive: true });
writeFileSync(join(ut, 'openapi.json'), `${JSON.stringify(samlet, null, 2)}\n`);
copyFileSync(join(rot, 'docs/referanse.html'), join(ut, 'index.html'));

const dokumenter = ['familien', 'arkitektur', 'guide'];
mkdirSync(join(ut, 'docs'), { recursive: true });
copyFileSync(join(rot, 'docs/visning.html'), join(ut, 'docs/index.html'));
for (const dokument of dokumenter) {
  copyFileSync(join(rot, `docs/${dokument}.md`), join(ut, `docs/${dokument}.md`));
}
console.log(
  `Skrev dist/openapi.json (${Object.keys(skjemaer).length} skjemaer), dist/index.html og dist/docs/ (${dokumenter.length} dokumenter)`,
);
