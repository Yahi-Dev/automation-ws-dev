// src/app/messages/[id]/page.tsx
import { AppLayout } from "@/src/components/AppLayout"
import { MessageAssignForm } from "@/src/features/messages/components/message-assign";
import { verifyAuth } from "@/src/hooks/use-auth";

const breadcrumb = [
  {
    title: "Mensajes",
    href: "/messages",
  },
  {
    title: "Crear Mensaje",
    href: "/messages/assign",
  },
]


const MessagesPage = async () => {
  const session = await verifyAuth();

  if (!session) {
    return null;
  }
  return (
    <AppLayout breadcrumbs={breadcrumb}>
      <MessageAssignForm />
    </AppLayout>
  );
};

export default MessagesPage;