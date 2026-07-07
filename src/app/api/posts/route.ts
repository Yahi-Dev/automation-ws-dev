// src/app/api/posts/route.ts
import { postCreateSchema, postUpdateSchema } from "@/src/features/posts/schema/validations"
import { auth } from "@/src/lib/auth"
import prisma from "@/src/lib/prisma"
import { redis } from "@/src/lib/redis"
import { CatchError } from "@/src/utils/catchError"
import { HttpResponse } from "@/src/utils/httpResponse"
import { parsePagination } from "@/src/lib/pagination"
import { Prisma } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"

const CACHE_KEY = "posts-cache";
const CACHE_KEY_ALL = "posts:list"; // ajusta a tu clave global

function badRequest(msg: string) {
  return NextResponse.json({ success: false, message: msg }, { status: 400 });
}
function notFound(msg: string) {
  return NextResponse.json({ success: false, message: msg }, { status: 404 });
}
function serverError(msg: string, error?: unknown) {
  console.error("[POSTS][DELETE] ", msg, error);
  return NextResponse.json({ success: false, message: msg }, { status: 500 });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')?.trim() || ''
    const { limit } = parsePagination(searchParams)

    const where: Prisma.postsWhereInput = {
      isDeleted: false,
      ...(search
        ? {
            OR: [
              { text: { contains: search } },
            ],
          }
        : {}),
    };

    const [posts, error] = await CatchError(
      prisma.posts.findMany({
        where,
        include: {
          contentTemplate: { select: { id: true, sid: true, friendlyName: true } },
          _count: { select: { messages: true } }, // 👈 contador por relación
          images: {
            where: {
              post: { isDeleted: false }
            },
            orderBy: { createdAt: 'asc' }
          }
        },
        orderBy: { schedule: 'desc' },
        take: limit,
      })
    );

    if (error) {
      console.error('Error fetching posts:', error);
      return serverError('Error al obtener los posts', error);
    }

    // Sin caché de clave fija: el listado varía por búsqueda y ya está acotado por take.
    const data = posts ?? [];

    return HttpResponse.sendSuccess(
      {
        Data: data,
        Total: data.length
      },
      'Posts obtenidos exitosamente'
    );
  } catch (error: unknown) {
    console.error('Error fetching posts:', error);
    return HttpResponse.sendServerError('Error al obtener los posts', error);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = postCreateSchema.safeParse(body);

    if (!parsed.success) {
      const errorDetails = parsed.error.flatten();
      console.error("Validation error:", errorDetails);
      return HttpResponse.sendBadRequest('Datos inválidos', {
        ...errorDetails,
        message: "Por favor verifica los datos ingresados"
      });
    }

    const session = await auth.api.getSession({ headers: req.headers });
    const data = parsed.data;
    const [created, createError] = await CatchError(
      prisma.posts.create({
        data: {
          schedule: new Date(data.schedule),
          text: data.text,
          createdBy: session?.user?.email ?? "desconocido",
          createdAt: new Date(),
          contentTemplateId: data.contentTemplateId ?? "N/A",
          images: {
            create: data.images?.map((img: { url: string }) => ({
              url: img.url,
              createdAt: new Date(),
            })) || []
          }
        },
        include: {
          images: true,
          contentTemplate: { select: { id: true, sid: true, friendlyName: true } },
        }
      })
    );

    if (createError) {
      return serverError('Error al crear el post', createError);
    }

    await redis.del(CACHE_KEY);

    return HttpResponse.sendCreated(
      { Data: created },
      "Post creado exitosamente"
    );
  } catch (error) {
    console.error("Server error:", error);
    return serverError('Error interno del servidor', error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));

    if (!Number.isInteger(id) || id <= 0) {
      return HttpResponse.sendBadRequest('Id inválido');
    }

    const body = await request.json();
    const parsed = postUpdateSchema.safeParse(body);

    if (!parsed.success) {
      const errorDetails = parsed.error.flatten();
      console.error("Validation error:", errorDetails);
      return HttpResponse.sendBadRequest('Datos inválidos', {
        ...errorDetails,
        message: "Por favor verifica los datos ingresados"
      });
    }

    const session = await auth.api.getSession({ headers: request.headers });

    const user = {
      name: session?.user?.name ?? "",
      email: session?.user?.email ?? "",
      avatar: session?.user?.image ?? "",
    };

    const data = parsed.data;

    // Primero, obtener el post actual para comparar imágenes
    const [currentPost, currentPostError] = await CatchError(
      prisma.posts.findUnique({
        where: { id },
        include: { images: true }
      })
    );

    if (currentPostError) {
      return HttpResponse.sendServerError('Error al obtener el post actual', currentPostError);
    }

    if (!currentPost) {
      return HttpResponse.sendNotFound('Post no encontrado');
    }

    // Preparar datos para actualización
    const updateData: Prisma.postsUpdateInput = {
      updatedAt: new Date(),
      updatedBy: user.email,
    };

    if (data.schedule) updateData.schedule = new Date(data.schedule);
    if (data.text) updateData.text = data.text;

    // Manejar actualización de imágenes
    let imagesUpdate = {};

    if (data.images !== undefined) {
      // Obtener URLs de imágenes actuales y nuevas
      const currentImageUrls = new Set(currentPost.images.map(img => img.url));
      const newImageUrls = new Set(data.images.map((img: { url: string }) => img.url));

      // Encontrar imágenes a eliminar (están en current pero no en new)
      const imagesToDelete = currentPost.images.filter(
        img => !newImageUrls.has(img.url)
      );

      // Encontrar imágenes a agregar (están en new pero no en current)
      const imagesToAdd = data.images.filter(
        (img: { url: string }) => !currentImageUrls.has(img.url)
      );

      // Configurar operaciones de imágenes
      imagesUpdate = {
        // Eliminar imágenes que ya no están en la lista
        deleteMany: imagesToDelete.length > 0 ? {
          id: { in: imagesToDelete.map(img => img.id) }
        } : undefined,
        // Agregar nuevas imágenes
        create: imagesToAdd.map((img: { url: string }) => ({
          url: img.url,
          createdAt: new Date(),
        }))
      };
    }

    // Si hay operaciones de imágenes, agregarlas al updateData
    if (Object.keys(imagesUpdate).length > 0) {
      updateData.images = imagesUpdate;
    }

    const [updated, updateError] = await CatchError(
      prisma.posts.update({
        where: { id },
        data: updateData,
        include: {
          images: {
            orderBy: { createdAt: 'asc' }
          }
        }
      })
    );

    if (updateError) {
      if (updateError instanceof Prisma.PrismaClientKnownRequestError) {
        if (updateError.code === 'P2025') {
          return HttpResponse.sendNotFound('Post no encontrado');
        }
      }
      return serverError('Error al actualizar el post', updateError);
    }

    // ✅ AQUÍ ES DONDE DEBES PONER LA LIMPIEZA DEL CACHE
    await redis.del(CACHE_KEY); // Cache general de posts
    await redis.del(`post-${id}`); // Cache individual del post

    return HttpResponse.sendSuccess(
      { Data: updated },
      "Post actualizado exitosamente"
    );
  } catch (error) {
    console.error("Error updating post:", error);
    return serverError('Error interno del servidor', error);
  }
}

