import './XToasts.js'
export class AlertManager {
  constructor({ logger, eventBus, placement = 'top-right' }){
    this.logger = logger; this.eventBus = eventBus;
    this.el = document.querySelector('x-toasts') || document.body.appendChild(document.createElement('x-toasts'));
    this.el.setAttribute('placement', placement);
    this.el.addEventListener('toast:show', (e)=>{ const d = e.detail; this.logger.info?.('toast:show', d); this.eventBus.emit('alerts:show', d); });
    this.el.addEventListener('toast:close', (e)=>{ const d = e.detail; this.logger.info?.('toast:close', d); this.eventBus.emit('alerts:close', d); });
    this.el.addEventListener('toast:action', (e)=>{ const d = e.detail; this.logger.info?.('toast:action', d); this.eventBus.emit('alerts:action', d); });
  }
  toast(opts){ const dismiss = this.el.toast(opts); this.logger.info?.('toast', opts); return dismiss; }
  progress(opts){ return this.el.progress(opts); }
}
