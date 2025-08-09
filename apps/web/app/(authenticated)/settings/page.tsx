"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card"
import { 
  Settings, 
  DollarSign, 
  MessageSquare, 
  Shield, 
  Bell,
  Database,
  ChevronRight
} from "lucide-react"
import Link from "next/link"

const settingsCards = [
  {
    title: "Configurações de Afiliados",
    description: "Configure seus IDs de afiliado para monetizar os links compartilhados",
    icon: DollarSign,
    href: "/settings/affiliates",
    color: "bg-green-500"
  },
  {
    title: "Configurações do WhatsApp",
    description: "Gerencie suas contas e sessões do WhatsApp",
    icon: MessageSquare,
    href: "/settings/whatsapp",
    color: "bg-green-600",
    disabled: true
  },
  {
    title: "Notificações",
    description: "Configure alertas e notificações do sistema",
    icon: Bell,
    href: "/settings/notifications",
    color: "bg-blue-500",
    disabled: true
  },
  {
    title: "Segurança",
    description: "Altere senha e configurações de segurança",
    icon: Shield,
    href: "/settings/security",
    color: "bg-red-500",
    disabled: true
  },
  {
    title: "Backup e Dados",
    description: "Faça backup e gerencie seus dados",
    icon: Database,
    href: "/settings/backup",
    color: "bg-purple-500",
    disabled: true
  }
]

export default function SettingsPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Settings className="h-8 w-8" />
              Configurações
            </h2>
            <p className="text-muted-foreground">
              Gerencie as configurações do sistema
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {settingsCards.map((card) => (
            <Link 
              key={card.title}
              href={card.disabled ? "#" : card.href}
              className={card.disabled ? "pointer-events-none opacity-50" : ""}
            >
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-lg ${card.color} flex items-center justify-center`}>
                      <card.icon className="h-6 w-6 text-white" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                  <CardTitle className="mt-4">{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
                {card.disabled && (
                  <CardContent>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      Em breve
                    </span>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Sistema</CardTitle>
              <CardDescription>
                Versão e informações técnicas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Versão</span>
                <span className="text-sm font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Ambiente</span>
                <span className="text-sm font-medium">Produção</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">API</span>
                <span className="text-sm font-medium text-green-600">Online</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Banco de Dados</span>
                <span className="text-sm font-medium text-green-600">Conectado</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  )
}