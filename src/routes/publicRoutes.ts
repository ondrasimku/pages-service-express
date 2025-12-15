import { Router } from 'express';
import container from '../config/container';
import { PageController } from '../controllers/pageController';
import { TYPES } from '../types/di.types';

const router = Router();
const pageController = container.get<PageController>(TYPES.PageController);

router.get('/:slug', pageController.getPublicPage);

export default router;

