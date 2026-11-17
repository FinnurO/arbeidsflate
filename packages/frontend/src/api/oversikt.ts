import type { Oversikt, Sammenheng, Tilgang, Tjeneste } from '../../../oversikt-api/src/typer.ts';
import { useAuthenticatedQuery } from '../auth/useAuthenticatedQuery.ts';
import { QUERY_KEYS } from '../constants/queryKeys.ts';
import { searchDialogs } from './queries.ts';

// Klient for Oversikt-API (packages/oversikt-api/openapi.yaml).
const BASE = '/api/oversikt/v1';

const hent = async <T>(sti: string): Promise<T> => {
  const svar = await fetch(`${BASE}${sti}`, { credentials: 'include' });
  if (!svar.ok) {
    throw new Error(`Oversikt-API svarte ${svar.status} på ${sti}`);
  }
  return svar.json();
};

export const useTilganger = () =>
  useAuthenticatedQuery({
    queryKey: [QUERY_KEYS.OVERSIKT_TILGANGER],
    queryFn: () => hent<Tilgang[]>('/aktorer'),
  });

export const useSammenhenger = () =>
  useAuthenticatedQuery({
    queryKey: [QUERY_KEYS.OVERSIKT_SAMMENHENGER],
    queryFn: () => hent<Sammenheng[]>('/sammenhenger'),
  });

export const useOversikt = (aktorId: string | undefined) =>
  useAuthenticatedQuery({
    queryKey: [QUERY_KEYS.OVERSIKT, aktorId],
    queryFn: () => hent<Oversikt>(`/aktorer/${encodeURIComponent(aktorId ?? '')}/oversikt`),
    enabled: Boolean(aktorId),
  });

export const useTjeneste = (tjenesteId: string | undefined) =>
  useAuthenticatedQuery({
    queryKey: [QUERY_KEYS.OVERSIKT_TJENESTE, tjenesteId],
    queryFn: () => hent<Tjeneste>(`/tjenester/${encodeURIComponent(tjenesteId ?? '')}`),
    enabled: Boolean(tjenesteId),
  });

/** Dialogene i Dialogporten for aktørene, slik at oversikten kan vise tittel, status og frist derfra. */
export const useDialogerForAktorer = (aktorIder: string[]) =>
  useAuthenticatedQuery({
    queryKey: [QUERY_KEYS.OVERSIKT_DIALOGER, ...aktorIder],
    queryFn: async () => (await searchDialogs(aktorIder, undefined, undefined)).searchDialogs?.items ?? [],
    enabled: aktorIder.length > 0,
  });
