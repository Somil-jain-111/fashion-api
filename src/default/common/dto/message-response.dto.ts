import { ApiProperty } from '@nestjs/swagger';

export class MessageResponseDto {
  @ApiProperty()
  message: string;

  constructor(message: string) {
    this.message = message;
  }
}
