import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';
import sharp from 'sharp';
import { FinderTarget } from './dto/generate-qr.dto';

export type FinderCorner = 'top-left' | 'top-right' | 'bottom-left';

export interface QrImageInput {
  buffer: Buffer;
  mime: string;
}

export interface GenerateQrOptions {
  value: string;
  size: number;
  darkColor: string;
  lightColor: string;
  finderTarget: FinderTarget;
  centerScale: number;
  format: 'png' | 'svg';
  centerImage?: QrImageInput;
  finderImage?: QrImageInput;
}

const FINDER_SIZE = 7;

@Injectable()
export class QrService {
  async generate(options: GenerateQrOptions): Promise<{
    buffer: Buffer;
    contentType: string;
  }> {
    const {
      value,
      size,
      darkColor,
      lightColor,
      finderTarget,
      centerScale,
      format,
      centerImage,
      finderImage,
    } = options;

    const qr = QRCode.create(value, {
      errorCorrectionLevel: 'H',
    });

    const moduleCount = qr.modules.size;
    const margin = 2;
    const totalModules = moduleCount + margin * 2;
    const moduleSize = size / totalModules;
    const offset = margin * moduleSize;

    const finderCorners = this.resolveFinderCorners(finderTarget);
    const hasFinderImage = Boolean(finderImage) && finderCorners.length > 0;

    const svg = this.buildSvg({
      size,
      darkColor,
      lightColor,
      moduleCount,
      moduleSize,
      offset,
      qr,
      finderCorners: hasFinderImage ? finderCorners : [],
    });

    if (format === 'svg' && !centerImage && !finderImage) {
      return {
        buffer: Buffer.from(svg, 'utf8'),
        contentType: 'image/svg+xml',
      };
    }

    let pipeline = sharp(Buffer.from(svg)).png();
    const composites: sharp.OverlayOptions[] = [];

    if (hasFinderImage && finderImage) {
      for (const corner of finderCorners) {
        const overlay = await this.buildFinderOverlay(
          corner,
          moduleCount,
          moduleSize,
          offset,
          finderImage,
          lightColor,
        );
        composites.push(overlay);
      }
    }

    if (centerImage) {
      composites.push(
        await this.buildCenterOverlay(size, centerScale, centerImage, lightColor),
      );
    }

    if (composites.length > 0) {
      pipeline = sharp(await pipeline.toBuffer()).composite(composites);
    }

    if (format === 'svg') {
      // Rasterized with overlays; export as PNG for reliable image embedding
      const png = await pipeline.png().toBuffer();
      return { buffer: png, contentType: 'image/png' };
    }

    return {
      buffer: await pipeline.png().toBuffer(),
      contentType: 'image/png',
    };
  }

