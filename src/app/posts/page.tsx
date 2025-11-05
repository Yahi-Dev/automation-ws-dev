// src/app/posts/page.tsx
import { AppLayout } from '@/src/components/AppLayout';
import PostsTable from '@/src/features/posts/components/posts-table';
import { verifyAuth } from '@/src/hooks/use-auth';

const breadcrumbs = [
  { title: 'Posts', href: '#' },
];

const PostsPage = async () => {
  const session = await verifyAuth();
  if (!session) return null; // or a loading state

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <PostsTable />
    </AppLayout>
  );
};

export default PostsPage;