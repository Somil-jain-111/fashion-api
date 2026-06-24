import { KycStatus, KycType } from "../../../default/common/enums/kyc.enum";
import { User } from "../../auth/entities";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("kyc_verifications")
@Index(["user_id", "type"])
@Index(["type", "status"])
export class KycVerificationEntity {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id: string;

  @Column({ name: "user_id", type: "bigint" })
  user_id: string;

  @ManyToOne(() => User, (user) => user.users)
  @JoinColumn({ name: "user_id" })
  kyc!: User;

  @Column({
    type: "enum",
    enum: KycType,
  })
  type: KycType;

  @Column({
    type: "enum",
    enum: KycStatus,
    default: KycStatus.PENDING,
  })
  status: KycStatus;

  @Column({ name: "reference_id", nullable: true, unique: true })
  referenceId?: string;

  @Column({ name: "document_number", nullable: true })
  documentNumber?: string;

  @Column({ name: "masked_document_number", nullable: true })
  maskedDocumentNumber?: string;

  @Column({ name: "verified_name", nullable: true })
  verifiedName?: string;

  @Column({ name: "provider", nullable: true })
  provider?: string;

  @Column({ name: "provider_request", type: "json", nullable: true })
  providerRequest?: Record<string, any>;

  @Column({ name: "provider_response", type: "json", nullable: true })
  providerResponse?: Record<string, any>;

  @Column({ name: "metadata", type: "json", nullable: true })
  metadata?: Record<string, any>;

  @Column({ name: "failure_reason", nullable: true })
  failureReason?: string;

  @CreateDateColumn({ name: "created_at" })
  created_at: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updated_at: Date;
}
