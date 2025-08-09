'use client'

import { useState } from 'react'
import { Card } from '@repo/ui/card'
import { Button } from '@repo/ui/button'
import { Badge } from '@repo/ui/badge'
import { 
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Instagram,
  Music2,
  MessageCircle,
  Clock,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'

interface ScheduledPost {
  id: string
  title: string
  platforms: string[]
  date: string
  time: string
  status: 'scheduled' | 'published' | 'draft'
  type: 'post' | 'story' | 'reel' | 'video'
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month')

  const scheduledPosts: ScheduledPost[] = [
    {
      id: '1',
      title: 'Fone Bluetooth Premium - Oferta Flash',
      platforms: ['instagram', 'tiktok'],
      date: '2024-01-15',
      time: '19:00',
      status: 'scheduled',
      type: 'post'
    },
    {
      id: '2',
      title: 'Kit Skincare - Story',
      platforms: ['instagram'],
      date: '2024-01-15',
      time: '12:00',
      status: 'scheduled',
      type: 'story'
    },
    {
      id: '3',
      title: 'Tênis Nike - Vídeo Review',
      platforms: ['tiktok'],
      date: '2024-01-16',
      time: '20:00',
      status: 'scheduled',
      type: 'video'
    }
  ]

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    
    const days = []
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    
    return days
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram':
        return <Instagram className="w-3 h-3" />
      case 'tiktok':
        return <Music2 className="w-3 h-3" />
      case 'whatsapp':
        return <MessageCircle className="w-3 h-3" />
      default:
        return null
    }
  }

  const getPostsForDay = (day: number) => {
    const dateStr = `2024-01-${day.toString().padStart(2, '0')}`
    return scheduledPosts.filter(post => post.date === dateStr)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Calendário de Publicações</h1>
          <p className="text-gray-600 mt-2">
            Visualize e gerencie suas publicações agendadas
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('month')}
            >
              Mês
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('week')}
            >
              Semana
            </Button>
            <Button
              variant={viewMode === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('day')}
            >
              Dia
            </Button>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Agendar Post
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3">
          <Card className="p-6">
            {/* Calendar Header */}
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">
                {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Hoje
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('next')}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-gray-200">
              {/* Weekday headers */}
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div
                  key={day}
                  className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-700"
                >
                  {day}
                </div>
              ))}
              
              {/* Calendar days */}
              {getDaysInMonth(currentDate).map((day, index) => {
                const dayPosts = day ? getPostsForDay(day) : []
                const isToday = day === new Date().getDate() && 
                  currentDate.getMonth() === new Date().getMonth() &&
                  currentDate.getFullYear() === new Date().getFullYear()
                
                return (
                  <div
                    key={index}
                    className={`bg-white min-h-[100px] p-2 ${
                      day ? 'cursor-pointer hover:bg-gray-50' : ''
                    } ${isToday ? 'bg-blue-50' : ''}`}
                    onClick={() => day && setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                  >
                    {day && (
                      <>
                        <div className={`text-sm font-medium mb-1 ${
                          isToday ? 'text-blue-600' : 'text-gray-900'
                        }`}>
                          {day}
                        </div>
                        <div className="space-y-1">
                          {dayPosts.slice(0, 2).map(post => (
                            <div
                              key={post.id}
                              className="text-xs p-1 bg-purple-100 rounded truncate"
                            >
                              <div className="flex items-center gap-1">
                                {post.platforms.map(p => getPlatformIcon(p))}
                                <span className="truncate">{post.time}</span>
                              </div>
                            </div>
                          ))}
                          {dayPosts.length > 2 && (
                            <div className="text-xs text-gray-500 text-center">
                              +{dayPosts.length - 2} mais
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Sidebar - Upcoming Posts */}
        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Próximas Publicações</h3>
            <div className="space-y-3">
              {scheduledPosts.slice(0, 5).map(post => (
                <div key={post.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-medium line-clamp-1">
                      {post.title}
                    </h4>
                    <Badge
                      variant={post.status === 'scheduled' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {post.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <Clock className="w-3 h-3" />
                    <span>{post.date} às {post.time}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      {post.platforms.map(platform => (
                        <div
                          key={platform}
                          className="p-1 bg-gray-100 rounded"
                        >
                          {getPlatformIcon(platform)}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Stats */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Estatísticas do Mês</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Agendado</span>
                <span className="font-semibold">47</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Publicados</span>
                <span className="font-semibold">32</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Rascunhos</span>
                <span className="font-semibold">8</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Taxa de Publicação</span>
                <span className="font-semibold text-green-600">94%</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}