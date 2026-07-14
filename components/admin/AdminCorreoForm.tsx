'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Field from '@/components/ui/Field'
import Button from '@/components/ui/Button'
import AdminUsuarioMultiSelect from '@/components/admin/AdminUsuarioMultiSelect'
import AdminCorreoPreview from '@/components/admin/AdminCorreoPreview'
import { ApiError, apiClient } from '@/lib/api/client'
import { ASUNTO_MAX, CUERPO_MAX, CUERPO_MIN } from '@/lib/validation/correoAdmin'
import type {
  CorreoAdmin,
  DestinatarioResuelto,
  DestinatariosCriterio,
  UsuarioCardData,
} from '@/lib/types/database'

type Modo = 'todos' | 'ids' | 'sin_publicacion'

const MODOS: { value: Modo; label: string }[] = [
  { value: 'todos', label: 'Todos los usuarios' },
  { value: 'ids', label: 'Usuarios específicos' },
  { value: 'sin_publicacion', label: 'Usuarios sin publicaciones' },
]

export default function AdminCorreoForm() {
  const router = useRouter()

  const [asunto, setAsunto] = useState('')
  const [cuerpo, setCuerpo] = useState('')
  const [modo, setModo] = useState<Modo>('todos')
  const [seleccionados, setSeleccionados] = useState<UsuarioCardData[]>([])

  const [previewOpen, setPreviewOpen] = useState(false)
  const [cantidadPreview, setCantidadPreview] = useState(0)
  const [destinatariosPreview, setDestinatariosPreview] = useState<DestinatarioResuelto[]>([])
  const [counting, setCounting] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function buildCriterio(): DestinatariosCriterio | null {
    if (modo === 'todos') return { tipo: 'todos' }
    if (modo === 'sin_publicacion') return { tipo: 'sin_publicacion' }
    if (seleccionados.length === 0) return null
    return { tipo: 'ids', valor: seleccionados.map((u) => u.id) }
  }

  function validarFormulario(): string | null {
    if (asunto.trim().length === 0) return 'El asunto es requerido.'
    if (asunto.length > ASUNTO_MAX) return `El asunto no puede superar ${ASUNTO_MAX} caracteres.`
    if (cuerpo.length < CUERPO_MIN) return `El cuerpo debe tener al menos ${CUERPO_MIN} caracteres.`
    if (cuerpo.length > CUERPO_MAX) return `El cuerpo no puede superar ${CUERPO_MAX} caracteres.`
    if (modo === 'ids' && seleccionados.length === 0) {
      return 'Selecciona al menos un usuario.'
    }
    return null
  }

  async function handlePreview() {
    setError('')
    setSuccess('')

    const validationMessage = validarFormulario()
    if (validationMessage) {
      setError(validationMessage)
      return
    }

    const criterio = buildCriterio()
    if (!criterio) return

    setCounting(true)
    try {
      const data = await apiClient<{ cantidad: number; destinatarios: DestinatarioResuelto[] }>(
        '/api/admin/correos/contar',
        {
          method: 'POST',
          body: JSON.stringify({ destinatarios_criterio: criterio }),
        },
      )
      setCantidadPreview(data.cantidad)
      setDestinatariosPreview(data.destinatarios)
      setPreviewOpen(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al calcular destinatarios.')
    } finally {
      setCounting(false)
    }
  }

  async function handleConfirm() {
    const criterio = buildCriterio()
    if (!criterio) return

    setSending(true)
    setError('')
    try {
      const data = await apiClient<{ correo: CorreoAdmin }>('/api/admin/correos', {
        method: 'POST',
        body: JSON.stringify({ asunto, cuerpo, destinatarios_criterio: criterio }),
      })
      setSuccess(
        `Correo enviado: ${data.correo.cantidad_enviados} entregados, ${data.correo.cantidad_fallidos} fallidos.`,
      )
      setPreviewOpen(false)
      setAsunto('')
      setCuerpo('')
      setModo('todos')
      setSeleccionados([])
      router.refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al enviar el correo.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="rounded-md border border-border bg-surface p-4 flex flex-col gap-4">
      <h2 className="text-(length:--size-heading-sm) font-normal font-display text-text">
        Enviar correo a usuarios
      </h2>

      <Field
        label="Asunto"
        name="asunto"
        value={asunto}
        onChange={(e) => setAsunto(e.target.value)}
        maxLength={ASUNTO_MAX}
        helper={`${asunto.length}/${ASUNTO_MAX} caracteres`}
        required
      />

      <Field
        label="Cuerpo"
        name="cuerpo"
        multiline
        value={cuerpo}
        onChange={(e) => setCuerpo(e.target.value)}
        maxLength={CUERPO_MAX}
        helper={`${cuerpo.length}/${CUERPO_MAX} caracteres (mínimo ${CUERPO_MIN})`}
        required
      />

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-text">Destinatarios</span>
        <div role="radiogroup" aria-label="Destinatarios" className="flex flex-wrap gap-2">
          {MODOS.map(({ value, label }) => {
            const selected = modo === value
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setModo(value)}
                className={[
                  'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-border-focus',
                  selected
                    ? 'border-primary bg-primary text-primary-fg'
                    : 'border-border bg-surface text-text hover:bg-surface-muted',
                ].join(' ')}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {modo === 'ids' && (
        <AdminUsuarioMultiSelect selected={seleccionados} onChange={setSeleccionados} />
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="text-sm text-text-muted">
          {success}
        </p>
      )}

      <div>
        <Button onClick={handlePreview} loading={counting} disabled={sending}>
          Ver vista previa
        </Button>
      </div>

      <AdminCorreoPreview
        open={previewOpen}
        asunto={asunto}
        cuerpo={cuerpo}
        cantidad={cantidadPreview}
        destinatarios={destinatariosPreview}
        sending={sending}
        onConfirm={handleConfirm}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  )
}
