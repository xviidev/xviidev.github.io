import { useEffect, useState } from 'react'
import logoUrl from '@xviidev/ui/brand.svg?url'
import type { CSSProperties } from 'react'
import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { Button } from '@xviidev/ui/components/button'
import { Separator } from '@xviidev/ui/components/separator'
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger, useSidebar } from '@xviidev/ui/components/sidebar'
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@xviidev/ui/components/command'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@xviidev/ui/components/tooltip'
import { ArrowLeftIcon, ChevronRightIcon, LayoutGridIcon, MoonIcon, SearchIcon, SunIcon } from '@xviidev/ui/lib/icons'
import { categories, utilities } from '../../lib/utilities'
function ThemeButton() {
 const [dark,setDark]=useState(()=>document.documentElement.classList.contains('dark'))
 useEffect(()=>{document.documentElement.classList.toggle('dark',dark);document.documentElement.style.colorScheme=dark?'dark':'light';try{localStorage.setItem('xvii-utilities-theme',dark?'dark':'light')}catch{}},[dark])
 return <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" aria-label={dark?'Gunakan tema terang':'Gunakan tema gelap'} onClick={()=>setDark(!dark)} />}>{dark?<SunIcon />:<MoonIcon />}</TooltipTrigger><TooltipContent>{dark?'Tema terang':'Tema gelap'}</TooltipContent></Tooltip>
}
function Brand() {
 return <Button role="link" nativeButton={false} variant="ghost" className="justify-start gap-3" render={<Link to="/" />}><img src={logoUrl} alt="XVII Dev" className="h-8 w-auto dark:invert" width="32" height="32" /><span>Utilitas</span></Button>
}
function ToolsSidebar({active,onSearch}:{active?:string;onSearch:()=>void}) {
 const {setOpenMobile}=useSidebar()
 return <Sidebar collapsible="offcanvas">
  <SidebarHeader className="h-16 justify-center border-b border-border"><Brand /></SidebarHeader>
  <SidebarContent>
   <SidebarGroup><Button variant="outline" className="justify-start" onClick={()=>{setOpenMobile(false);onSearch()}}><SearchIcon data-icon="inline-start" />Cari utilitas</Button></SidebarGroup>
   <SidebarGroup><SidebarMenu><SidebarMenuItem><SidebarMenuButton render={<Link to="/" onClick={()=>setOpenMobile(false)} />}><LayoutGridIcon /><span>Semua utilitas</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarGroup>
   {categories.map(category=><SidebarGroup key={category}><SidebarGroupLabel>{category}</SidebarGroupLabel><SidebarGroupContent><SidebarMenu>{utilities.filter(tool=>tool.category===category).map(tool=><SidebarMenuItem key={tool.slug}><SidebarMenuButton isActive={active===tool.slug} render={<Link to={`/${tool.slug}`} onClick={()=>setOpenMobile(false)} />}><tool.icon /><span>{tool.title}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroupContent></SidebarGroup>)}
  </SidebarContent>
  <SidebarFooter className="border-t border-border"><Button role="link" nativeButton={false} variant="ghost" size="sm" className="justify-start" render={<a href="/" />}><ArrowLeftIcon data-icon="inline-start" />Beranda XVII Dev</Button></SidebarFooter>
 </Sidebar>
}
export function UtilityShell() {
 const path=useRouterState({select:state=>state.location.pathname})
 const active=utilities.find(tool=>path.replace(/\/$/,'').endsWith(`/${tool.slug}`))
 useEffect(()=>{
  document.title = active ? `${active.title} — XVII Dev` : 'Utilitas — XVII Dev'
  document.querySelector('meta[name="description"]')?.setAttribute('content', active?.description ?? 'Alat sederhana untuk pekerjaan sehari-hari. Langsung di browser.')
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', `https://xvii.dev/utilities/${active ? active.slug + '/' : ''}`)
 },[active])
 const [searchOpen,setSearchOpen]=useState(false)
 const navigate=useNavigate()
 useEffect(()=>{
  const handler=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();setSearchOpen(value=>!value)}}
  document.addEventListener('keydown',handler);return()=>document.removeEventListener('keydown',handler)
 },[])
 return <TooltipProvider><SidebarProvider style={{'--sidebar-width':'15rem'} as CSSProperties}>
  <Button role="link" nativeButton={false} className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2" render={<a href="#utility-main" />}>Langsung ke konten</Button>
  {active&&<ToolsSidebar active={active.slug} onSearch={()=>setSearchOpen(true)} />}
  <SidebarInset className="min-w-0">
   <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-4 md:px-6">
    <div className="flex min-w-0 items-center gap-2">{active?<><SidebarTrigger aria-label="Buka atau tutup daftar utilitas" /><Separator orientation="vertical" className="mx-1 h-5" /><Button role="link" nativeButton={false} variant="ghost" size="sm" className="hidden sm:inline-flex" render={<Link to="/" />}>Utilitas</Button><ChevronRightIcon className="hidden size-3 shrink-0 text-muted-foreground sm:block" /><span className="truncate text-sm">{active.title}</span></>:<Brand />}</div>
    <nav aria-label="Navigasi utilitas" className="flex shrink-0 items-center gap-1">
     <Tooltip><TooltipTrigger render={<Button variant="ghost" size="icon" aria-label="Cari utilitas (Ctrl+K)" onClick={()=>setSearchOpen(true)} />}><SearchIcon /></TooltipTrigger><TooltipContent>Cari utilitas · Ctrl+K</TooltipContent></Tooltip>
     <ThemeButton />
    </nav>
   </header>
   <div id="utility-main" className="min-w-0 flex-1">{active?<div className="p-4 md:p-6"><Outlet /></div>:<Outlet />}</div>
   <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 text-sm text-muted-foreground md:px-8"><span>XVII Dev / Utilitas</span><Button role="link" nativeButton={false} variant="link" size="xs" render={<a href="/" />}>Kembali ke beranda</Button></footer>
  </SidebarInset>
  <CommandDialog open={searchOpen} onOpenChange={setSearchOpen} title="Cari utilitas" description="Temukan dan buka alat yang ingin digunakan.">
   <CommandInput aria-label="Cari utilitas di semua alat" placeholder="Cari utilitas…" />
   <CommandList aria-label="Hasil pencarian"><CommandEmpty>Utilitas tidak ditemukan.</CommandEmpty>{categories.map(category=><CommandGroup key={category} heading={category}>{utilities.filter(tool=>tool.category===category).map(tool=><CommandItem key={tool.slug} value={[tool.title,...tool.keywords].join(' ')} onSelect={()=>{setSearchOpen(false);void navigate({to:`/${tool.slug}`})}}><tool.icon /><span>{tool.title}</span></CommandItem>)}</CommandGroup>)}</CommandList>
  </CommandDialog>
 </SidebarProvider></TooltipProvider>
}
