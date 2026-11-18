import {
  Alert,
  Badge,
  Button,
  ButtonGroup,
  DashboardCard,
  DashboardHeader,
  Flex,
  Grid,
  Heading,
  List,
  ListItem,
  PageBase,
  Section,
  Typography,
} from '@altinn/altinn-components';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router';
import type { Involvert, Opplysning, Oversikt, Steg } from '../../../../oversikt-api/src/typer.ts';
import { useDialogerForAktorer, useOversikt, useTilganger } from '../../api/oversikt.ts';
import { usePageTitle } from '../../hooks/usePageTitle.ts';
import {
  aktorSti,
  dialogSti,
  dialogstatusTilStatus,
  formaterDato,
  grupperEtter,
  medMock,
  statusBadge,
  storForbokstav,
  synlighetstekst,
  tekst,
  tjenesteSti,
} from './felles.ts';
import { HandlingKnapp } from './HandlingKnapp.tsx';
import styles from './oversikt.module.css';

/**
 * Ett generisk dashbord for alle aktører og livssituasjoner. Siden kjenner ikke domenene:
 * den tegner livssituasjoner, steg og opplysninger ut fra kjernefeltene i Oversikt-API.
 */
export const AktorOversikt = () => {
  const { t } = useTranslation();
  const { aktorId = '' } = useParams();
  const id = decodeURIComponent(aktorId);
  const { data: oversikt, isLoading, isError } = useOversikt(id);
  usePageTitle({ baseTitle: oversikt?.tilgang.aktor.navn ?? t('oversikt.tittel') });

  if (isError) {
    return (
      <PageBase>
        <Alert variant="danger" heading={t('oversikt.feil.tittel')} message={t('oversikt.feil.tekst')} />
      </PageBase>
    );
  }
  if (isLoading || !oversikt) {
    return (
      <PageBase>
        <DashboardHeader loading />
      </PageBase>
    );
  }
  return <Dashbord oversikt={oversikt} />;
};

const tilstandsfarge = { ferdig: 'success', venter: 'warning', info: 'neutral' } as const;

