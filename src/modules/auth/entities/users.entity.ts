import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity,
  OneToMany,
  JoinColumn,
  ManyToOne,
  Check,
  Index,
} from 'typeorm';
import {
  LoginHistories,
  Roles,
  RevokedToken,
  KycVerificationEntity,
  KycVerificationLogEntity,
  Address,
  Order,
  PointHistory,
  InvoiceEntity,
} from '.';
import { Salutation, UserType } from '../../../default/common/enums/user-type.enum';
import { UserStatus } from '../constants/auth.constants';
@Entity('users')
@Unique('UQ_MOBILE', ['mobile'])
@Unique('UQ_WHATSAPP', ['whatsapp_number'])
@Check(`points >= 0`)
@Index(['mobile'])
@Index(['status'])
export class User extends BaseEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({
    type: 'enum',
    enum: UserType,
  })
  user_type!: UserType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  firmname?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  pvt_name?: string;

  @Column({ type: 'varchar', length: 36, nullable: true, unique: true })
  uuid?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  code?: string;

  @Column({ type: 'tinyint', default: UserStatus.ACTIVE })
  status!: UserStatus;

  @Column({ type: 'tinyint', default: 0 })
  flag!: number;

  @Column({ type: 'tinyint', default: 0 })
  testRecord!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  otp?: string | null;

  @Column({ type: 'datetime', nullable: true })
  otp_expiry?: Date | null;

  @Column({ type: 'int', default: 0 })
  otp_attempt_count!: number;

  @Column({ type: 'varchar', nullable: true })
  password?: string;

  @Column({ type: 'bigint', unsigned: true, default: 0 })
  points!: bigint;

  @Column({
    type: 'text',
    nullable: true,
  })
  refreshToken?: string | null;

  @Column('timestamp', { name: 'refresh_token_expiry', nullable: true })
  refreshTokenExpiry?: Date | null;

  @OneToMany(() => LoginHistories, (loginHistories) => loginHistories.user)
  loginHistory!: LoginHistories[];

  @Column({ type: 'bigint', nullable: true })
  role_id?: string | null;

  @ManyToOne(() => Roles, (role) => role.users)
  @JoinColumn({ name: 'role_id' })
  role!: Roles;

  @Column({ type: 'varchar', length: 255, default: null })
  image_url?: string;

  @Column({ type: 'varchar', length: 20, default: null })
  refferal_code?: string;

  @Column({ type: 'boolean', default: false })
  user_registered: boolean;

  @Column({
    type: 'enum',
    enum: Salutation,
    nullable: true,
  })
  salutation?: Salutation;

  @Column({ type: 'varchar', length: 100, nullable: true })
  username?: string;

  @Column({ type: 'varchar', length: 15, nullable: true })
  mobile?: string | null;

  @Column({ type: 'varchar', length: 15, nullable: true })
  whatsapp_number?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  email?: string;

  @Column({ type: 'date', nullable: true, default: null })
  date_of_birth?: Date;

  @Column({ type: 'bigint', nullable: true })
  created_by!: bigint | null;

  @Column({ type: 'boolean', default: false })
  isDefaultOtp!: boolean;

  @Column({ type: 'varchar', length: 6, default: null })
  defaultOtp!: string;

  @Column({ type: 'boolean', default: true })
  otpTrigger!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  resetPasswordToken?: string | null;

  @Column({ type: 'datetime', nullable: true })
  resetPasswordTokenExpiry?: Date | null;

  @OneToMany(() => RevokedToken, (revokedToken) => revokedToken.user)
  revokedTokens!: RevokedToken[];

  @CreateDateColumn({ type: 'datetime' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updated_at!: Date;

  @OneToMany(() => KycVerificationEntity, (kyc) => kyc.kyc)
  users!: User[];

  @OneToMany(() => KycVerificationLogEntity, (kyc) => kyc.kyc_logs)
  user_logs!: User[];

  @OneToMany(() => Address, (address) => address.user)
  addresses?: Address[];

  @OneToMany(() => Order, (Order) => Order.user)
  orders?: Order[];

  @OneToMany(() => PointHistory, (PointHistory) => PointHistory.user)
  pointHistories?: PointHistory[];

  @OneToMany(() => InvoiceEntity, (invoiceEntity) => invoiceEntity.user)
  invoice?: InvoiceEntity[];
}
