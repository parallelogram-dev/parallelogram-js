export class EventBus {
  constructor(){ this.listeners = new Map(); }
  on(evt, fn){ (this.listeners.get(evt) ?? this.listeners.set(evt, new Set()).get(evt)).add(fn); return () => this.off(evt, fn); }
  once(evt, fn){ const off = this.on(evt, (p)=>{ off(); fn(p); }); return off; }
  off(evt, fn){ const set = this.listeners.get(evt); if (set) { set.delete(fn); if (!set.size) this.listeners.delete(evt); } }
  emit(evt, payload){ const set = this.listeners.get(evt); if (!set) return; for (const fn of [...set]) { try { fn(payload); } catch(e){ console.error(`[event:${evt}] handler error`, e); } } }
}
