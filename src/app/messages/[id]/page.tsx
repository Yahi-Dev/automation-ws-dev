// src/app/messages/[id]/page.tsx
import { AppLayout } from "@/src/components/AppLayout"
import { MessageDetails } from "@/src/features/messages/components/message-details"
import { verifyAuth } from "@/src/hooks/use-auth"

const breadcrumb = [
  {
    title: "Mensajes",
    href: "/messages",
  },
  {
    title: "Detalles del Mensaje",
    href: "/messages/details",
  },
]

interface MessageDetailsPageProps {
  params: Promise<{
    id: string
  }>
}

const MessageDetailsPage = async ({ params }: MessageDetailsPageProps) => {
  const { id } = await params
  const messageId = parseInt(id)

  const session = await verifyAuth();

  if (!session) {
    return null;
  }

  return (
    <AppLayout breadcrumbs={breadcrumb}>
      <div className="">
        <div className="grid auto-rows-min gap-3 md:grid-cols-4">
          <div className="md:col-span-4 px-7">
            <MessageDetails id={messageId} />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default MessageDetailsPage