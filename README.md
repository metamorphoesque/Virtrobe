# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

Final Directory Structure
virtrobe/
├── public/
│   ├── favicon.ico
│   ├── logo.png
│   ├── index.html
│   └── models/
│       ├── female_mannequin.glb
│       ├── male_mannequin.glb
│       ├── DisplayStand.glb
│       └── garments/                      # Garment template library
│           ├── shirt.glb
│           ├── tshirt.glb
│           ├── dress.glb
│           ├── pants.glb
│           ├── skirt.glb
│           └── shorts.glb
│
├── src/
│   ├── components/
│   │   ├── 3d/                            # Three.js 3D Components
│   │   │   ├── MorphableMannequin.jsx     # Gender-based morphable mannequin
│   │   │   ├── HybridGarment.jsx          # AI-generated + template hybrid garment
│   │   │   ├── ClothSimulation.jsx        # CANNON.js cloth physics (optional)
│   │   │   ├── GarmentOverlay.jsx         # Legacy component
│   │   │   └── Scene.jsx                  # Main 3D scene wrapper
│   │   │
│   │   ├── pages/                         # Main application pages
│   │   │   ├── WelcomePage.jsx            # Landing page
│   │   │   ├── HomePage.jsx               # Dashboard
│   │   │   ├── SearchPage.jsx             # Garment search
│   │   │   ├── TryOnPage.jsx              # Virtual try-on (refactored)
│   │   │   └── MoodboardPage.jsx          # Saved looks
│   │   │
│   │   ├── TryOn/                         # TryOn feature components (NEW)
│   │   │   ├── GenderSelector.jsx         # Gender selection overlay
│   │   │   ├── ClothingSidebar.jsx        # Left sidebar with upload + types
│   │   │   ├── MeasurementPanel.jsx       # Right sidebar with measurements
│   │   │   └── SaveNotification.jsx       # Toast notification
│   │   │
│   │   ├── ui/                            # Reusable UI components
│   │   │   ├── Navigation.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── Card.jsx
│   │   │   └── Input.jsx
│   │   │
│   │   └── layout/                        # Layout components
│   │       ├── Header.jsx
│   │       └── Footer.jsx
│   │
│   ├── services/                          # Business logic & AI services
│   │   ├── hybridGarmentGenerator.js      # Main garment generation orchestrator
│   │   ├── depthEstimation.js             # MiDaS depth map generation
│   │   ├── garmentClassifier.js           # TensorFlow garment type classifier
│   │   ├── backgroundRemoval.js           # Image background removal
│   │   └── meshGeneration.js              # 3D mesh generation from 2D
│   │
│   ├── utils/                             # Utility functions
│   │   ├── bodyCalculations.js            # BMI, body type calculations
│   │   ├── garmentAnalysis.js             # Garment fit analysis
│   │   ├── fileHandlers.js                # File upload/download handlers
│   │   ├── imageProcessing.js             # Canvas/image manipulation
│   │   └── meshUtils.js                   # Mesh processing utilities
│   │
│   ├── hooks/                             # Custom React hooks
│   │   ├── useBodyMeasurements.js         # Body measurement state & calculations
│   │   ├── useGarmentUpload.js            # Garment image upload handler
│   │   ├── useUnitConversion.js           # Unit conversion (cm/ft, kg/lbs)
│   │   ├── useNotification.js             # Toast notification state
│   │   ├── useGarmentFit.js               # Garment fit recommendations
│   │   ├── useMoodboard.js                # Moodboard save/load logic
│   │   └── useClothPhysics.js             # CANNON.js physics hook (optional)
│   │
│   ├── styles/                            # Styling
│   │   ├── globals.css                    # Global styles
│   │   └── tailwind.css                   # Tailwind imports
│   │
│   ├── App.jsx                            # Main app component
│   └── index.js                           # React entry point
│
├── package.json                           # Dependencies
├── tailwind.config.js                     # Tailwind configuration
├── postcss.config.js                      # PostCSS configuration
├── vite.config.js                         # Vite build configuration
├── .gitignore                             # Git ignore rules
└── README.md                              # Project documentation