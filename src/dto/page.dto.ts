export interface PageResponseDto {
  id: string;
  userId: string;
  folderId: string | null;
  title: string;
  content: Record<string, any>;
  isPublished: boolean;
  slug: string | null;
  publishedAt: Date | null;
  folder?: {
    id: string;
    name: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePageDto {
  title: string;
  content?: Record<string, any>;
  folderId?: string | null;
}

export interface UpdatePageDto {
  title?: string;
  content?: Record<string, any>;
  folderId?: string | null;
}

export interface PublishPageDto {
  slug: string;
}

export interface MovePageDto {
  folderId: string | null;
}

export interface PageLinksResponseDto {
  outgoing: Array<{
    id: string;
    toPageId: string;
    toPage: {
      id: string;
      title: string;
      slug: string | null;
    };
    createdAt: Date;
  }>;
  incoming: Array<{
    id: string;
    fromPageId: string;
    fromPage: {
      id: string;
      title: string;
      slug: string | null;
    };
    createdAt: Date;
  }>;
}

