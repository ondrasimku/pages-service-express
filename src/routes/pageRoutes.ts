import { Router } from 'express';
import container from '../config/container';
import { PageController } from '../controllers/pageController';
import { TYPES } from '../types/di.types';
import { authenticateToken } from '../middlewares/auth';

const router = Router();
const pageController = container.get<PageController>(TYPES.PageController);

router.get('/', authenticateToken, pageController.getPages);
router.get('/:id', authenticateToken, pageController.getPageById);
router.post('/', authenticateToken, pageController.createPage);
router.patch('/:id', authenticateToken, pageController.updatePage);
router.delete('/:id', authenticateToken, pageController.deletePage);
router.post('/:id/publish', authenticateToken, pageController.publishPage);
router.post('/:id/unpublish', authenticateToken, pageController.unpublishPage);
router.post('/:id/move', authenticateToken, pageController.movePage);
router.get('/:id/links', authenticateToken, pageController.getPageLinks);
router.get('/:id/backlinks', authenticateToken, pageController.getBacklinks);

export default router;

