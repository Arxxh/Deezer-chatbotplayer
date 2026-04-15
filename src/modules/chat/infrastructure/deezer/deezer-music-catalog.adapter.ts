import { Injectable } from '@nestjs/common';
import { MusicCatalogPort } from '../../application/ports/music-catalog.port';
import { Track } from '../../domain/entities/track';

interface DeezerTrackPayload {
  id: number;
  title: string;
  duration: number;
  preview?: string;
  link: string;
  artist: {
    name: string;
  };
  album: {
    title: string;
    cover_medium?: string;
  };
}

interface DeezerSearchResponse {
  data?: DeezerTrackPayload[];
  error?: {
    message?: string;
  };
}

@Injectable()
export class DeezerMusicCatalogAdapter implements MusicCatalogPort {
  private readonly baseUrl = 'https://api.deezer.com';

  async searchTracks(query: string, limit: number): Promise<Track[]> {
    // Este adaptador traduce la API externa de Deezer
    // al formato interno `Track` que entiende la aplicacion.
    const url = new URL('/search', this.baseUrl);
    url.searchParams.set('q', query);
    url.searchParams.set('limit', String(Math.min(Math.max(limit, 1), 10)));
    url.searchParams.set('output', 'json');

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Deezer search failed with status ${response.status}`);
    }

    const payload = (await response.json()) as DeezerSearchResponse;

    if (payload.error) {
      throw new Error(payload.error.message ?? 'Unknown Deezer error');
    }

    return (payload.data ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      artistName: item.artist.name,
      albumTitle: item.album.title,
      duration: item.duration,
      previewUrl: item.preview ?? null,
      deezerUrl: item.link,
      coverUrl: item.album.cover_medium ?? null,
    }));
  }
}
