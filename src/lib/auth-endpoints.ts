export const AUTH_ENDPOINTS = {
  login: "/api/auth/login",                 // POST {email, password, remember}
  forgotPassword: "/api/auth/forgot-password", // POST {email}
  resetPassword: "/api/auth/reset-password",   // POST {token,email,password,password_confirmation}
  resendVerification: "/api/auth/email/resend", // POST {}
  logout: "/api/auth/logout",                 // POST {}
  confirmPassword: "/api/auth/confirm-password", // POST {password}
  accountRequest: "/api/auth/account-request",   // POST { ...form }
} as const;