import { Response, NextFunction } from 'express';
import { injectable, inject } from 'inversify';
import { IBinService } from '../services/binService';
import { TYPES } from '../types/di.types';
import { AuthenticatedRequest } from '../middlewares/auth';
import { AppError } from '../middlewares/errorHandler';

@injectable()
export class BinController {
  constructor(
    @inject(TYPES.BinService) private binService: IBinService,
  ) {}

  getBinItems = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.auth?.userId || req.user?.sub;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const items = await this.binService.getUserBinItems(userId);
      res.json(items);
    } catch (error) {
      next(error);
    }
  };

  restoreItem = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.auth?.userId || req.user?.sub;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const { id } = req.params;
      await this.binService.restoreItem(id, userId);
      
      res.json({ message: 'Item restored successfully' });
    } catch (error) {
      next(error);
    }
  };

  deleteItem = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.auth?.userId || req.user?.sub;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const { id } = req.params;
      const deleted = await this.binService.permanentlyDelete(id, userId);
      
      if (!deleted) {
        throw new AppError('Bin item not found', 404);
      }

      res.json({ message: 'Item permanently deleted' });
    } catch (error) {
      next(error);
    }
  };

  emptyBin = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.auth?.userId || req.user?.sub;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const count = await this.binService.emptyBin(userId);
      res.json({ 
        message: 'Bin emptied successfully',
        itemsDeleted: count,
      });
    } catch (error) {
      next(error);
    }
  };
}
