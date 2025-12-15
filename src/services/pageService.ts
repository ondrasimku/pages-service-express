import { injectable, inject } from 'inversify';
import { IPageRepository, PageFilters } from '../repositories/pageRepository';
import { IPageLinkRepository } from '../repositories/pageLinkRepository';
import { IFolderRepository } from '../repositories/folderRepository';
import { IBinRepository } from '../repositories/binRepository';
import { ILogger } from '../logging/logger.interface';
import { TYPES } from '../types/di.types';
import { Page } from '../models/page';

export interface IPageService {
  getPageById(id: string, userId?: string): Promise<Page | null>;
  getPageBySlug(slug: string): Promise<Page | null>;
  getUserPages(userId: string, filters?: PageFilters): Promise<Page[]>;
  createPage(userId: string, title: string, content?: any, folderId?: string | null): Promise<Page>;
  updatePage(id: string, userId: string, data: Partial<Page>): Promise<Page | null>;
  deletePage(id: string, userId: string): Promise<boolean>;
  publishPage(id: string, userId: string, slug: string): Promise<Page | null>;
  unpublishPage(id: string, userId: string): Promise<Page | null>;
  movePage(id: string, userId: string, folderId: string | null): Promise<Page | null>;
}

@injectable()
export class PageService implements IPageService {
  constructor(
    @inject(TYPES.PageRepository) private pageRepository: IPageRepository,
    @inject(TYPES.PageLinkRepository) private pageLinkRepository: IPageLinkRepository,
    @inject(TYPES.FolderRepository) private folderRepository: IFolderRepository,
    @inject(TYPES.BinRepository) private binRepository: IBinRepository,
    @inject(TYPES.Logger) private logger: ILogger,
  ) {}

  async getPageById(id: string, userId?: string): Promise<Page | null> {
    this.logger.debug('Fetching page by ID', { pageId: id, userId });
    const page = await this.pageRepository.findById(id);

    if (!page) {
      return null;
    }

    if (userId && page.userId !== userId && !page.isPublished) {
      return null;
    }

    if (!userId && !page.isPublished) {
      return null;
    }

    return page;
  }

  async getPageBySlug(slug: string): Promise<Page | null> {
    this.logger.debug('Fetching page by slug', { slug });
    return await this.pageRepository.findBySlug(slug);
  }

  async getUserPages(userId: string, filters?: PageFilters): Promise<Page[]> {
    this.logger.debug('Fetching user pages', { userId, filters });
    return await this.pageRepository.findByUserId(userId, filters);
  }

  async createPage(userId: string, title: string, content: any = {}, folderId?: string | null): Promise<Page> {
    this.logger.debug('Creating page', { userId, title, folderId });

    if (folderId) {
      const folder = await this.folderRepository.findById(folderId);
      if (!folder || folder.userId !== userId) {
        throw new Error('Folder not found or access denied');
      }
    }

    const page = await this.pageRepository.create({
      userId,
      title,
      content,
      folderId: folderId || null,
      isPublished: false,
      slug: null,
      publishedAt: null,
    });

    this.logger.info('Page created successfully', { pageId: page.id, userId });
    return page;
  }

  async updatePage(id: string, userId: string, data: Partial<Page>): Promise<Page | null> {
    this.logger.debug('Updating page', { pageId: id, userId, data });

    const page = await this.getPageById(id, userId);
    if (!page || page.userId !== userId) {
      this.logger.warn('Page not found or access denied', { pageId: id, userId });
      return null;
    }

    if (data.folderId !== undefined && data.folderId !== null) {
      const folder = await this.folderRepository.findById(data.folderId);
      if (!folder || folder.userId !== userId) {
        throw new Error('Folder not found or access denied');
      }
    }

    if (data.slug !== undefined && data.slug !== null) {
      const slugTaken = await this.pageRepository.isSlugTaken(data.slug, id);
      if (slugTaken) {
        throw new Error('Slug is already taken');
      }
    }

    const updateData: Partial<Page> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.folderId !== undefined) updateData.folderId = data.folderId;

    const updatedPage = await this.pageRepository.update(id, updateData);
    this.logger.info('Page updated successfully', { pageId: id, userId });
    return updatedPage;
  }

  async deletePage(id: string, userId: string): Promise<boolean> {
    this.logger.debug('Deleting page', { pageId: id, userId });

    const page = await this.getPageById(id, userId);
    if (!page || page.userId !== userId) {
      this.logger.warn('Page not found or access denied', { pageId: id, userId });
      return false;
    }

    // Fetch page links before deletion
    const links = await this.pageLinkRepository.findOutgoingLinks(id);

    // Create bin item with snapshot
    await this.binRepository.create({
      userId,
      itemType: 'page',
      itemId: id,
      itemData: {
        page: {
          id: page.id,
          userId: page.userId,
          folderId: page.folderId,
          title: page.title,
          content: page.content,
          isPublished: page.isPublished,
          slug: page.slug,
          publishedAt: page.publishedAt,
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
        },
        links: links.map(link => ({
          id: link.id,
          fromPageId: link.fromPageId,
          toPageId: link.toPageId,
          createdAt: link.createdAt,
        })),
      },
      deletedAt: new Date(),
    });

    // Delete page links and page
    await this.pageLinkRepository.deleteByPageId(id);
    const deleted = await this.pageRepository.delete(id);
    
    if (deleted) {
      this.logger.info('Page moved to bin', { pageId: id, userId });
    }
    return deleted;
  }

  async publishPage(id: string, userId: string, slug: string): Promise<Page | null> {
    this.logger.debug('Publishing page', { pageId: id, userId, slug });

    const page = await this.getPageById(id, userId);
    if (!page || page.userId !== userId) {
      this.logger.warn('Page not found or access denied', { pageId: id, userId });
      return null;
    }

    if (!slug || slug.trim().length === 0) {
      throw new Error('Slug is required for publishing');
    }

    const cleanSlug = this.sanitizeSlug(slug);
    const slugTaken = await this.pageRepository.isSlugTaken(cleanSlug, id);
    if (slugTaken) {
      throw new Error('Slug is already taken');
    }

    const updatedPage = await this.pageRepository.update(id, {
      isPublished: true,
      slug: cleanSlug,
      publishedAt: new Date(),
    });

    this.logger.info('Page published successfully', { pageId: id, userId, slug: cleanSlug });
    return updatedPage;
  }

  async unpublishPage(id: string, userId: string): Promise<Page | null> {
    this.logger.debug('Unpublishing page', { pageId: id, userId });

    const page = await this.getPageById(id, userId);
    if (!page || page.userId !== userId) {
      this.logger.warn('Page not found or access denied', { pageId: id, userId });
      return null;
    }

    const updatedPage = await this.pageRepository.update(id, {
      isPublished: false,
      publishedAt: null,
    });

    this.logger.info('Page unpublished successfully', { pageId: id, userId });
    return updatedPage;
  }

  async movePage(id: string, userId: string, folderId: string | null): Promise<Page | null> {
    this.logger.debug('Moving page', { pageId: id, userId, folderId });

    if (folderId !== null) {
      const folder = await this.folderRepository.findById(folderId);
      if (!folder || folder.userId !== userId) {
        throw new Error('Folder not found or access denied');
      }
    }

    return await this.updatePage(id, userId, { folderId });
  }

  private sanitizeSlug(slug: string): string {
    return slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

