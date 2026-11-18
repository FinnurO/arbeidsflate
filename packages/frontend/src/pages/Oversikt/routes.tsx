import { lazy, Suspense } from 'react';

// «Min oversikt» lastes ved behov, så innboksen ikke blir tyngre å starte.
const OversiktHjemPage = lazy(() =>
  import('./OversiktHjem.tsx').then(({ OversiktHjem }) => ({ default: OversiktHjem })),
);
const AktorOversiktPage = lazy(() =>
  import('./AktorOversikt.tsx').then(({ AktorOversikt }) => ({ default: AktorOversikt })),
);
const TjenesteSidePage = lazy(() =>
  import('./TjenesteSide.tsx').then(({ TjenesteSide }) => ({ default: TjenesteSide })),
);

export const OversiktHjemRoute = () => (
  <Suspense fallback={null}>
    <OversiktHjemPage />
  </Suspense>
);

export const AktorOversiktRoute = () => (
  <Suspense fallback={null}>
    <AktorOversiktPage />
  </Suspense>
);

export const TjenesteSideRoute = () => (
  <Suspense fallback={null}>
    <TjenesteSidePage />
  </Suspense>
);
