// src/features/posts/services/posts-service.ts
import { PostFormValues } from "../schema/validations";
import { PostsType } from "../types";
import { makeFriendlyName } from '@/utils/template-name';
export interface PostsResponse {
  success: boolean;
  message: string;
  id?: string;
  data?: PostsType | PostsType[];
  template?: { id: string };
}

export async function createPost(data: PostFormValues): Promise<PostsResponse> {
  try {

    const templateTwilio = await createTemplate(data);
    if (!templateTwilio?.success) {
      throw new Error("Error al crear el template");
    }

    data.contentTemplateId = templateTwilio?.template?.id ?? 'N/A';
    const response = await fetch("/api/posts", {
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
    console.error("Error creating post:", error);
    throw error;
  }
}

export async function createTemplate(data: PostFormValues): Promise<PostsResponse> {
  try {

    const payload = {
      types: {
        [process.env.TWILIO_TEMPLATE_DEFAULT_TYPE || 'twilio/text']: {
          body: data.text || process.env.TWILIO_TEMPLATE_ALT_TEXT || "Hola {{1}}, ¡gracias por escribirnos! 🙌",
        }
      },
      friendly_name: makeFriendlyName({ text: data.text, lang: process.env.TWILIO_TEMPLATE_LANGUAGE_CODE || 'es', prefix: 'mi' }),
      language : process.env.TWILIO_TEMPLATE_LANGUAGE_CODE || 'es',
      variables : { "1": "Cliente" },
    }

    const response = await fetch("/api/whatsapp/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error en el servidor");
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error creating post:", error);
    throw error;
  }
}

export async function getAllPosts(params?: {
  search?: string;
}): Promise<PostsResponse> {
  try {
    const url = new URL("/api/posts", typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

    if (params?.search) {
      url.searchParams.append("search", params.search);
    }
    // Posts (campañas) son pocos y se ordenan por schedule: una sola página acotada.
    url.searchParams.set("limit", "500");

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    return {
      success: true,
      message: "Posts obtenidos correctamente",
      data: result.data
    };
  } catch (error) {
    console.error("Error al obtener posts:", error);
    throw error;
  }
}

export async function getPostById(id: number): Promise<PostsResponse> {
  try {
    const response = await fetch(`/api/posts/${id}`);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Error al obtener el post");
    }

    if (!result.success || !result.data) {
      throw new Error("Respuesta inesperada del servidor");
    }

    return {
      success: true,
      message: result.message || "Post obtenido correctamente",
      data: result.data
    };
  } catch (error) {
    console.error("Error al obtener post por ID:", error);
    throw error;
  }
}

export async function updatePost(
  id: number,
  data: PostFormValues
): Promise<PostsResponse> {
  try {
    const response = await fetch(`/api/posts?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.message || "Error al actualizar el post");
      } catch {
        throw new Error(errorText || "Error al actualizar el post");
      }
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || "Error al actualizar el post");
    }

    return result;
  } catch (error) {
    console.error("Error al actualizar post:", error);
    throw error;
  }
}

export async function deletePost(id: number): Promise<PostsResponse> {
  try {
    const response = await fetch(`/api/posts?id=${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error al eliminar post");
    }

    return await response.json();
  } catch (error) {
    console.error("Error al eliminar post:", error);
    throw error;
  }
}

// Servicio para subir imágenes
export async function uploadPostImage(file: File): Promise<{ imageUrl: string }> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "posts"); // Especificamos la carpeta

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Error al subir la imagen");
    }

    return await response.json();
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
}