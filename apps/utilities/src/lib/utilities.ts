import type { ComponentType } from 'react'
import { utilityMetadata } from './metadata'
import { TagsIcon, QrCodeIcon, BarcodeIcon, FileImageIcon, ImageIcon, FilesIcon, ScissorsIcon, GaugeIcon } from '@xviidev/ui/lib/icons'
const implementations = {
 'speed-test': { icon: GaugeIcon, load:()=>import('@xviidev/speed-test') },
 'pdf-merge': { icon: FilesIcon, load:()=>import('@xviidev/pdf-merge') },
 'pdf-split': { icon: ScissorsIcon, load:()=>import('@xviidev/pdf-split') },
 'image-compressor': { icon: ImageIcon, load:()=>import('@xviidev/image-compressor') },
 'pdf-to-image': { icon: FileImageIcon, load:()=>import('@xviidev/pdf-to-image') },
 'barcode': { icon: BarcodeIcon, load:()=>import('@xviidev/barcode') },
 'qr-code': { icon: QrCodeIcon, load:()=>import('@xviidev/qr-code') },
 'labels': { icon: TagsIcon, load:()=>import('@xviidev/label-printer') },
} satisfies Record<(typeof utilityMetadata)[number]['slug'], { icon: typeof TagsIcon; load: () => Promise<{ default: ComponentType }> }>
export const utilities = utilityMetadata.map(tool => ({ ...tool, ...implementations[tool.slug] }))
export const categories = [...new Set(utilities.map(tool => tool.category))]
export function searchUtilities(query: string, category = 'Semua') {
 const terms = query.toLocaleLowerCase('id').trim().split(/\s+/).filter(Boolean)
 return utilities.filter(tool => (category === 'Semua' || tool.category === category) && terms.every(term => [tool.title, tool.description, tool.category, ...tool.keywords].join(' ').toLocaleLowerCase('id').includes(term)))
}
