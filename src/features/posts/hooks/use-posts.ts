// src/features/posts/hooks/use-posts.ts
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PostsType, ImagesPostsType } from "../types";
import { PostsResponse, createPost, deletePost, getAllPosts, getPostById, updatePost, uploadPostImage } from "../services/posts-service";
import { PostFormValues } from "../schema/validations";

export function useGetAllPosts() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<PostsType[]>([]);

  // Usar useCallback para memoizar la función
  const fetchAll = useCallback(async (params?: { search?: string }): Promise<PostsType[] | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await getAllPosts(params);

      if (response.success && response.data) {
        const data = (Array.isArray(response.data) ? response.data : [response.data])
          .map(post => ({
            ...post,
            schedule: new Date(post.schedule),
            createdAt: new Date(post.createdAt),
            updatedAt: post.updatedAt ? new Date(post.updatedAt) : null,
            images: post.images?.map((img: ImagesPostsType) => ({
              ...img,
              createdAt: new Date(img.createdAt),
              updatedAt: new Date(img.updatedAt),
            })) || [],
          }));

        setPosts(data);
        return data;
      }
      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido";
      setError(errorMessage);
      toast.error('Error al cargar posts', {
        description: errorMessage,
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []); // Dependencias vacías ya que no depende de props o estado

  return {
    fetchAll,
    posts,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

export const usePostById = (id: number) => {
  const [post, setPost] = useState<PostsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await getPostById(id);

        if (response.success && response.data) {
          const postData = Array.isArray(response.data)
            ? response.data[0]
            : response.data;

          const processedPost = {
            ...postData,
            schedule: new Date(postData.schedule),
            createdAt: new Date(postData.createdAt),
            updatedAt: postData.updatedAt ? new Date(postData.updatedAt) : null,
            images: postData.images?.map((img: ImagesPostsType) => ({
              ...img,
              createdAt: new Date(img.createdAt),
              updatedAt: new Date(img.updatedAt),
            })) || [],
          };

          setPost(processedPost);
        } else {
          setError(response.message || "Post no encontrado");
          toast.error('Error al cargar post', {
            description: response.message || "Post no encontrado"
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error desconocido";
        setError(errorMessage);
        toast.error('Error al cargar post', {
          description: errorMessage
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchPost();
  }, [id]);

  return { post, loading, error };
};

export function useDeletePost() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const remove = async (id: number): Promise<PostsResponse | null> => {
    setIsLoading(true);
    try {
      const response = await deletePost(id);
      router.push("/posts");
      return response;
    } catch (error) {
      console.error("Error deleting post:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { remove, isLoading };
};

export function useCreatePost() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async (data: PostFormValues): Promise<PostsResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await createPost(data);

      if (response.success) {
        toast.success("Post creado exitosamente", {
          description: "El post ha sido registrado correctamente."
        });
        router.push("/posts");
        return response;
      } else {
        throw new Error(response.message || "Error al crear el post");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido al crear el post";
      setError(errorMessage);
      toast.error("Error al crear post", {
        description: errorMessage
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return { create, isLoading, error, clearError };
};

export function useUpdatePost(id: number) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = async (data: PostFormValues): Promise<PostsResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await updatePost(id, data);

      if (response.success) {
        toast.success("Post actualizado exitosamente", {
          description: "El post ha sido actualizado correctamente."
        });

        // Forzar recarga de la página para ver cambios inmediatos
        router.refresh();
        router.push("/posts");

        return response;
      } else {
        throw new Error(response.message || "Error al actualizar el post");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error desconocido al actualizar el post";
      setError(errorMessage);
      toast.error("Error al actualizar post", {
        description: errorMessage
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return { update, isLoading, error, clearError };
};

// Hook para manejo de imágenes
export function usePostImages() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadImage = async (file: File): Promise<string> => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const result = await uploadPostImage(file);
      return result.imageUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error al subir la imagen";
      setUploadError(errorMessage);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const clearUploadError = () => setUploadError(null);

  return {
    uploadImage,
    isUploading,
    uploadError,
    clearUploadError,
  };
}