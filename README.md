# Parallelogram-JS

A lightweight, enhancement-first JavaScript framework for progressive web applications.

## Features

- 🎯 Progressive Enhancement - HTML first, JavaScript enhances
- 📊 Data-Driven - `data-[component]-[param]` attribute pattern  
- 🎨 BEM CSS - `.block__element--modifier` class pattern
- ♿ Accessible - ARIA attributes, keyboard navigation
- 🔧 Modular - Use only what you need

## Quick Start

```bash
npm install parallelogram-js
```

```javascript
import { Lazyimage, Modal } from 'parallelogram-js';
import 'parallelogram-js/styles';

Lazyimage.enhanceAll();
Modal.enhanceAll();
```

## Development

```bash
npm install
npm run build
npm run demo
```

## License

MIT