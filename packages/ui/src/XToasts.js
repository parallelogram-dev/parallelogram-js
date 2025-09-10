export class XToasts extends HTMLElement {
  constructor(){
    super();
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        :host{position:fixed; inset:auto auto auto 0; padding:12px; z-index:2147483647; display:grid; gap:8px;}
        :host([placement="top-left"]){ top:0; left:0; }
        :host([placement="top-right"]){ top:0; right:0; left:auto; }
        :host([placement="bottom-right"]){ bottom:0; right:0; left:auto; }
        :host([placement="bottom-left"]){ bottom:0; left:0; }
        .toast{ padding:10px 12px; border-radius:8px; color:#fff; box-shadow:0 6px 20px rgba(0,0,0,.25); opacity:0; transform: translateY(-6px);
                animation: in .18s ease-out forwards; cursor:pointer; font: 14px/1.4 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; outline:none;}
        .toast.info{ background:#111827; }
        .toast.success{ background:#065f46; }
        .toast.warn{ background:#7c2d12; }
        .toast.error{ background:#7f1d1d; }
        .toast.loading{ background:#0f172a; }
        @keyframes in{ to{ opacity:1; transform:none; } }
        @keyframes out{ to{ opacity:0; transform: translateY(-6px); } }
        .row{ display:flex; align-items:center; gap:8px; }
        .msg{ white-space:pre-wrap; }
        button.icon{ all:unset; display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:6px; font-weight:700; }
        button.action{ all:unset; padding:4px 8px; border-radius:6px; background:rgba(255,255,255,.15); font-weight:600; }
        .spacer{ flex:1; }
        .bar{ position:relative; height:6px; border-radius:999px; overflow:hidden; background: rgba(255,255,255,.18); margin-top:8px; }
        .bar > .fill{ position:absolute; inset:0 auto 0 0; width:0%; background: rgba(255,255,255,.85); border-radius:inherit; }
        .bar.indeterminate > .fill{ width:40%; animation: indet 1.2s ease-in-out infinite; }
        @keyframes indet { 0%{ left:-40%; } 50%{ left:60%; } 100%{ left:100%; } }
        .spin{ width:16px; height:16px; border-radius:50%; border:2px solid rgba(255,255,255,.35); border-top-color:#fff; animation: spin .8s linear infinite; }
        @keyframes spin{ to{ transform: rotate(360deg); } }
      </style>
      <div id="wrap" role="region" aria-live="polite"></div>`;
    this._wrap = root.getElementById('wrap');
    this._id = 0;
  }
  toast({ message, type = 'info', timeout = 4000, allowHTML = false, action }){
    const id = ++this._id;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const role = (type === 'warn' || type === 'error') ? 'alert' : 'status';
    el.setAttribute('role', role);
    el.tabIndex = 0;
    const row = document.createElement('div'); row.className = 'row';
    const span = document.createElement('span'); span.className='msg'; if (allowHTML) span.innerHTML = message; else span.textContent = message;
    const spacer = document.createElement('div'); spacer.className='spacer';
    let actionBtn = null;
    if (action?.label){
      actionBtn = document.createElement('button'); actionBtn.className='action'; actionBtn.type='button'; actionBtn.textContent=action.label;
      actionBtn.addEventListener('click', (ev)=>{ this.dispatchEvent(new CustomEvent('toast:action', { detail: { id, type, message }, bubbles: true })); action.onClick?.(ev); remove(); });
    }
    const close = document.createElement('button'); close.className='icon'; close.setAttribute('aria-label','Dismiss notification'); close.textContent='×';
    row.append(span, spacer); if (actionBtn) row.append(actionBtn); row.append(close);
    el.append(row); this._wrap.append(el);
    const removeNow = ()=>{ el.style.animation='out .15s ease-in forwards'; setTimeout(()=> el.remove(), 150); };
    let removed=false; const remove = ()=>{ if (removed) return; removed = true; removeNow(); this.dispatchEvent(new CustomEvent('toast:close', { detail: { id, type, message }, bubbles:true })); };
    const tid = timeout ? setTimeout(remove, timeout) : null;
    const cancelTimer = ()=> tid && clearTimeout(tid);
    close.addEventListener('click', remove);
    el.addEventListener('mouseenter', cancelTimer); el.addEventListener('focusin', cancelTimer);
    el.addEventListener('mouseleave', ()=> { if (timeout && !removed) setTimeout(remove, 1000); });
    this.dispatchEvent(new CustomEvent('toast:show', { detail: { id, type, message }, bubbles: true }));
    return remove;
  }
  progress({ message, determinate = false, value = 0, max = 100, cancellable = false, onCancel }){
    const id = ++this._id;
    const el = document.createElement('div'); el.className = 'toast loading'; el.setAttribute('role','status'); el.tabIndex = 0;
    const row = document.createElement('div'); row.className='row';
    const spin = document.createElement('div'); spin.className='spin'; row.append(spin);
    const span = document.createElement('span'); span.className='msg'; span.textContent = message; row.append(span);
    const spacer = document.createElement('div'); spacer.className='spacer'; row.append(spacer);
    const close = document.createElement('button'); close.className='icon'; close.setAttribute('aria-label', cancellable ? 'Cancel' : 'Dismiss'); close.textContent = '⨯';
    row.append(close);
    el.append(row);
    const bar = document.createElement('div'); bar.className = 'bar' + (determinate ? '' : ' indeterminate');
    const fill = document.createElement('div'); fill.className = 'fill'; bar.append(fill); el.append(bar);
    this._wrap.append(el);
    const set = (n)=>{ if (!determinate) return; const pct = Math.max(0, Math.min(100, (n/max)*100)); fill.style.width = pct + '%'; };
    if (determinate) set(value);
    const dismiss = ()=> el.remove();
    const succeed = (m)=>{ if (m) span.textContent=m; el.classList.add('success'); setTimeout(dismiss, 1200); };
    const fail = (m)=>{ if (m) span.textContent=m; el.classList.add('error'); setTimeout(dismiss, 1600); };
    close.addEventListener('click', ()=>{ if (cancellable && onCancel) onCancel(); dismiss(); });
    this.dispatchEvent(new CustomEvent('toast:show', { detail: { id, type: 'loading', message }, bubbles: true }));
    return { id, set, setMessage: (m)=> span.textContent=m, succeed, fail, dismiss };
  }
}
if (!customElements.get('x-toasts')) customElements.define('x-toasts', XToasts);