export async function  DELETE(req: NextRequest) {
  try {
    // 1) Validación de id
    const idStr = new URL(req.url).searchParams.get("id");
    const id = Number(idStr);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return badRequest("Id inválido");
    }

    // 2) Buscar post
    const post = await prisma.posts.findUnique({
      where: { id },
      select: { id: true, isDeleted: true },
    });

    if (!post) return notFound("Post no encontrado");

    // 3) Contar mensajes asociados (ajusta el modelo si es `messages`)
    const msgCount = await prisma.message.count({
      where: { postId: id },
    });

    if (msgCount > 0) {
      return HttpResponse.sendBadRequest(
        `No se puede eliminar el post: tiene ${msgCount} mensaje(s) asociado(s).`
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.imagesPosts.deleteMany({ where: { postId: id } }).catch(() => {});
      await tx.posts.delete({ where: { id } });
    });

    // Cache
    try {
      await redis.del(CACHE_KEY);            // lista general
      await redis.del(CACHE_KEY_ALL, `post:${id}`); // detalle
    } catch (e) {
      console.warn("[POSTS][DELETE] cache del warn", e);
    }

    return HttpResponse.sendSuccess(
      { hardDeleted: true, messagesCount: 0 },
      "Post eliminado definitivamente (sin mensajes asociados)"
    );

  } catch (error) {
    console.error('Error deleting post:', error);
    return serverError('Error interno del servidor al eliminar el post', error);
  }
}