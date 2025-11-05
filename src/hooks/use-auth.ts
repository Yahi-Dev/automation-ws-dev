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

  return session
}