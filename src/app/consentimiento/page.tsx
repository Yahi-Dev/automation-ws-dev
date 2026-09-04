// src/app/consentimiento/page.tsx
import { AppLayout } from '@/src/components/AppLayout';
import ConsentTable from '@/src/features/consent/components/consent-table';
import { verifyAuth } from '@/src/hooks/use-auth';

const breadcrumbs = [
  { title: 'Consentimiento', href: '#' },
];

const ConsentPage = async () => {
  const session = await verifyAuth();

  if (!session) {
    return null;
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <ConsentTable />
    </AppLayout>
  );
};

export default ConsentPage;
