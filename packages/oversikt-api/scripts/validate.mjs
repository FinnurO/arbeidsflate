// Validerer kontrakten, kildedataene og alle API-svar som mocken lager.
// Kjør: corepack pnpm --filter oversikt-api validate
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { parse } from 'yaml';
import { hentOversikt, hentSammenhenger, hentTilganger, hentTjeneste, lagDomenetyper } from '../src/sammenstill.ts';

const rot = join(dirname(fileURLToPath(import.meta.url)), '..');
const les = (sti) => JSON.parse(readFileSync(join(rot, sti), 'utf8'));
const feil = [];
const meld = (hvor, melding) => feil.push(`${hvor}: ${melding}`);

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const kjerne = les('schemas/kjerne.schema.json');
const kildedataSkjema = les('schemas/kildedata.schema.json');
ajv.addSchema(kjerne);
ajv.addSchema(kildedataSkjema);
const domeneskjemaer = Object.fromEntries(
  readdirSync(join(rot, 'schemas/domener'))
    .filter((fil) => fil.endsWith('.schema.json'))
    .map((fil) => [fil.replace('.schema.json', ''), les(`schemas/domener/${fil}`)]),
);
for (const skjema of Object.values(domeneskjemaer)) {
  ajv.addSchema(skjema);
}

const sjekk = (ref, data, hvor) => {
  const valider = ajv.getSchema(ref);
  if (!valider) {
    meld(hvor, `fant ikke skjemaet ${ref}`);
    return;
  }
  if (!valider(data)) {
    for (const e of valider.errors) {
      meld(hvor, `${e.instancePath || '/'} ${e.message}`);
    }
  }
};
const KJERNE = `${kjerne.$id}#/$defs/`;
const KILDE = `${kildedataSkjema.$id}#/$defs/`;

// 1. Alle $ref i OpenAPI peker til noe som finnes.
const openapi = parse(readFileSync(join(rot, 'openapi.yaml'), 'utf8'));
const refs = JSON.stringify(openapi).match(/"\$ref":"[^"]+"/g) ?? [];
for (const ref of refs.map((r) => r.slice(8, -1))) {
  if (ref.startsWith('#/')) {
    const finnes = ref
      .slice(2)
      .split('/')
      .reduce((node, del) => node?.[del], openapi);
    if (!finnes) meld('openapi.yaml', `${ref} finnes ikke`);
  } else {
    const [fil, peker] = ref.split('#');
    if (!fil.endsWith('kjerne.schema.json')) meld('openapi.yaml', `ukjent fil i ${ref}`);
    else if (!ajv.getSchema(`${kjerne.$id}#${peker}`)) meld('openapi.yaml', `${ref} finnes ikke`);
  }
}

// 2. Kildedataene mot kildedata-skjemaet.
const aktorfiler = readdirSync(join(rot, 'data/aktorer')).filter((fil) => fil.endsWith('.json'));
const kildedata = {
  brukere: les('data/brukere.json'),
  tilganger: les('data/tilganger.json'),
  sammenhenger: les('data/sammenhenger.json'),
  tjenester: les('data/tjenester.json'),
  dialoger: les('data/dialoger.json'),
  aktorer: aktorfiler.map((fil) => les(`data/aktorer/${fil}`)),
};
sjekk(`${KILDE}Brukere`, kildedata.brukere, 'data/brukere.json');
sjekk(`${KILDE}Tilganger`, kildedata.tilganger, 'data/tilganger.json');
sjekk(`${KILDE}Sammenhenger`, kildedata.sammenhenger, 'data/sammenhenger.json');
sjekk(`${KILDE}Tjenester`, kildedata.tjenester, 'data/tjenester.json');
sjekk(`${KILDE}Dialoger`, kildedata.dialoger, 'data/dialoger.json');
for (const [i, fil] of aktorfiler.entries()) sjekk(`${KILDE}Aktorkilde`, kildedata.aktorer[i], `data/aktorer/${fil}`);

