import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Page } from './page';

@Entity('page_links')
@Index(['fromPageId', 'toPageId'], { unique: true })
@Index(['toPageId'])
export class PageLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'from_page_id', type: 'uuid' })
  fromPageId!: string;

  @Column({ name: 'to_page_id', type: 'uuid' })
  toPageId!: string;

  @ManyToOne(() => Page, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'from_page_id' })
  fromPage?: Page;

  @ManyToOne(() => Page, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'to_page_id' })
  toPage?: Page;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

export default PageLink;

