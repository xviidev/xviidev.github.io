import { labelPrinter } from '@xviidev/label-printer/metadata'
import { TagsIcon } from '@xviidev/ui/lib/icons'
export const utilities = [{ ...labelPrinter, icon: TagsIcon, load:()=>import('@xviidev/label-printer') }]
export const categories = [...new Set(utilities.map(tool => tool.category))]
export function searchUtilities(query: string, category = 'Semua') {
 const terms = query.toLocaleLowerCase('id').trim().split(/\s+/).filter(Boolean)
 return utilities.filter(tool => (category === 'Semua' || tool.category === category) && terms.every(term => [tool.title, tool.description, tool.category, ...tool.keywords].join(' ').toLocaleLowerCase('id').includes(term)))
}