const Dashbord = ({ oversikt }: { oversikt: Oversikt }) => {
  const { t } = useTranslation();
  const { search } = useLocation();
  const navigate = useNavigate();
  const { tilgang, livssituasjoner, opplysninger, tjenesteforslag, dialoger, sammenhenger } = oversikt;
  const { aktor, rolle } = tilgang;
  const { data: tilganger = [] } = useTilganger();
  const { data: dialogdata = [] } = useDialogerForAktorer([aktor.id]);
  const [faser, setFaser] = useState<Record<string, string>>({});
  const [visSynlighet, setVisSynlighet] = useState(false);
  const ga = (sti: string) => navigate(medMock(sti, search));

  const dialog = (dialogId: string | undefined) => dialogdata.find((kandidat) => kandidat.id === dialogId);
  const stegIder = new Set(livssituasjoner.flatMap((l) => l.faser.flatMap((f) => f.steg.map((s) => s.dialogId))));
  const meldinger = dialoger.filter((referanse) => !stegIder.has(referanse.dialogId));
  const erSelv = rolle === 'selv';
  const fornavn = aktor.navn.split(' ')[0];
  const harPrivat = opplysninger.some((o) => o.synligFor?.length === 1 && o.synligFor[0] === rolle);
  const grupper = grupperEtter(oversikt.involverte ?? [], (involvert: Involvert) => involvert.gruppe);
  // Hvem som har opplysninger om aktøren, avledet av kildene på opplysningene.
  const kilder = grupperEtter(
    opplysninger.map((opplysning) => opplysning.kilde),
    (kilde) => kilde.virksomhet,
  );

  const stegItem = (steg: Steg) => {
    const fraDialog = dialog(steg.dialogId);
    const status = (fraDialog && dialogstatusTilStatus[fraDialog.status]) || steg.status;
    const frist = fraDialog?.dueAt ?? steg.frist;
    const beskrivelse = [
      steg.ansvarlig,
      frist ? `${t('oversikt.frist')}: ${formaterDato(frist)}` : steg.fristtekst,
      steg.beskrivelse,
      steg.bruker?.length
        ? `${t('oversikt.bruker')}: ${steg.bruker.map((b) => `${b.opplysning} (${b.kilde})`).join(', ')}`
        : undefined,
      visSynlighet ? synlighetstekst(steg.synligFor, rolle, t) : undefined,
    ]
      .filter(Boolean)
      .join(' · ');
    const sti = steg.dialogId
      ? dialogSti(steg.dialogId)
      : steg.tjenesteId
        ? tjenesteSti(steg.tjenesteId, aktor.id)
        : undefined;
    return (
      <ListItem
        key={steg.id}
        id={steg.id}
        title={steg.tittel}
        description={beskrivelse}
        badge={statusBadge(status, t)}
        as={sti ? 'button' : undefined}
        interactive={Boolean(sti)}
        linkIcon={Boolean(sti) && !steg.handling}
        onClick={sti ? () => ga(sti) : undefined}
        controls={steg.handling ? <HandlingKnapp handling={steg.handling} aktorId={aktor.id} /> : undefined}
      />
    );
  };

  return (
    <PageBase>
      <nav aria-label={t('oversikt.velg_aktor')}>
        <ButtonGroup wrap size="sm">
          {tilganger.map((annen) => (
            <Button
              key={annen.aktor.id}
              variant={annen.aktor.id === aktor.id ? 'solid' : 'outline'}
              aria-current={annen.aktor.id === aktor.id ? 'page' : undefined}
              onClick={() => ga(aktorSti(annen.aktor.id))}
            >
              {annen.rolle === 'selv' ? t('oversikt.meg_selv') : annen.aktor.navn}
            </Button>
          ))}
        </ButtonGroup>
      </nav>

      <DashboardHeader
        icon={{ name: aktor.navn, type: aktor.type === 'person' ? 'person' : 'company' }}
        title={erSelv ? t('oversikt.hei', { navn: fornavn }) : aktor.navn}
        description={erSelv ? aktor.beskrivelse : `${aktor.beskrivelse ?? ''} · ${tilgang.rolletekst ?? ''}`}
      >
        <Flex spacing="sm" align="center">
          <Button
            variant="outline"
            size="sm"
            aria-pressed={visSynlighet}
            onClick={() => setVisSynlighet((verdi) => !verdi)}
          >
            {visSynlighet ? t('oversikt.skjul_synlighet') : t('oversikt.vis_synlighet')}
          </Button>
        </Flex>
      </DashboardHeader>

      {erSelv && harPrivat && (
        <Alert variant="info" heading={t('oversikt.privat.tittel')} message={t('oversikt.privat.tekst')} />
      )}

      {(oversikt.kildestatus ?? []).map((status) => (
        <Alert
          key={`${status.kilde.virksomhet}-${status.kilde.system}`}
          variant="warning"
          heading={t('oversikt.kildestatus.tittel', {
            kilde: storForbokstav(status.kilde.system ?? status.kilde.virksomhet),
          })}
          message={status.melding}
        >
          {status.handling && <HandlingKnapp handling={status.handling} aktorId={aktor.id} />}
        </Alert>
      ))}

      {sammenhenger.map((sammenheng) => (
        <Alert key={sammenheng.id} variant="info" heading={sammenheng.tittel} message={sammenheng.beskrivelse}>
          <ButtonGroup wrap size="sm">
            {(sammenheng.handlinger ?? [])
              .filter((handling) => !(handling.type === 'aktor' && handling.mal === aktor.id))
              .map((handling) => (
                <HandlingKnapp key={handling.tittel} handling={handling} aktorId={aktor.id} />
              ))}
          </ButtonGroup>
        </Alert>
      ))}

      <div className={styles.kolonner}>
        <Flex direction="col" spacing={6}>
          {livssituasjoner.map((livssituasjon) => {
            const aktiv = faser[livssituasjon.id] ?? livssituasjon.aktivFase ?? livssituasjon.faser[0].id;
            const fase = livssituasjon.faser.find((kandidat) => kandidat.id === aktiv) ?? livssituasjon.faser[0];
            return (
              <Section key={livssituasjon.id} spacing={4}>
                <Flex justify="between" align="center" spacing="sm" className={styles.wrap}>
                  <Heading as="h2" size="lg">
                    {livssituasjon.tittel}
                  </Heading>
                  {livssituasjon.faser.length > 1 && (
                    <ButtonGroup size="sm">
                      {livssituasjon.faser.map((kandidat) => (
                        <Button
                          key={kandidat.id}
                          variant={kandidat.id === fase.id ? 'solid' : 'tinted'}
                          aria-pressed={kandidat.id === fase.id}
                          onClick={() => setFaser((forrige) => ({ ...forrige, [livssituasjon.id]: kandidat.id }))}
                        >
                          {kandidat.tittel}
                        </Button>
                      ))}
                    </ButtonGroup>
                  )}
                </Flex>
                {fase.beskrivelse && <Typography variant="subtle">{fase.beskrivelse}</Typography>}
                <List>{fase.steg.map(stegItem)}</List>
                {livssituasjon.forklaring && (
                  <details className={styles.forklaring}>
                    <summary>{t('oversikt.hvorfor')}</summary>
                    <Typography size="sm">{livssituasjon.forklaring}</Typography>
                  </details>
                )}
              </Section>
            );
          })}

          {opplysninger.length > 0 && (
            <Section spacing={4}>
              <Heading as="h2" size="lg">
                {t('oversikt.opplysninger')}
              </Heading>
              {oversikt.lagresTil && (
                <Typography variant="subtle" size="sm">
                  {t('oversikt.slettes', { dato: formaterDato(oversikt.lagresTil) })}
                </Typography>
              )}
              <Grid cols={2} spacing="md">
                {opplysninger.map((opplysning) => (
                  <OpplysningKort
                    key={opplysning.id}
                    opplysning={opplysning}
                    aktorId={aktor.id}
                    synlighet={visSynlighet ? synlighetstekst(opplysning.synligFor, rolle, t) : undefined}
                    privat={opplysning.synligFor?.length === 1 && opplysning.synligFor[0] === rolle && erSelv}
                  />
                ))}
              </Grid>
            </Section>
          )}

          {meldinger.length > 0 && (
            <Section spacing={4}>
              <Heading as="h2" size="lg">
                {t('oversikt.meldinger')}
              </Heading>
              <List>
                {meldinger.map((referanse) => {
                  const funnet = dialog(referanse.dialogId);
                  return (
                    <ListItem
                      key={referanse.dialogId}
                      id={referanse.dialogId}
                      title={tekst(funnet?.content?.title) || referanse.dialogId}
                      description={[
                        tekst(funnet?.content?.senderName),
                        tekst(funnet?.content?.summary),
                        visSynlighet ? synlighetstekst(referanse.synligFor, rolle, t) : undefined,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                      as="button"
                      interactive
                      linkIcon
                      onClick={() => ga(dialogSti(referanse.dialogId))}
                    />
                  );
                })}
              </List>
            </Section>
          )}
        </Flex>

        <Flex as="aside" direction="col" spacing={6}>
          {tjenesteforslag.length > 0 && (
            <Section spacing={3}>
              <Heading as="h2" size="md">
                {t('oversikt.tjenester')}
              </Heading>
              <Typography variant="subtle" size="xs">
                {t('oversikt.tjenester.kilde')}
              </Typography>
              <List>
                {tjenesteforslag.map((forslag) => (
                  <ListItem
                    key={forslag.tjenesteId}
                    id={forslag.tjenesteId}
                    title={forslag.tittel}
                    description={[forslag.ansvarlig, forslag.begrunnelse].filter(Boolean).join(' · ')}
                    as="button"
                    interactive
                    linkIcon
                    onClick={() => ga(tjenesteSti(forslag.tjenesteId, aktor.id))}
                  />
                ))}
              </List>
            </Section>
          )}

          {[...grupper].map(([gruppe, involverte]) => (
            <Section key={gruppe} spacing={3}>
              <Heading as="h2" size="md">
                {gruppe}
              </Heading>
              <List>
                {involverte.map((involvert) => (
                  <ListItem
                    key={involvert.navn}
                    id={`involvert-${involvert.navn}`}
                    icon={{ name: involvert.navn, type: involvert.type === 'organisasjon' ? 'company' : 'person' }}
                    title={involvert.erDeg ? `${involvert.navn} (${t('oversikt.deg')})` : involvert.navn}
                    description={involvert.beskrivelse}
                    badge={
                      involvert.tilstand
                        ? {
                            label: involvert.tilstand.tekst,
                            color: tilstandsfarge[involvert.tilstand.type],
                            variant: 'tinted',
                            size: 'sm',
                          }
                        : undefined
                    }
                  />
                ))}
              </List>
            </Section>
          ))}

          {kilder.size > 0 && (
            <Section spacing={3}>
              <Heading as="h2" size="md">
                {t('oversikt.hvem_har_opplysninger', { navn: erSelv ? t('oversikt.deg') : fornavn })}
              </Heading>
              <List>
                {[...kilder].map(([virksomhet, fraVirksomhet]) => (
                  <ListItem
                    key={virksomhet}
                    id={`kilde-${virksomhet}`}
                    title={virksomhet}
                    description={[...new Set(fraVirksomhet.map((kilde) => kilde.system).filter(Boolean))].join(', ')}
                  />
                ))}
              </List>
            </Section>
          )}

          {(oversikt.hjelp ?? []).map((hjelp) => (
            <Section key={hjelp.tittel} spacing={3}>
              <Heading as="h2" size="md">
                {hjelp.tittel}
              </Heading>
              <Flex direction="col" spacing="xs" align="start">
                {hjelp.handlinger.map((handling) => (
                  <HandlingKnapp key={handling.tittel} handling={handling} aktorId={aktor.id} variant="ghost" />
                ))}
              </Flex>
            </Section>
          ))}
        </Flex>
      </div>
    </PageBase>
  );
};

const OpplysningKort = ({
  opplysning,
  aktorId,
  synlighet,
  privat,
}: {
  opplysning: Opplysning;
  aktorId: string;
  synlighet?: string;
  privat: boolean;
}) => {
  const { t } = useTranslation();
  const { kilde } = opplysning;
  return (
    <DashboardCard title={opplysning.tittel} theme={privat ? 'tinted' : 'default'}>
      <Flex direction="col" spacing="xs" align="start">
        <Typography size="lg">
          <strong>{opplysning.hovedverdi}</strong>
        </Typography>
        {opplysning.beskrivelse && (
          <Typography variant="subtle" size="sm">
            {opplysning.beskrivelse}
          </Typography>
        )}
        {opplysning.merknad && (
          <Badge
            label={opplysning.merknad.tekst}
            color={opplysning.merknad.alvorlighet === 'advarsel' ? 'warning' : 'info'}
            variant="tinted"
            size="sm"
          />
        )}
        {privat && <Badge label={t('oversikt.synlighet.bare_deg')} color="success" variant="tinted" size="sm" />}
        {synlighet && !privat && <Badge label={synlighet} color="neutral" variant="outline" size="sm" />}
        {opplysning.handling && <HandlingKnapp handling={opplysning.handling} aktorId={aktorId} variant="ghost" />}
        <Typography variant="subtle" size="xs" className={styles.kilde}>
          {t('oversikt.kilde')}: {[kilde.virksomhet, kilde.system].filter(Boolean).join(', ')}
          {kilde.hentet ? ` · ${t('oversikt.hentet')} ${formaterDato(kilde.hentet)}` : ''}
        </Typography>
      </Flex>
    </DashboardCard>
  );
};
