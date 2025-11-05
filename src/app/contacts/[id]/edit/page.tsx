import { AppLayout } from "@/src/components/AppLayout"
import { EditContactForm } from "@/src/features/contacts/components/contact-update"
import { verifyAuth } from "@/src/hooks/use-auth"

const breadcrumb = [
  {
    title: "Contacts",
    href: "/contacts",
  },
  {
    title: "Editar Contacto",
    href: "/contacts/edit",
  },
]

interface EditContactPageProps {
  params: Promise<{
    id: string
  }>
}

const EditContactPage = async ({ params }: EditContactPageProps) => {
  const { id } = await params
  const contactId = parseInt(id)
  const session = await verifyAuth();

  if (!session) {
    return null;
  }

  return (
    <AppLayout breadcrumbs={breadcrumb}>
      <EditContactForm id={contactId} />
    </AppLayout>
  )
}

export default EditContactPage