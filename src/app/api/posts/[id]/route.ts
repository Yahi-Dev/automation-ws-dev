// src/app/api/posts/[id]/route.ts
import prisma from '@/src/lib/prisma';
import { requireAuth } from '@/src/lib/authz';
import { getOrSetCache } from '@/src/lib/redis';
import { CatchError } from '@/src/utils/catchError';
import { HttpResponse } from '@/src/utils/httpResponse';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest,{ params }: { params: Promise<{ id: string }> }) {
  try {
    const gate = await requireAuth(request);
    if ("response" in gate) return gate.response;

    const { id } = await params;
    const postId = Number.parseInt(id);

    if (Number.isNaN(postId) || postId <= 0) {
      return HttpResponse.sendBadRequest('ID de post inválido');
    }

    const cacheKey = `post-${postId}`;

    // Usar cache para el post individual
    const [post, postError] = await CatchError(
      getOrSetCache(cacheKey, async () => {
        return await prisma.posts.findUnique({
          where: {
            id: postId,
            isDeleted: false
          },
          include: {
            contentTemplate: { select: { friendlyName: true, sid: true, id: true } },
            images: {
              where: {
                post: { isDeleted: false }
              },
              orderBy: { createdAt: 'asc' }
            }
          }
        });
      })
    );

    if (postError) {
      console.error('Error fetching post:', postError);
      return HttpResponse.sendServerError('Error al obtener el post', postError);
    }

    if (!post) {
      return HttpResponse.sendNotFound('Post no encontrado');
    }

    return HttpResponse.sendSuccess(
      { Data: post },
      'Post obtenido exitosamente'
    );

  } catch (error) {
    console.error('Error fetching post:', error);
    return HttpResponse.sendServerError('Error interno del servidor al obtener el post', error);
  }
}