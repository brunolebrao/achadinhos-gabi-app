"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@repo/ui/utils"
import {
  BarChart3,
  Package,
  MessageSquare,
  Users,
  Bot,
  Settings,
  Search,
  Home,
  Smartphone,
  Link2,
  DollarSign,
  Users2,
  Palette,
  Send,
  Calendar,
  Image,
  FileText
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Produtos", href: "/products", icon: Package },
  { separator: true, label: "Redes Sociais" },
  { name: "Contas Sociais", href: "/social-accounts", icon: Users2 },
  { name: "Content Studio", href: "/content-studio", icon: Palette },
  { name: "Distribuição", href: "/distribution", icon: Send },
  { name: "Calendário", href: "/calendar", icon: Calendar },
  { name: "Biblioteca", href: "/media-library", icon: Image },
  { separator: true, label: "WhatsApp" },
  { name: "WhatsApp", href: "/whatsapp", icon: MessageSquare },
  { name: "Templates", href: "/templates", icon: FileText },
  { name: "Contatos", href: "/contacts", icon: Users },
  { separator: true, label: "Automação" },
  { name: "Scrapers", href: "/scrapers", icon: Bot },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { separator: true, label: "Configurações" },
  { name: "Afiliados", href: "/settings/affiliates", icon: DollarSign },
  { name: "Configurações", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col fixed inset-y-0 z-50 bg-gray-900">
      <div className="flex flex-col flex-grow pt-5 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <div className="flex items-center">
            <Search className="w-8 h-8 text-white" />
            <div className="ml-3">
              <h1 className="text-xl font-bold text-white">Achadinhos</h1>
              <p className="text-sm text-gray-300">da Gabi</p>
            </div>
          </div>
        </div>
        
        <nav className="mt-8 flex-1 px-2 space-y-1">
          {navigation.map((item, index) => {
            // Handle separator
            if ('separator' in item && item.separator) {
              return (
                <div key={`separator-${index}`} className="pt-4">
                  {item.label && (
                    <div className="px-2 pb-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {item.label}
                      </p>
                    </div>
                  )}
                </div>
              )
            }
            
            // Check if current path matches or starts with the item href (for subpages)
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-gray-800 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0",
                    isActive ? "text-white" : "text-gray-400 group-hover:text-white"
                  )}
                />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="flex-shrink-0 flex border-t border-gray-700 p-4">
          <div className="flex items-center">
            <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-green-500">
              <Smartphone className="h-4 w-4 text-white" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">Sistema Online</p>
              <p className="text-xs text-gray-400">2 contas conectadas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}