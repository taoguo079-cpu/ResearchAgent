# Research companion

The active companion has exactly two native 60fps vector actions: **Fintech Robot Relaxing** while stationary and **Fintech Robot Flying** while dragged or thrown. Both actions share the verified local Lottie files and transparent posters in `../research-robot/manifest.json`; `web/features/pet/pet-manifest.ts` defines the two-state mapping.

The old GIF sources and GIF previews were removed. Old atlas metadata, images and development tools remain as inactive historical files; the application and package build commands no longer load them. A failed vector load or reduced-motion/static preference uses the corresponding transparent poster.

Dragging, throwing, screen-edge collisions and settling use Rapier and the shared homepage rigid-body helpers from `web/features/welcome/rigid-toy-physics.ts`. The last stationary position is saved. The pet does not follow research task statuses or phases.

`npm --prefix web run pet:build` rebuilds the canonical native vector assets. `npm --prefix web run pet:validate` checks their source frame rates, complete cycles, hashes and transparent posters.
