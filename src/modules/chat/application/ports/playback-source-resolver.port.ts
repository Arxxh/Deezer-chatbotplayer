import { PlaybackSource } from '../../domain/entities/playback-source';
import { Track } from '../../domain/entities/track';

export const PLAYBACK_SOURCE_RESOLVER_PORT = Symbol(
  'PLAYBACK_SOURCE_RESOLVER_PORT',
);

// La aplicacion solo pide "alguna fuente reproducible" para una pista ya conocida.
// La implementacion concreta puede usar YouTube, archivos locales u otro proveedor.
export interface PlaybackSourceResolverPort {
  resolveTrackSource(track: Track): Promise<PlaybackSource | null>;
}
