import { Button, type ButtonProps } from '@altinn/altinn-components';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import type { Handling } from '../../../../oversikt-api/src/typer.ts';
import { eksternAdresse, handlingSti, medMock } from './felles.ts';

/**
 * En handling fra Oversikt-API som knapp: intern rute, ekstern lenke i ny fane, eller en plassholder
 * («#») som ennå ikke er koblet til noe i konseptet.
 */
export const HandlingKnapp = ({
  handling,
  aktorId,
  variant,
  size = 'sm',
}: {
  handling: Handling;
  aktorId?: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { search } = useLocation();
  const valgtVariant = variant ?? (handling.primar ? 'solid' : 'outline');
  const ekstern = eksternAdresse(handling);
  const sti = handlingSti(handling, aktorId);
  return (
    <Button
      variant={valgtVariant}
      size={size}
      title={sti || ekstern ? undefined : t('oversikt.ikke_koblet')}
      onClick={(event) => {
        event.stopPropagation();
        if (ekstern) {
          window.open(ekstern, '_blank', 'noopener,noreferrer');
        } else if (sti) {
          navigate(medMock(sti, search));
        }
      }}
    >
      {handling.tittel}
    </Button>
  );
};
