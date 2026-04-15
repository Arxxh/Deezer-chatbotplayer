import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ChatMessageDto {
  // El chat envia un unico texto que luego el parser interpreta.
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  message!: string;
}
