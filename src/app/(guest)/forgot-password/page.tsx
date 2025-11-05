import ForgotPasswordForm from "@/src/features/auth/components/forgot-password/forgot-password"
import { Suspense } from "react"

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ForgotPasswordForm />
    </Suspense>
  )
}
