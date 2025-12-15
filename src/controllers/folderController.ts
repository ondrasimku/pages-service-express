import { injectable, inject } from 'inversify';
import { Response, NextFunction } from 'express';
import { AppError } from '../middlewares/errorHandler';
import { AuthenticatedRequest } from '../middlewares/auth';
import { IFolderService } from '../services/folderService';
import { TYPES } from '../types/di.types';
import { FolderResponseDto, CreateFolderDto, UpdateFolderDto, MoveFolderDto } from '../dto/folder.dto';

@injectable()
export class FolderController {
  constructor(
    @inject(TYPES.FolderService) private folderService: IFolderService,
  ) {}

  getFolders = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.auth?.userId || req.user?.sub;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const folders = await this.folderService.getUserFolders(userId);
      res.json(folders.map(folder => this.mapToFolderResponse(folder)));
    } catch (error) {
      next(error);
    }
  };

  getFolderById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.auth?.userId || req.user?.sub;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const folder = await this.folderService.getFolderById(id, userId);

      if (!folder) {
        res.status(404).json({ message: 'Folder not found' });
        return;
      }

      res.json(this.mapToFolderResponse(folder));
    } catch (error) {
      next(error);
    }
  };

  createFolder = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.auth?.userId || req.user?.sub;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const data: CreateFolderDto = req.body;

      if (!data.name || data.name.trim().length === 0) {
        throw new AppError('Name is required', 400);
      }

      const folder = await this.folderService.createFolder(
        userId,
        data.name,
        data.parentId,
      );

      res.status(201).json(this.mapToFolderResponse(folder));
    } catch (error) {
      next(error);
    }
  };

  updateFolder = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.auth?.userId || req.user?.sub;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const data: UpdateFolderDto = req.body;

      const folder = await this.folderService.updateFolder(id, userId, data);

      if (!folder) {
        res.status(404).json({ message: 'Folder not found' });
        return;
      }

      res.json(this.mapToFolderResponse(folder));
    } catch (error) {
      next(error);
    }
  };

  deleteFolder = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.auth?.userId || req.user?.sub;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const deleted = await this.folderService.deleteFolder(id, userId);

      if (!deleted) {
        res.status(404).json({ message: 'Folder not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  moveFolder = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.auth?.userId || req.user?.sub;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const data: MoveFolderDto = req.body;

      const folder = await this.folderService.moveFolder(id, userId, data.parentId);

      if (!folder) {
        res.status(404).json({ message: 'Folder not found' });
        return;
      }

      res.json(this.mapToFolderResponse(folder));
    } catch (error) {
      next(error);
    }
  };

  private mapToFolderResponse(folder: any): FolderResponseDto {
    return {
      id: folder.id,
      userId: folder.userId,
      parentId: folder.parentId,
      name: folder.name,
      position: folder.position,
      parent: folder.parent ? {
        id: folder.parent.id,
        name: folder.parent.name,
      } : null,
      children: folder.children?.map((child: any) => this.mapToFolderResponse(child)),
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    };
  }
}

