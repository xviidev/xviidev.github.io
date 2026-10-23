import type { ComponentType } from 'react'
import { utilityMetadata } from './metadata'
import { TagsIcon } from '@xviidev/ui/lib/icons'
const implementations = {
 'label-printer': { icon: TagsIcon, load:()=>import('@xviidev/label-printer') },
} satisfies Record<(typeof utilityMetadata)[number]['slug'], { icon: typeof TagsIcon; load: () => Promise<{ default: ComponentType }> }>
export const utilities = utilityMetadata.map(tool => ({ ...tool, ...implementations[tool.slug] }))
export const categories = [...new Set(utilities.map(tool => tool.category))]
export function searchUtilities(query: string, category = 'Semua') {
 const terms = query.toLocaleLowerCase('id').trim().split(/\s+/).filter(Boolean)
 return utilities.filter(tool => (category === 'Semua' || tool.category === category) && terms.every(term => [tool.title, tool.description, tool.category, ...tool.keywords].join(' ').toLocaleLowerCase('id').includes(term)))
}
