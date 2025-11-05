import { AppLayout } from '@/src/components/AppLayout';
import ContactsTable from '@/src/features/contacts/components/contact-table';
import { verifyAuth } from '@/src/hooks/use-auth';

const breadcrumbs = [
  { title: 'Contacts', href: '#' },
];

const ContactsPage = async () => {
  const session = await verifyAuth();
  if (!session) return null;

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <ContactsTable />
    </AppLayout>
  );
};

export default ContactsPage;
