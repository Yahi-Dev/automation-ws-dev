
import { LoginInner } from "@/src/features/auth/components/login/LoginForm";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-100">
          <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
            <h2 className="text-xl font-semibold text-slate-800">Cargando…</h2>
          </div>
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}