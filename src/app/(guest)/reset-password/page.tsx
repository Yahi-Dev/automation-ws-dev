import ResetPasswordForm from "@/src/features/auth/components/reset-password/reset-password"
import { Suspense } from "react"

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}
