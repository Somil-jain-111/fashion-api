import {
  KycLogStatus,
  KycStatus,
  KycType,
} from "../../../default/common/enums/kyc.enum";
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

@Entity("kyc_verification_logs")
@Index(["user_id", "type"])
@Index(["referenceId"])
@Index(["status"])
export class KycVerificationLogEntity {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id: string;

  @Column({ name: "user_id", type: "bigint" })
  user_id: string;

  @Column({
    type: "enum",
    enum: KycType,
  })
  type: KycType;

  @ManyToOne(() => User, (user) => user.user_logs)
  @JoinColumn({ name: "user_id" })
  kyc_logs!: User;

  @Column({
    type: "enum",
    enum: KycLogStatus,
  })
  status: KycLogStatus;

  @Column({ name: "reference_id", nullable: true })
  referenceId?: string;

  @Column({ name: "document_number", nullable: true })
  documentNumber?: string;

  @Column({ name: "provider", nullable: true })
  provider?: string;

  @Column({ name: "request_payload", type: "json", nullable: true })
  requestPayload?: Record<string, any>;

  @Column({ name: "response_payload", type: "json", nullable: true })
  responsePayload?: Record<string, any>;

  @Column({ name: "failure_reason", nullable: true })
  failureReason?: string;

  @Column({ name: "journey_id", nullable: true })
  journeyId?: string;

  @CreateDateColumn({ name: "created_at" })
  created_at: Date;
}
