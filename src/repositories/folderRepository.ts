import { injectable, inject } from 'inversify';
import { Repository, DataSource } from 'typeorm';
import { Folder } from '../models/folder';
import { TYPES } from '../types/di.types';

export interface IFolderRepository {
  findById(id: string): Promise<Folder | null>;
  findByUserId(userId: string): Promise<Folder[]>;
  findByUserIdWithHierarchy(userId: string): Promise<Folder[]>;
  findChildren(folderId: string): Promise<Folder[]>;
  create(data: Partial<Folder>): Promise<Folder>;
  update(id: string, data: Partial<Folder>): Promise<Folder | null>;
  delete(id: string): Promise<boolean>;
  hasCircularReference(folderId: string, parentId: string): Promise<boolean>;
}

@injectable()
export class FolderRepository implements IFolderRepository {
  private repository: Repository<Folder>;

  constructor(
    @inject(TYPES.DataSource) dataSource: DataSource,
  ) {
    this.repository = dataSource.getRepository(Folder);
  }

  async findById(id: string): Promise<Folder | null> {
    return await this.repository.findOne({
      where: { id },
      relations: ['parent', 'children'],
    });
  }

  async findByUserId(userId: string): Promise<Folder[]> {
    return await this.repository.find({
      where: { userId },
      order: { position: 'ASC', name: 'ASC' },
    });
  }

  async findByUserIdWithHierarchy(userId: string): Promise<Folder[]> {
    return await this.repository.find({
      where: { userId },
      relations: ['parent', 'children'],
      order: { position: 'ASC', name: 'ASC' },
    });
  }

  async findChildren(folderId: string): Promise<Folder[]> {
    return await this.repository.find({
      where: { parentId: folderId },
      order: { position: 'ASC', name: 'ASC' },
    });
  }

  async create(data: Partial<Folder>): Promise<Folder> {
    const folder = this.repository.create(data);
    return await this.repository.save(folder);
  }

  async update(id: string, data: Partial<Folder>): Promise<Folder | null> {
    await this.repository.update(id, data);
    return await this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async hasCircularReference(folderId: string, parentId: string): Promise<boolean> {
    let currentId: string | null = parentId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === folderId) {
        return true;
      }

      if (visited.has(currentId)) {
        return true;
      }

      visited.add(currentId);

      const folder = await this.repository.findOne({
        where: { id: currentId },
        select: ['parentId'],
      });

      currentId = folder?.parentId ?? null;
    }

    return false;
  }
}

