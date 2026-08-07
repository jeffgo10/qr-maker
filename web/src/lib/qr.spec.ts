import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  FINDER_SIZE,
  finderOrigin,
  generateQrPng,
  isFinderInner,
  resolveFinderCorners,
  roundedRect,
  drawRoundedImage,
} from './qr'

describe('resolveFinderCorners', () => {
  it('returns no corners for none', () => {
    expect(resolveFinderCorners('none')).toEqual([])
  })

  it('returns all three corners for all', () => {
    expect(resolveFinderCorners('all')).toEqual([
      'top-left',
      'top-right',
      'bottom-left',
    ])
  })

  it('returns a single selected corner', () => {
    expect(resolveFinderCorners('top-left')).toEqual(['top-left'])
    expect(resolveFinderCorners('top-right')).toEqual(['top-right'])
    expect(resolveFinderCorners('bottom-left')).toEqual(['bottom-left'])
  })
})

describe('finderOrigin', () => {
  it('places finders at the expected module origins', () => {
    const moduleCount = 25
    expect(finderOrigin('top-left', moduleCount)).toEqual({ row: 0, col: 0 })
    expect(finderOrigin('top-right', moduleCount)).toEqual({
      row: 0,
      col: moduleCount - FINDER_SIZE,
    })
    expect(finderOrigin('bottom-left', moduleCount)).toEqual({
      row: moduleCount - FINDER_SIZE,
      col: 0,
    })
  })
})

describe('isFinderInner', () => {
  it('detects the inner 5x5 of selected finders', () => {
    const moduleCount = 21
    const corners = resolveFinderCorners('top-left')

    expect(isFinderInner(1, 1, moduleCount, corners)).toBe(true)
    expect(isFinderInner(0, 0, moduleCount, corners)).toBe(false)
    expect(isFinderInner(10, 10, moduleCount, corners)).toBe(false)
  })

  it('covers all corners when target is all', () => {
    const moduleCount = 25
    const corners = resolveFinderCorners('all')

    expect(isFinderInner(2, 2, moduleCount, corners)).toBe(true)
    expect(isFinderInner(2, moduleCount - 4, moduleCount, corners)).toBe(true)
    expect(isFinderInner(moduleCount - 4, 2, moduleCount, corners)).toBe(true)
  })
})

describe('canvas helpers', () => {
  it('builds a rounded rect path', () => {
    const context = {
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      arcTo: vi.fn(),
      closePath: vi.fn(),
    } as unknown as CanvasRenderingContext2D

    roundedRect(context, 10, 20, 100, 80, 12)

    expect(context.beginPath).toHaveBeenCalledOnce()
    expect(context.moveTo).toHaveBeenCalledWith(22, 20)
    expect(context.arcTo).toHaveBeenCalledTimes(4)
    expect(context.closePath).toHaveBeenCalledOnce()
  })

  it('clips and draws a rounded image', () => {
    const context = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      arcTo: vi.fn(),
      closePath: vi.fn(),
      clip: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D
    const image = {} as CanvasImageSource

    drawRoundedImage(context, image, 5, 6, 40, 8)

    expect(context.save).toHaveBeenCalledOnce()
    expect(context.clip).toHaveBeenCalledOnce()
    expect(context.drawImage).toHaveBeenCalledWith(image, 5, 6, 40, 40)
    expect(context.restore).toHaveBeenCalledOnce()
  })
})

describe('generateQrPng', () => {
  const fillRect = vi.fn()
  const fill = vi.fn()
  const drawImage = vi.fn()
  const save = vi.fn()
  const restore = vi.fn()
  const beginPath = vi.fn()
  const moveTo = vi.fn()
  const arcTo = vi.fn()
  const closePath = vi.fn()
  const clip = vi.fn()
  const toBlob = vi.fn()

  beforeEach(() => {
    vi.stubGlobal(
      'document',
      {
        createElement: vi.fn(() => ({
          width: 0,
          height: 0,
          getContext: () => ({
            fillStyle: '',
            fillRect,
            fill,
            drawImage,
            save,
            restore,
            beginPath,
            moveTo,
            arcTo,
            closePath,
            clip,
          }),
          toBlob,
        })),
      } as unknown as Document,
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('rejects empty values', async () => {
    await expect(generateQrPng({ value: '   ' })).rejects.toThrow(
      'Value is required',
    )
  })

  it('exports a png blob for plain qr codes', async () => {
    toBlob.mockImplementation((callback: (blob: Blob | null) => void) => {
      callback(new Blob(['qr'], { type: 'image/png' }))
    })

    const blob = await generateQrPng({
      value: 'https://beacon.qr',
      size: 256,
    })

    expect(blob.type).toBe('image/png')
    expect(fillRect).toHaveBeenCalled()
  })

  it('draws center and finder overlays when images are provided', async () => {
    toBlob.mockImplementation((callback: (blob: Blob | null) => void) => {
      callback(new Blob(['qr-marked'], { type: 'image/png' }))
    })

    const centerImage = {} as CanvasImageSource
    const finderImage = {} as CanvasImageSource

    await generateQrPng({
      value: 'https://beacon.qr',
      size: 256,
      finderTarget: 'all',
      centerImage,
      finderImage,
      centerScale: 24,
    })

    expect(drawImage).toHaveBeenCalled()
    expect(fill).toHaveBeenCalled()
  })

  it('throws when canvas export fails', async () => {
    toBlob.mockImplementation((callback: (blob: Blob | null) => void) => {
      callback(null)
    })

    await expect(
      generateQrPng({ value: 'https://beacon.qr', size: 128 }),
    ).rejects.toThrow('Could not export QR image')
  })
})
