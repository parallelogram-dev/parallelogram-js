export function createIdle(){
  const ric = typeof window !== 'undefined' && window.requestIdleCallback
    ? window.requestIdleCallback
    : (cb, { timeout } = {}) => setTimeout(()=> cb({ didTimeout:false, timeRemaining:()=>Math.max(0, 50) }), timeout ?? 1);
  const cic = typeof window !== 'undefined' && window.cancelIdleCallback
    ? window.cancelIdleCallback
    : (id)=> clearTimeout(id);
  const schedule = (fn, timeout=1200)=> ric(fn, { timeout });
  schedule.cancel = cic;
  return schedule;
}
export function cancelIdle(id){
  const cic = typeof window !== 'undefined' && window.cancelIdleCallback
    ? window.cancelIdleCallback
    : (id)=> clearTimeout(id);
  cic(id);
}
