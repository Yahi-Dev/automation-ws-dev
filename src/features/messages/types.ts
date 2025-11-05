// src/features/messages/types/index.ts
export interface MessageType {
  id: number;
  postId: number;
  contactId: number;
  status: 'pending' | 'sent' | 'failed' | 'delivered';
  sentAt: Date | null;
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
  status?: 'pending' | 'sent' | 'failed' | 'delivered';
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