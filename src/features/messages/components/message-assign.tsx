// src/features/messages/components/message-assign.tsx (VERSIÓN MEJORADA)
"use client"

import type React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Label } from "@/src/components/ui/label"
import { Alert, AlertDescription } from "@/src/components/ui/alert"
import { Button } from "@/src/components/ui/button"
import { Loader2, Search } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Badge } from "@/src/components/ui/badge"
import { Checkbox } from "@/src/components/ui/checkbox"
import { ScrollArea } from "@/src/components/ui/scroll-area"
import { toast } from "sonner"
import { useMessageAssignmentData, useAssignMessage } from "../hooks/use-message"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/src/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/ui/popover"
import { cn } from "@/src/lib/utils"
import Image from "next/image"

export function MessageAssignForm() {
  const { assign, isLoading: isAssigning, error, clearError } = useAssignMessage()
  const { posts, contacts, loading, error: dataError, refetch } = useMessageAssignmentData()

  const [selectedPost, setSelectedPost] = useState<number | null>(null)
  const [selectedContacts, setSelectedContacts] = useState<number[]>([])
  const [contactSearchOpen, setContactSearchOpen] = useState(false)
  const [contactSearchValue, setContactSearchValue] = useState("")

  const handlePostSelect = (postId: number) => {
    setSelectedPost(postId)
  }

  const handleContactToggle = (contactId: number) => {
    setSelectedContacts(prev => 
      prev.includes(contactId) 
        ? prev.filter(id => id !== contactId)
        : [...prev, contactId]
    )
  }

  const handleSelectAllContacts = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([])
    } else {
      setSelectedContacts(contacts.map(contact => contact.id))
    }
  }

  const handleContactSelect = (contactId: number) => {
    handleContactToggle(contactId)
    setContactSearchOpen(false)
    setContactSearchValue("")
  }

  const validateForm = (): boolean => {
    if (!selectedPost) {
      toast.error("Por favor selecciona un post")
      return false
    }
    if (selectedContacts.length === 0) {
      toast.error("Por favor selecciona al menos un contacto")
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm() || !selectedPost) return

    clearError()
    
    const result = await assign(selectedPost, selectedContacts)
    if (result?.success) {
      setSelectedPost(null)
      setSelectedContacts([])
      toast.success("Mensajes asignados correctamente")
    }
  }

  const selectedPostData = posts.find(post => post.id === selectedPost)
  const firstImageUrl = selectedPostData?.images?.[0]?.url

  // Filtrar contactos basado en la búsqueda
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(contactSearchValue.toLowerCase()) ||
    contact.phone.includes(contactSearchValue)
  )

  // Mostrar error de carga de datos
  if (dataError) {
    return (
      <Card className="w-full max-w-6xl mx-auto">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertDescription>
              Error al cargar los datos: {dataError}
            </AlertDescription>
          </Alert>
          <div className="flex justify-center mt-4">
            <Button onClick={refetch} variant="outline">
              Reintentar
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader className="bg-white border-b">
        <CardTitle className="text-3xl font-bold text-gray-900">Asignar Mensaje a Contactos</CardTitle>
        <CardDescription className="text-lg text-gray-600">
          Selecciona un post y los contactos a los que quieres enviarlo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Selección de Post - DISEÑO MEJORADO */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">
                  Seleccionar Post <span className="text-red-700">*</span>
                </Label>
                <p className="text-sm text-gray-500">
                  Elige el post que quieres asignar a los contactos
                </p>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-4 border rounded-lg animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <ScrollArea className="h-64 border rounded-lg">
                  <div className="p-2 space-y-2">
                    {posts.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>No hay posts disponibles</p>
                        <Link href="/posts/create">
                          <Button variant="outline" className="mt-2">
                            Crear primer post
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      posts.map(post => {
                        const postFirstImage = post.images?.[0]?.url
                        return (
                          <div
                            key={post.id}
                            className={cn(
                              "p-4 border rounded-lg cursor-pointer transition-all flex gap-3",
                              selectedPost === post.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            )}
                            onClick={() => handlePostSelect(post.id)}
                          >
                            {/* Imagen del post */}
                            {postFirstImage && (
                              <div className="flex-shrink-0 w-16 h-16 relative rounded-md overflow-hidden border">
                                <Image
                                  src={postFirstImage}
                                  alt="Imagen del post"
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                            
                            {/* Contenido del post */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Badge variant="outline">
                                  {new Date(post.schedule).toLocaleDateString()}
                                </Badge>
                                {post.images && post.images.length > 0 && (
                                  <Badge variant="secondary">
                                    {post.images.length} imagen(es)
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm font-medium text-gray-900 line-clamp-2">
                                {post.text}
                              </p>
                              <p className="text-xs text-gray-500 mt-2">
                                Creado por: {post.createdBy}
                              </p>
                            </div>
                            
                            {/* Indicador de selección */}
                            {selectedPost === post.id && (
                              <div className="flex-shrink-0 flex items-center justify-center w-6 h-6">
                                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Selección de Contactos - CON COMBOBOX MEJORADO */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-gray-700">
                    Seleccionar Contactos <span className="text-red-700">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllContacts}
                    disabled={loading || contacts.length === 0}
                  >
                    {selectedContacts.length === contacts.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  Elige los contactos que recibirán este mensaje
                </p>
                <div className="text-sm text-gray-600">
                  Seleccionados: {selectedContacts.length} de {contacts.length}
                </div>

                {/* ComboBox para buscar contactos */}
                <Popover open={contactSearchOpen} onOpenChange={setContactSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={contactSearchOpen}
                      className="w-full justify-between"
                    >
                      <span className="text-gray-500">
                        {contactSearchValue || "Buscar contacto..."}
                      </span>
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Buscar contacto por nombre o teléfono..."
                        value={contactSearchValue}
                        onValueChange={setContactSearchValue}
                      />
                      <CommandList>
                        <CommandEmpty>No se encontraron contactos.</CommandEmpty>
                        <CommandGroup>
                          {filteredContacts.map((contact) => (
                            <CommandItem
                              key={contact.id}
                              value={`${contact.name} ${contact.phone}`}
                              onSelect={() => handleContactSelect(contact.id)}
                              className="flex items-center justify-between"
                            >
                              <div>
                                <div className="font-medium">{contact.name}</div>
                                <div className="text-sm text-gray-500 font-mono">{contact.phone}</div>
                              </div>
                              <Checkbox
                                checked={selectedContacts.includes(contact.id)}
                                className="ml-2"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex items-center space-x-2 p-3 border rounded-lg animate-pulse">
                      <div className="h-4 w-4 bg-gray-200 rounded"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <ScrollArea className="h-48 border rounded-lg">
                  <div className="p-2 space-y-2">
                    {contacts.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>No hay contactos disponibles</p>
                        <Link href="/contacts/create">
                          <Button variant="outline" className="mt-2">
                            Crear primer contacto
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      contacts.map(contact => (
                        <div
                          key={contact.id}
                          className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <Checkbox
                            checked={selectedContacts.includes(contact.id)}
                            onCheckedChange={() => handleContactToggle(contact.id)}
                            id={`contact-${contact.id}`}
                          />
                          <Label
                            htmlFor={`contact-${contact.id}`}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="font-medium text-gray-900">{contact.name}</div>
                            <div className="text-sm text-gray-500 font-mono">{contact.phone}</div>
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>

          {/* Vista previa MEJORADA */}
          {selectedPostData && (
            <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
              <h4 className="font-semibold text-blue-900 mb-3">Vista previa de la asignación:</h4>
              <div className="flex gap-4 items-start">
                {firstImageUrl && (
                  <div className="flex-shrink-0 w-20 h-20 relative rounded-md overflow-hidden border">
                    <Image
                      src={firstImageUrl}
                      alt="Vista previa del post"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>Post:</strong> &quot;{selectedPostData.text.slice(0, 100)}...&quot;
                  </p>
                  <p className="text-sm text-blue-800">
                    Será asignado a <strong>{selectedContacts.length} contacto(s)</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-4 mt-8">
            <Link href="/messages">
              <Button variant="outline" type="button" disabled={isAssigning}>
                Cancelar
              </Button>
            </Link>
            <Button 
              type="submit" 
              disabled={isAssigning || !selectedPost || selectedContacts.length === 0 || posts.length === 0 || contacts.length === 0}
              className="min-w-40"
            >
              {isAssigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Asignando...
                </>
              ) : (
                `Asignar a ${selectedContacts.length} contacto(s)`
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}