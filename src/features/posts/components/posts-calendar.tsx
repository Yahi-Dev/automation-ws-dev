// src/features/posts/components/posts-calendar.tsx
"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Badge } from "@/src/components/ui/badge"
import { ScrollArea } from "@/src/components/ui/scroll-area"
import { Skeleton } from "@/src/components/ui/skeleton"
import { 
  Calendar, 
  Clock, 
  Image as ImageIcon, 
  Eye, 
  Edit,
  ChevronLeft,
  ChevronRight,
  Plus
} from "lucide-react"
import { PostsType } from "../types"
import { useGetAllPosts } from "../hooks/use-posts"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/src/lib/utils"
import { useRouter } from "next/navigation"
import { PostDialog } from "./post-dialog"

// Componente Skeleton movido fuera del componente principal
const CalendarSkeleton = () => (
  <div className="space-y-6">
    {/* Header Skeleton */}
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-48" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>

    {/* Calendar Grid Skeleton */}
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: 42 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-lg" />
      ))}
    </div>
  </div>
)

export default function PostsCalendar() {
  const router = useRouter()
  const { fetchAll, posts, isLoading } = useGetAllPosts()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [inspectPostId, setInspectPostId] = useState<number | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const navigateToPreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const navigateToNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const navigateToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  const handleInspectClick = useCallback((id: number) => {
    setInspectPostId(id)
    setIsDialogOpen(true)
  }, [])

  const handleDialogClose = useCallback(() => {
    setIsDialogOpen(false)
    setInspectPostId(null)
  }, [])

  const handleEditClick = useCallback((id: number) => {
    router.push(`/posts/${id}/edit`)
  }, [router])

  const handleCreatePost = () => {
    router.push("/posts/create")
  }

  // Obtener posts para una fecha específica
  const getPostsForDate = (date: Date): PostsType[] => {
    return posts.filter(post => {
      const postDate = new Date(post.schedule)
      return isSameDay(postDate, date)
    })
  }

  // Obtener posts para el mes actual
  const getPostsForCurrentMonth = (): PostsType[] => {
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)
    return posts.filter(post => {
      const postDate = new Date(post.schedule)
      return postDate >= start && postDate <= end
    })
  }

  // Generar días del mes
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Agrupar posts por día para mejor performance
  const postsByDate = posts.reduce((acc, post) => {
    const dateKey = format(new Date(post.schedule), 'yyyy-MM-dd')
    if (!acc[dateKey]) {
      acc[dateKey] = []
    }
    acc[dateKey].push(post)
    return acc
  }, {} as Record<string, PostsType[]>)

  const postsForSelectedDate = selectedDate ? 
    postsByDate[format(selectedDate, 'yyyy-MM-dd')] || [] : 
    []

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendario de Posts</h1>
          <p className="text-gray-600 mt-2">
            Visualiza y gestiona todos tus posts programados en un calendario
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => router.push("/posts")}
          >
            Vista de Tabla
          </Button>
          <Button 
            onClick={handleCreatePost}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nuevo Post
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Posts</p>
                <p className="text-2xl font-bold text-gray-900">{posts.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Este Mes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {getPostsForCurrentMonth().length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Hoy</p>
                <p className="text-2xl font-bold text-gray-900">
                  {getPostsForDate(new Date()).length}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Eye className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Calendario</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={navigateToToday}
                >
                  Hoy
                </Button>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={navigateToPreviousMonth}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={navigateToNextMonth}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <CardDescription>
              {format(currentDate, 'MMMM yyyy', { locale: es })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <CalendarSkeleton />
            ) : (
              <>
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map(day => {
                    const dayPosts = postsByDate[format(day, 'yyyy-MM-dd')] || []
                    const isToday = isSameDay(day, new Date())
                    const isSelected = selectedDate && isSameDay(day, selectedDate)
                    const isCurrentMonth = isSameMonth(day, currentDate)

                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "aspect-square rounded-lg border-2 p-2 cursor-pointer transition-all hover:bg-gray-50",
                          isToday && "border-blue-500 bg-blue-50",
                          isSelected && "border-blue-500 bg-blue-100",
                          !isCurrentMonth && "text-gray-400 bg-gray-50",
                          "flex flex-col"
                        )}
                        onClick={() => setSelectedDate(day)}
                      >
                        <div className="flex justify-between items-start">
                          <span className={cn(
                            "text-sm font-medium",
                            isToday && "text-blue-600",
                            isSelected && "text-blue-700"
                          )}>
                            {format(day, 'd')}
                          </span>
                          {dayPosts.length > 0 && (
                            <Badge variant="secondary" className="h-5 text-xs">
                              {dayPosts.length}
                            </Badge>
                          )}
                        </div>

                        {/* Posts Preview */}
                        <div className="flex-1 overflow-hidden mt-1 space-y-1">
                          {dayPosts.slice(0, 2).map(post => (
                            <div
                              key={post.id}
                              className={cn(
                                "text-xs p-1 rounded text-left truncate",
                                new Date(post.schedule) < new Date() 
                                  ? "bg-gray-200 text-gray-600" 
                                  : "bg-green-100 text-green-700"
                              )}
                              title={post.text}
                            >
                              {format(new Date(post.schedule), 'HH:mm')} - {post.text.slice(0, 20)}...
                            </div>
                          ))}
                          {dayPosts.length > 2 && (
                            <div className="text-xs text-gray-500 text-center">
                              +{dayPosts.length - 2} más
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Posts for Selected Date */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate ? (
                `Posts para ${format(selectedDate, 'PPP', { locale: es })}`
              ) : (
                "Selecciona una fecha"
              )}
            </CardTitle>
            <CardDescription>
              {selectedDate && `${postsForSelectedDate.length} posts programados`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <div className="text-center text-gray-500 py-8">
                <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p>Selecciona una fecha en el calendario para ver los posts programados</p>
              </div>
            ) : postsForSelectedDate.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Clock className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p>No hay posts programados para esta fecha</p>
                <Button 
                  variant="outline" 
                  className="mt-3"
                  onClick={handleCreatePost}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Programar Post
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {postsForSelectedDate.map(post => {
                    const isExpired = new Date(post.schedule) < new Date()
                    const isScheduled = new Date(post.schedule) > new Date()

                    return (
                      <div
                        key={post.id}
                        className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge 
                                variant={isExpired ? "destructive" : isScheduled ? "default" : "secondary"}
                              >
                                {isExpired ? "Expirado" : isScheduled ? "Programado" : "Publicado"}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {format(new Date(post.schedule), 'HH:mm')}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-gray-900 line-clamp-2">
                              {post.text}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {post.images.length > 0 && (
                              <div className="flex items-center gap-1">
                                <ImageIcon className="h-3 w-3" />
                                <span>{post.images.length}</span>
                              </div>
                            )}
                            <span>Creado por: {post.createdBy}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleInspectClick(post.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClick(post.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Post Dialog */}
      {inspectPostId && (
        <PostDialog
          id={inspectPostId}
          isOpen={isDialogOpen}
          onOpenChange={handleDialogClose}
          onEditClick={handleEditClick}
        />
      )}
    </div>
  )
}