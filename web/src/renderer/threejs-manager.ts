// ThreeJS manager for handling 3D rendering and interactions

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class ThreeJSManager {
  // Core ThreeJS components
  private container: HTMLElement | null = null;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  
  // Game grid and interaction
  private gridSize: number = 40; // Size of each grid cell
  private originalWidth: number = 800;
  private originalHeight: number = 600;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private currentHoverPosition: { x: number, y: number } = { x: -1, y: -1 };
  private selectedTowerType: number = 0;
  private groundPlane: THREE.Mesh | null = null;
  
  // Tower preview objects
  private towerPreviewMesh: THREE.Mesh | null = null;
  private rangePreviewMesh: THREE.Mesh | null = null;
  private invalidPlacementMesh: THREE.Group | null = null;
  
  // Lighting
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  
  // Canvas for text rendering (we'll still use 2D canvas for UI text)
  private textCanvas: HTMLCanvasElement;
  private textContext: CanvasRenderingContext2D | null = null;
  
  // Object tracking for cleanup
  private sceneObjects: THREE.Object3D[] = [];
  
  constructor(containerId: string) {
    // Initialize ThreeJS core components
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000); // Black background
    
    // Create orthographic camera for isometric view
    const aspectRatio = this.originalWidth / this.originalHeight;
    const frustumSize = 600;
    this.camera = new THREE.OrthographicCamera(
      frustumSize * aspectRatio / -2,
      frustumSize * aspectRatio / 2,
      frustumSize / 2,
      frustumSize / -2,
      1,
      2000
    );
    
    // Set up isometric view
    this.camera.position.set(500, 500, 500);
    this.camera.lookAt(0, 0, 0);
    
    // Initialize renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Initialize raycaster for mouse interaction
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    // Initialize lighting
    // Ambient light for base illumination
    this.ambientLight = new THREE.AmbientLight(0x444444, 0.6);
    this.scene.add(this.ambientLight);
    
    // Main directional light (sun-like)
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.directionalLight.position.set(300, 400, 300);
    this.directionalLight.castShadow = true;
    
    // Configure shadow properties for better quality
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 100;
    this.directionalLight.shadow.camera.far = 1500;
    this.directionalLight.shadow.camera.left = -700;
    this.directionalLight.shadow.camera.right = 700;
    this.directionalLight.shadow.camera.top = 700;
    this.directionalLight.shadow.camera.bottom = -700;
    this.directionalLight.shadow.bias = -0.0005;
    
    this.scene.add(this.directionalLight);
    
    // Add a secondary fill light from the opposite direction
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.4);
    fillLight.position.set(-300, 200, -300);
    this.scene.add(fillLight);
    
    // Add a subtle blue rim light from below for dramatic effect
    const rimLight = new THREE.DirectionalLight(0x0044ff, 0.2);
    rimLight.position.set(0, -200, 0);
    this.scene.add(rimLight);
    
    // Initialize controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.25;
    this.controls.screenSpacePanning = false;
    this.controls.maxPolarAngle = Math.PI / 2.5; // Limit rotation
    this.controls.minPolarAngle = Math.PI / 4; // Limit rotation
    
    // Create a separate canvas for text rendering
    this.textCanvas = document.createElement('canvas');
    this.textCanvas.style.position = 'absolute';
    this.textCanvas.style.top = '0';
    this.textCanvas.style.left = '0';
    this.textCanvas.style.pointerEvents = 'none'; // Allow click-through
    this.textContext = this.textCanvas.getContext('2d');
  }
  
  /**
   * Initialize the ThreeJS renderer and set up event listeners
   */
  initialize(): { width: number, height: number } {
    // Get container element
    this.container = document.getElementById('canvas-container');
    if (!this.container) {
      throw new Error('Container element not found');
    }
    
    // Set up renderer
    this.renderer.setSize(this.originalWidth, this.originalHeight);
    this.container.appendChild(this.renderer.domElement);
    
    // Add text canvas to container
    this.textCanvas.width = this.originalWidth;
    this.textCanvas.height = this.originalHeight;
    this.container.appendChild(this.textCanvas);
    
    // Create ground plane with grid
    this.createGroundPlane();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Initial resize
    this.handleResize();
    
    return { width: this.originalWidth, height: this.originalHeight };
  }
  
  /**
   * Create the ground plane with grid for tower placement
   */
  private createGroundPlane(): void {
    // Create ground plane
    const groundGeometry = new THREE.PlaneGeometry(
      this.originalWidth, 
      this.originalHeight
    );
    
    // Create a grid texture programmatically
    const gridSize = this.gridSize;
    const gridCanvas = document.createElement('canvas');
    gridCanvas.width = gridSize;
    gridCanvas.height = gridSize;
    const ctx = gridCanvas.getContext('2d');
    
    if (ctx) {
      // Fill with dark color
      ctx.fillStyle = '#111111';
      ctx.fillRect(0, 0, gridSize, gridSize);
      
      // Draw grid lines
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(gridSize, 0);
      ctx.moveTo(0, 0);
      ctx.lineTo(0, gridSize);
      ctx.stroke();
    }
    
    const gridTexture = new THREE.CanvasTexture(gridCanvas);
    gridTexture.wrapS = THREE.RepeatWrapping;
    gridTexture.wrapT = THREE.RepeatWrapping;
    gridTexture.repeat.set(
      this.originalWidth / gridSize,
      this.originalHeight / gridSize
    );
    
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x222222,
      roughness: 0.8,
      metalness: 0.2,
      map: gridTexture
    });
    
    this.groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
    this.groundPlane.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    this.groundPlane.receiveShadow = true;
    this.scene.add(this.groundPlane);
    
    // Create grid helper for better visualization
    const gridHelper = new THREE.GridHelper(
      Math.max(this.originalWidth, this.originalHeight), 
      Math.max(this.originalWidth, this.originalHeight) / this.gridSize,
      0x444444,
      0x222222
    );
    gridHelper.position.y = 0.1; // Slightly above ground to avoid z-fighting
    this.scene.add(gridHelper);
    
    // Create tower preview meshes
    this.createTowerPreviewMeshes();
  }
  
  /**
   * Create meshes used for tower placement preview
   */
  private createTowerPreviewMeshes(): void {
    // Tower placement indicator (cube for preview)
    const size = 30;
    const previewGeometry = new THREE.BoxGeometry(size * 0.8, size, size * 0.8);
    const previewMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffee,
      transparent: true,
      opacity: 0.5
    });
    this.towerPreviewMesh = new THREE.Mesh(previewGeometry, previewMaterial);
    this.towerPreviewMesh.visible = false;
    this.scene.add(this.towerPreviewMesh);
    
    // Range indicator
    const rangeGeometry = new THREE.CircleGeometry(100, 64);
    const rangeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffee,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    });
    this.rangePreviewMesh = new THREE.Mesh(rangeGeometry, rangeMaterial);
    this.rangePreviewMesh.rotation.x = -Math.PI / 2; // Make it horizontal
    this.rangePreviewMesh.visible = false;
    this.scene.add(this.rangePreviewMesh);
    
    // Invalid placement indicator (X shape)
    this.invalidPlacementMesh = new THREE.Group();
    
    const lineGeometry1 = new THREE.BoxGeometry(30, 5, 5);
    const lineGeometry2 = new THREE.BoxGeometry(5, 30, 5);
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    
    const line1 = new THREE.Mesh(lineGeometry1, lineMaterial);
    line1.rotation.z = Math.PI / 4;
    
    const line2 = new THREE.Mesh(lineGeometry2, lineMaterial);
    line2.rotation.z = Math.PI / 4;
    
    this.invalidPlacementMesh.add(line1);
    this.invalidPlacementMesh.add(line2);
    this.invalidPlacementMesh.visible = false;
    this.scene.add(this.invalidPlacementMesh);
  }
  
  /**
   * Set up event listeners for mouse/touch interaction
   */
  private setupEventListeners(): void {
    if (!this.renderer.domElement) return;
    
    // Mouse events
    this.renderer.domElement.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.renderer.domElement.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.renderer.domElement.addEventListener('click', this.handleClick.bind(this));
    
    // Touch events
    this.renderer.domElement.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.renderer.domElement.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.renderer.domElement.addEventListener('touchend', this.handleTouchEnd.bind(this));
    
    // Resize event
    window.addEventListener('resize', this.handleResize.bind(this));
  }
  
  /**
   * Handle window resize
   */
  private handleResize(): void {
    if (!this.container) return;
    
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;
    
    // Update camera aspect ratio
    const aspectRatio = containerWidth / containerHeight;
    const frustumSize = 600;
    
    this.camera.left = frustumSize * aspectRatio / -2;
    this.camera.right = frustumSize * aspectRatio / 2;
    this.camera.top = frustumSize / 2;
    this.camera.bottom = frustumSize / -2;
    this.camera.updateProjectionMatrix();
    
    // Update renderer size
    this.renderer.setSize(containerWidth, containerHeight);
    
    // Update text canvas size
    this.textCanvas.width = containerWidth;
    this.textCanvas.height = containerHeight;
  }
  
  /**
   * Convert screen coordinates to world coordinates
   */
  private screenToWorld(screenX: number, screenY: number): { x: number, y: number, z: number } | null {
    if (!this.renderer.domElement || !this.groundPlane) return null;
    
    // Calculate normalized device coordinates
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((screenX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((screenY - rect.top) / rect.height) * 2 + 1;
    
    // Update the raycaster
    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    // Find intersections with the ground plane
    const intersects = this.raycaster.intersectObject(this.groundPlane);
    
    if (intersects.length > 0) {
      const point = intersects[0].point;
      
      // Snap to grid
      const snappedX = Math.floor(point.x / this.gridSize) * this.gridSize + this.gridSize / 2;
      const snappedZ = Math.floor(point.z / this.gridSize) * this.gridSize + this.gridSize / 2;
      
      return { x: snappedX, y: 0, z: snappedZ };
    }
    
    return null;
  }
  
  /**
   * Convert 3D world coordinates to 2D game coordinates
   */
  private worldToGameCoords(worldX: number, worldY: number, worldZ: number): { x: number, y: number } {
    // This conversion depends on how your game coordinates are set up
    // For this example, we'll assume the game uses a top-down 2D coordinate system
    // where the origin is at the top-left corner of the ground plane
    
    // Adjust based on the ground plane position and size
    const gameX = worldX + this.originalWidth / 2;
    const gameY = worldZ + this.originalHeight / 2;
    
    return { x: gameX, y: gameY };
  }
  
  /**
   * Convert 2D game coordinates to 3D world coordinates
   */
  private gameToWorldCoords(gameX: number, gameY: number): { x: number, y: number, z: number } {
    // Convert from game coordinates to world coordinates
    const worldX = gameX - this.originalWidth / 2;
    const worldZ = gameY - this.originalHeight / 2;
    
    return { x: worldX, y: 0, z: worldZ };
  }
  
  /**
   * Handle mouse move for tower placement preview
   */
  private handleMouseMove(event: MouseEvent): void {
    const worldPos = this.screenToWorld(event.clientX, event.clientY);
    
    if (worldPos) {
      const gamePos = this.worldToGameCoords(worldPos.x, worldPos.y, worldPos.z);
      this.currentHoverPosition = gamePos;
    }
  }
  
  /**
   * Handle mouse leave
   */
  private handleMouseLeave(): void {
    this.currentHoverPosition = { x: -1, y: -1 };
    
    // Hide preview meshes
    if (this.towerPreviewMesh) this.towerPreviewMesh.visible = false;
    if (this.rangePreviewMesh) this.rangePreviewMesh.visible = false;
    if (this.invalidPlacementMesh) this.invalidPlacementMesh.visible = false;
  }
  
  /**
   * Handle canvas click
   */
  private handleClick(event: MouseEvent): void {
    const worldPos = this.screenToWorld(event.clientX, event.clientY);
    
    if (worldPos) {
      const gamePos = this.worldToGameCoords(worldPos.x, worldPos.y, worldPos.z);
      
      // Delegate to the WASM module through the app
      const gameApp = (window as any).gameApp;
      if (gameApp && gameApp.wasmLoader) {
        gameApp.wasmLoader.handleClick(gamePos.x, gamePos.y);
      }
    }
  }
  
  /**
   * Handle touch start event
   */
  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();
    
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      const worldPos = this.screenToWorld(touch.clientX, touch.clientY);
      
      if (worldPos) {
        const gamePos = this.worldToGameCoords(worldPos.x, worldPos.y, worldPos.z);
        this.currentHoverPosition = gamePos;
      }
    }
  }
  
  /**
   * Handle touch move event
   */
  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();
    
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      const worldPos = this.screenToWorld(touch.clientX, touch.clientY);
      
      if (worldPos) {
        const gamePos = this.worldToGameCoords(worldPos.x, worldPos.y, worldPos.z);
        this.currentHoverPosition = gamePos;
      }
    }
  }
  
  /**
   * Handle touch end event
   */
  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    
    // Handle as a click at the current hover position
    const gameApp = (window as any).gameApp;
    if (gameApp && gameApp.wasmLoader && 
        this.currentHoverPosition.x >= 0 && this.currentHoverPosition.y >= 0) {
      gameApp.wasmLoader.handleClick(this.currentHoverPosition.x, this.currentHoverPosition.y);
    }
    
    // Reset hover position
    this.currentHoverPosition = { x: -1, y: -1 };
  }
  
  /**
   * Clear the scene (equivalent to canvas clear)
   */
  clear(): void {
    // Remove all tracked objects from the scene
    for (const obj of this.sceneObjects) {
      this.scene.remove(obj);
      
      // Dispose of geometries and materials to prevent memory leaks
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(material => material.dispose());
          } else {
            obj.material.dispose();
          }
        }
      }
    }
    
    // Clear the array
    this.sceneObjects = [];
    
    // Clear the text canvas
    if (this.textContext) {
      this.textContext.clearRect(0, 0, this.textCanvas.width, this.textCanvas.height);
    }
  }
  
  /**
   * Render the scene
   */
  render(): void {
    // Update controls
    this.controls.update();
    
    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }
  
  /**
   * Draw a rectangle (creates a cube in 3D)
   * Used for towers - simple colored cubes
   */
  drawRect(x: number, y: number, width: number, height: number, r: number, g: number, b: number): void {
    // Convert 2D game coordinates to 3D world coordinates
    const worldPos = this.gameToWorldCoords(x + width/2, y + height/2);
    
    // Create a box geometry - make it a cube
    const size = Math.max(width, height);
    const geometry = new THREE.BoxGeometry(size * 0.8, size, size * 0.8); // Slightly narrower for better aesthetics
    
    // Create a glowing material for the tower
    const material = new THREE.MeshStandardMaterial({ 
      color: new THREE.Color(r/255, g/255, b/255),
      emissive: new THREE.Color(r/255 * 0.3, g/255 * 0.3, b/255 * 0.3), // Stronger glow
      metalness: 0.7,
      roughness: 0.2
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(worldPos.x, size/2, worldPos.z); // Position at half height
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Add to scene and track
    this.scene.add(mesh);
    this.sceneObjects.push(mesh);
  }
  
  /**
   * Draw a circle (creates a sphere in 3D)
   * Used for enemies - simple colored spheres
   */
  drawCircle(x: number, y: number, radius: number, r: number, g: number, b: number, fill: boolean): void {
    // More robust health bar detection:
    // 1. Health bars are typically small circles
    // 2. Health bars are usually drawn unfilled (wireframe)
    // 3. Health bars are usually positioned slightly above enemies
    // 4. Health bars often have specific colors (green/red)
    
    // Skip drawing health bars and other UI elements
    if ((!fill && radius < 15) || // Unfilled small circles (health bars)
        (y < 20 && radius < 10) || // Small elements at the top of the screen (UI)
        (radius < 5)) { // Very small elements (probably UI or decorative)
      return;
    }
    
    // Convert 2D game coordinates to 3D world coordinates
    const worldPos = this.gameToWorldCoords(x, y);
    
    // Create a sphere for 3D representation of a circle
    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    
    // Create a more vibrant material for enemies
    const material = new THREE.MeshStandardMaterial({ 
      color: new THREE.Color(r/255, g/255, b/255),
      emissive: new THREE.Color(r/255 * 0.4, g/255 * 0.4, b/255 * 0.4), // Stronger glow
      wireframe: !fill,
      metalness: 0.5,
      roughness: 0.3
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // Position slightly above ground for better visibility
    const hovering = 2; // Small hover effect
    mesh.position.set(worldPos.x, radius + hovering, worldPos.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Add to scene and track
    this.scene.add(mesh);
    this.sceneObjects.push(mesh);
  }
  
  /**
   * Draw a line (creates a line in 3D)
   */
  drawLine(x1: number, y1: number, x2: number, y2: number, thickness: number, r: number, g: number, b: number): void {
    // Convert 2D game coordinates to 3D world coordinates
    const worldPos1 = this.gameToWorldCoords(x1, y1);
    const worldPos2 = this.gameToWorldCoords(x2, y2);
    
    // Create line geometry
    const points = [
      new THREE.Vector3(worldPos1.x, 5, worldPos1.z), // Slightly above ground
      new THREE.Vector3(worldPos2.x, 5, worldPos2.z)
    ];
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ 
      color: new THREE.Color(r/255, g/255, b/255),
      linewidth: thickness // Note: linewidth may not work in WebGL
    });
    
    const line = new THREE.Line(geometry, material);
    
    // Add to scene and track
    this.scene.add(line);
    this.sceneObjects.push(line);
  }
  
  /**
   * Draw a triangle (creates a triangle in 3D)
   */
  drawTriangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, r: number, g: number, b: number, fill: boolean): void {
    // Convert 2D game coordinates to 3D world coordinates
    const worldPos1 = this.gameToWorldCoords(x1, y1);
    const worldPos2 = this.gameToWorldCoords(x2, y2);
    const worldPos3 = this.gameToWorldCoords(x3, y3);
    
    // Create triangle geometry
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      worldPos1.x, 5, worldPos1.z, // Slightly above ground
      worldPos2.x, 5, worldPos2.z,
      worldPos3.x, 5, worldPos3.z
    ]);
    
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    
    const material = fill 
      ? new THREE.MeshBasicMaterial({ 
          color: new THREE.Color(r/255, g/255, b/255),
          side: THREE.DoubleSide
        })
      : new THREE.LineBasicMaterial({ 
          color: new THREE.Color(r/255, g/255, b/255) 
        });
    
    const mesh = fill 
      ? new THREE.Mesh(geometry, material)
      : new THREE.Line(geometry, material);
    
    // Add to scene and track
    this.scene.add(mesh);
    this.sceneObjects.push(mesh);
  }
  
  /**
   * Draw text (using the 2D canvas overlay)
   */
  drawText(x: number, y: number, text: string, size: number, r: number, g: number, b: number): void {
    if (!this.textContext) return;
    
    // Convert 2D game coordinates to 3D world coordinates
    const worldPos = this.gameToWorldCoords(x, y);
    
    // Create a vector at the position, but elevated above the object
    const vector = new THREE.Vector3(worldPos.x, 30, worldPos.z);
    
    // Project 3D position to 2D screen position
    vector.project(this.camera);
    
    // Convert to screen coordinates
    const screenX = (vector.x * 0.5 + 0.5) * this.textCanvas.width;
    const screenY = (-vector.y * 0.5 + 0.5) * this.textCanvas.height;
    
    // Draw text on the 2D canvas with a slight shadow for better visibility
    this.textContext.font = `${size}px Arial, sans-serif`;
    this.textContext.textAlign = 'center';
    
    // Add shadow for better visibility
    this.textContext.shadowColor = 'rgba(0, 0, 0, 0.7)';
    this.textContext.shadowBlur = 4;
    this.textContext.shadowOffsetX = 2;
    this.textContext.shadowOffsetY = 2;
    
    this.textContext.fillStyle = `rgb(${r}, ${g}, ${b})`;
    this.textContext.fillText(text, screenX, screenY);
    
    // Reset shadow
    this.textContext.shadowColor = 'transparent';
    this.textContext.shadowBlur = 0;
    this.textContext.shadowOffsetX = 0;
    this.textContext.shadowOffsetY = 0;
  }
  
  /**
   * Draw tower placement preview
   */
  drawTowerPreview(x: number, y: number, canPlace: boolean, range: number): void {
    if (x < 0 || y < 0) {
      // Hide preview meshes
      if (this.towerPreviewMesh) this.towerPreviewMesh.visible = false;
      if (this.rangePreviewMesh) this.rangePreviewMesh.visible = false;
      if (this.invalidPlacementMesh) this.invalidPlacementMesh.visible = false;
      return;
    }
    
    // Convert 2D game coordinates to 3D world coordinates
    const worldPos = this.gameToWorldCoords(x, y);
    
    // Update tower preview position
    if (this.towerPreviewMesh) {
      const size = 30; // Match the size used in createTowerPreviewMeshes
      this.towerPreviewMesh.position.set(worldPos.x, size/2, worldPos.z); // Position at half height
      this.towerPreviewMesh.visible = true;
      
      // Update material color based on placement validity
      (this.towerPreviewMesh.material as THREE.MeshBasicMaterial).color.set(
        canPlace ? 0x00ffee : 0xff0000
      );
    }
    
    // Update range preview
    if (this.rangePreviewMesh && canPlace && range > 0) {
      this.rangePreviewMesh.position.set(worldPos.x, 0.5, worldPos.z);
      this.rangePreviewMesh.scale.set(range/100, range/100, range/100);
      this.rangePreviewMesh.visible = true;
    } else if (this.rangePreviewMesh) {
      this.rangePreviewMesh.visible = false;
    }
    
    // Update invalid placement indicator
    if (this.invalidPlacementMesh) {
      this.invalidPlacementMesh.position.set(worldPos.x, 10, worldPos.z);
      this.invalidPlacementMesh.visible = !canPlace;
    }
  }
  
  /**
   * Set the currently selected tower type
   */
  setSelectedTowerType(type: number): void {
    this.selectedTowerType = type;
  }
  
  /**
   * Get the current hover position
   */
  getHoverPosition(): { x: number, y: number } {
    return this.currentHoverPosition;
  }
  
  /**
   * Get the scene
   */
  getScene(): THREE.Scene {
    return this.scene;
  }
  
  /**
   * Get the camera
   */
  getCamera(): THREE.OrthographicCamera {
    return this.camera;
  }
  
  /**
   * Get the renderer
   */
  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }
  
  /**
   * Get the canvas dimensions
   */
  getDimensions(): { width: number, height: number } {
    return { 
      width: this.originalWidth, 
      height: this.originalHeight 
    };
  }
}
