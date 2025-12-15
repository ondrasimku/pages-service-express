import { injectable, inject } from 'inversify';
import { Response, NextFunction } from 'express';
import { AppError } from '../middlewares/errorHandler';
import { AuthenticatedRequest } from '../middlewares/auth';
import { IPageService } from '../services/pageService';
import { IPageLinkService } from '../services/pageLinkService';
import { TYPES } from '../types/di.types';
import { PageResponseDto, CreatePageDto, UpdatePageDto, PublishPageDto, MovePageDto, PageLinksResponseDto } from '../dto/page.dto';

@injectable()
export class PageController {
  constructor(
    @inject(TYPES.PageService) private pageService: IPageService,
    @inject(TYPES.PageLinkService) private pageLinkService: IPageLinkService,
  ) {}

  getPages = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.auth?.userId || req.user?.sub;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const folderId = req.query.folderId as string | undefined;
      const search = req.query.search as string | undefined;

      const pages = await this.pageService.getUserPages(userId, {
        folderId: folderId === 'null' ? null : folderId,
        search,
      });

      res.json(pages.map(page => this.mapToPageResponse(page)));
    } catch (error) {
      next(error);
    }
  };

  getPageById = async (
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

      const page = await this.pageService.getPageById(id, userId);

      if (!page) {
        res.status(404).json({ message: 'Page not found' });
        return;
      }

      res.json(this.mapToPageResponse(page));
    } catch (error) {
      next(error);
    }
  };

  getPublicPage = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { slug } = req.params;
      const page = await this.pageService.getPageBySlug(slug);

      if (!page) {
        res.status(404).json({ message: 'Page not found' });
        return;
      }

      res.json(this.mapToPageResponse(page));
    } catch (error) {
      next(error);
    }
  };

  createPage = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const userId = req.auth?.userId || req.user?.sub;
      if (!userId) {
        throw new AppError('User not authenticated', 401);
      }

      const data: CreatePageDto = req.body;

      if (!data.title || data.title.trim().length === 0) {
        throw new AppError('Title is required', 400);
      }

      const page = await this.pageService.createPage(
        userId,
        data.title,
        data.content || {},
        data.folderId,
      );

      res.status(201).json(this.mapToPageResponse(page));
    } catch (error) {
      next(error);
    }
  };

  updatePage = async (
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

      const data: UpdatePageDto = req.body;

      const page = await this.pageService.updatePage(id, userId, data);

      if (!page) {
        res.status(404).json({ message: 'Page not found' });
        return;
      }

      if (data.content) {
        const linkedPageIds = this.pageLinkService.extractPageLinksFromContent(data.content);
        await this.pageLinkService.updatePageLinks(id, userId, linkedPageIds);
      }

      res.json(this.mapToPageResponse(page));
    } catch (error) {
      next(error);
    }
  };

  deletePage = async (
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

      const deleted = await this.pageService.deletePage(id, userId);

      if (!deleted) {
        res.status(404).json({ message: 'Page not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  publishPage = async (
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

      const data: PublishPageDto = req.body;

      if (!data.slug || data.slug.trim().length === 0) {
        throw new AppError('Slug is required', 400);
      }

      const page = await this.pageService.publishPage(id, userId, data.slug);

      if (!page) {
        res.status(404).json({ message: 'Page not found' });
        return;
      }

      res.json(this.mapToPageResponse(page));
    } catch (error) {
      next(error);
    }
  };

  unpublishPage = async (
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

      const page = await this.pageService.unpublishPage(id, userId);

      if (!page) {
        res.status(404).json({ message: 'Page not found' });
        return;
      }

      res.json(this.mapToPageResponse(page));
    } catch (error) {
      next(error);
    }
  };

  getPageLinks = async (
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

      const links = await this.pageLinkService.getPageLinks(id, userId);

      const response: PageLinksResponseDto = {
        outgoing: links.outgoing.map(link => ({
          id: link.id,
          toPageId: link.toPageId,
          toPage: {
            id: link.toPage!.id,
            title: link.toPage!.title,
            slug: link.toPage!.slug,
          },
          createdAt: link.createdAt,
        })),
        incoming: links.incoming.map(link => ({
          id: link.id,
          fromPageId: link.fromPageId,
          fromPage: {
            id: link.fromPage!.id,
            title: link.fromPage!.title,
            slug: link.fromPage!.slug,
          },
          createdAt: link.createdAt,
        })),
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  getBacklinks = async (
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

      const backlinks = await this.pageLinkService.getBacklinks(id, userId);

      res.json(backlinks.map(link => ({
        id: link.id,
        fromPageId: link.fromPageId,
        fromPage: {
          id: link.fromPage!.id,
          title: link.fromPage!.title,
          slug: link.fromPage!.slug,
        },
        createdAt: link.createdAt,
      })));
    } catch (error) {
      next(error);
    }
  };

  movePage = async (
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

      const data: MovePageDto = req.body;

      const page = await this.pageService.movePage(id, userId, data.folderId);

      if (!page) {
        res.status(404).json({ message: 'Page not found' });
        return;
      }

      res.json(this.mapToPageResponse(page));
    } catch (error) {
      next(error);
    }
  };

  private mapToPageResponse(page: any): PageResponseDto {
    return {
      id: page.id,
      userId: page.userId,
      folderId: page.folderId,
      title: page.title,
      content: page.content,
      isPublished: page.isPublished,
      slug: page.slug,
      publishedAt: page.publishedAt,
      folder: page.folder ? {
        id: page.folder.id,
        name: page.folder.name,
      } : null,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    };
  }
}

