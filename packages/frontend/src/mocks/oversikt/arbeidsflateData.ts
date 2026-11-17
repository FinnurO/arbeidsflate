import { DialogStatus, type PartyFieldsFragment, type Profile } from 'bff-types-generated';
import type { AktorId } from '../../../../oversikt-api/src/typer.ts';
import { type MockDialog, mockDialog } from '../data/base/mockDialog.ts';
import { kildedata } from './kildedata.ts';

// Lager Arbeidsflates egne mockdata (profil, parties og dialoger) fra Oversikt-kildedataene,
// slik at innboksen og «Min oversikt» viser samme familie.

const nb = (value: string) => [{ value, languageCode: 'nb' }];
const plainText = (value: string) => ({ mediaType: 'text/plain', value: nb(value) });

const statuser: Record<string, DialogStatus> = {
  NotApplicable: DialogStatus.NotApplicable,
  InProgress: DialogStatus.InProgress,
  Draft: DialogStatus.Draft,
  Awaiting: DialogStatus.Awaiting,
  RequiresAttention: DialogStatus.RequiresAttention,
  Completed: DialogStatus.Completed,
};

const aktor = (id: AktorId) => kildedata.aktorer.find((kilde) => kilde.aktor.id === id)?.aktor;

const visningsnavn = (id: AktorId) => {
  const funnet = aktor(id);
  if (!funnet) {
    return id;
  }
  if (funnet.type !== 'person') {
    return funnet.navn.toUpperCase();
  }
  const deler = funnet.navn.toUpperCase().split(' ');
  return [deler.at(-1), ...deler.slice(0, -1)].join(' ');
};

const aktorerFor = (bruker: AktorId) =>
  kildedata.tilganger.filter((tilgang) => tilgang.bruker === bruker).map((tilgang) => tilgang.aktor);

export const lagParties = (bruker: AktorId): PartyFieldsFragment[] =>
  aktorerFor(bruker).map((id, indeks) => ({
    party: id,
    partyType: id.startsWith('urn:altinn:person:') ? 'Person' : 'Organization',
    subParties: [],
    name: visningsnavn(id),
    isCurrentEndUser: id === bruker,
    isDeleted: false,
    partyUuid: id.replace('identifier-no', 'uuid'),
    partyId: 9000 + indeks,
    dateOfBirth: aktor(id)?.fodselsdato ?? null,
    hasOnlyAccessToSubParties: false,
  }));

export const lagDialoger = (bruker: AktorId): MockDialog[] => {
  const parties = new Set(aktorerFor(bruker));
  return kildedata.dialoger
    .filter((dialog) => parties.has(dialog.party))
    .map((dialog) =>
      mockDialog({
        id: dialog.id,
        party: dialog.party,
        org: 'digdir',
        serviceResource: `urn:altinn:resource:${dialog.tjeneste ?? 'oversikt-mock'}`,
        status: statuser[dialog.status],
        createdAt: dialog.opprettet,
        contentUpdatedAt: dialog.opprettet,
        dueAt: dialog.frist ?? null,
        isContentSeen: Boolean(dialog.lest),
        hasUnopenedContent: !dialog.lest,
        content: {
          title: plainText(dialog.tittel),
          summary: plainText(dialog.sammendrag),
          senderName: plainText(dialog.avsender),
          extendedStatus: dialog.utvidetStatus ? plainText(dialog.utvidetStatus) : null,
        },
      }),
    );
};

export const lagProfil = (bruker: AktorId): Profile => {
  const navn = visningsnavn(bruker);
  const [etternavn, ...fornavn] = navn.split(' ');
  return {
    updatedAt: '1763366400000',
    language: 'nb',
    user: {
      userId: 90000,
      userUuid: '00000000-0000-4000-8000-000000009000',
      userName: '',
      email: 'eksempel@example.com',
      isReserved: false,
      phoneNumber: '+4799000000',
      externalIdentity: '',
      partyId: 9000,
      profileSettingPreference: { shouldShowDeletedEntities: false, preselectedPartyUuid: null },
      party: {
        partyId: 9000,
        partyUuid: bruker.replace('identifier-no', 'uuid'),
        partyTypeName: 1,
        orgNumber: '',
        ssn: '',
        unitType: null,
        name: navn,
        isDeleted: false,
        onlyHierarchyElementWithNoAccess: false,
        person: {
          ssn: '',
          name: navn,
          firstName: fornavn.join(' '),
          middleName: '',
          lastName: etternavn,
          telephoneNumber: '',
          mobileNumber: '',
          mailingAddress: 'Lykkeveien 12',
          mailingPostalCode: '9999',
          mailingPostalCity: 'LYKKE',
          addressMunicipalNumber: '9999',
          addressMunicipalName: 'LYKKE',
          addressStreetName: 'Lykkeveien',
          addressHouseNumber: '0012',
          addressHouseLetter: '',
          addressPostalCode: '9999',
          addressCity: 'LYKKE',
          dateOfDeath: null,
        },
      },
    },
  };
};

export const brukerFor = (playwrightId: string) => {
  const bruker = kildedata.brukere.find((kandidat) => kandidat.playwrightId === playwrightId);
  if (!bruker) {
    throw new Error(`Ingen bruker med playwrightId ${playwrightId} i packages/oversikt-api/data/brukere.json`);
  }
  return bruker.aktorId;
};
