import { Parallelogram } from '../../src/index.js';
import { registerComponents } from './components.js';
import { MockUpload, installMockApi } from './mocks.js';

installMockApi();

/* SelectLoader fetches its fragments through the router */
const app = Parallelogram.create({ router: {} });
registerComponents(app);

customElements.whenDefined('p-uploader').then(() => {
  document.querySelectorAll('p-uploader').forEach(uploader => uploader.setXHR?.(MockUpload));
});

app.run();
