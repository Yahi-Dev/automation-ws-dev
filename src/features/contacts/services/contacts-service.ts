import { ContactFormValues } from "../schema/validations";
import { ContactsType } from "../types";

export interface ContactsResponse {
  success: boolean;
  message: string;
  data?: ContactsType | ContactsType[];
}

export async function createContact(data: ContactFormValues): Promise<ContactsResponse> {
  try {

    const checkPhone = await checkWhatsApp(data.phone);
    if(checkPhone.ok){
      data.whatsapp = checkPhone.hasWhatsApp;
    }

    const response = await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error en el servidor");
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error en login:", error);
    throw error;
  }
}

export async function getAllContacts(params?: {
  isActive?: boolean;
  search?: string;
}): Promise<ContactsResponse> {
  try {
    const url = new URL("/api/contacts", typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

    if (params) {
      if (params.search) {
        url.searchParams.append("search", params.search);
      }
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    return {
      success: true,
      message: "Contactos obtenidos correctamente",
      data: result.data || result.items || result
    };
  } catch (error) {
    console.error("Error al obtener contactos:", error);
    throw error;
  }
}

export async function getContactById(id: number): Promise<ContactsResponse> {
  try {
    const response = await fetch(`/api/contacts/${id}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Error al obtener el contacto");
    }

    if (!result.success || !result.data) {
      throw new Error("Respuesta inesperada del servidor");
    }

    return {
      success: true,
      message: result.message || "Contacto obtenido correctamente",
      data: result.data
    };
  } catch (error) {
    console.error("Error al obtener contacto por ID:", error);
    throw error;
  }
}

export async function updateContact(id: number, data: ContactFormValues & { isActive?: boolean }): Promise<ContactsResponse> {
  try {

    const checkPhone = await checkWhatsApp(data.phone);
    if(checkPhone.ok){
      data.whatsapp = checkPhone.hasWhatsApp;
    }

    const response = await fetch(`/api/contacts?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.message || "Error al actualizar el contacto");
      } catch {
        throw new Error(errorText || "Error al actualizar el contacto");
      }
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || "Error al actualizar el contacto");
    }

    return result;
  } catch (error) {
    console.error("Error al actualizar contacto:", error);
    throw error;
  }
}

export async function deleteContact(id: number): Promise<ContactsResponse> {
  try {
    const response = await fetch(`/api/contacts?id=${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error al eliminar contacto");
    }

    return await response.json();
  } catch (error) {
    console.error("Error al eliminar contacto:", error);
    throw error;
  }
}

export async function setContactConsent(
  id: number,
  event: "opt_in" | "opt_out"
): Promise<ContactsResponse> {
  try {
    const response = await fetch(`/api/contacts/${id}/consent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || "Error al actualizar el consentimiento");
    }
    return result;
  } catch (error) {
    console.error("Error al actualizar el consentimiento:", error);
    throw error;
  }
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

export async function importContacts(file: File): Promise<{ success: boolean; message: string; data?: ImportResult }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/contacts/import", {
    method: "POST",
    body: formData,
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || "Error al importar contactos");
  }
  return result;
}

// Valida el número SIN enviar nada (libphonenumber-js del lado servidor).
export async function checkWhatsApp(phone: string, country?: string) {
  const res = await fetch("/api/whatsapp/check", {
    method: "POST",
    body: JSON.stringify({ phone, country }),
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.json();
  return data; // { ok, valid, hasWhatsApp, e164, country, type }
}