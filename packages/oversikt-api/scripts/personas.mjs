// Tegner personakortene i docs/personas/ som SVG ut fra docs/personas/personas.json.
// Kjør: pnpm --filter oversikt-api personas
// SVG-ene vises som bilder både på GitHub og på Pages, så de bruker systemfonter og ingen eksterne ressurser.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const mappe = join(dirname(fileURLToPath(import.meta.url)), '../docs/personas');
const { personas } = JSON.parse(readFileSync(join(mappe, 'personas.json'), 'utf8'));

const FONT = "'Inter', 'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif";
const BLEKK = '#1e2b3c';
const DEMPET = '#4f5d70';
const KANT = '#d6dde6';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Omtrentlig tekstbredde for en sans-serif, nok til å bryte linjer trygt.
const tegnbredde = (c) => {
  if (c === ' ') return 0.28;
  if (/[iljtf.,:;'!|ı]/.test(c)) return 0.3;
  if (/[r()-]/.test(c)) return 0.36;
  if (/[mwMWÆæ]/.test(c)) return 0.84;
  if (/[A-ZÅØ]/.test(c)) return 0.66;
  if (/[0-9]/.test(c)) return 0.57;
  return 0.54;
};
const bredde = (tekst, storrelse) => [...tekst].reduce((sum, c) => sum + tegnbredde(c), 0) * storrelse;
const bryt = (tekst, storrelse, maks) => {
  const linjer = [];
  let linje = '';
  for (const ord of tekst.split(/\s+/)) {
    const forsok = linje ? `${linje} ${ord}` : ord;
    if (bredde(forsok, storrelse) > maks && linje) {
      linjer.push(linje);
      linje = ord;
    } else linje = forsok;
  }
  if (linje) linjer.push(linje);
  return linjer;
};
const tekstlinjer = (linjer, x, y, { storrelse, linjehoyde, farge = BLEKK, vekt = 400, anker = 'start', stil = '' }) =>
  linjer
    .map(
      (l, i) =>
        `<text x="${x}" y="${y + i * linjehoyde}" font-size="${storrelse}" font-weight="${vekt}" fill="${farge}" text-anchor="${anker}"${stil ? ` font-style="${stil}"` : ''}>${esc(l)}</text>`,
    )
    .join('');

// ---------- Avatarer (tegnet i et 200 × 200-rutenett, klippet til en sirkel) ----------

const har = (a, egenskap) => (a.detaljer ?? []).includes(egenskap);

const harBak = (a) => {
  const h = a.har;
  switch (a.harstil) {
    case 'skulder':
      return `<path d="M56 92 Q52 36 100 34 Q148 36 144 92 L150 150 Q124 160 100 152 Q76 160 50 150 Z" fill="${h}"/>`;
    case 'fletter':
      return `<circle cx="50" cy="104" r="17" fill="${h}"/><circle cx="150" cy="104" r="17" fill="${h}"/><circle cx="62" cy="96" r="5" fill="${a.aksent}"/><circle cx="138" cy="96" r="5" fill="${a.aksent}"/>`;
    case 'knute':
      return `<circle cx="100" cy="40" r="19" fill="${h}"/>`;
    default:
      return '';
  }
};

const harForan = (a) => {
  const h = a.har;
  switch (a.harstil) {
    case 'skulder':
      return `<path d="M62 96 Q58 44 102 42 Q142 44 139 92 Q134 70 116 60 Q96 76 64 84 Z" fill="${h}"/>`;
    case 'kort':
      return `<path d="M61 88 Q58 42 100 40 Q142 42 139 88 Q136 64 100 61 Q66 62 61 88 Z" fill="${h}"/>`;
    case 'bustete':
      return `<path d="M60 90 Q54 46 92 40 L98 30 L106 40 L118 33 L120 45 Q144 52 140 90 Q134 66 104 63 Q74 63 60 90 Z" fill="${h}"/>`;
    case 'fletter':
      return `<path d="M61 94 Q60 50 100 48 Q140 50 139 94 Q130 70 100 69 Q70 70 61 94 Z" fill="${h}"/>`;
    case 'knute':
      return `<path d="M61 96 Q58 50 100 47 Q142 50 139 96 Q132 66 100 63 Q68 66 61 96 Z" fill="${h}"/>`;
    case 'tynt':
      return `<path d="M61 104 Q58 70 68 60 Q72 80 70 104 Z" fill="${h}"/><path d="M139 104 Q142 70 132 60 Q128 80 130 104 Z" fill="${h}"/><path d="M76 56 Q100 46 124 56" stroke="${h}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    default:
      return '';
  }
};

const klaer = (a) => {
  const k = a.klaer;
  const barn = a.alder === 'barn';
  const kropp = barn
    ? `<path d="M36 214 Q38 160 100 154 Q162 160 164 214 Z" fill="${k}"/>`
    : `<path d="M18 214 Q20 150 100 144 Q180 150 182 214 Z" fill="${k}"/>`;
  switch (a.plagg) {
    case 'kokkejakke':
      return `${kropp}<path d="M100 146 L100 214" stroke="#c9d1db" stroke-width="2"/><g fill="#9aa6b5">${[164, 182, 200].map((y) => `<circle cx="88" cy="${y}" r="3"/><circle cx="112" cy="${y}" r="3"/>`).join('')}</g><path d="M78 148 Q100 162 122 148" stroke="#c9d1db" stroke-width="3" fill="none"/>`;
    case 'blazer':
      return `${kropp}<path d="M84 148 L100 186 L116 148 Z" fill="#f4f1ec"/><path d="M80 148 L96 190 L84 214 M120 148 L104 190 L116 214" stroke="rgba(0,0,0,.18)" stroke-width="3" fill="none"/>`;
    case 'hettegenser':
      return `${kropp}<path d="M70 150 Q100 176 130 150" stroke="rgba(0,0,0,.2)" stroke-width="5" fill="none"/><path d="M90 168 L88 196 M110 168 L112 196" stroke="#f4f1ec" stroke-width="3" stroke-linecap="round"/><path d="M40 168 Q44 190 46 214 M160 168 Q156 190 154 214" stroke="${a.aksent}" stroke-width="7" fill="none"/>`;
    case 'kjole':
      return `${kropp}<path d="M80 158 Q100 172 120 158 L114 168 Q100 176 86 168 Z" fill="#ffffff"/>`;
    case 'cardigan':
      return `${kropp}<path d="M100 148 L100 214" stroke="rgba(0,0,0,.2)" stroke-width="2"/><g fill="rgba(255,255,255,.7)">${[166, 184, 202].map((y) => `<circle cx="106" cy="${y}" r="3"/>`).join('')}</g><path d="M82 148 Q100 160 118 148" stroke="#f4f1ec" stroke-width="5" fill="none"/>`;
    case 'dress':
      return `${kropp}<path d="M86 148 L100 176 L114 148 Z" fill="#f4f1ec"/><path d="M100 156 L95 168 L100 196 L105 168 Z" fill="#7a4b3a"/>`;
    default:
      return kropp;
  }
};

const ansikt = (a) => {
  const s = a.hud;
  const skygge = a.hudskygge;
  const barn = a.alder === 'barn';
  const eldre = a.alder === 'eldre';
  const hy = barn ? 98 : 92;
  const deler = [];
  deler.push(`<rect x="88" y="${barn ? 122 : 118}" width="24" height="34" rx="9" fill="${skygge}"/>`);
  deler.push(
    `<circle cx="${barn ? 60 : 62}" cy="${hy + 4}" r="8" fill="${s}"/><circle cx="${barn ? 140 : 138}" cy="${hy + 4}" r="8" fill="${s}"/>`,
  );
  deler.push(`<ellipse cx="100" cy="${hy}" rx="${barn ? 41 : 38}" ry="${barn ? 42 : 45}" fill="${s}"/>`);
  if (har(a, 'skjegg')) {
    deler.push(
      `<path d="M63 ${hy + 4} Q62 ${hy + 50} 100 ${hy + 50} Q138 ${hy + 50} 137 ${hy + 4} Q132 ${hy + 34} 100 ${hy + 36} Q68 ${hy + 34} 63 ${hy + 4} Z" fill="${a.har}" opacity=".92"/>`,
    );
  }
  const oy = hy + 2;
  deler.push(
    `<circle cx="86" cy="${oy}" r="${eldre ? 3.2 : 3.8}" fill="#2a2522"/><circle cx="114" cy="${oy}" r="${eldre ? 3.2 : 3.8}" fill="#2a2522"/>`,
  );
  if (!eldre && !har(a, 'briller')) {
    deler.push(
      `<circle cx="87.2" cy="${oy - 1.2}" r="1.1" fill="#fff"/><circle cx="115.2" cy="${oy - 1.2}" r="1.1" fill="#fff"/>`,
    );
  }
  const bryn = a.bryn ?? a.har;
  deler.push(
    `<path d="M78 ${oy - 11} Q86 ${oy - 15} 93 ${oy - 11}" stroke="${bryn}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M107 ${oy - 11} Q114 ${oy - 15} 122 ${oy - 11}" stroke="${bryn}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  );
  deler.push(
    `<path d="M100 ${oy + 6} Q96 ${oy + 16} 101 ${oy + 18}" stroke="${skygge}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
  );
  if (har(a, 'kinn') || barn) {
    deler.push(
      `<circle cx="80" cy="${oy + 16}" r="7" fill="#e8806f" opacity=".28"/><circle cx="120" cy="${oy + 16}" r="7" fill="#e8806f" opacity=".28"/>`,
    );
  }
  if (har(a, 'bart')) {
    deler.push(
      `<path d="M86 ${oy + 24} Q100 ${oy + 16} 114 ${oy + 24} Q100 ${oy + 22} 86 ${oy + 24} Z" fill="${a.har}"/>`,
    );
  }
  const munn =
    a.munn === 'rolig'
      ? `M91 ${oy + 28} Q100 ${oy + 31} 109 ${oy + 28}`
      : `M89 ${oy + 26} Q100 ${oy + 35} 111 ${oy + 26}`;
  deler.push(`<path d="${munn}" stroke="#8a4a3c" stroke-width="2.6" fill="none" stroke-linecap="round"/>`);
  if (eldre) {
    deler.push(
      `<g stroke="${skygge}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".9"><path d="M84 ${hy - 30} Q100 ${hy - 33} 116 ${hy - 30}"/><path d="M73 ${oy + 2} l-5 -2 M73 ${oy + 5} l-5 2 M127 ${oy + 2} l5 -2 M127 ${oy + 5} l5 2"/><path d="M84 ${oy + 22} Q82 ${oy + 28} 85 ${oy + 33} M116 ${oy + 22} Q118 ${oy + 28} 115 ${oy + 33}"/></g>`,
    );
  }
  if (har(a, 'briller')) {
    deler.push(
      `<g stroke="#3a3a44" stroke-width="2.4" fill="rgba(255,255,255,.18)"><rect x="73" y="${oy - 9}" width="25" height="19" rx="8"/><rect x="102" y="${oy - 9}" width="25" height="19" rx="8"/></g><path d="M98 ${oy - 2} Q100 ${oy - 4} 102 ${oy - 2}" stroke="#3a3a44" stroke-width="2.4" fill="none"/>`,
    );
  }
  if (har(a, 'orepynt')) {
    deler.push(
      `<circle cx="62" cy="${hy + 14}" r="3.2" fill="#d4a62a"/><circle cx="138" cy="${hy + 14}" r="3.2" fill="#d4a62a"/>`,
    );
  }
  return deler.join('');
};

const butikk = (a) => {
  const striper = Array.from(
    { length: 6 },
    (_, i) => `<rect x="${40 + i * 20}" y="70" width="10" height="24" fill="#ffffff"/>`,
  ).join('');
  const buer = Array.from(
    { length: 6 },
    (_, i) => `<path d="M${40 + i * 20} 94 a10 10 0 0 0 20 0 Z" fill="${i % 2 ? '#ffffff' : a.aksent}"/>`,
  ).join('');
  return `<rect x="46" y="92" width="108" height="100" fill="#fbf7f2"/><rect x="40" y="70" width="120" height="24" fill="${a.aksent}"/>${striper}${buer}<rect x="56" y="54" width="88" height="16" rx="3" fill="${BLEKK}"/><text x="100" y="66" font-size="9.5" font-weight="700" fill="#fff" text-anchor="middle" letter-spacing="1.2">LYKKE BISTRO</text><rect x="58" y="112" width="40" height="34" rx="3" fill="#cfe3f5"/><path d="M58 129 H98 M78 112 V146" stroke="#fff" stroke-width="2"/><rect x="108" y="112" width="34" height="80" rx="3" fill="#6b4a36"/><circle cx="135" cy="152" r="2.4" fill="#e0b64a"/><rect x="62" y="158" width="32" height="20" rx="3" fill="${a.aksent}" opacity=".85"/><path d="M68 168 h20" stroke="#fff" stroke-width="2"/><rect x="30" y="192" width="140" height="10" fill="#c7ccd3"/>`;
};

const avatar = (a, cx, cy, r, id) => {
  const skala = r / 100;
  const innhold = a.type === 'virksomhet' ? butikk(a) : `${harBak(a)}${klaer(a)}${ansikt(a)}${harForan(a)}`;
  const filter = a.dempet ? ` filter="url(#dempet-${id})"` : '';
  return `<defs><clipPath id="klipp-${id}"><circle cx="100" cy="100" r="100"/></clipPath>${a.dempet ? `<filter id="dempet-${id}"><feColorMatrix type="saturate" values="0.35"/></filter>` : ''}</defs><g transform="translate(${cx - r} ${cy - r}) scale(${skala})"><circle cx="100" cy="100" r="100" fill="${a.bakgrunn}"/><g clip-path="url(#klipp-${id})"${filter}>${innhold}</g><circle cx="100" cy="100" r="98.5" fill="none" stroke="#ffffff" stroke-width="3"/></g>`;
};

// ---------- Personakort ----------

const ikonPunkt = (x, y, farge, type) =>
  type === 'hake'
    ? `<circle cx="${x}" cy="${y}" r="8" fill="${farge}"/><path d="M${x - 3.6} ${y} l2.6 2.8 l4.8 -5.4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
    : type === 'varsel'
      ? `<circle cx="${x}" cy="${y}" r="8" fill="#fbe3df"/><path d="M${x} ${y - 4} v4.6" stroke="#b42318" stroke-width="2.2" stroke-linecap="round"/><circle cx="${x}" cy="${y + 3.8}" r="1.3" fill="#b42318"/>`
      : `<circle cx="${x}" cy="${y}" r="4" fill="${farge}"/>`;

const liste = (punkter, x, y, maks, farge, type) => {
  let svg = '';
  let yy = y;
  for (const punkt of punkter) {
    const linjer = bryt(punkt, 14, maks - 24);
    svg += ikonPunkt(x + 8, yy - 5, farge, type);
    svg += tekstlinjer(linjer, x + 24, yy, { storrelse: 14, linjehoyde: 20 });
    yy += linjer.length * 20 + 10;
  }
  return { svg, hoyde: yy - y };
};

const overskrift = (tekst, x, y, farge = DEMPET) =>
  `<text x="${x}" y="${y}" font-size="11.5" font-weight="700" fill="${farge}" letter-spacing="1.1">${esc(tekst.toUpperCase())}</text>`;

const kort = (p) => {
  const B = 960;
  const VB = 300;
  const id = p.id;
  const a = p.avatar;
  const aksent = a.aksent;
  const lys = a.lys;

  // Høyre side
  const hx = VB + 36;
  const hb = B - hx - 36;
  let y = 46;
  let hoyre = '';
  hoyre += overskrift(p.etikett, hx, y, aksent);
  y += 30;
  const sit = bryt(p.situasjon, 15.5, hb);
  hoyre += tekstlinjer(sit, hx, y, { storrelse: 15.5, linjehoyde: 23 });
  y += sit.length * 23 + 18;

  const kb = (hb - 28) / 2;
  hoyre += overskrift('Behov', hx, y);
  hoyre += overskrift('Det som er vanskelig i dag', hx + kb + 28, y);
  y += 24;
  const behov = liste(p.behov, hx, y, kb, aksent, 'prikk');
  const vansk = liste(p.vanskelig, hx + kb + 28, y, kb, aksent, 'varsel');
  hoyre += behov.svg + vansk.svg;
  y += Math.max(behov.hoyde, vansk.hoyde) + 8;

  const gir = liste(p.gir, hx + 20, y + 52, hb - 40, aksent, 'hake');
  const bandHoyde = gir.hoyde + 52;
  hoyre += `<rect x="${hx}" y="${y}" width="${hb}" height="${bandHoyde}" rx="12" fill="${lys}"/>`;
  hoyre += overskrift('Det oversikten gir', hx + 20, y + 30, aksent);
  hoyre += gir.svg;
  y += bandHoyde + 22;

  let tx = hx;
  for (const tagg of p.livssituasjoner) {
    const w = bredde(tagg, 12.5) + 24;
    hoyre += `<rect x="${tx}" y="${y}" width="${w}" height="26" rx="13" fill="#fff" stroke="${aksent}" stroke-width="1.2"/><text x="${tx + w / 2}" y="${y + 17.5}" font-size="12.5" font-weight="600" fill="${aksent}" text-anchor="middle">${esc(tagg)}</text>`;
    tx += w + 8;
  }
  y += 26;
  const hoyreHoyde = y + 36;

  // Venstre side
  let v = '';
  let vy = 40;
  const r = 82;
  v += avatar(a, VB / 2, vy + r, r, id);
  vy += 2 * r + 34;
  v += tekstlinjer(bryt(p.navn, 23, VB - 40), VB / 2, vy, {
    storrelse: 23,
    linjehoyde: 28,
    vekt: 700,
    anker: 'middle',
  });
  vy += bryt(p.navn, 23, VB - 40).length * 28 - 4;
  const under = bryt(p.undertittel, 13.5, VB - 48);
  v += tekstlinjer(under, VB / 2, vy, { storrelse: 13.5, linjehoyde: 19, farge: DEMPET, anker: 'middle' });
  vy += under.length * 19 + 14;
  for (const rolle of p.roller) {
    const w = Math.min(bredde(rolle, 12.5) + 26, VB - 40);
    v += `<rect x="${(VB - w) / 2}" y="${vy}" width="${w}" height="26" rx="13" fill="#fff"/><text x="${VB / 2}" y="${vy + 17.5}" font-size="12.5" font-weight="600" fill="${BLEKK}" text-anchor="middle">${esc(rolle)}</text>`;
    vy += 32;
  }
  if (p.tall) {
    vy += 10;
    v += `<text x="${VB / 2}" y="${vy + 34}" font-size="40" font-weight="800" fill="${aksent}" text-anchor="middle">${esc(p.tall.verdi)}</text>`;
    const tl = bryt(p.tall.tekst, 12.5, VB - 60);
    v += tekstlinjer(tl, VB / 2, vy + 56, { storrelse: 12.5, linjehoyde: 17, farge: DEMPET, anker: 'middle' });
    vy += 56 + tl.length * 17;
  }
  const sitat = bryt(`«${p.sitat.tekst}»`, 15, VB - 56);
  const sitatHoyde = sitat.length * 22 + (p.sitat.hvem ? 24 : 0);
  const venstreHoyde = vy + 28 + sitatHoyde + 40;

  const H = Math.max(hoyreHoyde, venstreHoyde);
  const sy = H - 36 - sitatHoyde + 16;
  v += `<path d="M28 ${sy - 30} h${VB - 56}" stroke="${aksent}" stroke-opacity=".35" stroke-width="1.5"/>`;
  v += tekstlinjer(sitat, 28, sy, { storrelse: 15, linjehoyde: 22, stil: 'italic', farge: BLEKK });
  if (p.sitat.hvem) {
    v += `<text x="28" y="${sy + sitat.length * 22 + 4}" font-size="12.5" fill="${DEMPET}">– ${esc(p.sitat.hvem)}</text>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${H}" viewBox="0 0 ${B} ${H}" font-family="${esc(FONT)}" role="img" aria-labelledby="tittel-${id}">
<title id="tittel-${id}">Persona: ${esc(p.navn)}</title>
<defs><clipPath id="kort-${id}"><rect width="${B}" height="${H}" rx="18"/></clipPath></defs>
<g clip-path="url(#kort-${id})">
<rect width="${B}" height="${H}" fill="#ffffff"/>
<rect width="${VB}" height="${H}" fill="${lys}"/>
<circle cx="${VB - 10}" cy="${H - 30}" r="110" fill="${aksent}" opacity=".06"/>
<circle cx="30" cy="20" r="70" fill="${aksent}" opacity=".07"/>
<rect width="${B}" height="6" fill="${aksent}"/>
${v}
${hoyre}
</g>
<rect x=".75" y=".75" width="${B - 1.5}" height="${H - 1.5}" rx="17.5" fill="none" stroke="${KANT}" stroke-width="1.5"/>
</svg>
`;
};

// ---------- Familiebildet: alle avatarene på rad ----------

const galleri = () => {
  const r = 58;
  const steg = 168;
  const B = steg * personas.length + 40;
  const H = 230;
  let svg = '';
  personas.forEach((p, i) => {
    const cx = 20 + steg * i + steg / 2;
    svg += avatar(p.avatar, cx, 26 + r, r, `g-${p.id}`);
    svg += `<text x="${cx}" y="${26 + 2 * r + 30}" font-size="15" font-weight="700" fill="${BLEKK}" text-anchor="middle">${esc(p.kortnavn)}</text>`;
    svg += tekstlinjer(bryt(p.kortrolle, 12, steg - 16), cx, 26 + 2 * r + 50, {
      storrelse: 12,
      linjehoyde: 16,
      farge: DEMPET,
      anker: 'middle',
    });
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${H}" viewBox="0 0 ${B} ${H}" font-family="${esc(FONT)}" role="img" aria-label="Familien Rahimi Berg og aktørene i demoen">
<rect width="${B}" height="${H}" rx="18" fill="#f6f8fb"/>
<rect x=".75" y=".75" width="${B - 1.5}" height="${H - 1.5}" rx="17.5" fill="none" stroke="${KANT}" stroke-width="1.5"/>
${svg}
</svg>
`;
};

for (const p of personas) {
  writeFileSync(join(mappe, `${p.id}.svg`), kort(p));
}
writeFileSync(join(mappe, 'familien.svg'), galleri());
console.log(`Skrev ${personas.length} personakort og familien.svg i docs/personas/`);
