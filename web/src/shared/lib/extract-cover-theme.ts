interface RgbColor {
  red: number;
  green: number;
  blue: number;
}

export interface CoverTheme {
  baseWash: string;
  primaryGlow: string;
  secondaryGlow: string;
}

const DEFAULT_RGB: RgbColor = {
  red: 76,
  green: 84,
  blue: 112,
};

export const DEFAULT_COVER_THEME = buildCoverTheme(DEFAULT_RGB);

// Extrae un color dominante suficientemente estable para usarlo como ambiente
// del chat. Si el cover falla o no permite lectura por canvas, volvemos al tema base.
export async function extractCoverTheme(
  coverUrl: string | null,
): Promise<CoverTheme> {
  if (!coverUrl || typeof window === 'undefined') {
    return DEFAULT_COVER_THEME;
  }

  try {
    const dominantColor = await sampleCoverColor(coverUrl);
    return buildCoverTheme(dominantColor);
  } catch {
    return DEFAULT_COVER_THEME;
  }
}

async function sampleCoverColor(coverUrl: string): Promise<RgbColor> {
  const image = await loadImage(coverUrl);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });

  if (!context) {
    throw new Error('No pude crear un contexto para extraer color.');
  }

  const sampleSize = 28;
  canvas.width = sampleSize;
  canvas.height = sampleSize;
  context.drawImage(image, 0, 0, sampleSize, sampleSize);

  const imageData = context.getImageData(0, 0, sampleSize, sampleSize);
  return pickDominantColor(imageData.data);
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.referrerPolicy = 'no-referrer';
    image.onload = () => resolve(image);
    image.onerror = () => {
      reject(new Error('No pude cargar la portada.'));
    };
    image.src = source;
  });
}

function pickDominantColor(data: Uint8ClampedArray): RgbColor {
  let weightedRed = 0;
  let weightedGreen = 0;
  let weightedBlue = 0;
  let totalWeight = 0;

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3] / 255;

    if (alpha < 0.35) {
      continue;
    }

    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const maxChannel = Math.max(red, green, blue);
    const minChannel = Math.min(red, green, blue);
    const saturation = maxChannel - minChannel;
    const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

    if (luminance < 12) {
      continue;
    }

    let weight = alpha * (0.45 + saturation / 140);

    if (luminance > 235) {
      weight *= 0.55;
    }

    weightedRed += red * weight;
    weightedGreen += green * weight;
    weightedBlue += blue * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return DEFAULT_RGB;
  }

  return {
    red: Math.round(weightedRed / totalWeight),
    green: Math.round(weightedGreen / totalWeight),
    blue: Math.round(weightedBlue / totalWeight),
  };
}

function buildCoverTheme(rgb: RgbColor): CoverTheme {
  const lifted = liftColor(rgb, 20);
  const softened = mixColors(lifted, { red: 255, green: 255, blue: 255 }, 0.18);
  const deepened = mixColors(lifted, { red: 5, green: 5, blue: 7 }, 0.56);

  return {
    baseWash: toRgba(deepened, 0.24),
    primaryGlow: toRgba(lifted, 0.34),
    secondaryGlow: toRgba(softened, 0.22),
  };
}

function liftColor(color: RgbColor, amount: number): RgbColor {
  return {
    red: clampChannel(color.red + amount),
    green: clampChannel(color.green + amount),
    blue: clampChannel(color.blue + amount),
  };
}

function mixColors(first: RgbColor, second: RgbColor, ratio: number): RgbColor {
  return {
    red: clampChannel(first.red * (1 - ratio) + second.red * ratio),
    green: clampChannel(first.green * (1 - ratio) + second.green * ratio),
    blue: clampChannel(first.blue * (1 - ratio) + second.blue * ratio),
  };
}

function toRgba(color: RgbColor, alpha: number) {
  return `rgba(${color.red}, ${color.green}, ${color.blue}, ${alpha})`;
}

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}
