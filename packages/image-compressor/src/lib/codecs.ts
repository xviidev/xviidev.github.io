// Explicit single-threaded codec modules work on static hosting without requiring
// cross-origin isolation. WASM URLs go through Vite's asset pipeline.
import jpegWasm from '@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm?url'
import webpWasm from '@jsquash/webp/codec/enc/webp_enc.wasm?url'
import avifWasm from '@jsquash/avif/codec/enc/avif_enc.wasm?url'
import jxlWasm from '@jsquash/jxl/codec/enc/jxl_enc.wasm?url'
import qoiWasm from '@jsquash/qoi/codec/enc/qoi_enc.wasm?url'
import jxlDecWasm from '@jsquash/jxl/codec/dec/jxl_dec.wasm?url'
import qoiDecWasm from '@jsquash/qoi/codec/dec/qoi_dec.wasm?url'
import avifDecWasm from '@jsquash/avif/codec/dec/avif_dec.wasm?url'
import pngWasm from '@jsquash/png/codec/pkg/squoosh_png_bg.wasm?url'
import oxiWasm from '@jsquash/oxipng/codec/pkg/squoosh_oxipng_bg.wasm?url'
import resizeWasm from '@jsquash/resize/lib/resize/pkg/squoosh_resize_bg.wasm?url'
import type { Options } from './options'
import { validateRasterHeader } from './options'

const jpeg = async () => { const [{ default: factory }, { defaultOptions }] = await Promise.all([import('@jsquash/jpeg/codec/enc/mozjpeg_enc.js'), import('@jsquash/jpeg/meta.js')]); return { module: await factory({ locateFile: () => jpegWasm }), defaults: defaultOptions } }
const webp = async () => { const [{ default: factory }, { defaultOptions }] = await Promise.all([import('@jsquash/webp/codec/enc/webp_enc.js'), import('@jsquash/webp/meta.js')]); return { module: await factory({ locateFile: () => webpWasm }), defaults: defaultOptions } }
const avif = async () => { const [{ default: factory }, { defaultOptions }] = await Promise.all([import('@jsquash/avif/codec/enc/avif_enc.js'), import('@jsquash/avif/meta.js')]); return { module: await factory({ locateFile: () => avifWasm }), defaults: defaultOptions } }
const jxl = async () => { const [{ default: factory }, { defaultOptions }] = await Promise.all([import('@jsquash/jxl/codec/enc/jxl_enc.js'), import('@jsquash/jxl/meta.js')]); return { module: await factory({ locateFile: () => jxlWasm }), defaults: defaultOptions } }
const qoi = async () => { const { default: factory } = await import('@jsquash/qoi/codec/enc/qoi_enc.js'); return factory({ locateFile: () => qoiWasm }) }
let jpegReady: ReturnType<typeof jpeg>, webpReady: ReturnType<typeof webp>, avifReady: ReturnType<typeof avif>, jxlReady: ReturnType<typeof jxl>, qoiReady: ReturnType<typeof qoi>

export async function encode(data: ImageData, options: Options): Promise<ArrayBuffer> {
  let bytes: ArrayBuffer | Uint8Array
  switch (options.format) {
    case 'jpeg': {
      const { module, defaults } = await (jpegReady ??= jpeg())
      bytes = module.encode(data.data, data.width, data.height, { ...defaults, quality: options.quality, progressive: options.progressive, auto_subsample: false, chroma_subsample: options.subsample === '444' ? 0 : 2 }); break
    }
    case 'webp': {
      const { module, defaults } = await (webpReady ??= webp())
      bytes = module.encode(data.data, data.width, data.height, { ...defaults, quality: options.quality, lossless: Number(options.lossless), method: Math.min(6, options.effort), use_sharp_yuv: Number(options.sharpYuv), exact: 1 }); break
    }
    case 'avif': {
      const { module, defaults } = await (avifReady ??= avif())
      bytes = module.encode(data.data, data.width, data.height, { ...defaults, quality: options.lossless ? 100 : options.quality, qualityAlpha: -1, lossless: options.lossless, speed: 10 - options.effort, subsample: options.lossless || options.subsample === '444' ? 3 : 1 }); break
    }
    case 'jxl': {
      const { module, defaults } = await (jxlReady ??= jxl())
      bytes = module.encode(data.data, data.width, data.height, { ...defaults, quality: options.lossless ? 100 : options.quality, lossless: options.lossless, effort: Math.min(9, options.effort), progressive: options.progressive }); break
    }
    case 'qoi': { const module = await (qoiReady ??= qoi()); bytes = module.encode(data.data, data.width, data.height); break }
    case 'png': {
      const { default: init, optimise_raw } = await import('@jsquash/oxipng/codec/pkg/squoosh_oxipng.js')
      await init(oxiWasm)
      bytes = optimise_raw(data.data, data.width, data.height, Math.min(6, options.effort), false, false); break
    }
    default: throw new Error('Pilih format hasil.')
  }
  if (!bytes || !bytes.byteLength) throw new Error('Codec gagal menghasilkan gambar. Coba format atau pengaturan lain.')
  return bytes instanceof ArrayBuffer ? bytes.slice(0) : new Uint8Array(bytes).buffer
}

export async function decodeSpecial(buffer: ArrayBuffer, format: 'jxl' | 'qoi' | 'avif') {
  validateRasterHeader(buffer)
  const urls = { jxl: jxlDecWasm, qoi: qoiDecWasm, avif: avifDecWasm }
  const decoder = format === 'jxl' ? await import('@jsquash/jxl/decode.js') : format === 'qoi' ? await import('@jsquash/qoi/decode.js') : await import('@jsquash/avif/decode.js')
  await decoder.init({ locateFile: () => urls[format] })
  const data = await decoder.default(buffer)
  if (!data) throw new Error('Gambar tidak dapat dibaca oleh codec.')
  return data
}
export async function decodePng(buffer: ArrayBuffer) {
  validateRasterHeader(buffer)
  const module = await import('@jsquash/png/decode.js')
  await module.init(pngWasm)
  const data = await module.default(buffer)
  if (!data) throw new Error('PNG tidak dapat dibaca.')
  return data
}
export async function resize(data: ImageData, options: Options, width: number, height: number) {
  const module = await import('@jsquash/resize')
  await module.initResize(resizeWasm)
  return module.default(data, { width, height, method: options.method === 'nearest' ? 'triangle' : options.method, linearRGB: options.linearRGB, premultiply: options.premultiply })
}
