import { injectable, inject } from 'inversify';
import { Repository, DataSource, ILike } from 'typeorm';
import { Page } from '../models/page';
import { TYPES } from '../types/di.types';

export interface PageFilters {
  userId?: string;
  folderId?: string | null;
  search?: string;
  isPublished?: boolean;
}

export interface IPageRepository {
  findById(id: string): Promise<Page | null>;
  findBySlug(slug: string): Promise<Page | null>;
  findByUserId(userId: string, filters?: PageFilters): Promise<Page[]>;
  findPublished(filters?: PageFilters): Promise<Page[]>;
  create(data: Partial<Page>): Promise<Page>;
  update(id: string, data: Partial<Page>): Promise<Page | null>;
  delete(id: string): Promise<boolean>;
  isSlugTaken(slug: string, excludePageId?: string): Promise<boolean>;
}

@injectable()
export class PageRepository implements IPageRepository {
  private repository: Repository<Page>;

  constructor(
    @inject(TYPES.DataSource) dataSource: DataSource,
  ) {
    this.repository = dataSource.getRepository(Page);
  }

  async findById(id: string): Promise<Page | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['folder'],
    });
  }

  async findBySlug(slug: string): Promise<Page | null> {
    return await this.repository.findOne({
      where: { slug, isPublished: true },
      relations: ['folder'],
    });
  }

  async findByUserId(userId: string, filters?: PageFilters): Promise<Page[]> {
    const where: any = { userId };

    if (filters?.folderId !== undefined) {
      where.folderId = filters.folderId;
    }

    if (filters?.isPublished !== undefined) {
      where.isPublished = filters.isPublished;
    }

    const queryBuilder = this.repository.createQueryBuilder('page')
      .leftJoinAndSelect('page.folder', 'folder')
      .where(where);

    if (filters?.search) {
      queryBuilder.andWhere(
        '(page.title ILIKE :search OR page.content::text ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    return await queryBuilder
      .orderBy('page.updatedAt', 'DESC')
      .getMany();
  }

  async findPublished(filters?: PageFilters): Promise<Page[]> {
    const where: any = { isPublished: true };

    if (filters?.search) {
      return await this.repository.createQueryBuilder('page')
        .leftJoinAndSelect('page.folder', 'folder')
        .where(where)
        .andWhere(
          '(page.title ILIKE :search OR page.content::text ILIKE :search)',
          { search: `%${filters.search}%` }
        )
        .orderBy('page.publishedAt', 'DESC')
        .getMany();
    }

    return await this.repository.find({
      where,
      relations: ['folder'],
      order: { publishedAt: 'DESC' },
    });
  }

  async create(data: Partial<Page>): Promise<Page> {
    const page = this.repository.create(data);
    return await this.repository.save(page);
  }

  async update(id: string, data: Partial<Page>): Promise<Page | null> {
    await this.repository.update(id, data);
    return await this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async isSlugTaken(slug: string, excludePageId?: string): Promise<boolean> {
    const query = this.repository.createQueryBuilder('page')
      .where('page.slug = :slug', { slug });

    if (excludePageId) {
      query.andWhere('page.id != :excludePageId', { excludePageId });
    }

    const count = await query.getCount();
    return count > 0;
  }
}

