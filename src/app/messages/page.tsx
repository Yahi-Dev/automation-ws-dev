// src/app/messages/page.tsx
import { AppLayout } from '@/src/components/AppLayout';
import MessagesTable from '@/src/features/messages/components/message-table';
import { verifyAuth } from '@/src/hooks/use-auth';

const breadcrumbs = [
  { title: 'Mensajes', href: '#' },
];

const MessagesPage = async () => {
  const session = await verifyAuth();

  if (!session) {
    return null;
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <MessagesTable />
    </AppLayout>
  );
};

export default MessagesPage;