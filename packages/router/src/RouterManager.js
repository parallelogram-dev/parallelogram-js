export class RouterManager {
  constructor({ eventBus, logger }){
    this.eventBus = eventBus; this.logger = logger; this.controller = null;
    this.boundPop = this._onPopState.bind(this);
    window.addEventListener('popstate', this.boundPop);
    window.addEventListener('pageshow', (e)=>{ if (e.persisted) this.eventBus.emit('bfcache:restore', {}); });
    window.addEventListener('pagehide', ()=> this.eventBus.emit('bfcache:store', {}));
  }
  destroy(){ window.removeEventListener('popstate', this.boundPop); }
  _onPopState(){ const url = new URL(location.href); this.eventBus.emit('route:pop', { url }); }
  async get(url, init = {}){
    this.logger.group?.(`GET ${url}`);
    const ac = new AbortController(); this._abortInFlight(); this.controller = ac;
    try {
      const res = await fetch(url, { ...init, method: 'GET', signal: ac.signal, credentials: 'same-origin', headers: { 'X-Requested-With':'fetch', ...(init.headers||{}) } });
      if (!res.ok) throw this._httpError(res);
      const ctype = res.headers.get('content-type') || '';
      const data = ctype.includes('application/json') ? await res.json() : await res.text();
      this.logger.info?.('GET ok', { url, status: res.status });
      return { res, data };
    } catch (e){
      if (e.name === 'AbortError'){ this.logger.warn?.('GET aborted', url); throw e; }
      this.logger.error?.('GET failed', e); throw e;
    } finally { this.logger.groupEnd?.(); this.controller = null; }
  }
  async navigate(url, { replace = false } = {}){
    const target = typeof url === 'string' ? new URL(url, location.href) : url;
    this.eventBus.emit('route:start', { url: target });
    try {
      const { data } = await this.get(target.toString());
      if (typeof data !== 'string') throw new Error('Expected HTML string for fragment navigation');
      if (replace) history.replaceState({}, '', target.toString()); else history.pushState({}, '', target.toString());
      this.eventBus.emit('route:success', { url: target, html: data });
      return data;
    } catch (e){ this.eventBus.emit('route:error', { url: target, error: e }); throw e; }
  }
  _abortInFlight(){ if (this.controller) { this.controller.abort(); this.controller = null; } }
  _httpError(res){ const err = new Error(`HTTP ${res.status} ${res.statusText}`); err.status = res.status; err.response = res; return err; }
}
