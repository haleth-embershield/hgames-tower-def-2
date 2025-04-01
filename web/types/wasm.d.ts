// Type definitions for tower-def-geometry WASM module

// Interface for all exported functions from the WASM module
export interface WasmModule {
  // Game initialization
  init(width: number, height: number): void;
  resetGame(): void;
  
  // Game update and interaction
  update(deltaTime: number): void;
  handleClick(x: number, y: number): void;
  
  // Tower placement and selection
  selectTowerType(towerType: number): void;
  canPlaceTower(x: number, y: number): boolean;
  getTowerRange(): number;
  
  // Memory management functions (if needed)
  memory: WebAssembly.Memory;
  
  // Audio functions for embedded audio files
  getEnemyHitAudioPtr(): number;
  getEnemyHitAudioLen(): number;
  getLevelCompleteAudioPtr(): number;
  getLevelCompleteAudioLen(): number;
  getLevelFailAudioPtr(): number;
  getLevelFailAudioLen(): number;
  getTowerShootAudioPtr(): number;
  getTowerShootAudioLen(): number;
  getEnemyExplosionAudioPtr(): number;
  getEnemyExplosionAudioLen(): number;
  
  // Add additional exported functions as needed
} 