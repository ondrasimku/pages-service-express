import { Router } from 'express';
import { BinController } from '../controllers/binController';
import { authenticateToken } from '../middlewares/auth';
import container from '../config/container';
import { TYPES } from '../types/di.types';

const router = Router();
const binController = container.get<BinController>(TYPES.BinController);

// All bin routes require authentication
router.use(authenticateToken);

// GET /api/bin - Get all bin items for user
router.get('/', (req, res, next) => binController.getBinItems(req, res, next));

// POST /api/bin/:id/restore - Restore item from bin
router.post('/:id/restore', (req, res, next) => binController.restoreItem(req, res, next));

// DELETE /api/bin/:id - Permanently delete item
router.delete('/:id', (req, res, next) => binController.deleteItem(req, res, next));

// DELETE /api/bin - Empty entire bin
router.delete('/', (req, res, next) => binController.emptyBin(req, res, next));

export default router;
