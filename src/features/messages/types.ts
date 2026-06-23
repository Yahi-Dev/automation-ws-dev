// src/features/messages/types/index.ts
export type MessageStatus =
  | 'pending'
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'undelivered';

export interface MessageType {
  id: number;
  postId: number;
  contactId: number;
  status: MessageStatus;
  sentAt: Date | null;
  deliveredAt?: Date | null;
  readAt?: Date | null;
  providerSid?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  createdBy: string;
  createdAt: Date;
  updatedBy: string | null;
  updatedAt: Date | null;
  isDeleted: boolean;
  
  // Relaciones
  post?: {
    id: number;
    text: string;
    schedule: Date;
    images?: Array<{
      id: number;
      url: string;
      postId: number;
      createdAt: Date;
      updatedAt: Date;
    }>;
  };
  contact?: {
    id: number;
    name: string;
    phone: string;
  };
}

export interface CreateMessageData {
  postId: number;
  contactIds: number[];
}

export interface UpdateMessageData {
  status?: MessageStatus;
  sentAt?: Date;
}

export interface MessageWithRelations extends MessageType {
  post: {
    id: number;
    text: string;
    schedule: Date;
    createdBy: string;
    images: Array<{
      id: number;
      url: string;
      postId: number;
      createdAt: Date;
      updatedAt: Date;
    }>;
  };
  contact: {
    id: number;
    name: string;
    phone: string;
  };
}