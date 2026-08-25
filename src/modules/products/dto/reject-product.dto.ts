import { IsNotEmpty, IsString } from 'class-validator';

export class RejectProductDto {
  @IsNotEmpty({ message: 'Rejection reason is required' })
  @IsString()
  reason!: string;
}
