import { labelPrinter } from '@xviidev/label-printer/metadata'
import { qrCode } from '@xviidev/qr-code/metadata'
import { barcode } from '@xviidev/barcode/metadata'
import { pdfToImage } from '@xviidev/pdf-to-image/metadata'
export const utilityMetadata = [labelPrinter, qrCode, barcode, pdfToImage]
export const legacyPaths = { '/utilitas/': '/utilities/', '/utilitas/cetak-label/': '/utilities/labels/', '/utilitas/label-printer/': '/utilities/labels/', '/utilities/cetak-label/': '/utilities/labels/', '/utilities/label-printer/': '/utilities/labels/' }
