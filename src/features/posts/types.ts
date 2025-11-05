// src/features/posts/types/index.ts
export interface PostsType {
  id: number;
  schedule: Date;
  text: string;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date | null;
  updatedBy: string | null;
  isDeleted: boolean;
  contentTemplateId: string;
  images: ImagesPostsType[];
  contentTemplate?: {
    friendlyName: string;
    sid: string;
    id: string;
  };
  _count?: {
    messages: number;
  };
}

export interface ImagesPostsType {
  id: number;
  url: string;
  postId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePostData {
  schedule: string;
  text: string;
  images?: { url: string }[];
}

export interface UpdatePostData {
  schedule?: string;
  text?: string;
  images?: { url: string }[];
}