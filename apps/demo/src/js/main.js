import { PageManager } from '@contenir/page';
import '@contenir/components';
import '@contenir/ui';

function kickoffEnterTransition(app){
  app.classList.remove('is-entered');
  requestAnimationFrame(() => app.classList.add('is-entered'));
}

function boot(){
  const app = document.querySelector('#app');
  if (!app) return;

  // Initial mount once
  kickoffEnterTransition(app);

  // Example router / PageManager wiring
  const pageManager = new PageManager({ container: app });

  document.addEventListener('event:route:success', async (e) => {
    // out
    app.classList.remove('is-entered');
    // small frame to allow CSS to pick up state change
    await new Promise(r => requestAnimationFrame(r));

    // render new content (assuming PageManager knows how)
    await pageManager.render(e.detail);

    // (re)mount components in the new DOM
    safeMountAllWithin(app);

    // in
    requestAnimationFrame(() => app.classList.add('is-entered'));
  });
}

document.addEventListener('DOMContentLoaded', boot);
