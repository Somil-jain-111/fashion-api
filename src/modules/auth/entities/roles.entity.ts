import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from ".";
import {
  UserRole,
  UserType,
} from "../../../default/common/enums/user-type.enum";

@Entity("roles")
export class Roles extends BaseEntity {
  @PrimaryGeneratedColumn("increment", { type: "bigint" })
  id!: bigint;

  @Column({
    type: "enum",
    enum: UserRole,
    nullable: false,
  })
  name!: UserRole;

  @OneToMany(() => User, (users) => users.role)
  users?: User[];

  @Column({
    type: "enum",
    enum: UserType,
  })
  user_type!: UserType;

  @CreateDateColumn({ type: "datetime" })
  created_at!: Date;

  @UpdateDateColumn({ type: "datetime" })
  updated_at!: Date;
}
