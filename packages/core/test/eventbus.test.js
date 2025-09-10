import { describe, it, expect } from 'vitest'
import { EventBus } from '../src/EventBus.js'

describe('EventBus', () => {
  it('on/emit works', () => {
    const bus = new EventBus()
    let hit = 0
    bus.on('ping', (p)=> { hit += p })
    bus.emit('ping', 2)
    expect(hit).toBe(2)
  })
  it('once works', () => {
    const bus = new EventBus()
    let hit = 0
    bus.once('one', ()=> hit++)
    bus.emit('one')
    bus.emit('one')
    expect(hit).toBe(1)
  })
})
