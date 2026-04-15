export interface PlaybackSource {
  provider: 'youtube';
  videoId: string;
  videoTitle: string;
  channelTitle: string;
  confidence: number;
}

// Fuente reproducible asociada a una pista ya resuelta por el catalogo.
// En este MVP el catalogo viene de Deezer y la reproduccion completa de YouTube.
