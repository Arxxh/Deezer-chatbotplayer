import { Track } from '../../domain/entities/track';

export const MUSIC_CATALOG_PORT = Symbol('MUSIC_CATALOG_PORT');

// Puerto de salida: la aplicacion solo sabe que puede buscar canciones.
// La implementacion concreta puede ser Deezer, una BD local o un mock.
export interface MusicCatalogPort {
  searchTracks(query: string, limit: number): Promise<Track[]>;
}
