import { pdfMerge } from '@xviidev/pdf-merge/metadata'
import { pdfSplit } from '@xviidev/pdf-split/metadata'
import { labelPrinter } from '@xviidev/label-printer/metadata'
import { qrCode } from '@xviidev/qr-code/metadata'
import { barcode } from '@xviidev/barcode/metadata'
import { pdfToImage } from '@xviidev/pdf-to-image/metadata'
import { imageCompressor } from '@xviidev/image-compressor/metadata'
export const utilityMetadata = [labelPrinter, qrCode, barcode, pdfToImage, imageCompressor, pdfMerge, pdfSplit]
export const legacyPaths = { '/utilitas/': '/utilities/', '/utilitas/cetak-label/': '/utilities/labels/', '/utilitas/label-printer/': '/utilities/labels/', '/utilities/cetak-label/': '/utilities/labels/', '/utilities/label-printer/': '/utilities/labels/' }
