export interface FolderResponseDto {
  id: string;
  userId: string;
  parentId: string | null;
  name: string;
  position: number;
  parent?: {
    id: string;
    name: string;
  } | null;
  children?: FolderResponseDto[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFolderDto {
  name: string;
  parentId?: string | null;
}

export interface UpdateFolderDto {
  name?: string;
  parentId?: string | null;
}

export interface MoveFolderDto {
  parentId: string | null;
}

