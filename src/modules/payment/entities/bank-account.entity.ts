import { Entity, Column, OneToOne, JoinColumn, ManyToOne } from 'typeorm';
//
import { User } from '../../auth/entities';
import { BaseEntity } from '../../../default/common/entities';

@Entity({ name: 'user_bank_accounts' })
export class BankAccount extends BaseEntity {
  @ManyToOne(() => User, (user) => user.bankAccounts, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 255, name: 'account_number', nullable: false })
  account_number: string;

  @Column({ type: 'varchar', length: 255, name: 'ifsc_internal', nullable: false })
  ifsc_internal: string;

  @Column({ type: 'varchar', length: 255, name: 'bank_name', nullable: false })
  bank_name: string;

  @Column({ type: 'varchar', length: 255, name: 'bank_holder_name_internal', nullable: false })
  bank_holder_name_internal: string;

  @Column({ type: 'tinyint', default: 1 })
  status: number;
}
