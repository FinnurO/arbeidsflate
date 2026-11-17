// Redigeringsapp for mockdataene i packages/oversikt-api/data.
// Skjemadrevet: skjemaene hentes fra /api/skjema, og skjemaet bygges ut fra JSON Schema.

const GRUPPER = ['Brukere og tilganger', 'Aktører', 'Sammenhenger', 'Tjenester', 'Dialoger'];

/** Felt som får tekstområde i stedet for én linje. */
const LANGE_FELT = new Set(['beskrivelse', 'sammendrag', 'begrunnelse', 'tekst', 'kommentar', 'resultat', 'grunnlag']);

/** Visningsnavn for feltnøkler der en enkel omskriving ikke holder. */
const ETIKETTER = {
  aktor: 'Aktør',
  aktorId: 'Aktør-ID',
  playwrightId: 'Playwright-ID',
  dialogId: 'Dialog-ID',
  tjenesteId: 'Tjeneste-ID',
  katalogUri: 'Katalog-URI',
  orgnr: 'Organisasjonsnummer',
  fodselsdato: 'Fødselsdato',
  skolear: 'Skoleår',
  omrade: 'Område',
  mestringsniva: 'Mestringsnivå',
  primar: 'Primær',
  mal: 'Mål',
  belop: 'Beløp',
  kjoretoy: 'Kjøretøy',
  proklamaFrist: 'Proklamafrist',
  andelProsent: 'Andel (prosent)',
  krevesSamtykke: 'Krever samtykke',
  synligFor: 'Synlig for',
  aktivFase: 'Aktiv fase',
  utvidetStatus: 'Utvidet status',
  fristtekst: 'Fristtekst',
  livssituasjoner: 'Livssituasjoner',
  tjenesteforslag: 'Tjenesteforslag',
  antallKreverHandling: 'Antall som krever handling',
  meldtAvForesatte: 'Meldt av foresatte',
  sakkyndigVurdering: 'Sakkyndig vurdering',
  nyeTilbakemeldinger: 'Nye tilbakemeldinger',
  gyldigTil: 'Gyldig til',
  domene: 'Opplysningstype',
};

const tilstand = {
  kildedataId: '',
  skjemaer: {},
  domenetyper: [],
  filer: [],
  fil: null, // { sti, skjema, finnes, kanSlettes, ny }
  verdi: undefined,
  lagretTekst: null,
  fane: 'skjema',
  apne: new Map(), // JSON-peker → om seksjonen er åpen
  feil: [],
};

const $ = (id) => document.getElementById(id);
let idTeller = 0;
const nyId = () => `f${++idTeller}`;

// ---------------------------------------------------------------- hjelpere

function el(tag, attrs = {}, ...barn) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  }
  for (const b of barn.flat()) {
    if (b === null || b === undefined || b === false) continue;
    e.append(b instanceof Node ? b : String(b));
  }
  return e;
}

function knapp(tekst, vedKlikk, { variant = 'secondary', farge, storrelse = 'sm', etikett } = {}) {
  return el(
    'button',
    {
      class: 'ds-button',
      type: 'button',
      'data-variant': variant,
      'data-color': farge,
      'data-size': storrelse,
      'aria-label': etikett,
      onclick: vedKlikk,
    },
    tekst,
  );
}

