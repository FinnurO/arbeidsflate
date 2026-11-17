import type {
  Aktorkilde,
  Bruker,
  Dialogkilde,
  Kildedata,
  Sammenhengkilde,
  Tilgangkilde,
  Tjeneste,
} from '../../../../oversikt-api/src/typer.ts';

// Kildedataene ligger i packages/oversikt-api/data og redigeres i redigeringsappen der.
const filer = import.meta.glob<unknown>('../../../../oversikt-api/data/**/*.json', {
  eager: true,
  import: 'default',
});
const domenefiler = import.meta.glob<{ $defs?: Record<string, { title?: string }> }>(
  '../../../../oversikt-api/schemas/domener/*.schema.json',
  { eager: true, import: 'default' },
);

const fil = <T>(navn: string): T => {
  const treff = Object.entries(filer).find(([sti]) => sti.endsWith(`/data/${navn}`));
  return (treff?.[1] ?? []) as T;
};

export const kildedata: Kildedata = {
  brukere: fil<Bruker[]>('brukere.json'),
  tilganger: fil<Tilgangkilde[]>('tilganger.json'),
  sammenhenger: fil<Sammenhengkilde[]>('sammenhenger.json'),
  tjenester: fil<Tjeneste[]>('tjenester.json'),
  dialoger: fil<Dialogkilde[]>('dialoger.json'),
  aktorer: Object.entries(filer)
    .filter(([sti]) => sti.includes('/data/aktorer/'))
    .map(([, innhold]) => innhold as Aktorkilde),
};

export const domeneskjemaer = Object.fromEntries(
  Object.entries(domenefiler).map(([sti, skjema]) => [
    sti.split('/').pop()?.replace('.schema.json', '') ?? sti,
    skjema,
  ]),
);
