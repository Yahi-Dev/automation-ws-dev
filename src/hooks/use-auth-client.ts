// hooks/use-auth-client.ts (Nuevo hook para cliente)
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function useAuthClient() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/session')
        const sessionData = await response.json()
        
        if (!sessionData?.user?.id) {
          router.push('/login')
          return
        }
        
        setSession(sessionData)
      } catch (error) {
        console.error('Error checking auth:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  return { session, loading }
}