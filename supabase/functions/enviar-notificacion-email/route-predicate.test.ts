import { describe, expect, it } from 'vitest'
import { resolveRecipient, type WebhookPayload } from './route-predicate'

describe('resolveRecipient', () => {
  it('routes a new solicitud_mensaje INSERT to the receptor with the message template', () => {
    const payload: WebhookPayload = {
      type: 'INSERT',
      table: 'solicitud_mensaje',
      schema: 'public',
      record: { id: 'sm-1', emisor_id: 'user-a', receptor_id: 'user-b', estado: 'pendiente' },
      old_record: null,
    }

    expect(resolveRecipient(payload)).toEqual({
      usuarioId: 'user-b',
      template: 'nueva_solicitud_mensaje',
    })
  })

  it('routes a solicitud_revista UPDATE that just became aceptada to the solicitante with the acceptance template', () => {
    const payload: WebhookPayload = {
      type: 'UPDATE',
      table: 'solicitud_revista',
      schema: 'public',
      record: {
        id: 'sr-1',
        solicitante_id: 'user-c',
        revista_id: 'rev-1',
        estado: 'aceptada',
      },
      old_record: { id: 'sr-1', estado: 'pendiente' },
    }

    expect(resolveRecipient(payload)).toEqual({
      usuarioId: 'user-c',
      template: 'solicitud_revista_aceptada',
    })
  })

  it('ignores a solicitud_revista UPDATE that re-saves an already-accepted row (old_record guard)', () => {
    const payload: WebhookPayload = {
      type: 'UPDATE',
      table: 'solicitud_revista',
      schema: 'public',
      record: {
        id: 'sr-1',
        solicitante_id: 'user-c',
        revista_id: 'rev-1',
        estado: 'aceptada',
      },
      old_record: { id: 'sr-1', estado: 'aceptada' },
    }

    expect(resolveRecipient(payload)).toBeNull()
  })

  it('routes a solicitud_revista UPDATE that moves to rechazada to the rejection template (superseded by notif-rechazo-recordatorio-solicitud)', () => {
    const payload: WebhookPayload = {
      type: 'UPDATE',
      table: 'solicitud_revista',
      schema: 'public',
      record: { id: 'sr-1', solicitante_id: 'user-c', estado: 'rechazada' },
      old_record: { id: 'sr-1', estado: 'pendiente' },
    }

    expect(resolveRecipient(payload)).toEqual({
      usuarioId: 'user-c',
      template: 'solicitud_revista_rechazada',
    })
  })

  it('ignores a solicitud_mensaje UPDATE (only INSERT triggers a notification)', () => {
    const payload: WebhookPayload = {
      type: 'UPDATE',
      table: 'solicitud_mensaje',
      schema: 'public',
      record: { id: 'sm-1', receptor_id: 'user-b', estado: 'aceptada' },
      old_record: { id: 'sm-1', estado: 'pendiente' },
    }

    expect(resolveRecipient(payload)).toBeNull()
  })

  it('ignores payloads from unrelated tables', () => {
    const payload: WebhookPayload = {
      type: 'INSERT',
      table: 'comentario',
      schema: 'public',
      record: { id: 'c-1', autor_id: 'user-a' },
      old_record: null,
    }

    expect(resolveRecipient(payload)).toBeNull()
  })

  it('routes a solicitud_revista UPDATE that just became rechazada to the solicitante with the rejection template', () => {
    const payload: WebhookPayload = {
      type: 'UPDATE',
      table: 'solicitud_revista',
      schema: 'public',
      record: {
        id: 'sr-2',
        solicitante_id: 'user-d',
        revista_id: 'rev-1',
        estado: 'rechazada',
        respuesta: 'No cumple el formato requerido',
      },
      old_record: { id: 'sr-2', estado: 'pendiente' },
    }

    expect(resolveRecipient(payload)).toEqual({
      usuarioId: 'user-d',
      template: 'solicitud_revista_rechazada',
    })
  })

  it('routes a solicitud_revista UPDATE that becomes rechazada with revisor_id NULL (automatic discard)', () => {
    const payload: WebhookPayload = {
      type: 'UPDATE',
      table: 'solicitud_revista',
      schema: 'public',
      record: {
        id: 'sr-3',
        solicitante_id: 'user-e',
        revista_id: 'rev-1',
        estado: 'rechazada',
        revisor_id: null,
      },
      old_record: { id: 'sr-3', estado: 'pendiente' },
    }

    expect(resolveRecipient(payload)).toEqual({
      usuarioId: 'user-e',
      template: 'solicitud_revista_rechazada',
    })
  })

  it('ignores a solicitud_revista UPDATE that re-saves an already-rechazada row (old_record guard)', () => {
    const payload: WebhookPayload = {
      type: 'UPDATE',
      table: 'solicitud_revista',
      schema: 'public',
      record: { id: 'sr-2', solicitante_id: 'user-d', estado: 'rechazada' },
      old_record: { id: 'sr-2', estado: 'rechazada' },
    }

    expect(resolveRecipient(payload)).toBeNull()
  })

  it('routes a notificacion INSERT of tipo recordatorio_cierre_revista to its usuario_id with the reminder template', () => {
    const payload: WebhookPayload = {
      type: 'INSERT',
      table: 'notificacion',
      schema: 'public',
      record: {
        id: 'notif-1',
        usuario_id: 'user-f',
        tipo: 'recordatorio_cierre_revista',
        descripcion: 'La ventana de postulación cierra pronto',
      },
      old_record: null,
    }

    expect(resolveRecipient(payload)).toEqual({
      usuarioId: 'user-f',
      template: 'recordatorio_cierre_revista',
    })
  })

  it('ignores a notificacion INSERT of any other tipo (guards against duplicate emails)', () => {
    const otherTipos = [
      'obra_likeada',
      'comentario_nueva',
      'comentario_respuesta',
      'nuevo_seguidor',
      'solicitud_mensaje',
      'obra_aceptada_revista',
      'obra_rechazada_revista',
    ]

    for (const tipo of otherTipos) {
      const payload: WebhookPayload = {
        type: 'INSERT',
        table: 'notificacion',
        schema: 'public',
        record: { id: 'notif-2', usuario_id: 'user-g', tipo },
        old_record: null,
      }

      expect(resolveRecipient(payload)).toBeNull()
    }
  })

  it('ignores a notificacion UPDATE (only INSERT triggers the recordatorio email)', () => {
    const payload: WebhookPayload = {
      type: 'UPDATE',
      table: 'notificacion',
      schema: 'public',
      record: { id: 'notif-1', usuario_id: 'user-f', tipo: 'recordatorio_cierre_revista', leida: true },
      old_record: { id: 'notif-1', leida: false },
    }

    expect(resolveRecipient(payload)).toBeNull()
  })
})
