import type { BadgeProps } from '@altinn/altinn-components';
import { DialogStatus } from 'bff-types-generated';
import type { Handling, Rolle, Status } from '../../../../oversikt-api/src/typer.ts';
import { FixedGlobalQueryParams } from '../Inbox/queryParams.ts';
import { PageRoutes } from '../routes.ts';

/** Beholder mock-parametrene når vi lenker internt, slik resten av Arbeidsflate gjør. */
export const medMock = (sti: string, search: string) => {
  const gjeldende = new URLSearchParams(search);
  const nye = new URLSearchParams();
  for (const navn of [FixedGlobalQueryParams.mock, FixedGlobalQueryParams.playwrightId]) {
    const verdi = gjeldende.get(navn);
    if (verdi) {
      nye.set(navn, verdi);
    }
  }
  const query = nye.toString();
  return query ? `${sti}?${query}` : sti;
};

export const aktorSti = (aktorId: string) => `${PageRoutes.oversikt}/aktor/${encodeURIComponent(aktorId)}`;
/** Tjenestesiden; med aktør vises også vurderingen for aktøren. */
export const tjenesteSti = (tjenesteId: string, aktorId?: string) =>
  aktorId
    ? `${aktorSti(aktorId)}/tjenester/${encodeURIComponent(tjenesteId)}`
    : `${PageRoutes.oversikt}/tjenester/${encodeURIComponent(tjenesteId)}`;
export const dialogSti = (dialogId: string) => PageRoutes.inboxItem.replace(':id', dialogId);

/** Ekstern adresse for en lenke-handling, eller undefined for plassholdere («#»). */
export const eksternAdresse = (handling: Handling) =>
  handling.type === 'lenke' && /^https?:\/\//.test(handling.mal) ? handling.mal : undefined;

/** Ruten en handling fører til, eller undefined for eksterne lenker og plassholdere. */
export const handlingSti = (handling: Handling, aktorId?: string) => {
  switch (handling.type) {
    case 'aktor':
      return aktorSti(handling.mal);
    case 'tjeneste':
      return tjenesteSti(handling.mal, aktorId);
    case 'dialog':
      return dialogSti(handling.mal);
    default:
      return undefined;
  }
};

const statusfarge: Record<Status, BadgeProps['color']> = {
  'ordnet-automatisk': 'success',
  utfort: 'success',
  'krever-handling': 'warning',
  'til-signering': 'warning',
  'til-behandling': 'neutral',
  'under-arbeid': 'neutral',
  utkast: 'neutral',
  venter: 'neutral',
  'ikke-startet': 'neutral',
  'ikke-aktuelt': 'neutral',
  senere: 'neutral',
  avslatt: 'danger',
};

export const statusBadge = (status: Status, t: (key: string) => string): BadgeProps => ({
  label: t(`oversikt.status.${status}`),
  color: statusfarge[status],
  variant: 'tinted',
  size: 'sm',
});

/** Dialogporten-status oversatt til stegstatus, slik at alt vises med samme merker. */
export const dialogstatusTilStatus: Partial<Record<DialogStatus, Status>> = {
  [DialogStatus.RequiresAttention]: 'krever-handling',
  [DialogStatus.InProgress]: 'under-arbeid',
  [DialogStatus.Draft]: 'utkast',
  [DialogStatus.Awaiting]: 'til-behandling',
  [DialogStatus.Completed]: 'utfort',
};

/**
 * Status for et steg: dialogens status i Dialogporten når steget har en dialog, ellers stegets egen.
 * «Avslått» har ingen egen status i Dialogporten (vedtaket er en avsluttet dialog), så den vinner.
 */
export const stegstatus = (status: Status, dialogstatus: DialogStatus | undefined): Status =>
  status === 'avslatt' ? status : ((dialogstatus && dialogstatusTilStatus[dialogstatus]) ?? status);

type Tekstverdi = { value?: { value: string; languageCode?: string | null }[] } | null | undefined;

export const tekst = (verdi: Tekstverdi) =>
  verdi?.value?.find((del) => del.languageCode === 'nb')?.value ?? verdi?.value?.[0]?.value ?? '';

export const storForbokstav = (tekst: string) => tekst.charAt(0).toUpperCase() + tekst.slice(1);

/** Grupperer i rekkefølgen elementene kommer. */
export const grupperEtter = <T>(elementer: T[], nokkel: (element: T) => string) => {
  const grupper = new Map<string, T[]>();
  for (const element of elementer) {
    grupper.set(nokkel(element), [...(grupper.get(nokkel(element)) ?? []), element]);
  }
  return grupper;
};

export const formaterDato = (dato: string | null | undefined) =>
  dato ? new Date(dato).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

/** Hvem ser elementet, sett fra den innloggede. Brukes av «Vis hvem som ser hva». */
export const synlighetstekst = (synligFor: Rolle[] | undefined, rolle: Rolle, t: (key: string) => string) => {
  if (!synligFor) {
    return t('oversikt.synlighet.alle');
  }
  const andre = synligFor.filter((annen) => annen !== rolle);
  if (andre.length === 0) {
    return t('oversikt.synlighet.bare_deg');
  }
  return andre.map((annen) => t(`oversikt.rolle.${annen}`)).join(', ');
};
