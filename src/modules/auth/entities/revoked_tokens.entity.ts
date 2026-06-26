import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  BaseEntity,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from ".";
import { TokenType } from "../../../default/common/enums/token-type.enum";


@Entity("revoked_tokens")
@Index("IDX_REVOKED_TOKEN_HASH", ["token_hash"])
@Index("IDX_REVOKED_TOKEN_USER_ID", ["user_id"])
@Index("IDX_REVOKED_TOKEN_TYPE", ["token_type"])
@Index("IDX_REVOKED_TOKEN_EXPIRES_AT", ["expires_at"])
export class RevokedToken extends BaseEntity {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id!: string;

  /**
   * Store token hash, not plain token.
   */
  @Column({ type: "varchar", length: 64 })
  token_hash!: string;

  @Column({ type: "bigint", nullable: true })
  user_id?: string | null;

  @ManyToOne(() => User, (user) => user.revokedTokens, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "user_id" })
  user?: User | null;

  @Column({
    type: "enum",
    enum: TokenType,
  })
  token_type!: TokenType;

  @Column({ type: "datetime" })
  expires_at!: Date;

  @CreateDateColumn({ type: "datetime" })
  created_at!: Date;
}
