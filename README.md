# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
```

---

## Step 2: Updated Architecture (2.5D System)

Here's your CORRECT folder structure reflecting the 2.5D warping system:
```
virtrobe/
│
├── 📂 public/
│   ├── index.html
│   └── 📂 models/
│       ├── female_mannequin.glb
│       ├── male_mannequin.glb
│       └── DisplayStand.glb
│
├── 📂 src/
│   │
│   ├── 📂 components/
│   │   │
│   │   ├── 📂 3d/
│   │   │   ├── MorphableMannequin.jsx      # ✅ Morphable mannequin with cloning
│   │   │   ├── Garment2DOverlay.jsx        # ✅ 2.5D garment overlay component
│   │   │   └── Scene.jsx                   # ✅ Main scene with camera lock
│   │   │
│   │   ├── 📂 pages/
│   │   │   ├── WelcomePage.jsx
│   │   │   ├── HomePage.jsx
│   │   │   ├── TryOnPage.jsx               # ✅ Updated with debug overlay
│   │   │   └── MoodboardPage.jsx
│   │   │
│   │   ├── 📂 TryOn/
│   │   │   ├── GenderSelector.jsx          # ✅ With cleanup (or simplified version)
│   │   │   ├── ClothingSidebar.jsx
│   │   │   ├── MeasurementPanel.jsx
│   │   │   └── SaveNotification.jsx
│   │   │
│   │   ├── 📂 debug/
│   │   │   └── debugOverlay.jsx            # ✅ NEW - Debug overlay
│   │   │
│   │   ├── 📂 ui/
│   │   │   ├── Navigation.jsx
│   │   │   ├── Button.jsx
│   │   │   └── Card.jsx
│   │   │
│   │   └── 📂 layout/
│   │       ├── Header.jsx
│   │       └── Footer.jsx
│   │
│   ├── 📂 services/
│   │   │
│   │   ├── 📂 garment2D/                   # ✅ NEW - 2.5D Processing
│   │   │   ├── garment2DProcessor.js       # Main 2D processor
│   │   │   ├── silhouetteExtractor.js      # Background removal
│   │   │   ├── perspectiveWarper.js        # WebGL warping
│   │   │   └── depthShader.js              # Normal map generation
│   │   │
│   │   └── productionGarmentService.js     # (Optional backend service)
│   │
│   ├── 📂 shaders/                         # ✅ NEW - WebGL Shaders
│   │   └── garmentShaders.js               # Vertex & fragment shaders
│   │
│   ├── 📂 hooks/
│   │   ├── useBodyMeasurements.js
│   │   ├── useGarmentUpload.js             # ✅ Updated for 2D pipeline
│   │   ├── useUnitConversion.js
│   │   └── useNotification.js
│   │
│   ├── 📂 styles/
│   │   ├── globals.css
│   │   └── tailwind.css
│   │
│   ├── App.jsx
│   └── main.jsx
│
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md 

React Ecosystem: react, react-dom, react-router-dom
3D Rendering: three, @react-three/fiber, @react-three/drei
AI/ML: @tensorflow/tfjs, @tensorflow-models/body-pix
Physics: cannon-es
Image Processing: @imgly/background-removal, delaunator
State Management: zustand
UI: lucide-react, leva, tailwindcss

Backend Dependencies (server/)
Core: express, dotenv
Middleware: cors, helmet, morgan, multer
HTTP Client: axios, form-data
Dev: nodemon
----------------------------------------------------------------------------------------------