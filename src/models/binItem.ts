import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn,
  Index,
} from 'typeorm';

export type ItemType = 'page' | 'folder';

@Entity('bin_items')
@Index(['userId', 'deletedAt'])
@Index(['itemType'])
export class BinItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ name: 'item_type', type: 'varchar' })
  itemType!: ItemType;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId!: string;

  @Column({ name: 'item_data', type: 'jsonb' })
  itemData!: Record<string, any>;

  @Column({ name: 'deleted_at', type: 'timestamp' })
  deletedAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

export default BinItem;
