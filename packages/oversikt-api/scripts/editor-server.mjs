// Lokal redigeringsapp for mockdataene i data/.
// Start: corepack pnpm --filter oversikt-api editor  →  http://127.0.0.1:5391
//
// Serverer editor/ og et lite API som leser, validerer og skriver filene i data/.
// Bare filene som står i FASTE_FILER og data/aktorer/<slug>.json kan leses eller skrives.

import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020Import from 'ajv/dist/2020.js';
import addFormatsImport from 'ajv-formats';

const Ajv2020 = Ajv2020Import.default ?? Ajv2020Import;
const addFormats = addFormatsImport.default ?? addFormatsImport;

const ROT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SKJEMAMAPPE = join(ROT, 'schemas');
const DOMENEMAPPE = join(SKJEMAMAPPE, 'domener');
const EDITORMAPPE = join(ROT, 'editor');
const PORT = Number(process.env.EDITOR_PORT ?? 5391);
const VERT = '127.0.0.1';
const MAKS_BODY = 10 * 1024 * 1024;

const KILDEDATA_ID = 'https://oversikt.local/schemas/kildedata.schema.json';

/** Faste filer: sti → navnet på $defs-oppføringen i kildedata.schema.json. */
const FASTE_FILER = {
  'data/brukere.json': { skjema: 'Brukere', gruppe: 'Brukere og tilganger', tittel: 'Brukere' },
  'data/tilganger.json': { skjema: 'Tilganger', gruppe: 'Brukere og tilganger', tittel: 'Tilganger' },
  'data/sammenhenger.json': { skjema: 'Sammenhenger', gruppe: 'Sammenhenger', tittel: 'Sammenhenger' },
  'data/tjenester.json': { skjema: 'Tjenester', gruppe: 'Tjenester', tittel: 'Tjenester' },
  'data/dialoger.json': { skjema: 'Dialoger', gruppe: 'Dialoger', tittel: 'Dialoger' },
};
const AKTORFIL = /^data\/aktorer\/([a-z0-9_][a-z0-9_-]{0,80})\.json$/;

/** Slår opp en sti fra klienten. Returnerer null for alt som ikke er en kjent datafil. */
function slaOppSti(sti) {
  if (typeof sti !== 'string') return null;
  if (Object.hasOwn(FASTE_FILER, sti)) return { sti, ...FASTE_FILER[sti], aktorfil: false };
  const m = AKTORFIL.exec(sti);
  if (m) return { sti, skjema: 'Aktorkilde', gruppe: 'Aktører', tittel: m[1], aktorfil: true };
  return null;
}

function absoluttSti(sti) {
  const abs = resolve(ROT, sti);
  const datamappe = join(ROT, 'data') + sep;
  if (!abs.startsWith(datamappe)) throw new Error('Ugyldig sti');
  return abs;
}

// ---------------------------------------------------------------- skjemaer

async function lesJson(fil) {
  return JSON.parse(await readFile(fil, 'utf8'));
}

async function skjemafiler() {
  const filer = [];
  for (const navn of await readdir(SKJEMAMAPPE)) {
    if (navn.endsWith('.schema.json')) filer.push({ fil: join(SKJEMAMAPPE, navn), relativ: `schemas/${navn}` });
  }
  if (existsSync(DOMENEMAPPE)) {
    for (const navn of await readdir(DOMENEMAPPE)) {
      if (navn.endsWith('.schema.json'))
        filer.push({ fil: join(DOMENEMAPPE, navn), relativ: `schemas/domener/${navn}` });
    }
  }
  return filer;
}

let skjemabuffer = null; // { nokkel, skjemaer, ajv, domenetyper }

