import { injectable, inject } from 'inversify';
import { IPageLinkRepository } from '../repositories/pageLinkRepository';
import { IPageRepository } from '../repositories/pageRepository';
import { ILogger } from '../logging/logger.interface';
import { TYPES } from '../types/di.types';
import { PageLink } from '../models/pageLink';

export interface IPageLinkService {
  getPageLinks(pageId: string, userId: string): Promise<{ outgoing: PageLink[]; incoming: PageLink[] }>;
  getBacklinks(pageId: string, userId: string): Promise<PageLink[]>;
  createLink(fromPageId: string, toPageId: string, userId: string): Promise<PageLink>;
  deleteLink(fromPageId: string, toPageId: string, userId: string): Promise<void>;
  updatePageLinks(pageId: string, userId: string, linkedPageIds: string[]): Promise<void>;
  extractPageLinksFromContent(content: any): string[];
}

@injectable()
export class PageLinkService implements IPageLinkService {
  constructor(
    @inject(TYPES.PageLinkRepository) private pageLinkRepository: IPageLinkRepository,
    @inject(TYPES.PageRepository) private pageRepository: IPageRepository,
    @inject(TYPES.Logger) private logger: ILogger,
  ) {}

  async getPageLinks(pageId: string, userId: string): Promise<{ outgoing: PageLink[]; incoming: PageLink[] }> {
    this.logger.debug('Fetching page links', { pageId, userId });

    const page = await this.pageRepository.findById(pageId);
    if (!page || page.userId !== userId) {
      throw new Error('Page not found or access denied');
    }

    const outgoing = await this.pageLinkRepository.findOutgoingLinks(pageId);
    const incoming = await this.pageLinkRepository.findIncomingLinks(pageId);

    return { outgoing, incoming };
  }

  async getBacklinks(pageId: string, userId: string): Promise<PageLink[]> {
    this.logger.debug('Fetching backlinks', { pageId, userId });

    const page = await this.pageRepository.findById(pageId);
    if (!page || page.userId !== userId) {
      throw new Error('Page not found or access denied');
    }

    return await this.pageLinkRepository.findIncomingLinks(pageId);
  }

  async createLink(fromPageId: string, toPageId: string, userId: string): Promise<PageLink> {
    this.logger.debug('Creating page link', { fromPageId, toPageId, userId });

    const fromPage = await this.pageRepository.findById(fromPageId);
    const toPage = await this.pageRepository.findById(toPageId);

    if (!fromPage || fromPage.userId !== userId) {
      throw new Error('Source page not found or access denied');
    }

    if (!toPage || toPage.userId !== userId) {
      throw new Error('Target page not found or access denied');
    }

    if (fromPageId === toPageId) {
      throw new Error('Cannot create self-referential link');
    }

    const link = await this.pageLinkRepository.create(fromPageId, toPageId);
    this.logger.info('Page link created successfully', { linkId: link.id, fromPageId, toPageId, userId });
    return link;
  }

  async deleteLink(fromPageId: string, toPageId: string, userId: string): Promise<void> {
    this.logger.debug('Deleting page link', { fromPageId, toPageId, userId });

    const fromPage = await this.pageRepository.findById(fromPageId);
    if (!fromPage || fromPage.userId !== userId) {
      throw new Error('Source page not found or access denied');
    }

    await this.pageLinkRepository.deleteBetweenPages(fromPageId, toPageId);
    this.logger.info('Page link deleted successfully', { fromPageId, toPageId, userId });
  }

  async updatePageLinks(pageId: string, userId: string, linkedPageIds: string[]): Promise<void> {
    this.logger.debug('Updating page links', { pageId, userId, linkedPageCount: linkedPageIds.length });

    const page = await this.pageRepository.findById(pageId);
    if (!page || page.userId !== userId) {
      throw new Error('Page not found or access denied');
    }

    const existingLinks = await this.pageLinkRepository.findOutgoingLinks(pageId);
    const existingTargetIds = new Set(existingLinks.map(link => link.toPageId));
    const newTargetIds = new Set(linkedPageIds);

    for (const existingId of existingTargetIds) {
      if (!newTargetIds.has(existingId)) {
        await this.pageLinkRepository.deleteBetweenPages(pageId, existingId);
      }
    }

    for (const newId of newTargetIds) {
      if (!existingTargetIds.has(newId) && newId !== pageId) {
        const targetPage = await this.pageRepository.findById(newId);
        if (targetPage && targetPage.userId === userId) {
          await this.pageLinkRepository.create(pageId, newId);
        }
      }
    }

    this.logger.info('Page links updated successfully', { pageId, userId, linkCount: newTargetIds.size });
  }

  extractPageLinksFromContent(content: any): string[] {
    const linkedPageIds: string[] = [];

    const traverse = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;

      if (obj.type === 'pageLink' && obj.attrs?.pageId) {
        linkedPageIds.push(obj.attrs.pageId);
      }

      if (Array.isArray(obj.content)) {
        obj.content.forEach(traverse);
      }

      if (obj.marks && Array.isArray(obj.marks)) {
        obj.marks.forEach(traverse);
      }
    };

    traverse(content);
    return [...new Set(linkedPageIds)];
  }
}

