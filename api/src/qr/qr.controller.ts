import {
  BadRequestException,
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
  Res,
  Body,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { GenerateQrDto } from './dto/generate-qr.dto';
import { QrService } from './qr.service';

const IMAGE_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
]);

@Controller('qr')
export class QrController {
  constructor(private readonly qrService: QrService) {}

  @Post('generate')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'centerImage', maxCount: 1 },
        { name: 'finderImage', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: 3 * 1024 * 1024 },
      },
    ),
  )
  async generate(
    @Body() body: GenerateQrDto,
    @UploadedFiles()
    files: {
      centerImage?: Express.Multer.File[];
      finderImage?: Express.Multer.File[];
    },
    @Res() res: Response,
  ) {
    if (!body.value?.trim()) {
      throw new BadRequestException('Value is required');
    }

    const centerFile = files?.centerImage?.[0];
    const finderFile = files?.finderImage?.[0];

    this.assertImage(centerFile, 'centerImage');
    this.assertImage(finderFile, 'finderImage');

    const result = await this.qrService.generate({
      value: body.value.trim(),
      size: Number(body.size) || 512,
      darkColor: body.darkColor || '#0B1F1A',
      lightColor: body.lightColor || '#F7F3EB',
      finderTarget: body.finderTarget || 'none',
      centerScale: Number(body.centerScale) || 22,
      format: body.format || 'png',
      centerImage: centerFile
        ? { buffer: centerFile.buffer, mime: centerFile.mimetype }
        : undefined,
      finderImage: finderFile
        ? { buffer: finderFile.buffer, mime: finderFile.mimetype }
        : undefined,
    });

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Cache-Control', 'no-store');
    res.send(result.buffer);
  }

  private assertImage(file: Express.Multer.File | undefined, field: string) {
    if (!file) return;
    if (!IMAGE_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        `${field} must be a PNG, JPEG, WebP, or GIF image`,
      );
    }
  }
}
