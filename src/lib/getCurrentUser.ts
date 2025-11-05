import { headers } from "next/headers";
import { authClient } from "./auth-client"; // cliente (solo browser)
import { auth } from "./auth";

type ClientUser = { id: string; name: string; email: string; avatar: string; role: string };

interface SessionUser {
  id?: string;
  name?: string;
  email?: string;
  image?: string;
  role?: string;
}

interface Session {
  user?: SessionUser;
}

function mapUser(session: Session): ClientUser {
  return {
    id: session.user?.id ?? "",
    name: session.user?.name ?? "",
    email: session.user?.email ?? "",
    avatar: session.user?.image ?? "",
    role: session.user?.role ?? "customer",
  };
}

/**
 * Devuelve `null` si no hay sesión.
 */
export async function getCurrentUser(): Promise<ClientUser | null> {
  try {
    // SERVER: usa la API de servidor de Better Auth y reenvía los headers (cookies incluidas)
    if (typeof window === "undefined") {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session?.user) return null;
      return mapUser(session);
    }

    // CLIENT: usa el cliente React (adjunta cookies del navegador)
    const { data: session } = await authClient.getSession();
    if (!session?.user) return null;
    return mapUser(session);
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}
