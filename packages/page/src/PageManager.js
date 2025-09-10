import { QueuedComponentProxy } from './BaseComponent.js'
import { createIdle } from '@contenir/core'
const idle = createIdle()

export class PageManager {
  constructor({ containerSelector, registry, eventBus, logger, router }){
    this.eventBus = eventBus; this.logger = logger; this.router = router;
    this.containerSelector = containerSelector;
    this.registry = registry;
    this.instances = new Map();
    this.observer = null;
    this.eventBus.on('route:success', ({ html }) => this.replaceFragment(html));
    this.eventBus.on('route:pop', async ({ url }) => {
      try { const { data } = await this.router.get(url.toString()); if (typeof data === 'string') this.replaceFragment(data, { fromPop: true }); }
      catch (e){ this.logger.error?.('route:pop fetch failed', e); }
    });
  }
  get container(){ const el = document.querySelector(this.containerSelector); if (!el) throw new Error(`Container not found: ${this.containerSelector}`); return el; }
  replaceFragment(html, { fromPop = false } = {}){
    const root = this.container;
    this.eventBus.emit('fragment:will-unmount', { root });
    this.unmountAllWithin(root);
    const tpl = document.createElement('template'); tpl.innerHTML = html.trim();
    root.replaceChildren(...tpl.content.childNodes);
    this.eventBus.emit('fragment:did-mount', { root });
    this.mountAllWithin(root);
    if (!fromPop) { /* scroll restore hook */ }
    idle(()=> this.mountAllWithin(root), 1200);
    if (!this.observer) this._startObserver(root);
  }
  _startObserver(root){
    if (!('MutationObserver' in window)) return;
    this.observer = new MutationObserver((mutations)=>{
      let added = [], removed = [];
      for (const m of mutations){
        if (m.addedNodes) added = added.concat([...m.addedNodes].filter(n=> n.nodeType===1));
        if (m.removedNodes) removed = removed.concat([...m.removedNodes].filter(n=> n.nodeType===1));
      }
      if (added.length){ this.mountAllWithin(root, added); }
      if (removed.length){ this.unmountRemoved(removed); }
    });
    this.observer.observe(root, { childList: true, subtree: true });
  }
  mountAllWithin(root, addedNodes = null){
    this.logger.group?.('mountAllWithin');
    try {
      for (const cfg of this.registry){
        const scope = addedNodes ? addedNodes : [root];
        const els = scope.flatMap(node => [...node.querySelectorAll(cfg.selector)]);
        if (!els.length) continue;
        const instance = this._ensureInstance(cfg);
        for (const el of els) instance.mount(el);
      }
    } finally { this.logger.groupEnd?.(); }
  }
  unmountAllWithin(root){
    this.logger.group?.('unmountAllWithin');
    try {
      for (const inst of this.instances.values()){
        for (const el of inst._elementsKeys?.() || []){ if (root.contains(el)) inst.unmount(el); }
      }
    } finally { this.logger.groupEnd?.(); }
  }
  unmountRemoved(nodes){
    for (const inst of this.instances.values()){
      for (const el of inst._elementsKeys?.() || []){ if (!document.documentElement.contains(el)) inst.unmount(el); }
    }
  }
  _ensureInstance(cfg){
    let inst = this.instances.get(cfg.name);
    if (inst) return inst;
    if (cfg.dependsOn?.length){ for (const dep of cfg.dependsOn){ const depCfg = this.registry.find(c=>c.name===dep); if (depCfg) this._ensureInstance(depCfg); } }
    const ctorPromiseLike = cfg.loader();
    const ctorMaybe = (ctorPromiseLike instanceof Promise) ? null : ctorPromiseLike;
    const create = (Ctor) => { const i = new Ctor({ eventBus: this.eventBus, logger: this.logger, router: this.router }); this.instances.set(cfg.name, i); return i; };
    if (ctorMaybe) return create(ctorMaybe.default);
    const queue = []; const placeholder = new QueuedComponentProxy((el)=> queue.push(['mount', el]), (el)=> queue.push(['unmount', el])); this.instances.set(cfg.name, placeholder);
    cfg.loader().then(mod => { const real = create(mod.default); for (const [action, el] of queue){ try { real[action](el); } catch(e){ this.logger.error?.(`dequeued ${cfg.name}.${action} failed`, e); } } this.instances.set(cfg.name, real); }).catch(e=> this.logger.error?.(`Failed to load component ${cfg.name}`, e));
    return placeholder;
  }
}
