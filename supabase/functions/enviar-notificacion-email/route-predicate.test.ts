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

  it('ignores a solicitud_revista UPDATE that moves to rechazada', () => {
    const payload: WebhookPayload = {
      type: 'UPDATE',
      table: 'solicitud_revista',
      schema: 'public',
      record: { id: 'sr-1', solicitante_id: 'user-c', estado: 'rechazada' },
      old_record: { id: 'sr-1', estado: 'pendiente' },
    }

    expect(resolveRecipient(payload)).toBeNull()
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
})
