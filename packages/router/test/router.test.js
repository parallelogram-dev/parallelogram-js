import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RouterManager } from '../src/RouterManager.js'

describe('RouterManager', () => {
  beforeEach(() => {
    global.fetch = vi.fn(async (url) => ({
      ok: true,
      status: 200,
      headers: { get: () => 'text/html' },
      text: async () => `<div>ok for ${url}</div>`
    }))
  })
  it('get returns text for html content-type', async () => {
    const rm = new RouterManager({ eventBus: { emit(){}, on(){} }, logger: {} })
    const { data } = await rm.get('/test')
    expect(typeof data).toBe('string')
    expect(data).toContain('ok for /test')
  })
  it('navigate emits events and returns html', async () => {
    const events = []
    const eventBus = { emit: (e,p)=> events.push(e), on(){} }
    const rm = new RouterManager({ eventBus, logger: {} })
    const html = await rm.navigate('/page')
    expect(html).toContain('ok for /page')
    expect(events.includes('route:start')).toBe(true)
    expect(events.includes('route:success')).toBe(true)
  })
})
