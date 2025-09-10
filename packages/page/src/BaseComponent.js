export class BaseComponent {
  constructor({ eventBus, logger, router }){ this.eventBus = eventBus; this.logger = logger; this.router = router; this.elements = new WeakMap(); }
  mount(el){ if (this.elements.has(el)) return this.update(el); const state = this._init(el); this.elements.set(el, state); }
  update(el){}
  unmount(el){ const state = this.elements.get(el); if (!state) return; try { state.cleanup?.(); } finally { this.elements.delete(el); } }
  destroy(){ for (const el of this._elementsKeys()) this.unmount(el); }
  _elementsKeys(){ if (!this._keys) this._keys = new Set(); return this._keys; }
  _track(el){ if (!this._keys) this._keys = new Set(); this._keys.add(el); }
  _untrack(el){ this._keys?.delete(el); }
  _init(el){ const controller = new AbortController(); const cleanup = ()=> { controller.abort(); this._untrack(el); }; this._track(el); return { cleanup, controller }; }
}
export class QueuedComponentProxy extends BaseComponent {
  constructor(onMount, onUnmount){ super({ eventBus: { on(){}, emit(){} }, logger: { info(){}, error(){}, enabled:false }, router: null }); this._onMount = onMount; this._onUnmount = onUnmount; }
  mount(el){ this._onMount(el); }
  unmount(el){ this._onUnmount(el); }
}
