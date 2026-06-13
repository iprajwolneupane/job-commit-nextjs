'use client'

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider
} from "@/components/ui/sidebar";
import { LayoutDashboardIcon } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                {children}
            </SidebarInset>
        </SidebarProvider>
    )
}


export function AppSidebar() {
    const pathname = usePathname()

    const NAV_ITEMS = [
        {
            label: null,
            items: [
                {
                    name: 'Dashboard',
                    url: '/',
                    icon: LayoutDashboardIcon,
                }
            ]
        },
        {
            label: 'Job Management',
            items: [
                {
                    name: 'Applied Jobs',
                    url: '/applied-jobs',
                    icon: LayoutDashboardIcon,
                },
            ],
        }
    ];

    function isActiveRoute(itemUrl: string) {
        if (itemUrl === '/') {
            return pathname === '/'
        }

        return pathname === itemUrl || pathname.startsWith(`${itemUrl}/`)
    }

    return (
        <Sidebar collapsible="none">
            <SidebarHeader className="border-sidebar-border border-b px-2 py-4">
                <SidebarMenu>
                    <SidebarMenuItem className="items-center flex flex-col">
                        <Image src={'/logo/light-full-logo.svg'} alt="JobCommit" width={115} height={50} priority className="dark:hidden" />
                        <Image src={'/logo/dark-full-logo.svg'} alt="JobCommit" width={115} height={50} priority className="hidden dark:block" />
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                {
                    NAV_ITEMS.map((grp, index) => (
                        <SidebarGroup key={index}>
                            {
                                grp.label && <SidebarGroupLabel>{grp.label}</SidebarGroupLabel>
                            }
                            <SidebarMenu>
                                {grp.items.map((item) => (
                                    <SidebarMenuItem key={item.name}>
                                        <SidebarMenuButton asChild
                                            isActive={isActiveRoute(item.url)}
                                        >
                                            <a href={item.url}>
                                                <item.icon />
                                                <span>{item.name}</span>
                                            </a>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroup>
                    ))
                }
            </SidebarContent>
            <SidebarFooter />
        </Sidebar>
    )
}
