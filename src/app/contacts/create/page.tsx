import { AppLayout } from "@/src/components/AppLayout";
import { CreateContactForm } from "@/src/features/contacts/components/contact-create";
import { verifyAuth } from "@/src/hooks/use-auth";

const countries = process.env.CONTACT_FORM_COUNTRIES_ACCEPT;

const breadcrumb = [
  {
    title: "Contacts",
    href: "/contacts",
  },
  {
    title: "Create Contact",
    href: "/contacts/create",
  },
]


const ContactCreatePage = async () => {
  const session = await verifyAuth();
  if (!session)  return null;

  const parsedCountries = countries ? JSON.parse(countries) : null;

  return (
    <AppLayout breadcrumbs={breadcrumb}>
      <CreateContactForm countries={parsedCountries} />
    </AppLayout>
  );
};

export default ContactCreatePage;