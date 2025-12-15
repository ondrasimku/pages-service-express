import { injectable, inject } from 'inversify';
import { Repository, DataSource } from 'typeorm';
import { PageLink } from '../models/pageLink';
import { TYPES } from '../types/di.types';

export interface IPageLinkRepository {
  findById(id: string): Promise<PageLink | null>;
  findByPageId(pageId: string): Promise<PageLink[]>;
  findOutgoingLinks(fromPageId: string): Promise<PageLink[]>;
  findIncomingLinks(toPageId: string): Promise<PageLink[]>;
  create(fromPageId: string, toPageId: string): Promise<PageLink>;
  delete(id: string): Promise<boolean>;
  deleteByPageId(pageId: string): Promise<void>;
  deleteBetweenPages(fromPageId: string, toPageId: string): Promise<void>;
  linkExists(fromPageId: string, toPageId: string): Promise<boolean>;
}

@injectable()
export class PageLinkRepository implements IPageLinkRepository {
  private repository: Repository<PageLink>;

  constructor(
    @inject(TYPES.DataSource) dataSource: DataSource,
  ) {
    this.repository = dataSource.getRepository(PageLink);
  }

  async findById(id: string): Promise<PageLink | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['fromPage', 'toPage'],
    });
  }

  async findByPageId(pageId: string): Promise<PageLink[]> {
    return await this.repository.find({
      where: [
        { fromPageId: pageId },
        { toPageId: pageId },
      ],
      relations: ['fromPage', 'toPage'],
    });
  }

  async findOutgoingLinks(fromPageId: string): Promise<PageLink[]> {
    return await this.repository.find({
      where: { fromPageId },
      relations: ['toPage'],
      order: { createdAt: 'DESC' },
    });
  }

  async findIncomingLinks(toPageId: string): Promise<PageLink[]> {
    return await this.repository.find({
      where: { toPageId },
      relations: ['fromPage'],
      order: { createdAt: 'DESC' },
    });
  }

  async create(fromPageId: string, toPageId: string): Promise<PageLink> {
    const existingLink = await this.repository.findOne({
      where: { fromPageId, toPageId },
    });

    if (existingLink) {
      return existingLink;
    }

    const link = this.repository.create({ fromPageId, toPageId });
    return await this.repository.save(link);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async deleteByPageId(pageId: string): Promise<void> {
    await this.repository.delete([
      { fromPageId: pageId },
      { toPageId: pageId },
    ]);
  }

  async deleteBetweenPages(fromPageId: string, toPageId: string): Promise<void> {
    await this.repository.delete({ fromPageId, toPageId });
  }

  async linkExists(fromPageId: string, toPageId: string): Promise<boolean> {
    const count = await this.repository.count({
      where: { fromPageId, toPageId },
    });
    return count > 0;
  }
}

