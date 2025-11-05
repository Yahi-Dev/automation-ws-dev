// src/app/posts/create/page.tsx
import { AppLayout } from "@/src/components/AppLayout";
import { CreatePostForm } from "@/src/features/posts/components/post-create";
import { verifyAuth } from "@/src/hooks/use-auth";

const breadcrumb = [
  {
    title: "Posts",
    href: "/posts",
  },
  {
    title: "Crear Post",
    href: "/posts/create",
  },
]

const PostCreatePage = async () => {
  const session = await verifyAuth();

  if (!session) {
    return null; 
  }
  
  return (
    <AppLayout breadcrumbs={breadcrumb}>
      <CreatePostForm />
    </AppLayout>
  );
};

export default PostCreatePage;