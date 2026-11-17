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
import { DialogStatus } from 'bff-types-generated';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { useDialogerForAktorer, useSammenhenger, useTilganger } from '../../api/oversikt.ts';
import { usePageTitle } from '../../hooks/usePageTitle.ts';
import { aktorSti, dialogSti, formaterDato, handlingSti, medMock, statusBadge, tekst } from './felles.ts';
import styles from './oversikt.module.css';

/** Den innloggedes samlede oversikt: hvem man handler for, sammenhenger og alt som krever handling. */
export const OversiktHjem = () => {
  const { t } = useTranslation();
  const { search } = useLocation();
  const navigate = useNavigate();
  const { data: tilganger, isLoading, isError } = useTilganger();
  const { data: sammenhenger = [] } = useSammenhenger();
  const aktorIder = (tilganger ?? []).map((tilgang) => tilgang.aktor.id);
  const { data: dialoger = [] } = useDialogerForAktorer(aktorIder);
  usePageTitle({ baseTitle: t('oversikt.tittel') });
  const ga = (sti: string) => navigate(medMock(sti, search));

  if (isError) {
    return (
      <PageBase>
        <Alert variant="danger" heading={t('oversikt.feil.tittel')} message={t('oversikt.feil.tekst')} />
      </PageBase>
    );
  }
  if (isLoading || !tilganger) {
    return (
      <PageBase>
        <DashboardHeader loading />
      </PageBase>
    );
  }
  // Den som bare ser seg selv, går rett til sitt eget dashbord.
  if (tilganger.length === 1) {
    return <Navigate to={medMock(aktorSti(tilganger[0].aktor.id), search)} replace />;
  }

  const [meg] = tilganger;
  const navn = (aktorId: string) => tilganger.find((tilgang) => tilgang.aktor.id === aktorId)?.aktor.navn ?? aktorId;
  const kreverHandling = dialoger
    .filter((dialog) => dialog.status === DialogStatus.RequiresAttention)
    .sort((a, b) => (a.dueAt ?? '9999').localeCompare(b.dueAt ?? '9999'));

  return (
    <PageBase>
      <DashboardHeader
        icon={{ name: meg.aktor.navn, type: 'person' }}
        title={t('oversikt.hei', { navn: meg.aktor.navn.split(' ')[0] })}
        description={t('oversikt.ingress')}
      />

      <Section spacing={4}>
        <Heading as="h2" size="lg">
          {t('oversikt.hvem')}
        </Heading>
        <Grid cols={4} spacing="md">
          {tilganger.map((tilgang) => (
            <Link key={tilgang.aktor.id} to={medMock(aktorSti(tilgang.aktor.id), search)} className={styles.kortlenke}>
              <DashboardCard
                color={tilgang.aktor.type === 'person' ? 'person' : 'company'}
                icon={{ name: tilgang.aktor.navn, type: tilgang.aktor.type === 'person' ? 'person' : 'company' }}
                title={tilgang.rolle === 'selv' ? t('oversikt.meg_selv') : tilgang.aktor.navn}
              >
                <Flex direction="col" spacing="xs" align="start">
                  <Typography variant="subtle" size="sm">
                    {tilgang.rolletekst}
                  </Typography>
                  <Badge
                    label={
                      tilgang.antallKreverHandling
                        ? t('oversikt.antall_krever_handling', { antall: String(tilgang.antallKreverHandling) })
                        : t('oversikt.ingen_oppgaver')
                    }
                    color={tilgang.antallKreverHandling ? 'warning' : 'neutral'}
                    variant="tinted"
                    size="sm"
                  />
                </Flex>
              </DashboardCard>
            </Link>
          ))}
        </Grid>
      </Section>

      {sammenhenger.length > 0 && (
        <Section spacing={4}>
          <Heading as="h2" size="lg">
            {t('oversikt.sammenhenger')}
          </Heading>
          {sammenhenger.map((sammenheng) => (
            <Alert key={sammenheng.id} variant="info" heading={sammenheng.tittel}>
              <Flex direction="col" spacing="sm" align="start">
                <Flex spacing="xs" align="center">
                  <Badge label={navn(sammenheng.fra)} color="neutral" variant="tinted" size="sm" />
                  <Typography size="sm" aria-hidden>
                    →
                  </Typography>
                  <Badge label={navn(sammenheng.til)} color="company" variant="tinted" size="sm" />
                </Flex>
                <Typography size="sm">{sammenheng.beskrivelse}</Typography>
                <ButtonGroup wrap size="sm">
                  {(sammenheng.handlinger ?? []).map((handling) => {
                    const sti = handlingSti(handling);
                    return (
                      <Button
                        key={handling.tittel}
                        variant={handling.primar ? 'solid' : 'outline'}
                        disabled={!sti}
                        onClick={sti ? () => ga(sti) : undefined}
                      >
                        {handling.tittel}
                      </Button>
                    );
                  })}
                </ButtonGroup>
                {sammenheng.kilder?.length ? (
                  <Typography variant="subtle" size="xs">
                    {t('oversikt.kilde')}:{' '}
                    {sammenheng.kilder.map((k) => [k.virksomhet, k.system].filter(Boolean).join(', ')).join('; ')}
                  </Typography>
                ) : null}
              </Flex>
            </Alert>
          ))}
        </Section>
      )}

      <Section spacing={4}>
        <Heading as="h2" size="lg">
          {t('oversikt.krever_handling')}
        </Heading>
        <List>
          {kreverHandling.map((dialog) => (
            <ListItem
              key={dialog.id}
              id={dialog.id}
              title={tekst(dialog.content?.title)}
              description={[
                navn(dialog.party),
                tekst(dialog.content?.senderName),
                dialog.dueAt
                  ? `${t('oversikt.frist')}: ${formaterDato(dialog.dueAt)}`
                  : tekst(dialog.content?.extendedStatus),
              ]
                .filter(Boolean)
                .join(' · ')}
              badge={statusBadge('krever-handling', t)}
              as="button"
              interactive
              linkIcon
              onClick={() => ga(dialogSti(dialog.id))}
            />
          ))}
        </List>
      </Section>

      <Section spacing={4}>
        <Heading as="h2" size="md">
          {t('oversikt.hjemmel')}
        </Heading>
        <List>
          {tilganger.map((tilgang) => (
            <ListItem
              key={tilgang.aktor.id}
              id={`hjemmel-${tilgang.aktor.id}`}
              title={tilgang.rolle === 'selv' ? t('oversikt.meg_selv') : tilgang.aktor.navn}
              description={`${tilgang.hjemmel.beskrivelse} · ${[tilgang.hjemmel.kilde.virksomhet, tilgang.hjemmel.kilde.system].filter(Boolean).join(', ')}`}
            />
          ))}
        </List>
      </Section>
    </PageBase>
  );
};
