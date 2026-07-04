// hooks/use-auth.ts → hooks/auth-utils.ts
import { auth } from '@/src/lib/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function verifyAuth() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.id) {
    redirect('/login')
  }

  // Gate de aprobación: solo usuarios aprobados entran.
  const status = (session.user as { status?: string }).status
  if (status && status !== 'approved') {
    redirect('/login?pending=1')
  }

  return session
}