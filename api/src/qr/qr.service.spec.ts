import { QrService } from './qr.service';

function tinyPng(): Buffer {
  // 1x1 transparent PNG
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
}

describe('QrService', () => {
  const service = new QrService();

  it('generates a png for plain text values', async () => {
    const result = await service.generate({
      value: 'https://beacon.qr',
      size: 256,
      darkColor: '#0B1F1A',
      lightColor: '#F7F3EB',
      finderTarget: 'none',
      centerScale: 22,
      format: 'png',
    });

    expect(result.contentType).toBe('image/png');
    expect(result.buffer.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    expect(result.buffer.length).toBeGreaterThan(100);
  });

  it('returns svg when no overlays are requested', async () => {
    const result = await service.generate({
      value: 'hello',
      size: 256,
      darkColor: '#111111',
      lightColor: '#ffffff',
      finderTarget: 'none',
      centerScale: 22,
      format: 'svg',
    });

    expect(result.contentType).toBe('image/svg+xml');
    expect(result.buffer.toString('utf8')).toContain('<svg');
    expect(result.buffer.toString('utf8')).toContain('#111111');
  });

  it('composites center and finder images onto a png', async () => {
    const mark = tinyPng();

    const result = await service.generate({
      value: 'https://beacon.qr/marked',
      size: 256,
      darkColor: '#0B1F1A',
      lightColor: '#F7F3EB',
      finderTarget: 'all',
      centerScale: 24,
      format: 'png',
      centerImage: { buffer: mark, mime: 'image/png' },
      finderImage: { buffer: mark, mime: 'image/png' },
    });

    expect(result.contentType).toBe('image/png');
    expect(result.buffer.length).toBeGreaterThan(100);
  });

  it('supports a single finder target', async () => {
    const mark = tinyPng();

    const result = await service.generate({
      value: 'single-finder',
      size: 256,
      darkColor: '#0B1F1A',
      lightColor: '#F7F3EB',
      finderTarget: 'top-left',
      centerScale: 20,
      format: 'png',
      finderImage: { buffer: mark, mime: 'image/png' },
    });

    expect(result.contentType).toBe('image/png');
    expect(result.buffer.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  });

  it('falls back to png when svg is requested with overlays', async () => {
    const mark = tinyPng();

    const result = await service.generate({
      value: 'svg-with-overlay',
      size: 256,
      darkColor: '#abc',
      lightColor: '#def',
      finderTarget: 'top-right',
      centerScale: 18,
      format: 'svg',
      centerImage: { buffer: mark, mime: 'image/png' },
    });

    expect(result.contentType).toBe('image/png');
    expect(result.buffer.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  });
});
