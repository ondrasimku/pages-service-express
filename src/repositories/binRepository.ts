import { injectable, inject } from 'inversify';
import { Repository, DataSource } from 'typeorm';
import { BinItem } from '../models/binItem';
import { TYPES } from '../types/di.types';

export interface IBinRepository {
  findByUserId(userId: string): Promise<BinItem[]>;
  findById(id: string): Promise<BinItem | null>;
  create(data: Partial<BinItem>): Promise<BinItem>;
  delete(id: string): Promise<boolean>;
  deleteAllByUserId(userId: string): Promise<number>;
}

@injectable()
export class BinRepository implements IBinRepository {
  private repository: Repository<BinItem>;

  constructor(
    @inject(TYPES.DataSource) dataSource: DataSource,
  ) {
    this.repository = dataSource.getRepository(BinItem);
  }

  async findByUserId(userId: string): Promise<BinItem[]> {
    return await this.repository.find({
      where: { userId },
      order: { deletedAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<BinItem | null> {
    return await this.repository.findOne({
      where: { id },
    });
  }

  async create(data: Partial<BinItem>): Promise<BinItem> {
    const binItem = this.repository.create(data);
    return await this.repository.save(binItem);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async deleteAllByUserId(userId: string): Promise<number> {
    const result = await this.repository.delete({ userId });
    return result.affected ?? 0;
  }
}
