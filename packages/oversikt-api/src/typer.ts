// Typer som speiler schemas/kjerne.schema.json og schemas/kildedata.schema.json.
// Skjemaene er kilden; hold disse i takt når skjemaene endres.

export type AktorId = string;

export type Rolle = 'selv' | 'foresatt' | 'daglig-leder' | 'styreleder' | 'regnskapsforer' | 'arving';

export type Status =
  | 'ordnet-automatisk'
  | 'krever-handling'
  | 'til-signering'
  | 'til-behandling'
  | 'under-arbeid'
  | 'utkast'
  | 'venter'
  | 'utfort'
  | 'ikke-startet'
  | 'ikke-aktuelt'
  | 'senere';

export interface Kilde {
  virksomhet: string;
  orgnr?: string;
  system?: string;
  hentet?: string;
}

export interface Hjemmel {
  beskrivelse: string;
  kilde: Kilde;
}

export interface Aktor {
  id: AktorId;
  type: 'person' | 'organisasjon' | 'dodsbo';
  navn: string;
  initialer?: string;
  beskrivelse?: string;
  fodselsdato?: string;
}

export interface Tilgang {
  aktor: Aktor;
  rolle: Rolle;
  rolletekst?: string;
  hjemmel: Hjemmel;
  antallKreverHandling?: number;
}

export interface Handling {
  tittel: string;
  type: 'dialog' | 'tjeneste' | 'aktor' | 'lenke';
  mal: string;
  primar?: boolean;
}

export interface Opplysningsbruk {
  opplysning: string;
  kilde: string;
}

export interface Steg {
  id: string;
  tittel: string;
  beskrivelse?: string;
  status: Status;
  ansvarlig?: string;
  frist?: string;
  fristtekst?: string;
  bruker?: Opplysningsbruk[];
  dialogId?: string;
  tjenesteId?: string;
  handling?: Handling;
  synligFor?: Rolle[];
}

export interface Fase {
  id: string;
  tittel: string;
  beskrivelse?: string;
  steg: Steg[];
}

export interface Livssituasjon {
  id: string;
  type: string;
  tittel: string;
  aktivFase?: string;
  faser: Fase[];
}

export interface Merknad {
  tekst: string;
  alvorlighet: 'info' | 'advarsel';
}

export interface Opplysning {
  id: string;
  domene: string;
  tittel: string;
  hovedverdi: string;
  beskrivelse?: string;
  lenketekst?: string;
  merknad?: Merknad;
  kilde: Kilde;
  livssituasjon?: string;
  synligFor?: Rolle[];
  data: Record<string, unknown>;
}

export interface Tjenesteforslag {
  tjenesteId: string;
  tittel: string;
  ansvarlig: string;
  begrunnelse?: string;
  livssituasjon?: string;
  synligFor?: Rolle[];
}

export interface Dialogreferanse {
  dialogId: string;
  livssituasjon?: string;
  steg?: string;
  synligFor?: Rolle[];
}

export interface Sammenheng {
  id: string;
  fra: AktorId;
  til: AktorId;
  tittel: string;
  beskrivelse: string;
  kilder?: Kilde[];
  handlinger?: Handling[];
  krevesSamtykke?: boolean;
}

export interface Katalogfelt {
  visning: string;
  felt: string;
  dekning: 'ja' | 'sjelden' | 'nei' | 'utenfor-katalogen';
}

export interface Tjeneste {
  id: string;
  katalogUri?: string;
  tittel: string;
  beskrivelse: string;
  ansvarlig: string;
  livshendelser?: string[];
  krav?: { tittel: string; beskrivelse?: string }[];
  resultat?: string;
  relaterte?: { tjenesteId?: string; tittel: string; relasjon: string }[];
  kontaktpunkt?: string;
  katalogdekning?: Katalogfelt[];
}

export interface Domenetype {
  id: string;
  domene: string;
  tittel: string;
  skjema: string;
}

export interface Oversikt {
  tilgang: Tilgang;
  livssituasjoner: Livssituasjon[];
  opplysninger: Opplysning[];
  tjenesteforslag: Tjenesteforslag[];
  dialoger: Dialogreferanse[];
  sammenhenger: Sammenheng[];
}

// Kildedata for mocken (schemas/kildedata.schema.json)

export interface Bruker {
  id: string;
  aktorId: AktorId;
  playwrightId: string;
}

export interface Tilgangkilde {
  bruker: AktorId;
  aktor: AktorId;
  rolle: Rolle;
  rolletekst?: string;
  hjemmel: Hjemmel;
}

export interface Aktorkilde {
  aktor: Aktor;
  livssituasjoner: Livssituasjon[];
  opplysninger: Opplysning[];
  tjenesteforslag: Tjenesteforslag[];
  dialoger: Dialogreferanse[];
}

export interface Sammenhengkilde {
  bruker: AktorId;
  sammenheng: Sammenheng;
}

export interface Dialogkilde {
  id: string;
  party: AktorId;
  tittel: string;
  sammendrag: string;
  avsender: string;
  tjeneste?: string;
  status: 'NotApplicable' | 'InProgress' | 'Draft' | 'Awaiting' | 'RequiresAttention' | 'Completed';
  utvidetStatus?: string;
  frist?: string;
  opprettet: string;
  lest?: boolean;
}

export interface Kildedata {
  brukere: Bruker[];
  tilganger: Tilgangkilde[];
  aktorer: Aktorkilde[];
  sammenhenger: Sammenhengkilde[];
  tjenester: Tjeneste[];
  dialoger: Dialogkilde[];
}
