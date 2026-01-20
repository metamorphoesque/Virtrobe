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
│
├── 📂 public/                              # Static assets served by Vite
│   ├── favicon.ico                         # App favicon
│   ├── logo.png                            # App logo
│   ├── index.html                          # HTML entry point
│   └── 📂 models/                          # 3D model library
│       ├── female_mannequin.glb            # Female body template
│       ├── male_mannequin.glb              # Male body template
│       ├── DisplayStand.glb                # Virtual display stand
│       └── 📂 garments/                    # Garment template library
│          
│
├──  src/                                 # Frontend source code (React + Three.js)
│   │
│   ├──  components/                      # React components
│   │   │
│   │   ├──  3d/                          # Three.js 3D rendering components
│   │   │   ├── MorphableMannequin.jsx      # Gender-morphable mannequin with measurements
│   │   │   ├── HybridGarment.jsx           # AI-generated + template hybrid garment
│   │   │   ├── ClothSimulation.jsx         # CANNON.js cloth physics (optional)
│   │   │   ├── GarmentOverlay.jsx          # Legacy 2D garment overlay component
│   │   │   └── Scene.jsx                   # Main 3D scene wrapper with lights/camera
│   │   │
│   │   ├──  pages/                       # Application page components
│   │   │   ├── WelcomePage.jsx             # Landing page
│   │   │   ├── HomePage.jsx                # Dashboard/main page
│   │   │   ├── SearchPage.jsx              # Garment search interface
│   │   │   ├── TryOnPage.jsx               # Virtual try-on interface (main feature)
│   │   │   └── MoodboardPage.jsx           # Saved looks/outfit collection
│   │   │
│   │   ├──   TryOn/                       # Try-on feature sub-components
│   │   │   ├── GenderSelector.jsx          # Gender selection overlay/modal
│   │   │   ├── ClothingSidebar.jsx         # Left sidebar: upload + garment types
│   │   │   ├── MeasurementPanel.jsx        # Right sidebar: body measurements input
│   │   │   └── SaveNotification.jsx        # Toast notification for save actions
│   │   │
│   │   ├──  ui/                          # Reusable UI components
│   │   │   ├── Navigation.jsx              # Navigation bar
│   │   │   ├── Button.jsx                  # Custom button component
│   │   │   ├── Card.jsx                    # Card container component
│   │   │   └── Input.jsx                   # Custom input component
│   │   │
│   │   └──  layout/                      # Layout wrapper components
│   │       ├── Header.jsx                  # App header
│   │       └── Footer.jsx                  # App footer
│   │
│   ├──  services/                        # Business logic & AI services
│   │   ├── productionGarmentService.js     #  Main garment generation (→ Backend API)
│   │   ├── depthEstimation.js              # MiDaS depth map generation (client-side)
│   │   ├── garmentClassifier.js            # TensorFlow garment type classifier
│   │   ├── backgroundRemoval.js            # Image background removal
│   │   ├── meshGeneration.js               # 3D mesh generation from 2D depth map
│   │   ├── templateMatcher.js              # Match uploaded garment to template
│   │   └── colorExtraction.js              # Extract dominant colors from image
│   │
│   ├──  utils/                           # Utility functions
│   │   ├── bodyCalculations.js             # BMI, body type calculations
│   │   ├── garmentAnalysis.js              # Garment fit analysis algorithms
│   │   ├── fileHandlers.js                 # File upload/download handlers
│   │   ├── imageProcessing.js              # Canvas/image manipulation utilities
│   │   └── meshUtils.js                    # 3D mesh processing utilities
│   │
│   ├──  hooks/                           # Custom React hooks
│   │   ├── useBodyMeasurements.js          # Body measurement state & calculations
│   │   ├── useGarmentUpload.js             # Garment image upload handler
│   │   ├── useUnitConversion.js            # Unit conversion (cm/ft, kg/lbs)
│   │   ├── useNotification.js              # Toast notification state management
│   │   ├── useGarmentFit.js                # Garment fit recommendations
│   │   ├── useMoodboard.js                 # Moodboard save/load logic
│   │   └── useClothPhysics.js              # CANNON.js physics hook (optional)
│   │
│   ├──  styles/                          # Styling files
│   │   ├── globals.css                     # Global CSS styles
│   │   └── tailwind.css                    # Tailwind CSS imports
│   │
│   ├── App.jsx                             # Main React app component
│   └── index.js                            # React entry point
│
├──  server/                              #  Backend API (Express.js)
│   │
│   ├──  config/                          # Server configuration
│   │   └── index.js                        # Environment variables & config
│   │
│   ├──  controllers/                     # Request handlers
│   │   └── garment.controller.js           # Garment generation controller
│   │
│   ├──  middleware/                      # Express middleware
│   │   ├── errorHandler.js                 # Global error handling
│   │   ├── validator.js                    # Request validation
│   │   └── upload.js                       # Multer file upload configuration
│   │
│   ├──  routes/                          # API routes
│   │   └── garment.routes.js               # POST /api/garment/generate
│   │
│   ├──  services/                        # Backend services
│   │   ├── modalClient.js                  # Modal.com API client wrapper
│   │   └── fileStorage.js                  # Temporary file handling (optional)
│   │
│   ├──  utils/                           # Backend utilities
│   │   ├── logger.js                       # Winston/Pino logger (optional)
│   │   └── apiResponse.js                  # Standardized API responses
│   │
│   ├── server.js                           # Express app entry point
│   └── package.json                        # Backend dependencies
│
├──  shared/                              # 🆕Shared code (client + server)
│   └── constants.js                        # Shared constants & types
│
├──  package.json                         # Root workspace configuration
├──  .env                                 #  Environment variables (DO NOT COMMIT)
├──  .env.local                           # Frontend environment variables (optional)
├──  .gitignore                           # Git ignore rules
├──  tailwind.config.js                   # Tailwind CSS configuration
├──  postcss.config.js                    # PostCSS configuration
├──  vite.config.js                       # Vite build configuration
├──  eslint.config.js                     # ESLint configuration
└──  README.md                            # Project documentation
---------------------------------------------------------------------------------------------
Frontend Dependencies (src/)
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