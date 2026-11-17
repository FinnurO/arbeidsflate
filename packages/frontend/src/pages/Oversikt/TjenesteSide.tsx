import {
  Alert,
  Badge,
  Button,
  ButtonGroup,
  DashboardHeader,
  Flex,
  Heading,
  List,
  ListItem,
  PageBase,
  Section,
  Typography,
} from '@altinn/altinn-components';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import type { Katalogfelt } from '../../../../oversikt-api/src/typer.ts';
import { useTjeneste } from '../../api/oversikt.ts';
import { usePageTitle } from '../../hooks/usePageTitle.ts';
import styles from './oversikt.module.css';

const dekningsfarge: Record<Katalogfelt['dekning'], 'success' | 'warning' | 'danger' | 'neutral'> = {
  ja: 'success',
  sjelden: 'warning',
  nei: 'danger',
  'utenfor-katalogen': 'neutral',
};

/** En tjeneste slik innbyggeren ser den, og hvilke av feltene som finnes i tjenestekatalogen i dag. */
export const TjenesteSide = () => {
  const { t } = useTranslation();
  const { tjenesteId = '' } = useParams();
  const { data: tjeneste, isLoading, isError } = useTjeneste(decodeURIComponent(tjenesteId));
  const [visKatalog, setVisKatalog] = useState(false);
  usePageTitle({ baseTitle: tjeneste?.tittel ?? t('oversikt.tjenester') });

  if (isError) {
    return (
      <PageBase>
        <Alert variant="danger" heading={t('oversikt.feil.tittel')} message={t('oversikt.feil.tekst')} />
      </PageBase>
    );
  }
  if (isLoading || !tjeneste) {
    return (
      <PageBase>
        <DashboardHeader loading />
      </PageBase>
    );
  }

  return (
    <PageBase>
      <DashboardHeader title={tjeneste.tittel} description={tjeneste.beskrivelse}>
        <Typography variant="subtle" size="sm">
          {t('oversikt.ansvarlig')}: {tjeneste.ansvarlig}
        </Typography>
      </DashboardHeader>

      {tjeneste.katalogdekning?.length ? (
        <ButtonGroup size="sm">
          <Button
            variant={visKatalog ? 'tinted' : 'solid'}
            aria-pressed={!visKatalog}
            onClick={() => setVisKatalog(false)}
          >
            {t('oversikt.tjeneste.for_innbygger')}
          </Button>
          <Button
            variant={visKatalog ? 'solid' : 'tinted'}
            aria-pressed={visKatalog}
            onClick={() => setVisKatalog(true)}
          >
            {t('oversikt.tjeneste.fra_katalogen')}
          </Button>
        </ButtonGroup>
      ) : null}

      {visKatalog ? (
        <Section spacing={4}>
          <Heading as="h2" size="lg">
            {t('oversikt.tjeneste.katalog_tittel')}
          </Heading>
          <Typography>{t('oversikt.tjeneste.katalog_ingress')}</Typography>
          <table className={`ds-table ${styles.tabell}`} data-border="true">
            <thead>
              <tr>
                <th>{t('oversikt.tjeneste.visning')}</th>
                <th>{t('oversikt.tjeneste.felt')}</th>
                <th>{t('oversikt.tjeneste.dekning')}</th>
              </tr>
            </thead>
            <tbody>
              {(tjeneste.katalogdekning ?? []).map((felt) => (
                <tr key={felt.visning}>
                  <td>{felt.visning}</td>
                  <td>{felt.felt}</td>
                  <td>
                    <Badge
                      label={t(`oversikt.dekning.${felt.dekning}`)}
                      color={dekningsfarge[felt.dekning]}
                      variant="tinted"
                      size="sm"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      ) : (
        <Flex direction="col" spacing={6}>
          {tjeneste.krav?.length ? (
            <Section spacing={4}>
              <Heading as="h2" size="lg">
                {t('oversikt.tjeneste.krav')}
              </Heading>
              <List>
                {tjeneste.krav.map((krav) => (
                  <ListItem key={krav.tittel} id={krav.tittel} title={krav.tittel} description={krav.beskrivelse} />
                ))}
              </List>
            </Section>
          ) : null}
          {tjeneste.resultat && (
            <Section spacing={2}>
              <Heading as="h2" size="lg">
                {t('oversikt.tjeneste.resultat')}
              </Heading>
              <Typography>{tjeneste.resultat}</Typography>
            </Section>
          )}
          {tjeneste.relaterte?.length ? (
            <Section spacing={4}>
              <Heading as="h2" size="lg">
                {t('oversikt.tjeneste.relaterte')}
              </Heading>
              <List>
                {tjeneste.relaterte.map((relatert) => (
                  <ListItem
                    key={relatert.tittel}
                    id={relatert.tittel}
                    title={relatert.tittel}
                    description={relatert.relasjon}
                  />
                ))}
              </List>
            </Section>
          ) : null}
          {tjeneste.kontaktpunkt && (
            <Typography variant="subtle" size="sm">
              {t('oversikt.tjeneste.kontakt')}: {tjeneste.kontaktpunkt}
            </Typography>
          )}
        </Flex>
      )}
    </PageBase>
  );
};
