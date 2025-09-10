import { describe, it, expect, beforeEach } from 'vitest'
import { PageManager } from '../src/PageManager.js'

function setupDOM(){
  document.body.innerHTML = `<main id="app"><div id="inner">hello</div></main>`
}

describe('PageManager', () => {
  beforeEach(() => setupDOM())
  it('replaces fragment and emits lifecycle events', async () => {
    const events = []
    const pm = new PageManager({
      containerSelector: '#app',
      registry: [],
      eventBus: { emit: (e,p)=> events.push(e), on(){}, },
      logger: {},
      router: { get: async()=> ({ data: '<section>new</section>'}) }
    })
    pm.replaceFragment('<section>new</section>')
    expect(document.querySelector('#app')?.innerHTML).toContain('new')
    expect(events.includes('fragment:will-unmount')).toBe(true)
    expect(events.includes('fragment:did-mount')).toBe(true)
  })
})