const pekerdel = (s) => String(s).replace(/~/g, '~0').replace(/\//g, '~1');
const peker = (sti) => (sti.length ? `/${sti.map(pekerdel).join('/')}` : '');
const kopi = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const kanonisk = (v) => JSON.stringify(v ?? null);
const erObjekt = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function etikettFor(nokkel, skjema) {
  if (skjema?.title) return skjema.title;
  if (ETIKETTER[nokkel]) return ETIKETTER[nokkel];
  const ord = String(nokkel)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase();
  return ord.charAt(0).toUpperCase() + ord.slice(1);
}

async function api(metode, url, body) {
  const svar = await fetch(url, {
    method: metode,
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body,
  });
  let data = null;
  try {
    data = await svar.json();
  } catch {
    /* tomt svar */
  }
  return { status: svar.status, ok: svar.ok, data };
}

// ---------------------------------------------------------------- skjemaoppslag

function slaOppRef(ref, base) {
  const url = new URL(ref, base);
  const [dok, fragment = ''] = url.href.split('#');
  let skjema = tilstand.skjemaer[dok];
  if (!skjema) throw new Error(`Fant ikke skjemaet ${dok}`);
  const deler = fragment
    .split('/')
    .slice(1)
    .map((d) => decodeURIComponent(d).replace(/~1/g, '/').replace(/~0/g, '~'));
  for (const d of deler) skjema = skjema?.[d];
  if (!skjema) throw new Error(`Fant ikke ${ref}`);
  return { skjema, base: dok, typenavn: deler.at(-1) };
}

/** Følger $ref og slår sammen med søskennøkler (f.eks. description ved siden av $ref). */
function los(node) {
  let { skjema, base, typenavn } = node;
  for (let i = 0; skjema?.$ref && i < 30; i++) {
    const { $ref, ...resten } = skjema;
    const mal = slaOppRef($ref, base);
    skjema = { ...mal.skjema, ...resten };
    base = mal.base;
    typenavn = mal.typenavn;
  }
  return { skjema: skjema ?? {}, base, typenavn };
}

function typer(skjema) {
  if (Array.isArray(skjema.type)) return skjema.type;
  if (skjema.type) return [skjema.type];
  if (skjema.enum) return ['string'];
  if (skjema.properties) return ['object'];
  if (skjema.items) return ['array'];
  return [];
}

function standardverdi(node, dybde = 0) {
  const { skjema, base } = los(node);
  if ('default' in skjema) return kopi(skjema.default);
  if ('const' in skjema) return kopi(skjema.const);
  if (skjema.enum) return skjema.enum[0];
  const t = typer(skjema).find((x) => x !== 'null') ?? typer(skjema)[0];
  if (dybde > 12) return t === 'array' ? [] : t === 'object' ? {} : undefined;
  switch (t) {
    case 'object': {
      const ut = {};
      for (const k of Object.keys(skjema.properties ?? {})) {
        if (!(skjema.required ?? []).includes(k)) continue;
        const v = standardverdi({ skjema: skjema.properties[k], base }, dybde + 1);
        if (v !== undefined) ut[k] = v;
      }
      return ut;
    }
    case 'array': {
      const antall = skjema.minItems ?? 0;
      return Array.from({ length: antall }, () => standardverdi({ skjema: skjema.items ?? {}, base }, dybde + 1));
    }
    case 'string':
      return '';
    case 'integer':
    case 'number':
      return skjema.minimum ?? 0;
    case 'boolean':
      return false;
    case 'null':
      return null;
    default:
      return {};
  }
}

function filskjema(navn) {
  return { skjema: { $ref: `#/$defs/${navn}` }, base: tilstand.kildedataId };
}

function domenenode(domene) {
  const type = tilstand.domenetyper.find((d) => d.id === domene);
  if (!type) return null;
  const [base, fragment] = type.skjema.split('#');
  return { type, node: { skjema: { $ref: `#${fragment}` }, base } };
}

// ---------------------------------------------------------------- verdien

function hent(sti) {
  let v = tilstand.verdi;
  for (const k of sti) v = v?.[k];
  return v;
}

function sett(sti, v) {
  if (!sti.length) {
    tilstand.verdi = v;
    return endret();
  }
  if (tilstand.verdi === null || typeof tilstand.verdi !== 'object')
    tilstand.verdi = typeof sti[0] === 'number' ? [] : {};
  let o = tilstand.verdi;
  for (let i = 0; i < sti.length - 1; i++) {
    const k = sti[i];
    if (o[k] === null || typeof o[k] !== 'object') o[k] = typeof sti[i + 1] === 'number' ? [] : {};
    o = o[k];
  }
  const siste = sti.at(-1);
  if (v === undefined) {
    if (Array.isArray(o)) o.splice(siste, 1);
    else delete o[siste];
  } else o[siste] = v;
  endret();
}

/** Setter et felt i et objekt. Nye felt legges inn i skjemaets rekkefølge, så filene blir ryddige. */
function settFelt(objSti, nokkel, v, rekkefolge) {
  const obj = hent(objSti);
  if (erObjekt(obj) && v !== undefined && !(nokkel in obj)) {
    const ny = {};
    for (const k of rekkefolge) {
      if (k === nokkel) ny[k] = v;
      else if (k in obj) ny[k] = obj[k];
    }
    for (const k of Object.keys(obj)) if (!(k in ny)) ny[k] = obj[k];
    if (!(nokkel in ny)) ny[nokkel] = v;
    sett(objSti, ny);
  } else sett([...objSti, nokkel], v);
}

function erEndret() {
  if (!tilstand.fil) return false;
  if (tilstand.lagretTekst === null) return true;
  if (tilstand.fane === 'raa') {
    try {
      return kanonisk(JSON.parse($('raa').value)) !== tilstand.lagretTekst;
    } catch {
      return true;
    }
  }
  return kanonisk(tilstand.verdi) !== tilstand.lagretTekst;
}

function endret() {
  $('fil-ulagret').hidden = !erEndret();
}

// ---------------------------------------------------------------- skjemagenerator

function feltramme(sti, nokkel, node, pakrevd, kontroll, ...ekstra) {
  const id = nyId();
  kontroll.id = id;
  const { skjema } = node;
  const beskrivelse = [skjema.description, skjema.pattern && !skjema.enum ? `Mønster: ${skjema.pattern}` : null]
    .filter(Boolean)
    .join(' ');
  return el(
    'div',
    { class: 'ds-field felt', 'data-sti': peker(sti) },
    el(
      'label',
      { class: 'ds-label', for: id, 'data-weight': 'medium' },
      etikettFor(nokkel, skjema),
      pakrevd ? el('span', { class: 'pakrevd', title: 'Må fylles ut' }, ' *') : null,
      nokkel !== null ? el('code', { class: 'nokkel' }, nokkel) : null,
    ),
    beskrivelse ? el('p', { 'data-field': 'description' }, beskrivelse) : null,
    kontroll,
    ...ekstra,
  );
}

/** Lager en seksjon som kan lukkes, og husker om den var åpen mellom omtegninger. */
function seksjon(sti, tittel, innhold, { standardApen = false, merkelapp, knapper, oppdater, beskrivelse } = {}) {
  const p = peker(sti);
  const apen = tilstand.apne.has(p) ? tilstand.apne.get(p) : standardApen;
  const tittelEl = el('span', { class: 'seksjon-tittel' }, tittel);
  const merkeEl = el('span', { class: 'seksjon-merker' }, merkelapp ?? null);
  const d = el(
    'details',
    { class: 'ds-details seksjon', 'data-sti': p, open: apen },
    el(
      'summary',
      {},
      el(
        'span',
        { class: 'seksjon-hode' },
        tittelEl,
        merkeEl,
        knapper ? el('span', { class: 'seksjon-knapper' }, knapper) : null,
      ),
    ),
    el(
      'div',
      { class: 'seksjon-innhold' },
      beskrivelse ? el('p', { class: 'ds-paragraph seksjon-beskrivelse', 'data-size': 'sm' }, beskrivelse) : null,
      innhold,
    ),
  );
  d.addEventListener('toggle', (e) => {
    if (e.target === d) tilstand.apne.set(p, d.open);
  });
  if (oppdater) {
    d._oppdater = () => {
      const { tittel: t, merkelapp: m } = oppdater();
      tittelEl.textContent = t;
      merkeEl.replaceChildren(...(m ? [m] : []));
    };
  }
  return d;
}

function gruppe(sti, tittel, beskrivelse, ...innhold) {
  return el(
    'fieldset',
    { class: 'ds-fieldset gruppe', 'data-sti': peker(sti) },
    el('legend', { class: 'ds-label', 'data-weight': 'medium' }, tittel),
    beskrivelse ? el('p', { 'data-field': 'description' }, beskrivelse) : null,
    ...innhold,
  );
}

/** Hovedinngangen: ett felt for en verdi med et gitt skjema. */
function felt(node, verdi, sti, valg) {
  const losning = los(node);
  const { skjema } = losning;
  const t = typer(skjema);
  if (skjema.enum) return enumFelt(losning, verdi, sti, valg);
  if (t.includes('object') && !t.includes('array')) return objektFelt(losning, verdi, sti, valg);
  if (t.includes('array')) return listeFelt(losning, verdi, sti, valg);
  if (t.includes('boolean')) return boolFelt(losning, verdi, sti, valg);
  if (t.includes('integer') || t.includes('number')) return tallFelt(losning, verdi, sti, valg);
  if (t.includes('string')) return tekstFelt(losning, verdi, sti, valg);
  return jsonFelt(losning, verdi, sti, valg);
}

function tekstFelt(node, verdi, sti, { nokkel, pakrevd, skriv }) {
  const { skjema } = node;
  const nullbar = typer(skjema).includes('null');
  const erNull = verdi === null;
  const tekst = typeof verdi === 'string' ? verdi : '';
  let kontroll;
  let hale = '';

  const skrivTekst = (v) => skriv(v === '' && !pakrevd ? undefined : v);

  if (skjema.format === 'date-time' && (tekst === '' || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(tekst))) {
    // datetime-local kan ikke vise tidssone. Vi viser klokkeslettet slik det står og beholder sekunder og tidssone.
    hale = tekst.slice(16);
    kontroll = el('input', { class: 'ds-input', type: 'datetime-local', step: 60 });
    kontroll.value = tekst.slice(0, 16);
    kontroll.addEventListener('input', () => {
      if (!kontroll.value) return skrivTekst('');
      skrivTekst(kontroll.value + nyHale(kontroll.value, hale));
    });
  } else if (skjema.format === 'date' && (tekst === '' || /^\d{4}-\d{2}-\d{2}$/.test(tekst))) {
    kontroll = el('input', { class: 'ds-input', type: 'date' });
    kontroll.value = tekst;
    kontroll.addEventListener('input', () => skrivTekst(kontroll.value));
  } else if (LANGE_FELT.has(nokkel) || (skjema.maxLength ?? 0) > 200) {
    kontroll = el('textarea', { class: 'ds-input', rows: 3 });
    kontroll.value = tekst;
    kontroll.addEventListener('input', () => skrivTekst(kontroll.value));
  } else {
    kontroll = el('input', { class: 'ds-input', type: 'text', spellcheck: 'false', maxlength: skjema.maxLength });
    kontroll.value = tekst;
    kontroll.addEventListener('input', () => skrivTekst(kontroll.value));
  }

  const ekstra = [];
  if (
    Array.isArray(skjema.examples) &&
    skjema.examples.length &&
    kontroll.tagName === 'INPUT' &&
    kontroll.type === 'text'
  ) {
    const listeId = nyId();
    kontroll.setAttribute('list', listeId);
    ekstra.push(
      el(
        'datalist',
        { id: listeId },
        skjema.examples.map((e) => el('option', { value: e })),
      ),
    );
  }
  if (skjema.format === 'date-time' && kontroll.type === 'datetime-local') {
    ekstra.push(
      el(
        'p',
        { class: 'hint' },
        hale ? `Lagres med «${hale}» etter klokkeslettet.` : 'Lagres med sekunder og norsk tidssone.',
      ),
    );
  }
  if (nullbar) {
    kontroll.disabled = erNull;
    const boksId = nyId();
    const boks = el('input', { class: 'ds-input', type: 'checkbox', id: boksId, checked: erNull });
    boks.addEventListener('change', () => {
      kontroll.disabled = boks.checked;
      if (boks.checked) skriv(null);
      else
        skrivTekst(
          kontroll.type === 'datetime-local' && kontroll.value
            ? kontroll.value + nyHale(kontroll.value, hale)
            : kontroll.value,
        );
    });
    ekstra.push(
      el(
        'div',
        { class: 'ds-field null-valg' },
        boks,
        el('label', { class: 'ds-label', for: boksId }, 'Tom verdi (null)'),
      ),
    );
  }
  return feltramme(sti, nokkel, node, pakrevd, kontroll, ...ekstra);
}

/** Sekunder og tidssone som skal stå etter «ÅÅÅÅ-MM-DDTHH:MM». */
function nyHale(lokal, gammel) {
  const m = /^(:\d{2}(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/.exec(gammel ?? '');
  const sekunder = m?.[1] ?? ':00';
  if (m?.[2] === 'Z') return `${sekunder}Z`;
  const minutter = -new Date(lokal).getTimezoneOffset();
  const fortegn = minutter >= 0 ? '+' : '-';
  const a = Math.abs(minutter);
  return `${sekunder}${fortegn}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
}

function tallFelt(node, verdi, sti, { nokkel, pakrevd, skriv }) {
  const { skjema } = node;
  const heltall = typer(skjema).includes('integer') && !typer(skjema).includes('number');
  const kontroll = el('input', {
    class: 'ds-input',
    type: 'number',
    step: heltall ? 1 : 'any',
    min: skjema.minimum,
    max: skjema.maximum,
    inputmode: heltall ? 'numeric' : 'decimal',
  });
  if (typeof verdi === 'number') kontroll.value = String(verdi);
  kontroll.addEventListener('input', () => {
    if (kontroll.value === '') return skriv(undefined);
    const n = Number(kontroll.value);
    if (!Number.isNaN(n)) skriv(n);
  });
  return feltramme(sti, nokkel, node, pakrevd, kontroll);
}

function boolFelt(node, verdi, sti, { nokkel, pakrevd, skriv }) {
  const { skjema } = node;
  const id = nyId();
  const boks = el('input', { class: 'ds-input', type: 'checkbox', id, checked: verdi === true });
  boks.addEventListener('change', () => skriv(boks.checked ? true : pakrevd ? false : undefined));
  return el(
    'div',
    { class: 'ds-field felt', 'data-sti': peker(sti) },
    boks,
    el(
      'label',
      { class: 'ds-label', for: id },
      etikettFor(nokkel, skjema),
      pakrevd ? el('span', { class: 'pakrevd' }, ' *') : null,
      nokkel !== null ? el('code', { class: 'nokkel' }, nokkel) : null,
    ),
    skjema.description ? el('p', { 'data-field': 'description' }, skjema.description) : null,
  );
}

function enumFelt(node, verdi, sti, { nokkel, pakrevd, skriv }) {
  const { skjema } = node;
  const kontroll = el('select', { class: 'ds-input' });
  const finnes = skjema.enum.includes(verdi);
  if (!pakrevd || verdi === undefined) kontroll.append(el('option', { value: '' }, '(ikke valgt)'));
  if (verdi !== undefined && !finnes)
    kontroll.append(el('option', { value: '__ugyldig' }, `${JSON.stringify(verdi)} (ugyldig)`));
  for (const [i, v] of skjema.enum.entries()) kontroll.append(el('option', { value: String(i) }, String(v)));
  kontroll.value = finnes ? String(skjema.enum.indexOf(verdi)) : verdi === undefined ? '' : '__ugyldig';
  kontroll.addEventListener('change', () => {
    if (kontroll.value === '') return skriv(undefined);
    if (kontroll.value === '__ugyldig') return;
    skriv(skjema.enum[Number(kontroll.value)]);
  });
  return feltramme(sti, nokkel, node, pakrevd, kontroll);
}

function jsonFelt(node, verdi, sti, { nokkel, pakrevd, skriv }) {
  const kontroll = el('textarea', { class: 'ds-input json-felt', rows: 6, spellcheck: 'false' });
  kontroll.value = verdi === undefined ? '' : JSON.stringify(verdi, null, 2);
  const melding = el('p', { class: 'ds-validation-message', 'data-field': 'validation', hidden: true });
  kontroll.addEventListener('input', () => {
    if (kontroll.value.trim() === '') {
      melding.hidden = true;
      return skriv(undefined);
    }
    try {
      skriv(JSON.parse(kontroll.value));
      melding.hidden = true;
      kontroll.removeAttribute('aria-invalid');
    } catch (e) {
      melding.textContent = `Ikke gyldig JSON: ${e.message}`;
      melding.hidden = false;
      kontroll.setAttribute('aria-invalid', 'true');
    }
  });
  return feltramme(sti, nokkel, node, pakrevd, kontroll, melding);
}

function objektFelt(node, verdi, sti, { nokkel, pakrevd, skriv, rot, iListe }) {
  const { skjema } = node;
  if (!rot && !iListe && verdi === undefined && !pakrevd) {
    return el(
      'div',
      { class: 'valgfritt-objekt', 'data-sti': peker(sti) },
      knapp(`Legg til ${etikettFor(nokkel, skjema).toLowerCase()}`, () => {
        skriv(standardverdi(node));
        tilstand.apne.set(peker(sti), true);
        tegnSkjema();
      }),
      el('code', { class: 'nokkel' }, nokkel),
    );
  }
  const innhold = objektInnhold(node, verdi, sti);
  if (rot || iListe) return innhold;
  const fjern = pakrevd
    ? null
    : knapp(
        'Fjern',
        () => {
          skriv(undefined);
          tegnSkjema();
        },
        { variant: 'tertiary', farge: 'danger', etikett: `Fjern ${etikettFor(nokkel, skjema).toLowerCase()}` },
      );
  const tittel = el(
    'span',
    {},
    etikettFor(nokkel, skjema),
    pakrevd ? el('span', { class: 'pakrevd' }, ' *') : null,
    ' ',
    el('code', { class: 'nokkel' }, nokkel),
  );
  return gruppe(sti, tittel, skjema.description, innhold, fjern ? el('div', { class: 'gruppe-knapper' }, fjern) : null);
}

function objektInnhold(node, verdi, sti) {
  const { skjema, base, typenavn } = node;
  const props = skjema.properties ?? {};
  const krav = new Set(skjema.required ?? []);
  const rekkefolge = Object.keys(props);
  const obj = erObjekt(verdi) ? verdi : undefined;
  const erOpplysning = typenavn === 'Opplysning' || (props.domene && props.data && props.hovedverdi);
  const beholder = el('div', { class: 'objekt' });

  for (const [k, delskjema] of Object.entries(props)) {
    const barnSti = [...sti, k];
    const valg = { nokkel: k, pakrevd: krav.has(k), skriv: (v) => settFelt(sti, k, v, rekkefolge) };
    if (erOpplysning && k === 'domene')
      beholder.append(domeneFelt({ skjema: delskjema, base }, obj?.domene, barnSti, sti, { ...valg, rekkefolge }));
    else if (erOpplysning && k === 'data') beholder.append(dataFelt(obj?.domene, obj?.data, barnSti, valg));
    else beholder.append(felt({ skjema: delskjema, base }, obj?.[k], barnSti, valg));
  }

  const ukjente = obj ? Object.keys(obj).filter((k) => !(k in props)) : [];
  if (ukjente.length && skjema.properties) {
    beholder.append(
      el(
        'div',
        { class: 'ds-alert', 'data-color': 'warning', 'data-size': 'sm' },
        el('p', {}, `Felt som ikke står i skjemaet: ${ukjente.join(', ')}. Rediger eller fjern dem under «Rå JSON».`),
      ),
    );
  }
  return beholder;
}

function domeneFelt(node, verdi, sti, objSti, { nokkel, pakrevd, rekkefolge }) {
  const losning = los(node);
  const kontroll = el('select', { class: 'ds-input' });
  kontroll.append(el('option', { value: '' }, '(velg opplysningstype)'));
  const kjent = tilstand.domenetyper.some((d) => d.id === verdi);
  if (verdi && !kjent) kontroll.append(el('option', { value: verdi }, `${verdi} (ukjent)`));
  const domener = [...new Set(tilstand.domenetyper.map((d) => d.domene))];
  for (const domene of domener) {
    const typer = tilstand.domenetyper.filter((d) => d.domene === domene);
    kontroll.append(
      el(
        'optgroup',
        { label: typer[0].domenetittel },
        typer.map((d) => el('option', { value: d.id }, `${d.tittel} (${d.id})`)),
      ),
    );
  }
  kontroll.value = verdi ?? '';
  kontroll.addEventListener('change', () => {
    const ny = kontroll.value || undefined;
    const obj = hent(objSti) ?? {};
    const harData = erObjekt(obj.data) && Object.keys(obj.data).length > 0;
    if (
      harData &&
      ny !== obj.domene &&
      !confirm('Bytte opplysningstype? Feltene under «data» erstattes med tomme felt for den nye typen.')
    ) {
      kontroll.value = obj.domene ?? '';
      return;
    }
    settFelt(objSti, 'domene', ny, rekkefolge);
    const dn = ny ? domenenode(ny) : null;
    settFelt(objSti, 'data', dn ? standardverdi(dn.node) : {}, rekkefolge);
    const etter = hent(objSti);
    if (dn && !etter.tittel) settFelt(objSti, 'tittel', dn.type.tittel, rekkefolge);
    tilstand.apne.set(peker([...objSti, 'data']), true);
    tegnSkjema();
  });
  return feltramme(sti, nokkel, { ...losning, skjema: { ...losning.skjema, pattern: undefined } }, pakrevd, kontroll);
}

function dataFelt(domene, verdi, sti, valg) {
  const dn = domene ? domenenode(domene) : null;
  if (!dn) {
    const merknad = domene
      ? `Opplysningstypen «${domene}» finnes ikke i schemas/domener. Data kan redigeres som JSON.`
      : 'Velg opplysningstype for å få feltene til data.';
    return gruppe(sti, 'Data', merknad, jsonFelt({ skjema: {} }, verdi, sti, { ...valg, nokkel: null }));
  }
  const losning = los(dn.node);
  const tittel = el('span', {}, `Data: ${dn.type.tittel} `, el('code', { class: 'nokkel' }, 'data'));
  return gruppe(
    sti,
    tittel,
    `Skjema: ${dn.type.skjema.replace(/^https:\/\/oversikt\.local\//, '')}`,
    objektInnhold(losning, verdi, sti),
  );
}

function elementtittel(v, i) {
  const nr = `${i + 1}.`;
  if (!erObjekt(v)) return `${nr} ${v ?? ''}`;
  const kandidat =
    v.tittel ??
    v.navn ??
    v.aktor?.navn ??
    v.sammenheng?.tittel ??
    v.fag ??
    v.periode ??
    v.adresse ??
    v.bank ??
    v.kreditor ??
    v.opplysning;
  if (kandidat) return `${nr} ${kandidat}`;
  if (v.bruker && v.aktor && v.rolle) return `${nr} ${v.rolle}: ${kortId(v.bruker)} → ${kortId(v.aktor)}`;
  if (v.playwrightId) return `${nr} ${v.playwrightId}`;
  const resten = v.id ?? v.dialogId ?? v.tjenesteId ?? v.rolle ?? v.type ?? v.dato ?? v.visning;
  if (resten) return `${nr} ${resten}`;
  return `${nr} (uten tittel)`;
}

function kortId(urn) {
  return String(urn).replace(/^urn:altinn:(person|organization):identifier-no:/, '');
}

function elementmerker(v) {
  if (!erObjekt(v)) return null;
  const merker = [];
  if (v.domene) merker.push(v.domene);
  if (v.status) merker.push(v.status);
  if (v.type && (v.tittel || v.navn)) merker.push(v.type);
  if (Array.isArray(v.synligFor)) merker.push(`synlig for ${v.synligFor.join(', ')}`);
  if (!merker.length) return null;
  return el(
    'span',
    {},
    merker.map((m) => el('span', { class: 'ds-tag', 'data-color': 'neutral', 'data-size': 'sm' }, m)),
  );
}

function flyttApneTilstand(listeSti, fra, til) {
  const a = peker([...listeSti, fra]);
  const b = peker([...listeSti, til]);
  const ny = new Map();
  for (const [p, apen] of tilstand.apne) {
    if (p === a || p.startsWith(`${a}/`)) ny.set(b + p.slice(a.length), apen);
    else if (p === b || p.startsWith(`${b}/`)) ny.set(a + p.slice(b.length), apen);
    else ny.set(p, apen);
  }
  tilstand.apne = ny;
}

function fjernApneTilstand(listeSti, indeks, lengde) {
  // Elementene etter det fjernede flytter ett hakk opp.
  for (let i = indeks; i < lengde - 1; i++) flyttApneTilstand(listeSti, i, i + 1);
}

function listeFelt(node, verdi, sti, { nokkel, pakrevd, skriv, rot }) {
  const { skjema, base } = node;
  const elementnode = los({ skjema: skjema.items ?? {}, base });
  const liste = Array.isArray(verdi) ? verdi : [];
  const etikett = etikettFor(nokkel, skjema);

  // Liste av faste valg uten duplikater: avkrysningsbokser.
  if (elementnode.skjema.enum && skjema.uniqueItems) {
    const bokser = elementnode.skjema.enum.map((v) => {
      const id = nyId();
      const boks = el('input', { class: 'ds-input', type: 'checkbox', id, checked: liste.includes(v) });
      boks.addEventListener('change', () => {
        const valgt = elementnode.skjema.enum.filter((x) => (x === v ? boks.checked : (hent(sti) ?? []).includes(x)));
        skriv(valgt.length || pakrevd ? valgt : undefined);
      });
      return el('div', { class: 'ds-field' }, boks, el('label', { class: 'ds-label', for: id }, String(v)));
    });
    const beskrivelse = [skjema.description ?? elementnode.skjema.description].filter(Boolean).join(' ');
    const tittel = el(
      'span',
      {},
      etikett,
      pakrevd ? el('span', { class: 'pakrevd' }, ' *') : null,
      ' ',
      el('code', { class: 'nokkel' }, nokkel),
    );
    return gruppe(sti, tittel, beskrivelse, el('div', { class: 'avkrysning' }, bokser));
  }

  const elementErObjekt = typer(elementnode.skjema).includes('object') && !elementnode.skjema.enum;
  const elementer = liste.map((v, i) => {
    const elSti = [...sti, i];
    const flytt = (retning) => {
      const ny = [...liste];
      const j = i + retning;
      [ny[i], ny[j]] = [ny[j], ny[i]];
      flyttApneTilstand(sti, i, j);
      skriv(ny);
      tegnSkjema();
    };
    const fjern = () => {
      if (elementErObjekt && !confirm(`Fjerne «${elementtittel(v, i)}»?`)) return;
      const ny = liste.filter((_, x) => x !== i);
      fjernApneTilstand(sti, i, liste.length);
      skriv(ny.length || pakrevd || rot ? ny : undefined);
      tegnSkjema();
    };
    const knapper = [
      knapp(
        'Opp',
        (e) => {
          e.preventDefault();
          flytt(-1);
        },
        { variant: 'tertiary', etikett: 'Flytt opp' },
      ),
      knapp(
        'Ned',
        (e) => {
          e.preventDefault();
          flytt(1);
        },
        { variant: 'tertiary', etikett: 'Flytt ned' },
      ),
      knapp(
        'Fjern',
        (e) => {
          e.preventDefault();
          fjern();
        },
        {
          variant: 'tertiary',
          farge: 'danger',
          etikett: 'Fjern elementet',
        },
      ),
    ];
    knapper[0].disabled = i === 0;
    knapper[1].disabled = i === liste.length - 1;
    const elementvalg = { nokkel: null, pakrevd: true, skriv: (x) => sett(elSti, x), iListe: true };

    if (elementErObjekt) {
      return seksjon(elSti, elementtittel(v, i), felt(elementnode, v, elSti, elementvalg), {
        merkelapp: elementmerker(v),
        knapper,
        oppdater: () => {
          const naa = hent(elSti);
          return { tittel: elementtittel(naa, i), merkelapp: elementmerker(naa) };
        },
      });
    }
    return el(
      'div',
      { class: 'listerad', 'data-sti': peker(elSti) },
      felt(elementnode, v, elSti, { ...elementvalg, nokkel: `${i + 1}` }),
      el('div', { class: 'listerad-knapper' }, knapper),
    );
  });

  const leggTil = knapp(`Legg til i ${etikett.toLowerCase()}`, () => {
    const ny = [...liste, standardverdi(elementnode)];
    tilstand.apne.set(peker([...sti, ny.length - 1]), true);
    skriv(ny);
    tegnSkjema();
  });
  const tom = liste.length ? null : el('p', { class: 'ds-paragraph tom-liste', 'data-size': 'sm' }, 'Ingen elementer.');
  const innhold = el('div', { class: 'liste' }, tom, elementer, el('div', { class: 'liste-bunn' }, leggTil));

  if (rot) return innhold;
  const antall = el('span', { class: 'ds-tag', 'data-color': 'neutral', 'data-size': 'sm' }, String(liste.length));
  return seksjon(sti, etikett, innhold, {
    standardApen: sti.length === 1,
    merkelapp: el('span', {}, antall, ' ', el('code', { class: 'nokkel' }, nokkel)),
    beskrivelse: skjema.description,
  });
}

/** Feltene i en rotobjekt-fil (aktørfiler) får egne seksjoner. */
function rotFelt(node, verdi) {
  const losning = los(node);
  const { skjema, base } = losning;
  if (typer(skjema).includes('array')) {
    return listeFelt(losning, verdi, [], { nokkel: null, pakrevd: true, skriv: (v) => sett([], v), rot: true });
  }
  const props = skjema.properties ?? {};
  const krav = new Set(skjema.required ?? []);
  const rekkefolge = Object.keys(props);
  const obj = erObjekt(verdi) ? verdi : {};
  return el(
    'div',
    { class: 'rot' },
    Object.entries(props).map(([k, delskjema]) => {
      const barn = los({ skjema: delskjema, base });
      const valg = { nokkel: k, pakrevd: krav.has(k), skriv: (v) => settFelt([], k, v, rekkefolge) };
      if (typer(barn.skjema).includes('array')) return listeFelt(barn, obj[k], [k], valg);
      if (typer(barn.skjema).includes('object')) {
        const innhold = objektInnhold(barn, obj[k], [k]);
        return seksjon([k], etikettFor(k, barn.skjema), innhold, {
          standardApen: true,
          merkelapp: el('code', { class: 'nokkel' }, k),
          beskrivelse: barn.skjema.description,
        });
      }
      return felt(barn, obj[k], [k], valg);
    }),
  );
}

function tegnSkjema() {
  const rot = $('skjema');
  const y = window.scrollY;
  const skjemanode = filskjema(tilstand.fil.skjema);
  rot.replaceChildren(el('div', { 'data-sti': '' }, rotFelt(skjemanode, tilstand.verdi)));
  visFeltfeil();
  window.scrollTo(0, y);
  endret();
}

// ---------------------------------------------------------------- feil

function finnElement(sti) {
  const rot = $('skjema');
  let p = sti;
  for (;;) {
    const e = rot.querySelector(`[data-sti="${CSS.escape(p)}"]`);
    if (e) return { element: e, eksakt: p === sti, rest: sti.slice(p.length) };
    if (!p) return null;
    p = p.slice(0, p.lastIndexOf('/'));
  }
}

function apneForfedre(e) {
  for (let d = e.closest('details'); d; d = d.parentElement?.closest('details')) {
    d.open = true;
    tilstand.apne.set(d.dataset.sti, true);
  }
}

function visFeltfeil() {
  for (const f of tilstand.feil) {
    const treff = finnElement(f.sti);
    if (!treff) continue;
    const { element, eksakt, rest } = treff;
    const tekst = eksakt ? f.melding : `${rest}: ${f.melding}`;
    const melding = el('p', { class: 'ds-validation-message feltfeil', 'data-field': 'validation' }, tekst);
    if (element.tagName === 'DETAILS') element.querySelector(':scope > .seksjon-innhold').prepend(melding);
    else if (element.tagName === 'FIELDSET') element.querySelector(':scope > legend').after(melding);
    else element.append(melding);
    element.querySelector(':scope > .ds-input, :scope > select')?.setAttribute('aria-invalid', 'true');
    apneForfedre(element);
  }
}

function visMelding(type, tittel, punkter = []) {
  const boks = $('melding');
  if (!type) return boks.replaceChildren();
  const farge = { feil: 'danger', ok: 'success', info: 'info', advarsel: 'warning' }[type];
  const innhold = [el('h3', { class: 'ds-heading', 'data-size': 'xs' }, tittel)];
  if (punkter.length) {
    innhold.push(
      el(
        'ul',
        { class: 'feilliste' },
        punkter.map((f) =>
          el(
            'li',
            {},
            el(
              'a',
              {
                href: '#',
                class: 'ds-link',
                onclick: (e) => {
                  e.preventDefault();
                  gaTilFeil(f.sti);
                },
              },
              f.sti || '(hele filen)',
            ),
            ` ${f.melding}`,
          ),
        ),
      ),
    );
  }
  boks.replaceChildren(
    el('div', { class: 'ds-alert', 'data-color': farge, role: type === 'feil' ? 'alert' : 'status' }, innhold),
  );
  if (type === 'ok') setTimeout(() => boks.firstChild?.dataset.color === 'success' && boks.replaceChildren(), 4000);
}

function gaTilFeil(sti) {
  if (tilstand.fane !== 'skjema' && !byttFane('skjema')) return;
  const treff = finnElement(sti);
  if (!treff) return;
  apneForfedre(treff.element);
  treff.element.scrollIntoView({ block: 'center', behavior: 'smooth' });
  treff.element.querySelector('input, select, textarea')?.focus({ preventScroll: true });
}

// ---------------------------------------------------------------- faner

function byttFane(fane) {
  if (fane === tilstand.fane) return true;
  if (fane === 'raa') {
    $('raa').value = JSON.stringify(tilstand.verdi, null, 2);
  } else {
    try {
      tilstand.verdi = JSON.parse($('raa').value);
    } catch (e) {
      visMelding('feil', 'Rå JSON kan ikke leses', [{ sti: '', melding: e.message }]);
      return false;
    }
  }
  tilstand.fane = fane;
  $('fane-skjema').setAttribute('aria-selected', String(fane === 'skjema'));
  $('fane-raa').setAttribute('aria-selected', String(fane === 'raa'));
  $('panel-skjema').hidden = fane !== 'skjema';
  $('panel-raa').hidden = fane !== 'raa';
  if (fane === 'skjema') tegnSkjema();
  endret();
  return true;
}

// ---------------------------------------------------------------- filer

async function lastFilliste() {
  const { data } = await api('GET', '/api/filer');
  tilstand.filer = data ?? [];
  tegnFilliste();
}

function tegnFilliste() {
  const beholder = $('filliste');
  beholder.replaceChildren(
    ...GRUPPER.map((g) => {
      const filer = tilstand.filer.filter((f) => f.gruppe === g);
      if (tilstand.fil?.ny && g === 'Aktører')
        filer.push({ sti: tilstand.fil.sti, tittel: tilstand.fil.sti.split('/').pop(), ny: true });
      const punkter = filer.map((f) =>
        el(
          'li',
          {},
          el(
            'a',
            {
              href: `#${f.sti}`,
              class: 'filvalg',
              'aria-current': tilstand.fil?.sti === f.sti ? 'page' : null,
              onclick: (e) => {
                e.preventDefault();
                apneFil(f.sti);
              },
            },
            el('span', { class: 'filvalg-tittel' }, f.tittel),
            f.undertittel ? el('span', { class: 'filvalg-under' }, f.undertittel) : null,
            f.ny ? el('span', { class: 'ds-tag', 'data-color': 'warning', 'data-size': 'sm' }, 'Ny') : null,
            f.finnes === false
              ? el('span', { class: 'ds-tag', 'data-color': 'neutral', 'data-size': 'sm' }, 'Mangler')
              : null,
          ),
        ),
      );
      if (!punkter.length) punkter.push(el('li', { class: 'tom-liste' }, 'Ingen filer ennå.'));
      return el(
        'section',
        { class: 'filgruppe' },
        el('h2', { class: 'ds-heading', 'data-size': '2xs' }, g),
        el('ul', { class: 'ds-list--unstyled' }, punkter),
      );
    }),
  );
}

function kanForlate() {
  return !erEndret() || confirm('Du har endringer som ikke er lagret. Vil du forkaste dem?');
}

async function apneFil(sti, { tvungen = false } = {}) {
  if (!tvungen && tilstand.fil && !kanForlate()) return;
  const { ok, data } = await api('GET', `/api/fil?sti=${encodeURIComponent(sti)}`);
  if (!ok) {
    visMelding('feil', data?.melding ?? 'Kunne ikke åpne filen.');
    return;
  }
  const info = tilstand.filer.find((f) => f.sti === sti) ?? {};
  tilstand.fil = { sti, skjema: data.skjema, finnes: data.finnes, kanSlettes: info.kanSlettes ?? false, ny: false };
  tilstand.apne = new Map();
  tilstand.feil = [];
  visMelding(null);

  if (!data.finnes) {
    tilstand.verdi = standardverdi(filskjema(data.skjema));
    tilstand.lagretTekst = kanonisk(tilstand.verdi);
    visMelding('info', 'Filen finnes ikke ennå. Den opprettes når du lagrer.');
  } else if (data.lesefeil) {
    tilstand.verdi = null;
    tilstand.lagretTekst = null;
  } else {
    tilstand.verdi = data.innhold;
    tilstand.lagretTekst = kanonisk(data.innhold);
  }
  history.replaceState(null, '', `#${sti}`);
  visRedigering();
  if (data.lesefeil) {
    tilstand.fane = 'skjema';
    byttFaneTilRaa(data.tekst);
    visMelding('feil', data.lesefeil);
  }
}

function byttFaneTilRaa(tekst) {
  tilstand.fane = 'raa';
  $('raa').value = tekst;
  $('fane-skjema').setAttribute('aria-selected', 'false');
  $('fane-raa').setAttribute('aria-selected', 'true');
  $('panel-skjema').hidden = true;
  $('panel-raa').hidden = false;
  endret();
}

function visRedigering() {
  const { fil } = tilstand;
  $('tom').hidden = true;
  $('redigering').hidden = false;
  const info = tilstand.filer.find((f) => f.sti === fil.sti);
  $('fil-tittel').textContent = info?.tittel ?? fil.sti.split('/').pop();
  $('fil-sti').textContent = fil.sti;
  $('fil-skjema').textContent = `kildedata #/$defs/${fil.skjema}`;
  $('slett').hidden = !(fil.kanSlettes || fil.ny);
  $('slett').textContent = fil.ny ? 'Forkast ny aktør' : 'Slett aktørfil';
  tegnFilliste();
  if (tilstand.fane === 'raa') {
    $('raa').value = JSON.stringify(tilstand.verdi, null, 2);
    endret();
  } else tegnSkjema();
}

function visTom() {
  tilstand.fil = null;
  tilstand.verdi = undefined;
  $('tom').hidden = false;
  $('redigering').hidden = true;
  history.replaceState(null, '', location.pathname);
  tegnFilliste();
}

async function lagre() {
  if (tilstand.fane === 'raa') {
    try {
      tilstand.verdi = JSON.parse($('raa').value);
    } catch (e) {
      visMelding('feil', 'Rå JSON kan ikke leses', [{ sti: '', melding: e.message }]);
      return;
    }
  }
  const knappEl = $('lagre');
  knappEl.setAttribute('aria-busy', 'true');
  try {
    const { status, ok, data } = await api(
      'PUT',
      `/api/fil?sti=${encodeURIComponent(tilstand.fil.sti)}`,
      JSON.stringify(tilstand.verdi),
    );
    if (ok) {
      tilstand.lagretTekst = kanonisk(tilstand.verdi);
      tilstand.feil = [];
      tilstand.fil.ny = false;
      tilstand.fil.finnes = true;
      await lastFilliste();
      const info = tilstand.filer.find((f) => f.sti === tilstand.fil.sti);
      tilstand.fil.kanSlettes = info?.kanSlettes ?? false;
      visRedigering();
      visMelding('ok', 'Lagret.');
    } else if (status === 422) {
      tilstand.feil = data?.feil ?? [];
      if (tilstand.fane === 'skjema') tegnSkjema();
      visMelding('feil', data?.melding ?? 'Filen ble ikke lagret.', tilstand.feil);
      $('melding').scrollIntoView({ block: 'nearest' });
    } else {
      visMelding('feil', data?.melding ?? `Lagring feilet (${status}).`);
    }
  } catch (e) {
    visMelding('feil', `Lagring feilet: ${e.message}`);
  } finally {
    knappEl.removeAttribute('aria-busy');
    endret();
  }
}

async function slett() {
  const { fil } = tilstand;
  if (fil.ny) {
    if (!confirm('Forkaste den nye aktøren? Den er ikke lagret.')) return;
    return visTom();
  }
  if (!confirm(`Slette ${fil.sti}? Filen fjernes fra disken, og dette kan ikke angres i appen.`)) return;
  const { ok, data } = await api('DELETE', `/api/fil?sti=${encodeURIComponent(fil.sti)}`);
  if (!ok) return visMelding('feil', data?.melding ?? 'Kunne ikke slette filen.');
  tilstand.lagretTekst = kanonisk(tilstand.verdi);
  await lastFilliste();
  visTom();
}

function nyAktor(e) {
  e.preventDefault();
  const felt = $('ny-aktor-slug');
  const slug = felt.value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    felt.setAttribute('aria-invalid', 'true');
    felt.focus();
    return;
  }
  felt.removeAttribute('aria-invalid');
  const sti = `data/aktorer/${slug}.json`;
  if (tilstand.filer.some((f) => f.sti === sti)) {
    apneFil(sti);
    return;
  }
  if (tilstand.fil && !kanForlate()) return;
  const verdi = standardverdi(filskjema('Aktorkilde'));
  verdi.aktor = {
    id: 'urn:altinn:person:identifier-no:',
    type: 'person',
    navn: slug.charAt(0).toUpperCase() + slug.slice(1),
  };
  tilstand.fil = { sti, skjema: 'Aktorkilde', finnes: false, kanSlettes: false, ny: true };
  tilstand.verdi = verdi;
  tilstand.lagretTekst = null;
  tilstand.apne = new Map();
  tilstand.feil = [];
  felt.value = '';
  history.replaceState(null, '', `#${sti}`);
  visMelding('info', 'Ny aktørfil. Fyll ut aktøren og lagre for å opprette filen.');
  visRedigering();
}

function settAlleSeksjoner(apen) {
  for (const d of $('skjema').querySelectorAll('details')) {
    d.open = apen;
    tilstand.apne.set(d.dataset.sti, apen);
  }
}

// ---------------------------------------------------------------- oppstart

async function start() {
  const [skjema, domenetyper] = await Promise.all([api('GET', '/api/skjema'), api('GET', '/api/domenetyper')]);
  tilstand.kildedataId = skjema.data.kildedata;
  tilstand.skjemaer = skjema.data.skjemaer;
  tilstand.domenetyper = domenetyper.data ?? [];
  await lastFilliste();

  $('lagre').addEventListener('click', lagre);
  $('angre').addEventListener('click', () => {
    if (!erEndret()) return;
    if (!confirm('Forkaste alle endringer siden sist lagring?')) return;
    if (tilstand.fil.ny) return visTom();
    apneFil(tilstand.fil.sti, { tvungen: true });
  });
  $('slett').addEventListener('click', slett);
  $('ny-aktor').addEventListener('submit', nyAktor);
  $('fane-skjema').addEventListener('click', () => byttFane('skjema'));
  $('fane-raa').addEventListener('click', () => byttFane('raa'));
  $('raa').addEventListener('input', endret);
  $('apne-alle').addEventListener('click', () => settAlleSeksjoner(true));
  $('lukk-alle').addEventListener('click', () => settAlleSeksjoner(false));

  // Oppdater sammendragene (titler i lukkbare seksjoner) mens man skriver.
  const oppdaterForfedre = (e) => {
    for (let d = e.target.closest('details'); d; d = d.parentElement?.closest('details')) d._oppdater?.();
    const felt = e.target.closest('.felt');
    if (felt) {
      for (const m of felt.querySelectorAll(':scope > .feltfeil')) m.remove();
      e.target.removeAttribute('aria-invalid');
    }
  };
  $('skjema').addEventListener('input', oppdaterForfedre);
  $('skjema').addEventListener('change', oppdaterForfedre);

  window.addEventListener('beforeunload', (e) => {
    if (erEndret()) e.preventDefault();
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && tilstand.fil) {
      e.preventDefault();
      lagre();
    }
  });

  const fraAdresse = decodeURIComponent(location.hash.slice(1));
  if (fraAdresse && tilstand.filer.some((f) => f.sti === fraAdresse)) await apneFil(fraAdresse);
}

start().catch((e) => {
  document.body.prepend(
    el('div', { class: 'ds-alert', 'data-color': 'danger' }, `Appen kunne ikke starte: ${e.message}`),
  );
});
