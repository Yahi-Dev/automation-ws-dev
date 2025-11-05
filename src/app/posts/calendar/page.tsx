// src/app/posts/calendar/page.tsx
import { AppLayout } from "@/src/components/AppLayout"
import PostsCalendar from "@/src/features/posts/components/posts-calendar"
import { verifyAuth } from "@/src/hooks/use-auth";

const breadcrumbs = [
  { title: "Posts", href: "/posts" },
  { title: "Calendario", href: "#" },
]

const PostsCalendarPage = async () => {
  const session = await verifyAuth();
  if (!session) return null;

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <div className="">
        <div className="grid auto-rows-min gap-3 md:grid-cols-4">
          <div className="md:col-span-4 px-7">
            <PostsCalendar />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default PostsCalendarPage