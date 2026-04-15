import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AddPlaylistTrackDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  query!: string;
}