/** Leser alle skjemaene på nytt når en av dem er endret (den andre agenten kan endre dem underveis). */
async function hentSkjemaer() {
  const filer = await skjemafiler();
  const tider = await Promise.all(filer.map(async (f) => `${f.relativ}:${(await stat(f.fil)).mtimeMs}`));
  const nokkel = tider.join('|');
  if (skjemabuffer?.nokkel === nokkel) return skjemabuffer;

  const skjemaer = [];
  for (const f of filer) {
    const innhold = await lesJson(f.fil);
    skjemaer.push({ relativ: f.relativ, id: innhold.$id, innhold, domene: f.relativ.startsWith('schemas/domener/') });
  }
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  for (const s of skjemaer) ajv.addSchema(s.innhold);

  const domenetyper = [];
  for (const s of skjemaer.filter((x) => x.domene)) {
    const domene = s.relativ.replace(/^schemas\/domener\//, '').replace(/\.schema\.json$/, '');
    for (const [def, defSkjema] of Object.entries(s.innhold.$defs ?? {})) {
      domenetyper.push({
        id: `${domene}.${def}`,
        domene,
        domenetittel: s.innhold.title ?? domene,
        tittel: defSkjema.title ?? def,
        skjema: `${s.id}#/$defs/${def}`,
      });
    }
  }
  skjemabuffer = { nokkel, skjemaer, ajv, domenetyper };
  return skjemabuffer;
}

// ---------------------------------------------------------------- validering

function pekerdel(s) {
  return String(s).replace(/~/g, '~0').replace(/\//g, '~1');
}

function norskMelding(feil) {
  const p = feil.params ?? {};
  switch (feil.keyword) {
    case 'required':
      return `Feltet «${p.missingProperty}» mangler.`;
    case 'type':
      return `Må være ${oversettType(p.type)}.`;
    case 'enum':
      return `Må være en av: ${(p.allowedValues ?? []).map((v) => JSON.stringify(v)).join(', ')}.`;
    case 'const':
      return `Må være ${JSON.stringify(p.allowedValue)}.`;
    case 'pattern':
      return `Har feil format (må passe mønsteret ${p.pattern}).`;
    case 'format':
      return `Må være gyldig ${oversettFormat(p.format)}.`;
    case 'additionalProperties':
      return `Ukjent felt «${p.additionalProperty}».`;
    case 'minimum':
      return `Må være minst ${p.limit}.`;
    case 'maximum':
      return `Kan ikke være større enn ${p.limit}.`;
    case 'exclusiveMinimum':
      return `Må være større enn ${p.limit}.`;
    case 'exclusiveMaximum':
      return `Må være mindre enn ${p.limit}.`;
    case 'minLength':
      return `Må ha minst ${p.limit} tegn.`;
    case 'maxLength':
      return `Kan ha høyst ${p.limit} tegn.`;
    case 'minItems':
      return `Må ha minst ${p.limit} element.`;
    case 'maxItems':
      return `Kan ha høyst ${p.limit} element.`;
    case 'uniqueItems':
      return `Inneholder like verdier (element ${p.j} og ${p.i}).`;
    default:
      return feil.message ?? 'Ugyldig verdi.';
  }
}

function oversettType(t) {
  const ord = {
    string: 'tekst',
    integer: 'et heltall',
    number: 'et tall',
    boolean: 'ja/nei',
    object: 'et objekt',
    array: 'en liste',
    null: 'null',
  };
  return String(t)
    .split(',')
    .map((x) => ord[x] ?? x)
    .join(' eller ');
}

function oversettFormat(f) {
  return (
    {
      date: 'dato (ÅÅÅÅ-MM-DD)',
      'date-time': 'tidspunkt (ISO 8601 med tidssone)',
      uri: 'URI',
      uuid: 'UUID',
      email: 'e-postadresse',
    }[f] ?? f
  );
}

function tilFeilliste(ajvFeil, prefiks = '') {
  const ut = [];
  const sett = new Set();
  for (const f of ajvFeil ?? []) {
    let sti = prefiks + f.instancePath;
    if (f.keyword === 'required') sti += `/${pekerdel(f.params.missingProperty)}`;
    if (f.keyword === 'additionalProperties') sti += `/${pekerdel(f.params.additionalProperty)}`;
    const melding = norskMelding(f);
    const nokkel = `${sti}|${melding}`;
    if (sett.has(nokkel)) continue;
    sett.add(nokkel);
    ut.push({ sti, melding });
  }
  return ut;
}

async function valider(info, verdi) {
  const { ajv, domenetyper } = await hentSkjemaer();
  const validator = ajv.getSchema(`${KILDEDATA_ID}#/$defs/${info.skjema}`);
  if (!validator) return [{ sti: '', melding: `Fant ikke skjemaet ${info.skjema} i kildedata.schema.json.` }];
  const feil = validator(verdi) ? [] : tilFeilliste(validator.errors);

  // Opplysning.data valideres mot domeneskjemaet som domene peker på.
  if (info.skjema === 'Aktorkilde' && Array.isArray(verdi?.opplysninger)) {
    verdi.opplysninger.forEach((o, i) => {
      if (!o || typeof o !== 'object' || typeof o.domene !== 'string') return;
      const type = domenetyper.find((d) => d.id === o.domene);
      if (!type) {
        feil.push({ sti: `/opplysninger/${i}/domene`, melding: `Ukjent domenetype «${o.domene}».` });
        return;
      }
      if (o.data === undefined) return; // «mangler» er allerede meldt
      const domenevalidator = ajv.getSchema(type.skjema);
      if (domenevalidator && !domenevalidator(o.data)) {
        feil.push(...tilFeilliste(domenevalidator.errors, `/opplysninger/${i}/data`));
      }
    });
  }
  return feil;
}

// ---------------------------------------------------------------- http

function svar(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(body);
}

function lesBody(req) {
  return new Promise((ok, feil) => {
    const biter = [];
    let lengde = 0;
    req.on('data', (b) => {
      lengde += b.length;
      if (lengde > MAKS_BODY) {
        feil(Object.assign(new Error('For stor forespørsel'), { status: 413 }));
        req.destroy();
      } else biter.push(b);
    });
    req.on('end', () => ok(Buffer.concat(biter).toString('utf8')));
    req.on('error', feil);
  });
}

async function listFiler() {
  const filer = [];
  for (const [sti, info] of Object.entries(FASTE_FILER)) {
    filer.push({
      sti,
      skjema: info.skjema,
      gruppe: info.gruppe,
      tittel: info.tittel,
      finnes: existsSync(absoluttSti(sti)),
      kanSlettes: false,
    });
  }
  const aktormappe = join(ROT, 'data', 'aktorer');
  if (existsSync(aktormappe)) {
    for (const navn of (await readdir(aktormappe)).sort()) {
      const sti = `data/aktorer/${navn}`;
      const info = slaOppSti(sti);
      if (!info) continue;
      let tittel = info.tittel;
      let undertittel;
      try {
        const innhold = await lesJson(absoluttSti(sti));
        if (innhold?.aktor?.navn) {
          tittel = innhold.aktor.navn;
          undertittel = navn;
        }
      } catch {
        undertittel = `${navn} (kan ikke leses)`;
      }
      filer.push({
        sti,
        skjema: info.skjema,
        gruppe: info.gruppe,
        tittel,
        undertittel,
        finnes: true,
        kanSlettes: true,
      });
    }
  }
  return filer;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.md': 'text/plain; charset=utf-8',
};

async function serverStatisk(res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const abs = resolve(EDITORMAPPE, `.${rel}`);
  if (!abs.startsWith(EDITORMAPPE + sep) || !existsSync(abs) || !(await stat(abs)).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Fant ikke siden.');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[extname(abs)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(await readFile(abs));
}

async function behandle(req, res) {
  const url = new URL(req.url, `http://${VERT}:${PORT}`);
  const { pathname } = url;

  if (!pathname.startsWith('/api/')) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return svar(res, 405, { melding: 'Metoden støttes ikke.' });
    return serverStatisk(res, pathname);
  }

  if (pathname === '/api/filer' && req.method === 'GET') return svar(res, 200, await listFiler());

  if (pathname === '/api/skjema' && req.method === 'GET') {
    const { skjemaer } = await hentSkjemaer();
    return svar(res, 200, {
      kildedata: KILDEDATA_ID,
      skjemaer: Object.fromEntries(skjemaer.map((s) => [s.id, s.innhold])),
      filer: Object.fromEntries(skjemaer.map((s) => [s.relativ, s.id])),
    });
  }

  if (pathname === '/api/domenetyper' && req.method === 'GET') {
    const { domenetyper } = await hentSkjemaer();
    return svar(res, 200, domenetyper);
  }

  if (pathname === '/api/fil') {
    const info = slaOppSti(url.searchParams.get('sti'));
    if (!info) return svar(res, 400, { melding: 'Ukjent eller ugyldig filsti. Bare filene i data/ kan redigeres.' });
    const abs = absoluttSti(info.sti);

    if (req.method === 'GET') {
      if (!existsSync(abs)) return svar(res, 200, { sti: info.sti, skjema: info.skjema, finnes: false, innhold: null });
      const tekst = await readFile(abs, 'utf8');
      let innhold = null;
      let lesefeil;
      try {
        innhold = JSON.parse(tekst);
      } catch (e) {
        lesefeil = `Filen er ikke gyldig JSON: ${e.message}`;
      }
      return svar(res, 200, { sti: info.sti, skjema: info.skjema, finnes: true, innhold, tekst, lesefeil });
    }

    if (req.method === 'PUT') {
      const tekst = await lesBody(req);
      let verdi;
      try {
        verdi = JSON.parse(tekst);
      } catch (e) {
        return svar(res, 422, { melding: 'Innholdet er ikke gyldig JSON.', feil: [{ sti: '', melding: e.message }] });
      }
      const feil = await valider(info, verdi);
      if (feil.length) return svar(res, 422, { melding: `Filen ble ikke lagret. ${feil.length} feil.`, feil });
      await mkdir(dirname(abs), { recursive: true });
      await writeFile(abs, `${JSON.stringify(verdi, null, 2)}\n`, 'utf8');
      return svar(res, 200, { melding: 'Lagret.', sti: info.sti });
    }

    if (req.method === 'DELETE') {
      if (!info.aktorfil) return svar(res, 400, { melding: 'Bare aktørfiler kan slettes.' });
      if (!existsSync(abs)) return svar(res, 404, { melding: 'Filen finnes ikke.' });
      await unlink(abs);
      return svar(res, 200, { melding: 'Slettet.', sti: info.sti });
    }

    return svar(res, 405, { melding: 'Metoden støttes ikke.' });
  }

  return svar(res, 404, { melding: 'Ukjent API-adresse.' });
}

const server = createServer((req, res) => {
  behandle(req, res).catch((e) => {
    console.error(e);
    if (!res.headersSent) svar(res, e.status ?? 500, { melding: e.message ?? 'Intern feil.' });
    else res.end();
  });
});

server.listen(PORT, VERT, () => {
  console.log(`Redigeringsappen kjører på http://${VERT}:${PORT}`);
});
