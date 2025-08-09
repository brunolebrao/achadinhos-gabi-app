"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card"
import { Button } from "@repo/ui/button"
import { Badge } from "@repo/ui/badge"
import { 
  Bot, 
  Plus, 
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Package,
  Activity,
  Database,
  Search,
  Filter,
  X,
  Save,
  Tags,
  DollarSign,
  Timer,
  RefreshCw
} from "lucide-react"
import { toast } from "sonner"
import { DeleteConfirmationModal } from "../../../components/ConfirmationModal"

interface ScraperConfig {
  id: string
  platform: 'MERCADOLIVRE' | 'AMAZON' | 'SHOPEE' | 'ALIEXPRESS'
  name: string
  isActive: boolean
  categories: string[]
  keywords: string[]
  minPrice?: number
  maxPrice?: number
  minDiscount?: number
  frequency: string
  lastRun?: string
  nextRun?: string
  userId: string
  createdAt: string
  updatedAt: string
  _count?: {
    executions: number
  }
}

interface ScraperExecution {
  id: string
  scraperId: string
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED'
  startedAt: string
  finishedAt?: string
  productsFound: number
  productsAdded: number
  error?: string
}

const platformColors = {
  MERCADOLIVRE: 'bg-yellow-500',
  AMAZON: 'bg-gray-800', 
  SHOPEE: 'bg-orange-500',
  ALIEXPRESS: 'bg-red-500'
}

const platformNames = {
  MERCADOLIVRE: 'Mercado Livre',
  AMAZON: 'Amazon',
  SHOPEE: 'Shopee',
  ALIEXPRESS: 'AliExpress'
}

