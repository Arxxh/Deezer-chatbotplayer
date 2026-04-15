import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { AddTrackToPlaylistUseCase } from '../../application/use-cases/add-track-to-playlist.use-case';
import { CreatePlaylistUseCase } from '../../application/use-cases/create-playlist.use-case';
import { DeletePlaylistUseCase } from '../../application/use-cases/delete-playlist.use-case';
import { GetPlaylistUseCase } from '../../application/use-cases/get-playlist.use-case';
import { ListPlaylistsUseCase } from '../../application/use-cases/list-playlists.use-case';
import { AddPlaylistTrackDto } from './add-playlist-track.dto';
import { CreatePlaylistDto } from './create-playlist.dto';

@Controller('playlists')
export class PlaylistsController {
  constructor(
    private readonly createPlaylistUseCase: CreatePlaylistUseCase,
    private readonly addTrackToPlaylistUseCase: AddTrackToPlaylistUseCase,
    private readonly deletePlaylistUseCase: DeletePlaylistUseCase,
    private readonly getPlaylistUseCase: GetPlaylistUseCase,
    private readonly listPlaylistsUseCase: ListPlaylistsUseCase,
  ) {}

  @Get()
  async list() {
    return this.listPlaylistsUseCase.execute();
  }

  @Get(':playlistId')
  async getById(@Param('playlistId') playlistId: string) {
    const playlist = await this.getPlaylistUseCase.execute(playlistId);

    if (!playlist) {
      throw new NotFoundException('Playlist no encontrada.');
    }

    return playlist;
  }

  @Post()
  async create(@Body() body: CreatePlaylistDto) {
    try {
      return await this.createPlaylistUseCase.execute(body.name);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'No pude crear la playlist.',
      );
    }
  }

  @Post(':playlistId/tracks')
  async addTrack(
    @Param('playlistId') playlistId: string,
    @Body() body: AddPlaylistTrackDto,
  ) {
    // La capa HTTP convierte errores de dominio a respuestas HTTP legibles.
    try {
      return await this.addTrackToPlaylistUseCase.execute(
        playlistId,
        body.query,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No pude agregar la canción a la playlist.';

      if (message === 'La playlist no existe.') {
        throw new NotFoundException(message);
      }

      throw new BadRequestException(message);
    }
  }

  @Delete(':playlistId')
  async delete(@Param('playlistId') playlistId: string) {
    try {
      return await this.deletePlaylistUseCase.execute(playlistId);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No pude eliminar la playlist.';

      if (message === 'La playlist no existe.') {
        throw new NotFoundException(message);
      }

      throw new BadRequestException(message);
    }
  }
}
