import { injectable, inject } from 'inversify';
import { IBinRepository } from '../repositories/binRepository';
import { IPageRepository } from '../repositories/pageRepository';
import { IFolderRepository } from '../repositories/folderRepository';
import { IPageLinkRepository } from '../repositories/pageLinkRepository';
import { ILogger } from '../logging/logger.interface';
import { TYPES } from '../types/di.types';
import { BinItem } from '../models/binItem';
import { Page } from '../models/page';
import { Folder } from '../models/folder';
import { PageLink } from '../models/pageLink';

export interface IBinService {
  getUserBinItems(userId: string): Promise<BinItem[]>;
  restoreItem(id: string, userId: string): Promise<void>;
  permanentlyDelete(id: string, userId: string): Promise<boolean>;
  emptyBin(userId: string): Promise<number>;
}

@injectable()
export class BinService implements IBinService {
  constructor(
    @inject(TYPES.BinRepository) private binRepository: IBinRepository,
    @inject(TYPES.PageRepository) private pageRepository: IPageRepository,
    @inject(TYPES.FolderRepository) private folderRepository: IFolderRepository,
    @inject(TYPES.PageLinkRepository) private pageLinkRepository: IPageLinkRepository,
    @inject(TYPES.Logger) private logger: ILogger,
  ) {}

  async getUserBinItems(userId: string): Promise<BinItem[]> {
    this.logger.debug('Fetching user bin items', { userId });
    return await this.binRepository.findByUserId(userId);
  }

  async restoreItem(id: string, userId: string): Promise<void> {
    this.logger.debug('Restoring bin item', { binItemId: id, userId });

    const binItem = await this.binRepository.findById(id);
    if (!binItem) {
      throw new Error('Bin item not found');
    }

    if (binItem.userId !== userId) {
      throw new Error('Access denied');
    }

    if (binItem.itemType === 'page') {
      await this.restorePage(binItem);
    } else if (binItem.itemType === 'folder') {
      await this.restoreFolder(binItem);
    } else {
      throw new Error(`Unknown item type: ${binItem.itemType}`);
    }

    // Delete bin item after successful restore
    await this.binRepository.delete(id);
    this.logger.info('Bin item restored successfully', { binItemId: id, itemType: binItem.itemType });
  }

  private async restorePage(binItem: BinItem): Promise<void> {
    const { page, links } = binItem.itemData as { page: Page; links: PageLink[] };

    // Handle slug conflicts
    if (page.slug) {
      const slugTaken = await this.pageRepository.isSlugTaken(page.slug);
      if (slugTaken) {
        // Clear slug and unpublish to avoid conflict
        page.slug = null;
        page.isPublished = false;
        page.publishedAt = null;
        this.logger.warn('Slug conflict during restore, page unpublished', { 
          pageId: page.id, 
          slug: page.slug 
        });
      }
    }

    // Check if folder still exists
    if (page.folderId) {
      const folder = await this.folderRepository.findById(page.folderId);
      if (!folder || folder.userId !== page.userId) {
        // Folder no longer exists, set to null
        page.folderId = null;
      }
    }

    // Restore page
    await this.pageRepository.create({
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
    });

    // Restore links (only if target pages still exist)
    if (links && links.length > 0) {
      for (const link of links) {
        try {
          const targetPage = await this.pageRepository.findById(link.toPageId);
          if (targetPage) {
            await this.pageLinkRepository.create(link.fromPageId, link.toPageId);
          }
        } catch (error) {
          this.logger.warn('Failed to restore page link', { 
            linkId: link.id, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
    }
  }

  private async restoreFolder(binItem: BinItem): Promise<void> {
    const { folder, pages, subfolders, allPageLinks } = binItem.itemData as {
      folder: Folder;
      pages: Page[];
      subfolders: Folder[];
      allPageLinks: PageLink[];
    };

    // Check if parent folder still exists
    if (folder.parentId) {
      const parent = await this.folderRepository.findById(folder.parentId);
      if (!parent || parent.userId !== folder.userId) {
        // Parent no longer exists, set to root
        folder.parentId = null;
      }
    }

    // Restore main folder
    await this.folderRepository.create({
      id: folder.id,
      userId: folder.userId,
      parentId: folder.parentId,
      name: folder.name,
      position: folder.position,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    });

    // Restore subfolders (in correct hierarchy order)
    if (subfolders && subfolders.length > 0) {
      // Sort by depth (folders with no parent first)
      const sortedSubfolders = this.sortFoldersByHierarchy(subfolders);
      
      for (const subfolder of sortedSubfolders) {
        try {
          await this.folderRepository.create({
            id: subfolder.id,
            userId: subfolder.userId,
            parentId: subfolder.parentId,
            name: subfolder.name,
            position: subfolder.position,
            createdAt: subfolder.createdAt,
            updatedAt: subfolder.updatedAt,
          });
        } catch (error) {
          this.logger.warn('Failed to restore subfolder', { 
            folderId: subfolder.id, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
    }

    // Restore pages
    if (pages && pages.length > 0) {
      for (const page of pages) {
        try {
          // Handle slug conflicts
          if (page.slug) {
            const slugTaken = await this.pageRepository.isSlugTaken(page.slug);
            if (slugTaken) {
              page.slug = null;
              page.isPublished = false;
              page.publishedAt = null;
            }
          }

          await this.pageRepository.create({
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
          });
        } catch (error) {
          this.logger.warn('Failed to restore page', { 
            pageId: page.id, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
    }

    // Restore page links (only if both pages exist)
    if (allPageLinks && allPageLinks.length > 0) {
      for (const link of allPageLinks) {
        try {
          const fromPage = await this.pageRepository.findById(link.fromPageId);
          const toPage = await this.pageRepository.findById(link.toPageId);
          
          if (fromPage && toPage) {
            await this.pageLinkRepository.create(link.fromPageId, link.toPageId);
          }
        } catch (error) {
          this.logger.warn('Failed to restore page link', { 
            linkId: link.id, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
    }
  }

  private sortFoldersByHierarchy(folders: Folder[]): Folder[] {
    const folderMap = new Map<string, Folder>();
    folders.forEach(f => folderMap.set(f.id, f));

    const result: Folder[] = [];
    const processed = new Set<string>();

    const addFolder = (folder: Folder) => {
      if (processed.has(folder.id)) return;

      // Add parent first if exists
      if (folder.parentId && folderMap.has(folder.parentId)) {
        const parent = folderMap.get(folder.parentId)!;
        addFolder(parent);
      }

      if (!processed.has(folder.id)) {
        result.push(folder);
        processed.add(folder.id);
      }
    };

    folders.forEach(addFolder);
    return result;
  }

  async permanentlyDelete(id: string, userId: string): Promise<boolean> {
    this.logger.debug('Permanently deleting bin item', { binItemId: id, userId });

    const binItem = await this.binRepository.findById(id);
    if (!binItem) {
      return false;
    }

    if (binItem.userId !== userId) {
      throw new Error('Access denied');
    }

    const deleted = await this.binRepository.delete(id);
    if (deleted) {
      this.logger.info('Bin item permanently deleted', { binItemId: id });
    }
    return deleted;
  }

  async emptyBin(userId: string): Promise<number> {
    this.logger.debug('Emptying bin', { userId });
    const count = await this.binRepository.deleteAllByUserId(userId);
    this.logger.info('Bin emptied', { userId, itemsDeleted: count });
    return count;
  }
}
