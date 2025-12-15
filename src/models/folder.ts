import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Page } from './page';

@Entity('folders')
export class Folder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId!: string | null;

  @Column()
  name!: string;

  @Column({ default: 0 })
  position!: number;

  @ManyToOne(() => Folder, folder => folder.children, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent?: Folder | null;

  @OneToMany(() => Folder, folder => folder.parent)
  children?: Folder[];

  @OneToMany(() => Page, page => page.folder)
  pages?: Page[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

export default Folder;

