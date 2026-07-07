// src/utils/http-response.ts
import { NextResponse } from 'next/server';

interface ResponseData {
  Data?: unknown;
  Total?: number;
  Page?: number;
  messagesCount?: number;
  hardDeleted?: boolean;
}

export class HttpResponse {
  static sendSuccess(data: ResponseData = {}, message: string = 'Éxito') {
    return NextResponse.json({
      status: 'success',
      Permission: "Permission accepted.",
      success: true,
      message,
      data: data.Data,
      totalRecords: data.Total ?? 0,
      page: data.Page,
      error: false,
      date: new Date()
    }, { status: 200 });
  }

  static sendCreated(data: ResponseData = {}, message: string = 'Creado exitosamente') {
    return NextResponse.json({
      status: 'success',
      Permission: "Permission accepted.",
      success: true,
      message,
      data: data.Data,
      totalRecords: data.Total ?? 0,
      page: data.Page,
      error: false,
      date: new Date()
    }, { status: 201 });
  }

  // 202 Accepted: el trabajo se encoló y se procesará de forma asíncrona.
  // `data` queda en null a propósito para que la UI muestre `message` (no cuenta 0).
  static sendAccepted(message: string = 'Solicitud aceptada', extra: Record<string, unknown> = {}) {
    return NextResponse.json({
      status: 'accepted',
      Permission: "Permission accepted.",
      success: true,
      message,
      data: null,
      error: false,
      date: new Date(),
      ...extra,
    }, { status: 202 });
  }

  static sendBadRequest(message: string = 'Solicitud incorrecta', data = {}) {
    return NextResponse.json({
      status: 'error',
      Permission: "Permission denied.",
      success: false,
      message,
      data,
      error: true,
      date: new Date()
    }, { status: 400 });
  }

  static sendUnauthorized(message: string = 'No autorizado', data = {}) {
    return NextResponse.json({
      status: 'error',
      Permission: "Permission denied.",
      success: false,
      message,
      data,
      error: true,
      date: new Date()
    }, { status: 401 });
  }

  static sendForbidden(message: string = 'Acceso denegado', data = {}) {
    return NextResponse.json({
      status: 'error',
      Permission: "Permission denied.",
      success: false,
      message,
      data,
      error: true,
      date: new Date()
    }, { status: 403 });
  }

  static sendNotFound(message: string = 'No encontrado', data = {}) {
    return NextResponse.json({
      status: 'error',
      Permission: "Permission denied.",
      success: false,
      message,
      data,
      error: true,
      date: new Date()
    }, { status: 404 });
  }

  static sendServerError(message: string = 'Error interno del servidor', error?: unknown) {
    console.error('❌ Error interno:', error);
    return NextResponse.json({
      status: 'error',
      Permission: "Permission denied.",
      success: false,
      message,
      error: true,
      date: new Date()
    }, { status: 500 });
  }

  // Método adicional para rate limiting (puede ser útil)
  static sendTooManyRequests(message: string = 'Demasiadas solicitudes', retryAfter?: number) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (retryAfter) {
      headers['Retry-After'] = retryAfter.toString();
    }

    return new NextResponse(JSON.stringify({
      status: 'error',
      Permission: "Permission denied.",
      success: false,
      message,
      error: true,
      date: new Date(),
      retryAfter
    }), {
      status: 429,
      headers
    });
  }
}

// Exportaciones individuales para compatibilidad
export const sendSuccess = HttpResponse.sendSuccess;
export const sendCreated = HttpResponse.sendCreated;
export const sendAccepted = HttpResponse.sendAccepted;
export const sendBadRequest = HttpResponse.sendBadRequest;
export const sendUnauthorized = HttpResponse.sendUnauthorized;
export const sendForbidden = HttpResponse.sendForbidden;
export const sendNotFound = HttpResponse.sendNotFound;
export const sendServerError = HttpResponse.sendServerError;
export const sendTooManyRequests = HttpResponse.sendTooManyRequests;