export default function ScrapersPage() {
  const { data: session, status } = useSession()
  const [scrapers, setScrapers] = useState<ScraperConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPlatform, setSelectedPlatform] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [runningScrapers, setRunningScrapers] = useState<Set<string>>(new Set())
  const [scraperExecutions, setScraperExecutions] = useState<Map<string, ScraperExecution>>(new Map())
  const [loadingActions, setLoadingActions] = useState<Set<string>>(new Set())
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; scraperId?: string; scraperName?: string }>({ isOpen: false })
  const [formData, setFormData] = useState({
    platform: 'MERCADOLIVRE' as const,
    name: '',
    isActive: true,
    categories: [] as string[],
    keywords: [] as string[],
    minPrice: '',
    maxPrice: '',
    minDiscount: '',
    frequency: '0 */6 * * *',
    maxProducts: 100
  })
  const [currentKeyword, setCurrentKeyword] = useState('')
  const [currentCategory, setCurrentCategory] = useState('')

  // Templates pré-definidos
  const scraperTemplates = {
    'MERCADOLIVRE': [
      {
        name: 'Eletrônicos em Promoção',
        keywords: ['smartphone', 'notebook', 'tablet', 'smart tv'],
        categories: ['eletrônicos', 'informática'],
        minDiscount: '20',
        frequency: '0 */6 * * *'
      },
      {
        name: 'Casa e Decoração',
        keywords: ['sofá', 'mesa', 'decoração', 'cozinha'],
        categories: ['casa', 'móveis', 'decoração'],
        minDiscount: '15',
        frequency: '0 0 * * *'
      }
    ],
    'SHOPEE': [
      {
        name: 'Moda e Beleza',
        keywords: ['roupa', 'sapato', 'maquiagem', 'perfume'],
        categories: ['moda', 'beleza'],
        minDiscount: '30',
        frequency: '0 */12 * * *'
      }
    ],
    'AMAZON': [
      {
        name: 'Livros e Educação',
        keywords: ['livro', 'curso', 'kindle'],
        categories: ['livros', 'educação'],
        minDiscount: '10',
        frequency: '0 0 * * *'
      }
    ]
  }

  const applyTemplate = (template: typeof scraperTemplates['MERCADOLIVRE'][0]) => {
    setFormData(prev => ({
      ...prev,
      name: template.name,
      keywords: [...template.keywords],
      categories: [...template.categories],
      minDiscount: template.minDiscount,
      frequency: template.frequency
    }))
  }

  useEffect(() => {
    if (status === 'authenticated' && session?.accessToken) {
      fetchScrapers()
    }
  }, [status, session])

  const fetchScrapers = async () => {
    if (!session?.accessToken) return

    try {
      const response = await fetch('http://localhost:3001/api/scrapers/user', {
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setScrapers(data)
      } else if (response.status === 404) {
        // No scrapers found, that's ok
        setScrapers([])
      } else {
        toast.error('Erro ao carregar scrapers')
      }
    } catch (error) {
      console.error('Failed to fetch scrapers:', error)
      toast.error('Erro ao carregar scrapers')
    } finally {
      setLoading(false)
    }
  }

  const fetchScraperExecutions = async (scraperIds: string[]) => {
    if (!session?.accessToken || scraperIds.length === 0) return

    try {
      const promises = scraperIds.map(scraperId =>
        fetch(`http://localhost:3001/api/scrapers/executions?scraperId=${scraperId}`, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`
          }
        })
      )

      const responses = await Promise.all(promises)
      const newExecutions = new Map<string, ScraperExecution>()

      for (let i = 0; i < responses.length; i++) {
        const response = responses[i]
        const scraperId = scraperIds[i]
        
        if (response.ok) {
          const executions: ScraperExecution[] = await response.json()
          // Get the most recent execution that's still running or just finished
          const activeExecution = executions.find(exec => 
            exec.status === 'RUNNING' || exec.status === 'PENDING' || 
            (exec.status === 'SUCCESS' && runningScrapers.has(scraperId))
          )
          if (activeExecution) {
            newExecutions.set(scraperId, activeExecution)
          }
        }
      }

      // Check for completed executions to show notifications
      const previousExecutions = scraperExecutions
      newExecutions.forEach((execution, scraperId) => {
        const prevExecution = previousExecutions.get(scraperId)
        
        // Show toast notification when execution completes
        if (prevExecution && prevExecution.status !== execution.status) {
          if (execution.status === 'SUCCESS') {
            const scraperName = scrapers.find(s => s.id === scraperId)?.name || 'Scraper'
            toast.success(
              `${scraperName} concluído!`, 
              {
                description: `${execution.productsFound} produtos encontrados, ${execution.productsAdded} novos produtos adicionados`
              }
            )
          } else if (execution.status === 'FAILED') {
            const scraperName = scrapers.find(s => s.id === scraperId)?.name || 'Scraper'
            toast.error(
              `${scraperName} falhou`, 
              {
                description: execution.error || 'Erro desconhecido durante a execução'
              }
            )
          }
        }
      })

      setScraperExecutions(newExecutions)

      // Update running scrapers based on execution status
      const currentlyRunning = new Set<string>()
      newExecutions.forEach((execution, scraperId) => {
        if (execution.status === 'RUNNING' || execution.status === 'PENDING') {
          currentlyRunning.add(scraperId)
        }
      })
      setRunningScrapers(currentlyRunning)

    } catch (error) {
      console.error('Failed to fetch executions:', error)
    }
  }

  // Polling effect for running scrapers
  useEffect(() => {
    if (runningScrapers.size > 0 && session?.accessToken) {
      const interval = setInterval(() => {
        fetchScraperExecutions(Array.from(runningScrapers))
      }, 3000) // Poll every 3 seconds

      return () => clearInterval(interval)
    }
  }, [runningScrapers, session?.accessToken])

  // Initial fetch of executions for any currently running scrapers
  useEffect(() => {
    if (scrapers.length > 0 && session?.accessToken) {
      const scraperIds = scrapers.map(s => s.id)
      fetchScraperExecutions(scraperIds)
    }
  }, [scrapers, session?.accessToken])

  const toggleScraperStatus = async (scraperId: string, isActive: boolean) => {
    if (!session?.accessToken) return
    
    const actionKey = `toggle-${scraperId}`
    setLoadingActions(prev => new Set([...prev, actionKey]))

    try {
      console.log('Toggling scraper:', { scraperId, currentStatus: isActive, newStatus: !isActive })
      
      const response = await fetch(`http://localhost:3001/api/scrapers/${scraperId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`
        },
        body: JSON.stringify({ isActive: !isActive })
      })

      if (response.ok) {
        const updatedScraper = await response.json()
        console.log('Scraper toggled successfully:', updatedScraper)
        await fetchScrapers()
        toast.success(isActive ? 'Scraper pausado com sucesso' : 'Scraper ativado com sucesso')
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Toggle failed:', response.status, errorData)
        toast.error(errorData.error || `Erro ao ${isActive ? 'pausar' : 'ativar'} scraper`)
      }
    } catch (error) {
      console.error('Failed to toggle scraper:', error)
      toast.error(`Erro de conexão ao ${isActive ? 'pausar' : 'ativar'} scraper`)
    } finally {
      setLoadingActions(prev => {
        const newSet = new Set(prev)
        newSet.delete(actionKey)
        return newSet
      })
    }
  }

  const handleDeleteClick = (scraperId: string, scraperName: string) => {
    setDeleteModal({ isOpen: true, scraperId, scraperName })
  }

  const handleDeleteConfirm = async () => {
    if (!session?.accessToken || !deleteModal.scraperId || !deleteModal.scraperName) return
    
    const actionKey = `delete-${deleteModal.scraperId}`
    setLoadingActions(prev => new Set([...prev, actionKey]))

    try {
      console.log('Deleting scraper:', { scraperId: deleteModal.scraperId, scraperName: deleteModal.scraperName })
      
      const response = await fetch(`http://localhost:3001/api/scrapers/${deleteModal.scraperId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      })

      if (response.ok) {
        console.log('Scraper deleted successfully')
        await fetchScrapers()
        toast.success(`Scraper "${deleteModal.scraperName}" excluído com sucesso`)
        setDeleteModal({ isOpen: false })
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Delete failed:', response.status, errorData)
        toast.error(errorData.error || 'Erro ao excluir scraper')
      }
    } catch (error) {
      console.error('Failed to delete scraper:', error)
      toast.error('Erro de conexão ao excluir scraper')
    } finally {
      setLoadingActions(prev => {
        const newSet = new Set(prev)
        newSet.delete(actionKey)
        return newSet
      })
    }
  }

  const runScraper = async (scraperId: string) => {
    if (!session?.accessToken) return

    // Add a timeout after 2 minutes
    const SCRAPER_TIMEOUT = 120000 // 2 minutes
    let timeoutId: NodeJS.Timeout | null = null

    try {
      // Add to running scrapers immediately for UI feedback
      setRunningScrapers(prev => new Set([...prev, scraperId]))
      
      const response = await fetch(`http://localhost:3001/api/scrapers/${scraperId}/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        
        // Create initial execution state
        setScraperExecutions(prev => new Map([
          ...prev,
          [scraperId, {
            id: data.executionId,
            scraperId,
            status: 'RUNNING',
            startedAt: new Date().toISOString(),
            productsFound: 0,
            productsAdded: 0
          }]
        ]))
        
        toast.success('Scraper iniciado com sucesso!')
        
        // Set timeout to handle stuck scrapers
        timeoutId = setTimeout(() => {
          // Check if scraper is still running
          setScraperExecutions(prev => {
            const exec = prev.get(scraperId)
            if (exec && (exec.status === 'RUNNING' || exec.status === 'PENDING')) {
              // Mark as failed due to timeout
              const updatedExec = {
                ...exec,
                status: 'FAILED' as const,
                finishedAt: new Date().toISOString(),
                error: 'Execução expirou após 2 minutos'
              }
              const newMap = new Map(prev)
              newMap.set(scraperId, updatedExec)
              
              toast.error(`Scraper "${scrapers.find(s => s.id === scraperId)?.name || scraperId}" expirou após 2 minutos`)
              
              // Remove from running scrapers
              setRunningScrapers(current => {
                const newSet = new Set(current)
                newSet.delete(scraperId)
                return newSet
              })
              
              return newMap
            }
            return prev
          })
        }, SCRAPER_TIMEOUT)
        
        // Start polling for this scraper
        setTimeout(() => {
          fetchScraperExecutions([scraperId])
        }, 1000)
        
      } else {
        // Remove from running scrapers on error
        setRunningScrapers(prev => {
          const newSet = new Set(prev)
          newSet.delete(scraperId)
          return newSet
        })
        toast.error('Erro ao executar scraper')
      }
    } catch (error) {
      // Remove from running scrapers on error
      setRunningScrapers(prev => {
        const newSet = new Set(prev)
        newSet.delete(scraperId)
        return newSet
      })
      console.error('Failed to run scraper:', error)
      toast.error('Erro ao executar scraper')
    }
  }

  const createScraper = async () => {
    if (!session?.accessToken) return
    
    // Final validation
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      toast.error('Por favor, corrija os erros nos formulários')
      return
    }

    setCreating(true)
    try {
      const payload = {
        ...formData,
        minPrice: formData.minPrice ? parseFloat(formData.minPrice) : undefined,
        maxPrice: formData.maxPrice ? parseFloat(formData.maxPrice) : undefined,
        minDiscount: formData.minDiscount ? parseFloat(formData.minDiscount) : undefined
      }

      const response = await fetch('http://localhost:3001/api/scrapers/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        toast.success('Scraper criado com sucesso!')
        setShowCreateModal(false)
        resetForm()
        await fetchScrapers()
      } else {
        const errorData = await response.json().catch(() => null)
        toast.error(errorData?.error || 'Erro ao criar scraper')
      }
    } catch (error) {
      console.error('Failed to create scraper:', error)
      toast.error('Erro ao criar scraper')
    } finally {
      setCreating(false)
    }
  }

  const resetForm = () => {
    setFormData({
      platform: 'MERCADOLIVRE',
      name: '',
      isActive: true,
      categories: [],
      keywords: [],
      minPrice: '',
      maxPrice: '',
      minDiscount: '',
      frequency: '0 */6 * * *',
      maxProducts: 100
    })
    setCurrentKeyword('')
    setCurrentCategory('')
    setCurrentStep(1)
    setFormErrors({})
  }

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {}
    
    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          errors.name = 'Nome do scraper é obrigatório'
        }
        if (formData.name.trim().length < 3) {
          errors.name = 'Nome deve ter pelo menos 3 caracteres'
        }
        break
      case 2:
        if (formData.keywords.length === 0) {
          errors.keywords = 'Adicione pelo menos uma palavra-chave'
        }
        break
      case 3:
        if (formData.minPrice && formData.maxPrice && 
            parseFloat(formData.minPrice) >= parseFloat(formData.maxPrice)) {
          errors.price = 'Preço mínimo deve ser menor que o máximo'
        }
        break
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4))
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
    setFormErrors({})
  }

  const canProceed = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.name.trim().length >= 3
      case 2:
        return formData.keywords.length > 0
      case 3:
        return true // Optional step
      case 4:
        return true // Configuration step
      default:
        return false
    }
  }

  const addKeyword = () => {
    if (currentKeyword.trim() && !formData.keywords.includes(currentKeyword.trim())) {
      setFormData({ ...formData, keywords: [...formData.keywords, currentKeyword.trim()] })
      setCurrentKeyword('')
    }
  }

  const removeKeyword = (keyword: string) => {
    setFormData({ ...formData, keywords: formData.keywords.filter(k => k !== keyword) })
  }

  const addCategory = () => {
    if (currentCategory.trim() && !formData.categories.includes(currentCategory.trim())) {
      setFormData({ ...formData, categories: [...formData.categories, currentCategory.trim()] })
      setCurrentCategory('')
    }
  }

  const removeCategory = (category: string) => {
    setFormData({ ...formData, categories: formData.categories.filter(c => c !== category) })
  }

  const formatFrequency = (cron: string) => {
    const cronMap: { [key: string]: string } = {
      '0 */6 * * *': 'A cada 6 horas',
      '0 */12 * * *': 'A cada 12 horas', 
      '0 0 * * *': 'Diariamente',
      '0 0 */2 * *': 'A cada 2 dias',
      '0 0 * * 0': 'Semanalmente',
      '*/15 * * * *': 'A cada 15 minutos'
    }
    return cronMap[cron] || cron
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Nunca'
    return new Date(dateString).toLocaleString('pt-BR')
  }

  const filteredScrapers = scrapers.filter(scraper => {
    const matchesSearch = scraper.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPlatform = selectedPlatform === "all" || scraper.platform === selectedPlatform
    const matchesStatus = selectedStatus === "all" || 
      (selectedStatus === "active" && scraper.isActive) ||
      (selectedStatus === "inactive" && !scraper.isActive)
    
    return matchesSearch && matchesPlatform && matchesStatus
  })

  const activeScrapers = scrapers.filter(s => s.isActive).length
  const totalExecutions = scrapers.reduce((sum, s) => sum + (s._count?.executions || 0), 0)

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Não autenticado</h2>
            <p className="text-gray-600">Faça login para acessar esta página.</p>
          </div>
        </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Bot className="h-8 w-8" />
              Meus Scrapers
            </h2>
            <p className="text-muted-foreground">
              Gerencie seus scrapers pessoais para encontrar produtos com seus links de afiliado
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Scraper
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scrapers Ativos</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeScrapers}/{scrapers.length}</div>
              <p className="text-xs text-muted-foreground">
                {activeScrapers === scrapers.length ? "Todos ativos" : `${scrapers.length - activeScrapers} pausados`}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Execuções</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalExecutions}</div>
              <p className="text-xs text-muted-foreground">
                Execuções realizadas
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Plataformas</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Array.from(new Set(scrapers.map(s => s.platform))).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Plataformas diferentes
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Próxima Execução</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {scrapers.some(s => s.nextRun) ? 'Em breve' : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Próximo scraper
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar scrapers..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="all">Todos os status</option>
                <option value="active">Ativos</option>
                <option value="inactive">Pausados</option>
              </select>
              
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
              >
                <option value="all">Todas as plataformas</option>
                <option value="MERCADOLIVRE">Mercado Livre</option>
                <option value="SHOPEE">Shopee</option>
                <option value="AMAZON">Amazon</option>
                <option value="ALIEXPRESS">AliExpress</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {filteredScrapers.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Bot className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              {scrapers.length === 0 ? (
                <>
                  <h3 className="text-lg font-semibold mb-2">Nenhum scraper criado</h3>
                  <p className="text-gray-600 mb-4">
                    Crie seu primeiro scraper para começar a encontrar produtos automaticamente
                  </p>
                  <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Scraper
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold mb-2">Nenhum resultado encontrado</h3>
                  <p className="text-gray-600">
                    Tente ajustar os filtros de busca
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredScrapers.map((scraper) => {
              const isRunning = runningScrapers.has(scraper.id)
              const execution = scraperExecutions.get(scraper.id)
              const isToggling = loadingActions.has(`toggle-${scraper.id}`)
              const isDeleting = loadingActions.has(`delete-${scraper.id}`)
              
              return (
                <Card key={scraper.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          isRunning ? 'bg-blue-500 animate-pulse' : 
                          scraper.isActive ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{scraper.name}</CardTitle>
                            <Badge 
                              className={`${platformColors[scraper.platform]} text-white`}
                              variant="secondary"
                            >
                              {platformNames[scraper.platform]}
                            </Badge>
                            
                            {isRunning ? (
                              <Badge variant="default" className="bg-blue-500 animate-pulse">
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                {execution?.status === 'PENDING' ? 'Iniciando...' : 'Executando...'}
                              </Badge>
                            ) : (
                              <Badge variant={scraper.isActive ? "default" : "secondary"}>
                                {scraper.isActive ? "Ativo" : "Pausado"}
                              </Badge>
                            )}
                          </div>
                          <CardDescription className="flex items-center gap-4 mt-2">
                            <span>📊 Frequência: {formatFrequency(scraper.frequency)}</span>
                            <span>🔗 Execuções: {scraper._count?.executions || 0}</span>
                            {isRunning && execution && (
                              <span className="text-blue-600 font-medium">
                                📦 {execution.productsFound} produtos encontrados
                                {execution.productsAdded > 0 && ` | ✨ ${execution.productsAdded} novos`}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => runScraper(scraper.id)}
                          disabled={!scraper.isActive || isRunning}
                          title={isRunning ? "Executando..." : "Executar agora"}
                        >
                          {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleScraperStatus(scraper.id, scraper.isActive)}
                          disabled={isRunning || isToggling || isDeleting}
                          title={
                            isToggling ? (scraper.isActive ? "Pausando..." : "Ativando...") :
                            isRunning ? "Aguarde a execução terminar" : 
                            (scraper.isActive ? "Pausar" : "Ativar")
                          }
                        >
                          {isToggling ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            scraper.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClick(scraper.id, scraper.name)}
                          disabled={isRunning || isToggling || isDeleting}
                          title={
                            isDeleting ? "Excluindo..." :
                            isRunning ? "Aguarde a execução terminar" : 
                            "Excluir"
                          }
                        >
                          {isDeleting ? (
                            <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-red-500" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <strong>Categorias:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {scraper.categories.slice(0, 3).map((category, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                        {scraper.categories.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{scraper.categories.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <strong>Keywords:</strong>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {scraper.keywords.slice(0, 3).map((keyword, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                        {scraper.keywords.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{scraper.keywords.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <strong>Filtros:</strong>
                      <div className="text-gray-600 mt-1">
                        {scraper.minPrice && <div>💰 Min: R$ {scraper.minPrice}</div>}
                        {scraper.maxPrice && <div>💰 Max: R$ {scraper.maxPrice}</div>}
                        {scraper.minDiscount && <div>🏷️ Desconto: {scraper.minDiscount}%+</div>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 mt-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Última execução: {formatDate(scraper.lastRun)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Próxima execução: {formatDate(scraper.nextRun)}
                    </div>
                  </div>
                  
                  {/* Show execution status */}
                  {execution && execution.status === 'RUNNING' && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400 animate-pulse">
                      <div className="flex items-center gap-2 text-blue-800 text-sm font-medium">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Scraper em execução...
                      </div>
                      <div className="flex items-center gap-4 text-blue-700 text-xs mt-2">
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          Buscando produtos...
                        </div>
                        <div className="flex items-center gap-1">
                          <Timer className="h-3 w-3" />
                          {(() => {
                            const start = new Date(execution.startedAt).getTime()
                            const now = new Date().getTime()
                            const elapsed = Math.floor((now - start) / 1000)
                            const minutes = Math.floor(elapsed / 60)
                            const seconds = elapsed % 60
                            return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
                          })()}
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="w-full bg-blue-200 rounded-full h-1.5">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                            style={{ width: '60%' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {execution && execution.status === 'PENDING' && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                      <div className="flex items-center gap-2 text-yellow-800 text-sm font-medium">
                        <Clock className="h-4 w-4" />
                        Aguardando início da execução...
                      </div>
                      <div className="text-yellow-700 text-xs mt-1">
                        O scraper está na fila e iniciará em breve
                      </div>
                    </div>
                  )}
                  
                  {execution && execution.status === 'SUCCESS' && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                      <div className="flex items-center gap-2 text-green-800 text-sm font-medium">
                        <CheckCircle className="h-4 w-4" />
                        Última execução concluída com sucesso
                      </div>
                      <div className="text-green-700 text-xs mt-1">
                        📦 {execution.productsFound} produtos encontrados • ✨ {execution.productsAdded} novos produtos adicionados
                      </div>
                      {execution.finishedAt && (
                        <div className="text-green-600 text-xs mt-1">
                          Duração: {(() => {
                            const start = new Date(execution.startedAt).getTime()
                            const end = new Date(execution.finishedAt).getTime()
                            const duration = Math.floor((end - start) / 1000)
                            const minutes = Math.floor(duration / 60)
                            const seconds = duration % 60
                            return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {execution && execution.status === 'FAILED' && (
                    <div className="mt-4 p-3 bg-red-50 rounded-lg border-l-4 border-red-400">
                      <div className="flex items-center gap-2 text-red-800 text-sm font-medium">
                        <AlertCircle className="h-4 w-4" />
                        Última execução falhou
                      </div>
                      {execution.error && (
                        <div className="text-red-700 text-xs mt-1">
                          {execution.error}
                        </div>
                      )}
                      {execution.finishedAt && (
                        <div className="text-red-600 text-xs mt-1">
                          Falhou após: {(() => {
                            const start = new Date(execution.startedAt).getTime()
                            const end = new Date(execution.finishedAt).getTime()
                            const duration = Math.floor((end - start) / 1000)
                            const minutes = Math.floor(duration / 60)
                            const seconds = duration % 60
                            return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
            })}
          </div>
        )}

        {/* Create Scraper Wizard */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="h-5 w-5" />
                      Novo Scraper - Step {currentStep} de 4
                    </CardTitle>
                    <CardDescription>
                      {currentStep === 1 && "Configure as informações básicas do seu scraper"}
                      {currentStep === 2 && "Defina as palavras-chave e categorias para busca"}
                      {currentStep === 3 && "Configure filtros de preço e desconto (opcional)"}
                      {currentStep === 4 && "Finalize com frequência e configurações avançadas"}
                    </CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setShowCreateModal(false)
                      resetForm()
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Progress Bar */}
                <div className="flex items-center gap-2 mt-4">
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      className={`flex-1 h-2 rounded-full ${
                        step <= currentStep ? 'bg-blue-500' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step 1: Basic Info */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    {/* Templates */}
                    <div>
                      <label className="block text-sm font-medium mb-3">Começar com um template (opcional)</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {scraperTemplates[formData.platform as keyof typeof scraperTemplates]?.map((template, index) => (
                          <div
                            key={index}
                            className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => applyTemplate(template)}
                          >
                            <div className="font-medium text-sm">{template.name}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              {template.keywords.slice(0, 3).join(', ')}
                              {template.keywords.length > 3 && ` +${template.keywords.length - 3}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Nome do Scraper *</label>
                        <input
                          type="text"
                          className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            formErrors.name ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="Ex: Tech Gadgets Promoções"
                          value={formData.name}
                          onChange={(e) => {
                            setFormData({ ...formData, name: e.target.value })
                            if (formErrors.name) setFormErrors({...formErrors, name: ''})
                          }}
                        />
                        {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Plataforma *</label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={formData.platform}
                          onChange={(e) => setFormData({ ...formData, platform: e.target.value as any })}
                        >
                          <option value="MERCADOLIVRE">Mercado Livre</option>
                          <option value="SHOPEE">Shopee</option>
                          <option value="AMAZON">Amazon</option>
                          <option value="ALIEXPRESS">AliExpress</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Keywords and Categories */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    {/* Keywords */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Palavras-chave *</label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Ex: smartphone, notebook, headphone"
                          value={currentKeyword}
                          onChange={(e) => setCurrentKeyword(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                        />
                        <Button type="button" onClick={addKeyword} disabled={!currentKeyword.trim()}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.keywords.map((keyword, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center gap-1">
                            {keyword}
                            <X 
                              className="h-3 w-3 cursor-pointer hover:text-red-500" 
                              onClick={() => removeKeyword(keyword)}
                            />
                          </Badge>
                        ))}
                      </div>
                      {formData.keywords.length === 0 && (
                        <p className="text-sm text-gray-500 mt-1">Adicione pelo menos uma palavra-chave</p>
                      )}
                      {formErrors.keywords && <p className="text-red-500 text-xs mt-1">{formErrors.keywords}</p>}
                    </div>

                    {/* Categories */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Categorias (opcional)</label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Ex: eletrônicos, informática, casa"
                          value={currentCategory}
                          onChange={(e) => setCurrentCategory(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                        />
                        <Button type="button" onClick={addCategory} disabled={!currentCategory.trim()}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.categories.map((category, index) => (
                          <Badge key={index} variant="outline" className="flex items-center gap-1">
                            <Tags className="h-3 w-3" />
                            {category}
                            <X 
                              className="h-3 w-3 cursor-pointer hover:text-red-500" 
                              onClick={() => removeCategory(category)}
                            />
                          </Badge>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500 mt-2">💡 As categorias ajudam a focar a busca em seções específicas da plataforma</p>
                    </div>
                  </div>
                )}

                {/* Step 3: Price Filters */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
                        <DollarSign className="h-4 w-4" />
                        Filtros de Preço
                      </div>
                      <p className="text-blue-700 text-sm">Configure filtros para encontrar produtos dentro da sua faixa de preço preferida. Estes filtros são opcionais.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Preço Mínimo (R$)</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Ex: 50"
                          value={formData.minPrice}
                          onChange={(e) => {
                            setFormData({ ...formData, minPrice: e.target.value })
                            if (formErrors.price) setFormErrors({...formErrors, price: ''})
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Preço Máximo (R$)</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Ex: 500"
                          value={formData.maxPrice}
                          onChange={(e) => {
                            setFormData({ ...formData, maxPrice: e.target.value })
                            if (formErrors.price) setFormErrors({...formErrors, price: ''})
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Desconto Mín. (%)</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Ex: 20"
                          value={formData.minDiscount}
                          onChange={(e) => setFormData({ ...formData, minDiscount: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    {formErrors.price && <p className="text-red-500 text-sm">{formErrors.price}</p>}
                  </div>
                )}

                {/* Step 4: Configuration */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <h3 className="font-medium mb-3">Resumo da Configuração</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Nome:</span> {formData.name}
                        </div>
                        <div>
                          <span className="font-medium">Plataforma:</span> {platformNames[formData.platform]}
                        </div>
                        <div>
                          <span className="font-medium">Keywords:</span> {formData.keywords.join(', ')}
                        </div>
                        <div>
                          <span className="font-medium">Categorias:</span> {formData.categories.length > 0 ? formData.categories.join(', ') : 'Nenhuma'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Frequência de Execução</label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={formData.frequency}
                          onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                        >
                          <option value="*/15 * * * *">A cada 15 minutos (teste)</option>
                          <option value="0 */6 * * *">A cada 6 horas (recomendado)</option>
                          <option value="0 */12 * * *">A cada 12 horas</option>
                          <option value="0 0 * * *">Diariamente</option>
                          <option value="0 0 */2 * *">A cada 2 dias</option>
                          <option value="0 0 * * 0">Semanalmente</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Máx. Produtos por Execução</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={formData.maxProducts}
                          onChange={(e) => setFormData({ ...formData, maxProducts: parseInt(e.target.value) || 100 })}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="isActive"
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      />
                      <label htmlFor="isActive" className="text-sm font-medium">
                        Iniciar scraper ativo (começar a executar imediatamente)
                      </label>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-4 border-t">
                  <Button 
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                  >
                    Anterior
                  </Button>
                  
                  {currentStep < 4 ? (
                    <Button 
                      onClick={nextStep}
                      disabled={!canProceed(currentStep)}
                    >
                      Próximo
                    </Button>
                  ) : (
                    <Button 
                      onClick={createScraper}
                      disabled={creating || !canProceed(currentStep)}
                    >
                      {creating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Criando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Criar Scraper
                        </>
                      )}
                    </Button>
                  )}
                </div>

              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false })}
          onConfirm={handleDeleteConfirm}
          itemName={deleteModal.scraperName || ''}
          itemType="scraper"
          loading={loadingActions.has(`delete-${deleteModal.scraperId}`)}
        />
    </div>
  )
}