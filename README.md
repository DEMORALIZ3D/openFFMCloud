# openFFM Cloud
### High-Performance 3D Design & Rendering Platform
**by AHM Labs**

openFFM Cloud is a comprehensive, self-hosted platform for managing, customizing, and rendering 3D models. Originally designed as a cloud-based OpenSCAD rendering server, it has evolved into a full-featured 3D asset management system supporting SCAD, STL, OBJ, and 3MF formats with integrated slicing and cost calculation capabilities.


## Features

- **Multi-Format 3D Viewer:** Supports `.scad`, `.stl`, `.obj`, and `.3mf` files with high-quality PBR shading and lighting controls.
- **Headless Rendering:** Uses OpenSCAD for server-side rendering of designs.
- **Slicing & Cost Calculation:** Integrated PrusaSlicer for G-code generation and filament/electricity cost estimation.
- **Public Sharing:** Generate unique tokens to share read-only previews and configurators with non-logged-in users.
- **Queue Management:** Powered by Redis and BullMQ for reliable background job processing and rate limiting.
- **Customizer:** Real-time variable adjustment for OpenSCAD files.
- **Multi-Filament Support:** Preserves color data for `.obj` and `.3mf` uploads.

## Tech Stack

- **Backend:** Node.js, Express, SQLite (better-sqlite3), BullMQ, Redis.
- **Frontend:** React, Vite, Three.js (React Three Fiber), Tailwind CSS, Lucide React.
- **External Tools:** OpenSCAD, PrusaSlicer (AppImage).

## Getting Started

### Prerequisites

- Node.js (v18+)
- Redis
- OpenSCAD (`openscad` command in PATH)
- PrusaSlicer (included as AppImage in `tools/`)

### Installation

1. Install dependencies:
   ```bash
   npm install
   cd client && npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Start the client:
   ```bash
   cd client && npm run dev
   ```

## Infrastructure & Scaling

### Queue Integration (BullMQ + Redis)
The system uses BullMQ to manage rendering and slicing jobs. This ensures that the server remains responsive even under heavy load. 
- **Concurrency:** Limited to 2 simultaneous OpenSCAD processes by default to prevent CPU exhaustion.
- **Rate Limiting:** Jobs are limited to 5 per second globally to prevent API abuse.

### Public Sharing
Models can be shared via a unique public link. 
- **SCAD:** Public users can adjust variables and trigger a preview render.
- **Meshes:** Public users can view the 3D model but cannot trigger slicing or editing.

## License
MIT
