import { Parallelogram } from '../../src/index.js';
import { MockXHR } from './MockXHR.js';

window.MockXHR = MockXHR;

const app = Parallelogram.create({
  mode: 'production',
  debug: true,

  router: {
    timeout: 10000,
    loadingClass: 'router-loading'
  },

  pageManager: {
    containerSelector: '[data-view="main"]',
    targetGroups: {
      main: ['main', 'navbar'],
    },
    targetGroupTransitions: {
      main: {
        out: 'page-transition-out',
        in: 'page-transition-in',
      },
      navbar: {
        out: 'fade-scale-down',
        in: 'fade-scale-up',
        duration: 250,
      },
      sidebar: {
        out: 'slide-left',
        in: 'slide-right',
        duration: 200,
      },
    },
    enableComponentPooling: true,
    enableHealthMonitoring: true,
    trackPerformance: true,
  }
});

app.components
  .add('p-modal', () =>
    import(/* webpackChunkName: "p-modal" */ '../../src/components/PModal.js')
  )
  .add('p-toasts', () =>
    import(/* webpackChunkName: "p-toasts" */ '../../src/components/PToasts.js')
  )
  .add('p-select', () =>
    import(/* webpackChunkName: "p-select" */ '../../src/components/PSelect.js')
  )
  .add('p-datetime', () =>
    import(/* webpackChunkName: "p-datetime" */ '../../src/components/PDatetime.js')
  )
  .add('p-uploader', () =>
    import(/* webpackChunkName: "p-uploader" */ '../../src/components/PUploader.js')
  )

  .add('[data-lazysrc]:not([data-lazysrc-complete])', () =>
    import(/* webpackChunkName: "lazysrc" */ '../../src/components/Lazysrc.js')
  )
  .add('[data-toggle]', () =>
    import(/* webpackChunkName: "toggle" */ '../../src/components/Toggle.js')
  )
  .add('[data-modal][data-modal-target]', () =>
    import(/* webpackChunkName: "modal" */ '../../src/components/Modal.js')
  )
  .add('[data-toast-trigger][data-toast-message]', () =>
    import(/* webpackChunkName: "toast" */ '../../src/components/Toast.js')
  )
  .add('[data-scrollhide]', () =>
    import(/* webpackChunkName: "scrollhide" */ '../../src/components/Scrollhide.js')
  )
  .add('[data-reveal]', () =>
    import(/* webpackChunkName: "scrollreveal" */ '../../src/components/Scrollreveal.js')
  )
  .add('[data-tabs]', () =>
    import(/* webpackChunkName: "tabs" */ '../../src/components/Tabs.js')
  )
  .add('[data-videoplay]', () =>
    import(/* webpackChunkName: "videoplay" */ '../../src/components/Videoplay.js')
  )
  .add('[data-datatable]', () =>
    import(/* webpackChunkName: "datatable" */ '../../src/components/DataTable.js')
  )
  .add('[data-lightbox]', () =>
    import(/* webpackChunkName: "lightbox" */ '../../src/components/Lightbox.js')
  )
  .add('[data-form-validator]', () =>
    import(/* webpackChunkName: "form-validator" */ '../../src/components/FormEnhancer.js')
  )
  .add('[data-copy-to-clipboard]', () =>
    import(/* webpackChunkName: "copy-to-clipboard" */ '../../src/components/CopyToClipboard.js')
  )
  .add('[data-selectloader]', () =>
    import(/* webpackChunkName: "selectloader" */ '../../src/components/SelectLoader.js')
  )

  .add('[data-demo="home"]', () =>
    import(/* webpackChunkName: "demo-home" */ './DemoHome.js')
  )
  .add('[data-demo="media"]', () =>
    import(/* webpackChunkName: "demo-media" */ './DemoMedia.js')
  )
  .add('[data-demo="performance"]', () =>
    import(/* webpackChunkName: "demo-performance" */ './DemoPerformance.js')
  )
  .add('[data-demo="ui-components"]', () =>
    import(/* webpackChunkName: "demo-ui-components" */ './DemoUIComponents.js')
  )
  .add('[data-demo="uploader"]', () =>
    import(/* webpackChunkName: "demo-uploader" */ './DemoFileUploader.js')
  )
  .add('[data-demo="selectloader"]', () =>
    import(/* webpackChunkName: "demo-selectloader" */ './DemoSelectLoader.js')
  );

app.run();