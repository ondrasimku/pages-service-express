import { Router } from 'express';
import container from '../config/container';
import { FolderController } from '../controllers/folderController';
import { TYPES } from '../types/di.types';
import { authenticateToken } from '../middlewares/auth';

const router = Router();
const folderController = container.get<FolderController>(TYPES.FolderController);

router.get('/', authenticateToken, folderController.getFolders);
router.get('/:id', authenticateToken, folderController.getFolderById);
router.post('/', authenticateToken, folderController.createFolder);
router.patch('/:id', authenticateToken, folderController.updateFolder);
router.delete('/:id', authenticateToken, folderController.deleteFolder);
router.post('/:id/move', authenticateToken, folderController.moveFolder);

export default router;

