'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Field from '@/components/ui/Field'
import Button from '@/components/ui/Button'
import { apiClient, ApiError } from '@/lib/api/client'
import type { Usuario } from '@/lib/types/database'

export interface PerfilEditFormProps {
  perfil: Pick<Usuario, 'nombre' | 'institucion' | 'carrera'>
}

export default function PerfilEditForm({ perfil }: PerfilEditFormProps) {
  const router = useRouter()

  const [nombre, setNombre] = useState(perfil.nombre)
  const [institucion, setInstitucion] = useState(perfil.institucion ?? '')
  const [carrera, setCarrera] = useState(perfil.carrera ?? '')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      await apiClient<Usuario>('/api/perfil', {
        method: 'PATCH',
        body: JSON.stringify({ nombre, institucion, carrera }),
      })
      setSuccess(true)
      router.refresh()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Error inesperado. Intenta de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="text-[--size-heading-sm] font-semibold font-serif text-[--color-text]">
        Editar perfil
      </h2>

      <Field
        label="Nombre"
        name="nombre"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        required
        disabled={loading}
      />

      <Field
        label="Institución"
        name="institucion"
        value={institucion}
        onChange={(e) => setInstitucion(e.target.value)}
        disabled={loading}
        placeholder="Universidad o institución"
      />

      <Field
        label="Carrera"
        name="carrera"
        value={carrera}
        onChange={(e) => setCarrera(e.target.value)}
        disabled={loading}
        placeholder="Carrera o área de estudio"
      />

      {error && (
        <p role="alert" className="text-sm text-[--color-danger]">
          {error}
        </p>
      )}

      {success && (
        <p role="status" className="text-sm text-[--color-text-muted]">
          Perfil actualizado correctamente.
        </p>
      )}

      <Button type="submit" loading={loading} className="self-start">
        Guardar cambios
      </Button>
    </form>
  )
}