// 3. Opplysning.data mot domeneskjemaet, og referanser på tvers av filene.
const aktorIder = new Set(kildedata.aktorer.map((a) => a.aktor.id));
const dialogIder = new Set(kildedata.dialoger.map((d) => d.id));
const tjenesteIder = new Set(kildedata.tjenester.map((t) => t.id));
kildedata.aktorer.forEach((kilde, i) => {
  const hvor = `data/aktorer/${aktorfiler[i]}`;
  for (const opplysning of kilde.opplysninger) {
    const [domene, type] = opplysning.domene.split('.');
    const skjema = domeneskjemaer[domene];
    if (!skjema?.$defs?.[type]) meld(hvor, `opplysning ${opplysning.id}: ukjent domene ${opplysning.domene}`);
    else sjekk(`${skjema.$id}#/$defs/${type}`, opplysning.data, `${hvor} opplysning ${opplysning.id}`);
  }
  const steg = kilde.livssituasjoner.flatMap((l) => l.faser.flatMap((f) => f.steg));
  for (const s of steg) {
    if (s.dialogId && !dialogIder.has(s.dialogId)) meld(hvor, `steg ${s.id}: ukjent dialog ${s.dialogId}`);
    if (s.tjenesteId && !tjenesteIder.has(s.tjenesteId)) meld(hvor, `steg ${s.id}: ukjent tjeneste ${s.tjenesteId}`);
  }
  for (const d of kilde.dialoger) {
    const dialog = kildedata.dialoger.find((x) => x.id === d.dialogId);
    if (!dialog) meld(hvor, `ukjent dialog ${d.dialogId}`);
    else if (dialog.party !== kilde.aktor.id) meld(hvor, `dialog ${d.dialogId} tilhører ${dialog.party}`);
  }
  for (const f of kilde.tjenesteforslag) {
    if (!tjenesteIder.has(f.tjenesteId)) meld(hvor, `ukjent tjeneste ${f.tjenesteId}`);
  }
});
for (const t of kildedata.tilganger) {
  if (!aktorIder.has(t.aktor)) meld('data/tilganger.json', `ukjent aktør ${t.aktor}`);
}
for (const { sammenheng } of kildedata.sammenhenger) {
  for (const id of [sammenheng.fra, sammenheng.til]) {
    if (!aktorIder.has(id)) meld('data/sammenhenger.json', `${sammenheng.id}: ukjent aktør ${id}`);
  }
  for (const h of sammenheng.handlinger ?? []) {
    if (h.type === 'dialog' && !dialogIder.has(h.mal))
      meld('data/sammenhenger.json', `${sammenheng.id}: ukjent dialog`);
    if (h.type === 'aktor' && !aktorIder.has(h.mal)) meld('data/sammenhenger.json', `${sammenheng.id}: ukjent aktør`);
  }
}

// 4. Alle svar mocken kan gi, mot kjernen.
let antallSvar = 0;
for (const bruker of kildedata.brukere) {
  const tilganger = hentTilganger(kildedata, bruker.aktorId);
  for (const t of tilganger) sjekk(`${KJERNE}Tilgang`, t, `GET /aktorer (${bruker.id})`);
  for (const s of hentSammenhenger(kildedata, bruker.aktorId)) {
    sjekk(`${KJERNE}Sammenheng`, s, `GET /sammenhenger (${bruker.id})`);
  }
  for (const t of tilganger) {
    const svar = hentOversikt(kildedata, bruker.aktorId, t.aktor.id);
    if (svar.status !== 200) meld(`oversikt ${bruker.id} → ${t.aktor.navn}`, svar.melding);
    else sjekk(`${KJERNE}Oversikt`, svar.oversikt, `GET /aktorer/{id}/oversikt (${bruker.id} → ${t.aktor.navn})`);
    antallSvar++;
  }
  antallSvar += 2;
}
for (const t of kildedata.tjenester) {
  sjekk(`${KJERNE}Tjeneste`, hentTjeneste(kildedata, t.id), `GET /tjenester/${t.id}`);
  antallSvar++;
}
const domenetyper = lagDomenetyper(domeneskjemaer, (d, t) => `/schemas/domener/${d}.schema.json#/$defs/${t}`);
for (const d of domenetyper) sjekk(`${KJERNE}Domenetype`, d, 'GET /domener');

if (feil.length) {
  console.error(`${feil.length} feil:\n${feil.map((f) => `  ${f}`).join('\n')}`);
  process.exit(1);
}
console.log(
  `OK: openapi.yaml, ${aktorfiler.length + 5} datafiler, ${domenetyper.length} domenetyper i ${Object.keys(domeneskjemaer).length} domener, ${antallSvar} API-svar`,
);