  private buildSvg(params: {
    size: number;
    darkColor: string;
    lightColor: string;
    moduleCount: number;
    moduleSize: number;
    offset: number;
    qr: QRCode.QRCode;
    finderCorners: FinderCorner[];
  }): string {
    const {
      size,
      darkColor,
      lightColor,
      moduleCount,
      moduleSize,
      offset,
      qr,
      finderCorners,
    } = params;

    const parts: string[] = [];
    parts.push(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">`,
    );
    parts.push(
      `<rect width="${size}" height="${size}" fill="${this.escapeXml(lightColor)}"/>`,
    );

    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (!qr.modules.get(row, col)) continue;
        if (
          finderCorners.length > 0 &&
          this.isFinderInner(row, col, moduleCount, finderCorners)
        ) {
          continue;
        }

        const x = offset + col * moduleSize;
        const y = offset + row * moduleSize;
        parts.push(
          `<rect x="${x.toFixed(3)}" y="${y.toFixed(3)}" width="${(moduleSize + 0.05).toFixed(3)}" height="${(moduleSize + 0.05).toFixed(3)}" fill="${this.escapeXml(darkColor)}"/>`,
        );
      }
    }

    parts.push('</svg>');
    return parts.join('');
  }

  private async buildFinderOverlay(
    corner: FinderCorner,
    moduleCount: number,
    moduleSize: number,
    offset: number,
    image: QrImageInput,
    lightColor: string,
  ): Promise<sharp.OverlayOptions> {
    const origin = this.getFinderOrigin(corner, moduleCount);
    const x = Math.round(offset + (origin.col + 1) * moduleSize);
    const y = Math.round(offset + (origin.row + 1) * moduleSize);
    const box = Math.round((FINDER_SIZE - 2) * moduleSize);
    const pad = Math.round(moduleSize * 0.35);
    const imgSize = Math.max(8, box - pad * 2);
    const radius = Math.round(imgSize * 0.18);

    const roundedImage = await sharp(image.buffer)
      .resize(imgSize, imgSize, { fit: 'cover' })
      .composite([
        {
          input: Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" width="${imgSize}" height="${imgSize}"><rect width="${imgSize}" height="${imgSize}" rx="${radius}" fill="#fff"/></svg>`,
          ),
          blend: 'dest-in',
        },
      ])
      .png()
      .toBuffer();

    const plate = await sharp({
      create: {
        width: box,
        height: box,
        channels: 4,
        background: this.hexToRgba(lightColor),
      },
    })
      .composite([{ input: roundedImage, left: pad, top: pad }])
      .png()
      .toBuffer();

    return { input: plate, left: x, top: y };
  }

  private async buildCenterOverlay(
    size: number,
    centerScale: number,
    image: QrImageInput,
    lightColor: string,
  ): Promise<sharp.OverlayOptions> {
    const logoSize = Math.round((size * centerScale) / 100);
    const pad = Math.round(logoSize * 0.12);
    const bgSize = logoSize + pad * 2;
    const left = Math.round((size - bgSize) / 2);
    const top = Math.round((size - bgSize) / 2);
    const logoRadius = Math.round(logoSize * 0.14);
    const bgRadius = Math.round(bgSize * 0.18);

    const roundedLogo = await sharp(image.buffer)
      .resize(logoSize, logoSize, { fit: 'cover' })
      .composite([
        {
          input: Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" width="${logoSize}" height="${logoSize}"><rect width="${logoSize}" height="${logoSize}" rx="${logoRadius}" fill="#fff"/></svg>`,
          ),
          blend: 'dest-in',
        },
      ])
      .png()
      .toBuffer();

    const plate = await sharp({
      create: {
        width: bgSize,
        height: bgSize,
        channels: 4,
        background: this.hexToRgba(lightColor),
      },
    })
      .composite([
        {
          input: Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" width="${bgSize}" height="${bgSize}"><rect width="${bgSize}" height="${bgSize}" rx="${bgRadius}" fill="${this.escapeXml(lightColor)}"/></svg>`,
          ),
          top: 0,
          left: 0,
        },
        { input: roundedLogo, left: pad, top: pad },
      ])
      .png()
      .toBuffer();

    return { input: plate, left, top };
  }

  private resolveFinderCorners(target: FinderTarget): FinderCorner[] {
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

  private getFinderOrigin(
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

  private isFinderInner(
    row: number,
    col: number,
    moduleCount: number,
    corners: FinderCorner[],
  ): boolean {
    for (const corner of corners) {
      const origin = this.getFinderOrigin(corner, moduleCount);
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

  private hexToRgba(hex: string): { r: number; g: number; b: number; alpha: number } {
    const cleaned = hex.replace('#', '');
    const full =
      cleaned.length === 3
        ? cleaned
            .split('')
            .map((c) => c + c)
            .join('')
        : cleaned.padEnd(6, '0').slice(0, 6);
    const n = Number.parseInt(full, 16);
    return {
      r: (n >> 16) & 255,
      g: (n >> 8) & 255,
      b: n & 255,
      alpha: 1,
    };
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
