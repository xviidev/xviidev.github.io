import { useState } from 'react'
import { createRootRoute, createRoute, createRouter, lazyRouteComponent, RouterProvider } from '@tanstack/react-router'
import { Button } from '@xviidev/ui/components/button'
import { Skeleton } from '@xviidev/ui/components/skeleton'
import { UtilityShell } from './utilities/UtilityShell'
import { UtilityCatalog } from './utilities/UtilityCatalog'
import { utilities } from '../lib/utilities'
const rootRoute = createRootRoute({component:UtilityShell,notFoundComponent:()=> <div className="flex flex-col items-start gap-4 p-6"><h1 className="text-2xl font-semibold">Utilitas tidak ditemukan</h1><p>Pilih alat yang tersedia dari katalog.</p><Button role="link" nativeButton={false} render={<a href="/utilitas/" />}>Buka katalog utilitas</Button></div>})
const catalogRoute = createRoute({getParentRoute:()=>rootRoute,path:'/',component:UtilityCatalog})
const toolRoutes = utilities.map(tool=>createRoute({getParentRoute:()=>rootRoute,path:`/${tool.slug}`,component:lazyRouteComponent(tool.load)}))
const routeTree = rootRoute.addChildren([catalogRoute,...toolRoutes])
export default function UtilityApp() {
 const [router] = useState(()=>createRouter({routeTree,basepath:'/utilitas',trailingSlash:'always',defaultPreload:'intent',scrollRestoration:true,
  defaultPendingComponent:()=> <div className="flex flex-col gap-4 p-6" role="status" aria-label="Memuat utilitas"><Skeleton className="h-8 w-48" /><Skeleton className="h-72 w-full" /></div>,
  defaultErrorComponent:()=> <div className="flex flex-col items-start gap-4 p-6"><h1>Utilitas gagal dimuat</h1><p>Coba muat ulang halaman untuk melanjutkan.</p><Button onClick={()=>window.location.reload()}>Muat ulang</Button></div>,
 }))
 return <RouterProvider router={router} />
}
