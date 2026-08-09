import QRCode from 'qrcode';

export type FinderTarget =
  'none' | 'all' | 'top-left' | 'top-right' | 'bottom-left';
export type FinderCorner = 'top-left' | 'top-right' | 'bottom-left';

export const FINDER_SIZE = 7;

export interface GenerateQrOptions {
  value: string;
  size?: number;
  darkColor?: string;
  lightColor?: string;
  finderTarget?: FinderTarget;
  centerScale?: number;
  centerImage?: CanvasImageSource | null;
  finderImage?: CanvasImageSource | null;
}

export function resolveFinderCorners(target: FinderTarget): FinderCorner[] {
  switch (target) {
    case 'all':
      return ['top-left', 'top-right', 'bottom-left'];
    case 'top-left':
    case 'top-right':
    case 'bottom-left':
      return [target];
    default:
      return [];
  }
}

export function finderOrigin(
  corner: FinderCorner,
  moduleCount: number,
): { row: number; col: number } {
  switch (corner) {
    case 'top-left':
      return { row: 0, col: 0 };
    case 'top-right':
      return { row: 0, col: moduleCount - FINDER_SIZE };
    case 'bottom-left':
      return { row: moduleCount - FINDER_SIZE, col: 0 };
  }
}

export function isFinderInner(
  row: number,
  col: number,
  moduleCount: number,
  corners: ReadonlyArray<FinderCorner>,
): boolean {
  for (const corner of corners) {
    const origin = finderOrigin(corner, moduleCount);
    if (
      row >= origin.row + 1 &&
      row < origin.row + FINDER_SIZE - 1 &&
      col >= origin.col + 1 &&
      col < origin.col + FINDER_SIZE - 1
    ) {
      return true;
    }
  }

  return false;
}

export function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

export function drawRoundedImage(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  x: number,
  y: number,
  sizePx: number,
  radius: number,
) {
  context.save();
  roundedRect(context, x, y, sizePx, sizePx, radius);
  context.clip();
  context.drawImage(image, x, y, sizePx, sizePx);
  context.restore();
}

export async function generateQrPng(options: GenerateQrOptions): Promise<Blob> {
  const {
    value,
    size = 512,
    darkColor = '#0B1F1A',
    lightColor = '#F7F3EB',
    finderTarget = 'none',
    centerScale = 22,
    centerImage = null,
    finderImage = null,
  } = options;

  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('Value is required');
  }

  const qr = QRCode.create(trimmed, {
    errorCorrectionLevel: 'H',
  });
  const moduleCount = qr.modules.size;
  const margin = 2;
  const totalModules = moduleCount + margin * 2;
  const moduleSize = size / totalModules;
  const offset = margin * moduleSize;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas is not available in this browser');
  }

  context.fillStyle = lightColor;
  context.fillRect(0, 0, size, size);

  const finderCorners = resolveFinderCorners(finderTarget);
  const hasFinderImage = Boolean(finderImage) && finderCorners.length > 0;

  context.fillStyle = darkColor;
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (!qr.modules.get(row, col)) continue;
      if (
        hasFinderImage &&
        isFinderInner(row, col, moduleCount, finderCorners)
      ) {
        continue;
      }

      const x = offset + col * moduleSize;
      const y = offset + row * moduleSize;
      context.fillRect(x, y, moduleSize + 0.05, moduleSize + 0.05);
    }
  }

  if (finderImage && hasFinderImage) {
    for (const corner of finderCorners) {
      const origin = finderOrigin(corner, moduleCount);
      const x = offset + (origin.col + 1) * moduleSize;
      const y = offset + (origin.row + 1) * moduleSize;
      const box = (FINDER_SIZE - 2) * moduleSize;
      const pad = moduleSize * 0.35;
      const imgSize = Math.max(8, box - pad * 2);

      context.fillStyle = lightColor;
      context.fillRect(x, y, box, box);
      drawRoundedImage(
        context,
        finderImage,
        x + pad,
        y + pad,
        imgSize,
        imgSize * 0.18,
      );
    }
  }

  if (centerImage) {
    const logoSize = (size * centerScale) / 100;
    const x = (size - logoSize) / 2;
    const y = (size - logoSize) / 2;
    const pad = logoSize * 0.12;
    const bgSize = logoSize + pad * 2;
    const bgX = x - pad;
    const bgY = y - pad;

    context.fillStyle = lightColor;
    roundedRect(context, bgX, bgY, bgSize, bgSize, bgSize * 0.18);
    context.fill();
    drawRoundedImage(context, centerImage, x, y, logoSize, logoSize * 0.14);
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error('Could not export QR image'));
    }, 'image/png');
  });
}
