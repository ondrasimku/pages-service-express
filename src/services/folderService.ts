import { injectable, inject } from 'inversify';
import { IFolderRepository } from '../repositories/folderRepository';
import { IPageRepository } from '../repositories/pageRepository';
import { IPageLinkRepository } from '../repositories/pageLinkRepository';
import { IBinRepository } from '../repositories/binRepository';
import { ILogger } from '../logging/logger.interface';
import { TYPES } from '../types/di.types';
import { Folder } from '../models/folder';
import { Page } from '../models/page';
import { PageLink } from '../models/pageLink';

export interface IFolderService {
  getFolderById(id: string, userId: string): Promise<Folder | null>;
  getUserFolders(userId: string): Promise<Folder[]>;
  createFolder(userId: string, name: string, parentId?: string | null): Promise<Folder>;
  updateFolder(id: string, userId: string, data: { name?: string; parentId?: string | null }): Promise<Folder | null>;
  deleteFolder(id: string, userId: string): Promise<boolean>;
  moveFolder(id: string, userId: string, newParentId: string | null): Promise<Folder | null>;
}

@injectable()
export class FolderService implements IFolderService {
  constructor(
    @inject(TYPES.FolderRepository) private folderRepository: IFolderRepository,
    @inject(TYPES.PageRepository) private pageRepository: IPageRepository,
    @inject(TYPES.PageLinkRepository) private pageLinkRepository: IPageLinkRepository,
    @inject(TYPES.BinRepository) private binRepository: IBinRepository,
    @inject(TYPES.Logger) private logger: ILogger,
  ) {}

  async getFolderById(id: string, userId: string): Promise<Folder | null> {
    this.logger.debug('Fetching folder by ID', { folderId: id, userId });
    const folder = await this.folderRepository.findById(id);

    if (!folder || folder.userId !== userId) {
      return null;
    }

    return folder;
  }

  async getUserFolders(userId: string): Promise<Folder[]> {
    this.logger.debug('Fetching user folders', { userId });
    return await this.folderRepository.findByUserIdWithHierarchy(userId);
  }

  async createFolder(userId: string, name: string, parentId?: string | null): Promise<Folder> {
    this.logger.debug('Creating folder', { userId, name, parentId });

    if (parentId) {
      const parent = await this.folderRepository.findById(parentId);
      if (!parent || parent.userId !== userId) {
        throw new Error('Parent folder not found or access denied');
      }
    }

    const folder = await this.folderRepository.create({
      userId,
      name,
      parentId: parentId || null,
      position: 0,
    });

    this.logger.info('Folder created successfully', { folderId: folder.id, userId });
    return folder;
  }

  async updateFolder(id: string, userId: string, data: { name?: string; parentId?: string | null }): Promise<Folder | null> {
    this.logger.debug('Updating folder', { folderId: id, userId, data });

    const folder = await this.getFolderById(id, userId);
    if (!folder) {
      this.logger.warn('Folder not found or access denied', { folderId: id, userId });
      return null;
    }

    if (data.parentId !== undefined && data.parentId !== null) {
      const hasCircular = await this.folderRepository.hasCircularReference(id, data.parentId);
      if (hasCircular) {
        throw new Error('Circular reference detected: folder cannot be its own ancestor');
      }

      const parent = await this.folderRepository.findById(data.parentId);
      if (!parent || parent.userId !== userId) {
        throw new Error('Parent folder not found or access denied');
      }
    }

    const updatedFolder = await this.folderRepository.update(id, data);
    this.logger.info('Folder updated successfully', { folderId: id, userId });
    return updatedFolder;
  }

  async deleteFolder(id: string, userId: string): Promise<boolean> {
    this.logger.debug('Deleting folder', { folderId: id, userId });

    const folder = await this.getFolderById(id, userId);
    if (!folder) {
      this.logger.warn('Folder not found or access denied', { folderId: id, userId });
      return false;
    }

    // Recursively collect all subfolders
    const allSubfolders = await this.collectAllSubfolders(id, userId);
    
    // Collect all pages in folder and subfolders
    const folderIds = [id, ...allSubfolders.map(f => f.id)];
    const allPages: Page[] = [];
    const allPageLinks: PageLink[] = [];
    
    for (const folderId of folderIds) {
      const pages = await this.pageRepository.findByUserId(userId, { folderId });
      allPages.push(...pages);
      
      // Collect links for each page
      for (const page of pages) {
        const links = await this.pageLinkRepository.findByPageId(page.id);
        allPageLinks.push(...links);
      }
    }

    // Create bin item with complete snapshot
    await this.binRepository.create({
      userId,
      itemType: 'folder',
      itemId: id,
      itemData: {
        folder: {
          id: folder.id,
          userId: folder.userId,
          parentId: folder.parentId,
          name: folder.name,
          position: folder.position,
          createdAt: folder.createdAt,
          updatedAt: folder.updatedAt,
        },
        subfolders: allSubfolders.map(f => ({
          id: f.id,
          userId: f.userId,
          parentId: f.parentId,
          name: f.name,
          position: f.position,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
        })),
        pages: allPages.map(p => ({
          id: p.id,
          userId: p.userId,
          folderId: p.folderId,
          title: p.title,
          content: p.content,
          isPublished: p.isPublished,
          slug: p.slug,
          publishedAt: p.publishedAt,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        })),
        allPageLinks: allPageLinks.map(link => ({
          id: link.id,
          fromPageId: link.fromPageId,
          toPageId: link.toPageId,
          createdAt: link.createdAt,
        })),
      },
      deletedAt: new Date(),
    });

    // Delete all page links
    for (const page of allPages) {
      await this.pageLinkRepository.deleteByPageId(page.id);
    }

    // Delete all pages
    for (const page of allPages) {
      await this.pageRepository.delete(page.id);
    }

    // Delete all subfolders (in reverse order to handle hierarchy)
    for (let i = allSubfolders.length - 1; i >= 0; i--) {
      await this.folderRepository.delete(allSubfolders[i].id);
    }

    // Delete main folder
    const deleted = await this.folderRepository.delete(id);
    
    if (deleted) {
      this.logger.info('Folder moved to bin', { 
        folderId: id, 
        userId,
        subfoldersCount: allSubfolders.length,
        pagesCount: allPages.length,
      });
    }
    return deleted;
  }

  private async collectAllSubfolders(folderId: string, userId: string): Promise<Folder[]> {
    const result: Folder[] = [];
    const children = await this.folderRepository.findChildren(folderId);
    
    for (const child of children) {
      if (child.userId === userId) {
        result.push(child);
        const descendants = await this.collectAllSubfolders(child.id, userId);
        result.push(...descendants);
      }
    }
    
    return result;
  }

  async moveFolder(id: string, userId: string, newParentId: string | null): Promise<Folder | null> {
    this.logger.debug('Moving folder', { folderId: id, userId, newParentId });

    if (newParentId !== null) {
      const hasCircular = await this.folderRepository.hasCircularReference(id, newParentId);
      if (hasCircular) {
        throw new Error('Circular reference detected: folder cannot be moved to its own descendant');
      }
    }

    return await this.updateFolder(id, userId, { parentId: newParentId });
  }
}

