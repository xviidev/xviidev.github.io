import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@xviidev/ui/components/button'
import { Badge } from '@xviidev/ui/components/badge'
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@xviidev/ui/components/card'
import { InputGroup, InputGroupInput, InputGroupAddon, InputGroupButton } from '@xviidev/ui/components/input-group'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@xviidev/ui/components/tabs'
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent } from '@xviidev/ui/components/empty'
import { Separator } from '@xviidev/ui/components/separator'
import { ArrowUpRightIcon, SearchIcon, ShieldCheckIcon, XIcon } from '@xviidev/ui/lib/icons'
import { categories, searchUtilities, utilities } from '../../lib/utilities'
export function UtilityCatalog() {
 const [query,setQuery] = useState('')
 useEffect(()=>{document.title='Utilitas — XVII Dev'},[])
 return <div className="mx-auto w-full max-w-6xl px-5 py-12 md:px-8 md:py-20">
  <section className="mx-auto mb-10 flex max-w-3xl flex-col items-center gap-5 text-center md:mb-14">
   <Badge variant="outline">XVII / Utilitas</Badge>
   <h1 className="text-3xl leading-tight font-medium tracking-tight sm:text-5xl">Alat kecil.<br />Pekerjaan lebih ringan.</h1>
   <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">Kumpulan alat untuk hal-hal yang perlu diselesaikan. Pilih utilitas, lalu kerjakan langsung di browser.</p>
  </section>
  <div className="mb-6"><InputGroup>
   <InputGroupInput aria-label="Cari utilitas" placeholder="Cari utilitas, misalnya label atau Excel…" value={query} onChange={event=>setQuery(event.target.value)} />
   <InputGroupAddon><SearchIcon /></InputGroupAddon>
   {query && <InputGroupAddon align="inline-end"><InputGroupButton aria-label="Hapus pencarian" size="icon-xs" onClick={()=>setQuery('')}><XIcon /></InputGroupButton></InputGroupAddon>}
  </InputGroup></div>
  <Tabs defaultValue="Semua" className="gap-8">
   <TabsList variant="line" aria-label="Kategori utilitas" className="max-w-full flex-wrap"><TabsTrigger value="Semua">Semua <Badge variant="secondary">{utilities.length}</Badge></TabsTrigger>{categories.map(category=><TabsTrigger key={category} value={category}>{category}</TabsTrigger>)}</TabsList>
   {['Semua',...categories].map(category=>{
    const matches=searchUtilities(query,category)
    return <TabsContent key={category} value={category} className="flex flex-col gap-8">
     <p className="text-sm text-muted-foreground" role="status">{matches.length} utilitas{query ? ` untuk “${query}”` : ' tersedia'}</p>
     {matches.length ? categories.filter(group=>matches.some(tool=>tool.category===group)).map(group=><section key={group} aria-label={group} className="flex flex-col gap-5">
      <div className="flex items-center gap-4"><h2 className="shrink-0 text-sm font-semibold tracking-normal normal-case">{group}</h2><Separator className="flex-1" /></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{matches.filter(tool=>tool.category===group).map(tool=><Card key={tool.slug} size="sm">
       <CardHeader className="gap-4"><div className="flex items-center justify-between"><tool.icon className="size-5" aria-hidden="true" /><Badge variant="outline">{tool.category}</Badge></div><CardTitle role="heading" aria-level={3}>{tool.title}</CardTitle><CardDescription>{tool.description}</CardDescription></CardHeader>
       <CardFooter><Button role="link" nativeButton={false} variant="outline" size="sm" className="w-full" aria-label={`Buka ${tool.title}`} render={<Link to={`/${tool.slug}`} />}>Buka utilitas<ArrowUpRightIcon data-icon="inline-end" /></Button></CardFooter>
      </Card>)}</div>
     </section>) : <Empty className="border"><EmptyHeader><EmptyTitle>Belum ditemukan</EmptyTitle><EmptyDescription>Coba kata lain, seperti label, Excel, atau PDF.</EmptyDescription></EmptyHeader><EmptyContent><Button variant="outline" onClick={()=>setQuery('')}>Hapus pencarian</Button></EmptyContent></Empty>}
    </TabsContent>
   })}
  </Tabs>
  <div className="mt-12 flex items-start gap-3 border-t border-border pt-6 text-sm leading-relaxed text-muted-foreground"><ShieldCheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><p>Pada cetak label, berkas Excel dan data penerima diproses di perangkat Anda.</p></div>
 </div>
}
