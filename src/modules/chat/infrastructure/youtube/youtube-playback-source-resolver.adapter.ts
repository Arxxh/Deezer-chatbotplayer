import { Injectable } from '@nestjs/common';
import { PlaybackSourceResolverPort } from '../../application/ports/playback-source-resolver.port';
import { PlaybackSource } from '../../domain/entities/playback-source';
import { Track } from '../../domain/entities/track';

interface YouTubeSearchItem {
  id?: {
    videoId?: string;
  };
  snippet?: {
    title?: string;
    description?: string;
    channelTitle?: string;
    liveBroadcastContent?: string;
  };
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[];
}

interface YouTubeVideoItem {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    channelTitle?: string;
  };
  contentDetails?: {
    duration?: string;
  };
  status?: {
    embeddable?: boolean;
  };
}

interface YouTubeVideosResponse {
  items?: YouTubeVideoItem[];
}

interface CandidateVideo {
  videoId: string;
  title: string;
  description: string;
  channelTitle: string;
  durationInSeconds: number | null;
  embeddable: boolean;
}

const NEGATIVE_TITLE_TERMS = [
  'live',
  'cover',
  'karaoke',
  'tribute',
  'slowed',
  'sped up',
  'nightcore',
  '8d',
  'reaction',
  'remix',
  'instrumental',
];

@Injectable()
export class YouTubePlaybackSourceResolverAdapter implements PlaybackSourceResolverPort {
  private readonly apiBaseUrl = 'https://www.googleapis.com/youtube/v3';
  private readonly resultCache = new Map<string, PlaybackSource | null>();

  async resolveTrackSource(track: Track): Promise<PlaybackSource | null> {
    const apiKey = process.env.YOUTUBE_DATA_API_KEY;
    if (!apiKey) {
      return null;
    }

    const cacheKey = this.buildCacheKey(track);
    const cachedResult = this.resultCache.get(cacheKey);
    if (cachedResult !== undefined) {
      return cachedResult;
    }

    try {
      const candidates = await this.searchCandidates(track, apiKey);
      const bestCandidate = this.selectBestCandidate(track, candidates);
      this.resultCache.set(cacheKey, bestCandidate);
      return bestCandidate;
    } catch {
      this.resultCache.set(cacheKey, null);
      return null;
    }
  }

  private async searchCandidates(
    track: Track,
    apiKey: string,
  ): Promise<CandidateVideo[]> {
    const searchUrl = new URL(this.apiBaseUrl + '/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set(
      'q',
      `${track.artistName} ${track.title} official audio`,
    );
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('maxResults', '5');
    searchUrl.searchParams.set('order', 'relevance');
    searchUrl.searchParams.set('videoCategoryId', '10');
    searchUrl.searchParams.set('videoEmbeddable', 'true');
    searchUrl.searchParams.set('key', apiKey);

    const searchResponse = await fetch(searchUrl.toString(), {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!searchResponse.ok) {
      throw new Error(
        `YouTube search failed with status ${searchResponse.status}`,
      );
    }

    const searchPayload =
      (await searchResponse.json()) as YouTubeSearchResponse;
    const videoIds = (searchPayload.items ?? [])
      .map((item) => item.id?.videoId)
      .filter((videoId): videoId is string => Boolean(videoId))
      .slice(0, 5);

    if (videoIds.length === 0) {
      return [];
    }

    const videosUrl = new URL(this.apiBaseUrl + '/videos');
    videosUrl.searchParams.set('part', 'snippet,contentDetails,status');
    videosUrl.searchParams.set('id', videoIds.join(','));
    videosUrl.searchParams.set('key', apiKey);

    const videosResponse = await fetch(videosUrl.toString(), {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!videosResponse.ok) {
      throw new Error(
        `YouTube videos lookup failed with status ${videosResponse.status}`,
      );
    }

    const videosPayload =
      (await videosResponse.json()) as YouTubeVideosResponse;

    return (videosPayload.items ?? []).map((item) => ({
      videoId: item.id ?? '',
      title: item.snippet?.title ?? '',
      description: item.snippet?.description ?? '',
      channelTitle: item.snippet?.channelTitle ?? '',
      durationInSeconds: parseIsoDurationToSeconds(
        item.contentDetails?.duration ?? '',
      ),
      embeddable: item.status?.embeddable ?? false,
    }));
  }

  private selectBestCandidate(
    track: Track,
    candidates: CandidateVideo[],
  ): PlaybackSource | null {
    const rankedCandidates = candidates
      .filter((candidate) => candidate.videoId && candidate.embeddable)
      .map((candidate) => ({
        candidate,
        score: scoreCandidate(track, candidate),
      }))
      .sort((left, right) => right.score - left.score);

    const bestMatch = rankedCandidates[0];
    if (!bestMatch || bestMatch.score < 45) {
      return null;
    }

    return {
      provider: 'youtube',
      videoId: bestMatch.candidate.videoId,
      videoTitle: bestMatch.candidate.title,
      channelTitle: bestMatch.candidate.channelTitle,
      confidence: bestMatch.score,
    };
  }

  private buildCacheKey(track: Track) {
    return `${track.id}:${track.artistName}:${track.title}:${track.duration}`;
  }
}

function scoreCandidate(track: Track, candidate: CandidateVideo) {
  const normalizedTrackTitle = normalizeTitle(track.title);
  const normalizedArtist = normalizeText(track.artistName);
  const normalizedCandidateTitle = normalizeText(candidate.title);
  const normalizedChannel = normalizeText(candidate.channelTitle);
  const normalizedDescription = normalizeText(candidate.description);

  if (!normalizedCandidateTitle || !normalizedArtist) {
    return -100;
  }

  let score = 0;

  if (
    normalizedCandidateTitle.includes(normalizedTrackTitle) ||
    normalizedTrackTitle.includes(normalizedCandidateTitle)
  ) {
    score += 32;
  }

  if (normalizedCandidateTitle.includes(normalizedArtist)) {
    score += 22;
  }

  if (normalizedChannel.includes(normalizedArtist)) {
    score += 18;
  }

  if (
    normalizedChannel.includes(`${normalizedArtist} topic`) ||
    normalizedChannel.includes(`${normalizedArtist} - topic`)
  ) {
    score += 18;
  }

  if (
    normalizedCandidateTitle.includes('official audio') ||
    normalizedCandidateTitle.includes('official video')
  ) {
    score += 12;
  }

  if (normalizedDescription.includes('provided to youtube by')) {
    score += 10;
  }

  const durationDifference = candidate.durationInSeconds
    ? Math.abs(candidate.durationInSeconds - track.duration)
    : null;

  if (durationDifference !== null) {
    if (durationDifference <= 4) {
      score += 18;
    } else if (durationDifference <= 8) {
      score += 12;
    } else if (durationDifference <= 15) {
      score += 6;
    } else if (durationDifference >= 45) {
      score -= 18;
    }
  }

  for (const term of NEGATIVE_TITLE_TERMS) {
    if (
      normalizedCandidateTitle.includes(term) ||
      normalizedDescription.includes(term)
    ) {
      score -= 30;
    }
  }

  return score;
}

function normalizeTitle(value: string) {
  return normalizeText(stripFeaturingClauses(value));
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripFeaturingClauses(value: string) {
  return value.replace(/\((feat|ft)\.[^)]+\)/gi, '').trim();
}

function parseIsoDurationToSeconds(value: string) {
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);

  return hours * 3600 + minutes * 60 + seconds;
}
