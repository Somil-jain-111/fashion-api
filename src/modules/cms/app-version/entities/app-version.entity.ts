import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
} from 'typeorm';
import { Platform } from '../enum/platform.enum';

@Entity('app_versions')
export class AppVersionEntity extends BaseEntity{
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({
    type: 'enum',
    enum: Platform,
  })
  platform!: Platform;

  @Column({
    name: 'latest_version',
  })
  latestVersion!: string;

  @Column({
    name: 'minimum_supported_version',
  })
  minimumSupportedVersion!: string;

  @Column({
    name: 'force_update',
    default: false,
  })
  forceUpdate!: boolean;

  @Column({
    name: 'store_url',
    nullable: true,
  })
  storeUrl?: string;

  @Column({
    name: 'release_notes',
    type: 'longtext',
    nullable: true,
  })
  releaseNotes?: string;

  @Column({
    name: 'is_active',
    default: true,
  })
  isActive!: boolean;

  @Column({
    name: 'maintenance_mode',

    default: false,
  })
  maintenanceMode!: boolean;

  @Column({
    name: 'maintenance_message',

    type: 'text',

    nullable: true,
  })
  maintenanceMessage?: string;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt!: Date;
}
