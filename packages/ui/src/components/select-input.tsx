import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from './select'
import type { LucideIcon } from 'lucide-react'
export interface SelectOption { value: string; label: string; disabled?: boolean }
interface Props {
 id?: string
 value: string
 onValueChange: (value: string) => void
 options: readonly SelectOption[]
 label?: string
 size?: 'sm' | 'default'
 className?: string
 disabled?: boolean
 icon?: LucideIcon
}
/** Shared single-value select composition. No browser-native select control. */
export function SelectInput({id,value,onValueChange,options,label,size,className,disabled,icon: Icon}: Props) {
 return <Select value={value} items={options} onValueChange={next => { if (typeof next === 'string') onValueChange(next) }} disabled={disabled}>
  <SelectTrigger id={id} aria-label={label} size={size} className={className}>{Icon ? <span className="flex min-w-0 flex-1 items-center gap-2 text-left"><Icon aria-hidden="true" className="text-muted-foreground" /><SelectValue className="min-w-0 truncate" /></span> : <SelectValue />}</SelectTrigger>
  <SelectContent align="start" alignItemWithTrigger={false}><SelectGroup>{options.map(option => <SelectItem key={option.value} value={option.value} disabled={option.disabled}>{option.label}</SelectItem>)}</SelectGroup></SelectContent>
 </Select>
}
