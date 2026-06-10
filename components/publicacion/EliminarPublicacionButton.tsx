'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import ConfirmDeleteModal from './ConfirmDeleteModal'

interface EliminarPublicacionButtonProps {
  publicacionId: string
  titulo: string
  tieneRevista: boolean
  tieneSolicitudPendiente: boolean
}

export default function EliminarPublicacionButton({
  publicacionId,
  titulo,
  tieneRevista,
  tieneSolicitudPendiente,
}: EliminarPublicacionButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setIsOpen(true)}>
        Eliminar
      </Button>
      <ConfirmDeleteModal
        isOpen={isOpen}
        onCancel={() => setIsOpen(false)}
        titulo={titulo}
        publicacionId={publicacionId}
        tieneRevista={tieneRevista}
        tieneSolicitudPendiente={tieneSolicitudPendiente}
      />
    </>
  )
}
