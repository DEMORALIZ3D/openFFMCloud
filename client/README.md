# OpenSCAD Cloud - Client

The frontend for the OpenSCAD Cloud Render Server.

## Key Components

- **Viewer3D:** A high-performance 3D viewer using React Three Fiber.
  - Supports STL, OBJ, and 3MF loaders.
  - Interactive lighting and measurement tools.
  - PBR material rendering with shadow-bias fixes.
- **Customizer:** Parses OpenSCAD variables and provides UI controls for dynamic model adjustment.
- **Dashboard:** Unified interface for file management, code editing, and print cost calculation.
- **PublicViewer:** Lite interface for shared links.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
The build artifacts will be placed in `dist/` and served by the backend.