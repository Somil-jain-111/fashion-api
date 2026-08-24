import {
  Entity,
  Column,
  Unique,
  OneToMany,
  JoinColumn,
  ManyToOne,
  Check,
  Index,
  OneToOne,
} from 'typeorm';
import { LoginHistories, Roles, RevokedToken } from '.';
import { Salutation, UserPartnerType } from '../../../default/common/enums/user-type.enum';
import { UserStatus } from '../constants/auth.constants';
import { BaseEntity } from '../../../default/common/entities';
@Entity('users')
@Unique('UQ_MOBILE', ['mobile'])
@Unique('UQ_WHATSAPP', ['whatsappNumber'])
@Check(`points >= 0`)
@Index(['mobile'])
@Index(['status'])
export class User extends BaseEntity {
  /**
   * @Default Fields
   */
  @Column({ type: 'varchar', length: 36, nullable: true, unique: true })
  uuid?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, unique: true, name: 'application_id' })
  applicationId?: string;

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

  @Column({ type: 'varchar', length: 15, nullable: true, name: 'whatsapp_number' })
  whatsappNumber?: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true, name: 'whatsapp_otp' })
  whatsappOtp?: string | null;

  @Column({ type: 'datetime', nullable: true, name: 'whatsapp_otp_expiry' })
  whatsappOtpExpiry?: Date | null;

  @Column({ type: 'boolean', default: false, name: 'whatsapp_verified' })
  whatsappVerified!: boolean;

  @Column({ type: 'varchar', length: 10, nullable: true, name: 'email_otp' })
  emailOtp?: string | null;

  @Column({ type: 'datetime', nullable: true, name: 'email_otp_expiry' })
  emailOtpExpiry?: Date | null;

  @Column({ type: 'boolean', default: false, name: 'email_verified' })
  emailVerified!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  email?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  password?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'firm_name' })
  firmName?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'private_name' })
  privateName?: string;

  @Column({
    type: 'enum',
    enum: UserPartnerType,
    nullable: true,
    name: 'partner_type',
  })
  partnerType?: UserPartnerType;

  @Column({ type: 'varchar', length: 20, nullable: true })
  code?: string;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.IN_APPROVAL })
  status!: UserStatus;

  @Column({ type: 'tinyint', default: 0 })
  flag!: number;

  @Column({ type: 'boolean', default: false })
  isTestRecord!: boolean;

  @Column({ type: 'bigint', unsigned: true, default: 0 })
  points!: bigint;

  @Column({ type: 'varchar', length: 255, default: null })
  image_url?: string;

  /**
   * @Auth Fields
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  otp?: string;

  @Column({ type: 'datetime', nullable: true })
  otp_expiry?: Date | null;

  @Column({ type: 'bigint', default: 0 })
  otp_attempt_count!: number;

  @Column({ type: 'boolean', default: false })
  isDefaultOtp!: boolean;

  @Column({ type: 'varchar', length: 6, default: null })
  defaultOtp!: string;

  @Column({ type: 'boolean', default: true })
  otpTrigger!: boolean;

  @Column('timestamp', { name: 'refresh_token_expiry', nullable: true })
  refreshTokenExpiry?: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  resetPasswordToken?: string | null;

  @Column({ type: 'datetime', nullable: true })
  resetPasswordTokenExpiry?: Date | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  refreshToken?: string | null;

  /**
   * @Misc Fields
   */
  @Column({ type: 'varchar', length: 20, default: null })
  refferal_code?: string;

  @Column({ type: 'date', nullable: true, default: null })
  date_of_birth?: Date;

  @Column({ type: 'date', nullable: true, default: null, name: 'anniversary_date' })
  anniversary_date?: Date | null;

  /**
   * @Relation fields
   */
  @ManyToOne(() => Roles, (role) => role.users)
  @JoinColumn({ name: 'role_id' })
  role!: Roles;

  @OneToMany(() => LoginHistories, (loginHistories) => loginHistories.user)
  loginHistory!: LoginHistories[];

  @OneToOne(() => User, (user) => user.id, { nullable: true })
  created_by!: User | null;

  @OneToMany(() => RevokedToken, (revokedToken) => revokedToken.user, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  revokedTokens!: RevokedToken[];
}
