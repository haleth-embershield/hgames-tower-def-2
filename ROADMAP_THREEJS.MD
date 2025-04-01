***NOTE: THREEJS FOR RENDERING ONLY, NO GAME LOGIC OR GAME STATE***

# Migration Roadmap: 2D Canvas to ThreeJS Isometric View

This roadmap outlines the steps for transitioning our tower defense game from a 2D Canvas implementation to a 3D isometric view using ThreeJS, while maintaining the Zig WebAssembly backend for game logic and physics.

## 1. Project Setup and ThreeJS Integration (Week 1)

### 1.1 Dependencies
- Add ThreeJS and related dependencies:
  ```bash
  bun add three
  bun add @types/three --dev
  ```
- Optional extras:
  ```bash
  bun add @react-three/drei @react-three/fiber # If we want to use React for UI components
  bun add stats.js # For performance monitoring
  ```

### 1.2 Project Structure Updates
- Create a new directory structure for 3D assets:
  ```
  web/src/renderer/       # ThreeJS implementation
  web/src/models/         # 3D models and assets
  web/src/shaders/        # Custom shaders if needed
  ```

### 1.3 Basic ThreeJS Setup
- Implement a basic ThreeJS renderer that replaces the Canvas implementation
- Create initial camera setup for isometric view
- Set up basic lighting system
- Implement a ground plane with grid for tower placement

## 2. Core Rendering Architecture (Week 2)

### 2.1 ThreeJS Manager
- Create a `ThreeManager` class that will replace `CanvasManager`
- Implement core rendering loop with ThreeJS
- Set up proper resizing and viewport management
- Create helpers for coordinate conversion between game logic and 3D space

### 2.2 Isometric Camera Setup
- Implement proper isometric camera positioning
- Add camera controls for panning, zooming (orbit controls)
- Create boundary limits for camera movement
- Optimize camera for the tower defense gameplay

### 2.3 Lighting System
- Implement a comprehensive lighting setup:
  - Ambient light for base illumination
  - Directional light for shadows and depth
  - Point lights for effects (tower firing, explosions)
- Set up shadow mapping for depth perception

## 3. Asset Creation and Integration (Week 3)

### 3.1 Core Game Elements
- Design and model basic 3D assets for game elements:
  - Game board/terrain with grid cells
  - Simple tower bases (to be extended with geometry)
  - Enemy models (can start with simple geometric shapes)
  - Projectiles and effects

### 3.2 Asset Pipeline
- Establish an asset pipeline for importing and optimizing 3D models
- Set up a texture atlas for efficient rendering
- Create material library for consistent visual style
- Implement level of detail (LOD) system for performance optimization

### 3.3 Animation System
- Create animation framework for game entities
- Implement transition animations (building towers, tower attacks)
- Add particle systems for visual effects (explosions, hits)

## 4. WASM Integration with ThreeJS (Week 4)

### 4.1 Interface Updates
- Update the WASM interface to support 3D positioning and operations
- Modify `wasm.d.ts` type definitions to include 3D coordinates and rotation
- Create translation layer between Zig 2D logic and ThreeJS 3D rendering

### 4.2 Game Logic Adaptation
- Keep core game logic in Zig (unchanged where possible)
- Implement conversion utilities for translating between 2D game logic and 3D visualization
- Create a state synchronization system between WASM and ThreeJS

### 4.3 Event Handling
- Implement raycasting for 3D object selection
- Update mouse/touch event handling for 3D space interaction
- Adapt UI element positioning to work with 3D perspective

## 5. Gameplay Enhancements for 3D (Week 5)

### 5.1 Tower Visualization
- Create unique 3D models for each tower type:
  - Square tower: Geometric cube with laser beam
  - Circle tower: Cylindrical tower with radial attack
  - Triangle tower: Pyramid with directional attack
  - Pentagon tower: Complex structure with area effect

### 5.2 Enemy Pathing and Visualization
- Implement path visualization in 3D space
- Add height variation to paths for visual interest
- Create enemy movement animations (walking, flying, etc.)

### 5.3 Visual Effects
- Add particle effects for tower attacks
- Create impact visualization for hits
- Implement death/destruction animations for enemies
- Add visual feedback for game events (level completion, tower placement)

## 6. Performance Optimization (Week 6)

### 6.1 Rendering Optimization
- Implement object pooling for frequently created/destroyed objects
- Set up instancing for similar geometries
- Optimize materials and textures
- Add level-of-detail (LOD) based on camera distance

### 6.2 Memory Management
- Ensure proper disposal of ThreeJS objects
- Implement asset loading/unloading strategies
- Monitor and optimize memory usage in both JS and WASM

### 6.3 Testing and Profiling
- Set up performance benchmarks
- Test on various devices and optimize accordingly
- Implement adaptive quality settings based on device capabilities

## 7. Polish and Refinement (Week 7)

### 7.1 Visual Polish
- Enhance materials with physically-based rendering (PBR)
- Add post-processing effects (bloom, ambient occlusion)
- Implement dynamic lighting effects tied to gameplay
- Create visual themes for different levels

### 7.2 Audio Integration
- Update audio system to work with 3D spatial audio
- Position sound effects in 3D space
- Implement audio falloff based on camera distance

### 7.3 Accessibility and UX
- Ensure the game is still intuitive with 3D visualization
- Add camera controls tutorial
- Implement visual cues for gameplay elements
- Create UI elements that work well with the 3D perspective

## 8. Final Integration and Release (Week 8)

### 8.1 Final Testing
- Cross-browser compatibility testing
- Performance testing on various devices
- Gameplay testing with the new visualization

### 8.2 Documentation
- Update code documentation to reflect the new architecture
- Create developer guides for extending the 3D functionality
- Document the Zig-ThreeJS interface for future development

### 8.3 Deployment
- Update build pipeline for optimized 3D assets
- Implement asset loading strategies (progressive, chunked)
- Release the updated template

## Implementation Notes

### Core Architectural Changes

1. **Separation of Concerns**:
   - Zig (WASM): Game state, physics, core logic
   - ThreeJS: Visualization, rendering, effects
   - TypeScript: Bridging layer, UI, input handling

2. **Coordinate Systems**:
   - Game Logic: Continue using 2D grid coordinates internally
   - Rendering: Convert to 3D isometric space for visualization
   - Input: Convert 3D screen coordinates back to 2D game coordinates

3. **Performance Considerations**:
   - Use object pooling for frequently created/destroyed entities
   - Implement instancing for similar objects (e.g., same tower types)
   - Keep physics calculations in Zig/WASM for performance
   - Optimize ThreeJS rendering with appropriate techniques (frustum culling, LOD)

### Maintaining Template Simplicity

While adding 3D visualization, we'll keep the template approachable by:

1. Creating clear separation between game logic and visualization
2. Providing simple, extensible base models that can be replaced
3. Documenting the architecture thoroughly
4. Including examples of extending the system with custom elements
5. Maintaining the same build and deployment simplicity

This roadmap provides a structured approach to migrating from 2D Canvas to ThreeJS while keeping the core strength of the Zig + TypeScript + WebAssembly architecture intact. 