// src/app/posts/[id]/edit/page.tsx
import { AppLayout } from "@/src/components/AppLayout"
import { EditPostForm } from "@/src/features/posts/components/post-update"
import { verifyAuth } from "@/src/hooks/use-auth"

const breadcrumb = [
  {
    title: "Posts",
    href: "/posts",
  },
  {
    title: "Editar Post",
    href: "/posts/edit",
  },
]

interface EditPostPageProps {
  params: Promise<{
    id: string
  }>
}

const EditPostPage = async ({ params }: EditPostPageProps) => {
  const { id } = await params
  const postId = parseInt(id)
  const session = await verifyAuth();

  if (!session) {
    return null;
  }

  return (
    <AppLayout breadcrumbs={breadcrumb}>
      <EditPostForm id={postId} />
    </AppLayout>
  )
}

export default EditPostPage