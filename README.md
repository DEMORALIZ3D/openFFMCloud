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

## Future Enhancements & Roadmap

To further evolve openFFM Cloud into a complete 3D production ecosystem, the following features are planned:

### 🛠️ Production & Slicing
- **Batch Production & Nesting:** Implement automated "Auto-Layout" to arrange multiple models on a single virtual print bed to optimize space and minimize print time.
- **Advanced Filament Library:** - Track physical spool inventory (grams remaining) based on completed print jobs.
    - Custom material profiles (density/cost) for more accurate price estimations.
- **API-First Automation:** Support for webhooks to trigger renders or slicing jobs from external services.

### 👥 Collaboration & Sharing
- **Real-Time Collaboration:** Multi-user sessions where participants can see synchronized camera movements and live OpenSCAD parameter changes.
- **Community Templates:** A public gallery for users to share their SCAD configurators and rendered assets.
- **Mobile AR Preview:** Integrate WebXR to allow users to visualize their 3D models in their physical space before printing.

### 📦 Asset Management
- **Automated Version Control:** A snapshot system to save and revert to previous versions of OpenSCAD code or mesh uploads.
- **Folders & Tagging:** Improved organization for large libraries of designs and renders.
- **Multi-Server Scaling:** Support for distributed workers to handle rendering queues across multiple machines.

### Other
- Multinational currency support
- Quoting - ability to send private links with quotes displayed allowing family and friends or small companies to send 3d model previews and cost before printing.
- Add ability to auto back up db and generations to bucket somewhere.
- Upload designs to Makerworld/creatlity cloud/thingiverse/cults if API intergration possible.

## 💡 About AHM Labs & Open Source
This project is part of an initiative by **AHM Labs** to release high-utility, applicationswith the assitance of AI to the open-source community. Our goal is to provide powerful tools that anyone can fork, modify, or deploy, while exploring the future of rapid application development. We use AI to help build our hand written concepts out faster. Giving way to rapid prototyping and allow us to gain skills for our clients.

If you find this tool useful, consider supporting our work through sponsorship or by contributing to the code!

## License
MIT