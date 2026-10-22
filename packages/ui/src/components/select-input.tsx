import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from './select'
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
}
/** Shared single-value select composition. No browser-native select control. */
export function SelectInput({id,value,onValueChange,options,label,size,className,disabled}: Props) {
 return <Select value={value} items={options} onValueChange={next => { if (typeof next === 'string') onValueChange(next) }} disabled={disabled}>
  <SelectTrigger id={id} aria-label={label} size={size} className={className}><SelectValue /></SelectTrigger>
  <SelectContent align="start" alignItemWithTrigger={false}><SelectGroup>{options.map(option => <SelectItem key={option.value} value={option.value} disabled={option.disabled}>{option.label}</SelectItem>)}</SelectGroup></SelectContent>
 </Select>
}
