import { useState } from 'react'
import { createRootRoute, createRoute, createRouter, Outlet, RouterProvider } from '@tanstack/react-router'
import LabelPrinter from '@xviidev/label-printer'
const rootRoute = createRootRoute({component: Outlet})
const labelRoute = createRoute({getParentRoute: () => rootRoute, path: '/cetak-label', component: LabelPrinter})
const routeTree = rootRoute.addChildren([labelRoute])
export default function UtilityApp() {
 const [router] = useState(() => createRouter({routeTree,basepath:'/utilitas',trailingSlash:'always'}))
 return <RouterProvider router={router} />
}
