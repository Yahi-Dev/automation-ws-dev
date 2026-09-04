// src/app/entrantes/page.tsx
import { AppLayout } from '@/src/components/AppLayout';
import InboundTable from '@/src/features/inbound/components/inbound-table';
import { verifyAuth } from '@/src/hooks/use-auth';

const breadcrumbs = [
  { title: 'Mensajes entrantes', href: '#' },
];

const InboundPage = async () => {
  const session = await verifyAuth();

  if (!session) {
    return null;
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <InboundTable />
    </AppLayout>
  );
};

export default InboundPage;
