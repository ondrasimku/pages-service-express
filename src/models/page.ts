import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Folder } from './folder';

@Entity('pages')
@Index(['userId', 'folderId'])
@Index(['slug'], { unique: true, where: 'slug IS NOT NULL' })
export class Page {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ name: 'folder_id', type: 'uuid', nullable: true })
  folderId!: string | null;

  @Column()
  title!: string;

  @Column({ type: 'jsonb', default: '{}' })
  content!: Record<string, any>;

  @Column({ name: 'is_published', default: false })
  isPublished!: boolean;

  @Column({ type: 'varchar', nullable: true, unique: true })
  slug!: string | null;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt!: Date | null;

  @ManyToOne(() => Folder, folder => folder.pages, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'folder_id' })
  folder?: Folder | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

export default Page;

