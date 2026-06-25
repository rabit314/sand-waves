# Sand Waves

**🕹️ [Play the game live here!](https://sandwaves.netlify.app/)**

A fast-paced, wave-based 3D tank combat game built entirely in a single HTML file using [Three.js](https://threejs.org/). Survive against endless waves of enemy tanks in a sprawling desert environment.

## Features

- **Pure WebGL Performance:** Runs beautifully in any modern browser without installation.
- **Wave-based Survival:** Survive increasingly difficult sectors of hostile tanks.
- **Advanced Rendering:** Dynamic lighting, soft shadows, and procedural atmospheric sky gradients.
- **Optimized for Low-Spec & Mobile:** 
  - Massive geometry merging to minimize draw calls.
  - Instanced mesh rendering for hundreds of simultaneous explosion and smoke particles.
  - Precomputed terrain heights for high-performance physics.
  - Dynamic detection for mobile devices to adjust pixel ratios and disable heavy shadows automatically.
- **Object Pooling:** Efficient memory management utilizing object pooling for projectiles, enemies, and particle systems to ensure zero garbage-collection stuttering during gameplay.

## Controls

| Action | Input |
| :--- | :--- |
| **Move Forward / Backward** | `W` / `S` |
| **Turn Left / Right** | `A` / `D` |
| **Engine Boost** | `SHIFT` |
| **Aim Turret** | `Mouse Movement` |
| **Fire Cannon** | `Left Click` |

## How to Play

No build steps, no servers, no dependencies. 

Simply open `index.html` in your favorite modern web browser (Chrome, Firefox, Edge, Safari) and click **Deploy Tank**.

## Technical Details

This project pushes the limits of what a single `index.html` file can do. Recent optimizations include:
- Swapping `MeshStandardMaterial` for `MeshLambertMaterial` to massively reduce fragment shader complexity on low-end GPUs.
- Compacting arrays using read/write indices instead of standard `splice()` for real-time particle updates.
- Implementing an elaborate `deadEnemies` pool so that complex multi-material `Tank` objects are continuously recycled rather than instantiated and destroyed.
