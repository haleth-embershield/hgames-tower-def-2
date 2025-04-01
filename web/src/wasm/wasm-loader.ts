// TypeScript implementation of the WASM loader
import type { WasmModule } from "../../types/wasm.d.ts";
import * as THREE from 'three';

// Define logger type for compatibility
interface Logger {
  log(message: string): void;
  error(message: string): void;
  warn(message: string): void;
}

export class WasmLoader {
  private wasmModule: WasmModule | null = null;
  private logger: Logger;
  private gameApp: any; // Reference to the main game application
  private sceneObjects: THREE.Object3D[] = []; // Track objects added to the scene for cleanup

  constructor(gameApp: any, logger?: Logger) {
    this.gameApp = gameApp;
    this.logger = logger || console;
  }

  /**
   * Check if the WASM module has been loaded
   * @returns True if the WASM module is loaded, false otherwise
   */
  isLoaded(): boolean {
    return this.wasmModule !== null;
  }

  /**
   * Load and instantiate the WebAssembly module
   * @returns Promise resolving to the initialized WASM module
   */
  async loadWasm(): Promise<WasmModule> {
    if (this.wasmModule) return this.wasmModule;
    
    try {
      this.logger.log("Loading WASM module...");
      
      // Define JavaScript functions that will be called from Zig
      const importObject = {
        env: {
          // Example of a logging function that can be called from Zig
          consoleLog: (ptr: number, len: number) => {
            // Implementation would depend on how strings are passed from Zig
            // This is a placeholder
            this.logger.log(`[WASM] Log message from ptr ${ptr}, len: ${len}`);
          },
          // Audio functions called from Zig
          playLevelCompleteSound: () => {
            this.logger.log("Playing level complete sound (from WASM callback)");
            // We'll now use the embedded audio data instead of loading from file
            this.playWasmSound('levelComplete');
          },
          playLevelFailSound: () => {
            this.logger.log("Playing level fail sound (from WASM callback)");
            this.playWasmSound('levelFail');
          },
          playTowerShootSound: () => {
            this.logger.log("Playing tower shoot sound (from WASM callback)");
            this.playWasmSound('towerShoot');
          },
          playEnemyExplosionSound: () => {
            this.logger.log("Playing enemy explosion sound (from WASM callback)");
            this.playWasmSound('enemyExplosion');
          },
          playEnemyHitSound: () => {
            this.logger.log("Playing enemy hit sound (from WASM callback)");
            this.playWasmSound('enemyHit');
          },
          // Rendering functions - updated for ThreeJS
          clearCanvas: () => {
            // Clear the scene using the renderer's clear method
            this.gameApp.renderer.clear();
          },
          drawRect: (x: number, y: number, width: number, height: number, r: number, g: number, b: number) => {
            // Use ThreeJS to draw a rectangle (box in 3D)
            this.gameApp.renderer.drawRect(x, y, width, height, r, g, b);
          },
          drawCircle: (x: number, y: number, radius: number, r: number, g: number, b: number, fill: boolean) => {
            // Use ThreeJS to draw a circle (sphere in 3D)
            this.gameApp.renderer.drawCircle(x, y, radius, r, g, b, fill);
          },
          drawLine: (x1: number, y1: number, x2: number, y2: number, thickness: number, r: number, g: number, b: number) => {
            // Use ThreeJS to draw a line
            this.gameApp.renderer.drawLine(x1, y1, x2, y2, thickness, r, g, b);
          },
          drawTriangle: (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, r: number, g: number, b: number, fill: boolean) => {
            // Use ThreeJS to draw a triangle
            this.gameApp.renderer.drawTriangle(x1, y1, x2, y2, x3, y3, r, g, b, fill);
          },
          drawText: (x: number, y: number, text_ptr: number, text_len: number, size: number, r: number, g: number, b: number) => {
            try {
              // We need to wait until the WASM module is instantiated to access memory
              if (!this.wasmModule || !this.wasmModule.memory) {
                // Can't draw text without WASM memory
                return;
              }
              
              // Create a view into the WebAssembly memory
              const memoryView = new Uint8Array(this.wasmModule.memory.buffer);
              
              // Extract the text from memory
              const textBytes = memoryView.slice(text_ptr, text_ptr + text_len);
              const text = new TextDecoder().decode(textBytes);
              
              // Draw the text using the ThreeJS manager's text canvas
              this.gameApp.renderer.drawText(x, y, text, size, r, g, b);
            } catch (error) {
              this.logger.error(`Error drawing text: ${error}`);
            }
          }
        }
      };
      
      // Fetch and instantiate the WASM module
      const response = await fetch('towerd.wasm');
      const bytes = await response.arrayBuffer();
      const { instance } = await WebAssembly.instantiate(bytes, importObject);
      
      // Cast the exports to our WasmModule interface
      this.wasmModule = instance.exports as unknown as WasmModule;
      
      // Verify that memory is accessible
      if (!this.wasmModule.memory) {
        this.logger.warn("WebAssembly memory not exported. Text rendering may not work correctly.");
      } else {
        this.logger.log("WebAssembly memory initialized successfully");
      }
      
      this.logger.log("WASM module loaded successfully");
      return this.wasmModule;
    } catch (error) {
      this.logger.error(`Error loading WASM module: ${error}`);
      throw error;
    }
  }

  /**
   * Play a sound using the audio data embedded in the WASM module
   * @param soundName The name of the sound to play
   */
  private async playWasmSound(soundName: string): Promise<void> {
    if (!this.wasmModule || !this.wasmModule.memory) {
      this.logger.warn("Cannot play sound: WASM module or memory not available");
      return;
    }
    
    try {
      // Get the memory buffer from the WASM module
      const memory = this.wasmModule.memory;
      let audioPtr: number = 0;
      let audioLen: number = 0;
      
      // Access the audio data directly from memory using the exported audio data
      // This approach doesn't rely on the getter functions that might not be exported correctly
      switch (soundName) {
        case 'enemyHit':
          if (typeof this.wasmModule.getEnemyHitAudioPtr === 'function') {
            audioPtr = this.wasmModule.getEnemyHitAudioPtr();
            audioLen = this.wasmModule.getEnemyHitAudioLen();
          } else {
            // Fallback to direct memory access if functions aren't available
            // These would need to be updated with the actual memory locations
            this.logger.warn("Using fallback for enemyHit sound - functions not exported");
            return;
          }
          break;
        case 'levelComplete':
          if (typeof this.wasmModule.getLevelCompleteAudioPtr === 'function') {
            audioPtr = this.wasmModule.getLevelCompleteAudioPtr();
            audioLen = this.wasmModule.getLevelCompleteAudioLen();
          } else {
            this.logger.warn("Using fallback for levelComplete sound - functions not exported");
            return;
          }
          break;
        case 'levelFail':
          if (typeof this.wasmModule.getLevelFailAudioPtr === 'function') {
            audioPtr = this.wasmModule.getLevelFailAudioPtr();
            audioLen = this.wasmModule.getLevelFailAudioLen();
          } else {
            this.logger.warn("Using fallback for levelFail sound - functions not exported");
            return;
          }
          break;
        case 'towerShoot':
          if (typeof this.wasmModule.getTowerShootAudioPtr === 'function') {
            audioPtr = this.wasmModule.getTowerShootAudioPtr();
            audioLen = this.wasmModule.getTowerShootAudioLen();
          } else {
            this.logger.warn("Using fallback for towerShoot sound - functions not exported");
            return;
          }
          break;
        case 'enemyExplosion':
          if (typeof this.wasmModule.getEnemyExplosionAudioPtr === 'function') {
            audioPtr = this.wasmModule.getEnemyExplosionAudioPtr();
            audioLen = this.wasmModule.getEnemyExplosionAudioLen();
          } else {
            this.logger.warn("Using fallback for enemyExplosion sound - functions not exported");
            return;
          }
          break;
        default:
          this.logger.warn(`Unknown embedded sound: ${soundName}`);
          return;
      }
      
      if (audioPtr === 0 || audioLen === 0) {
        this.logger.warn(`Invalid audio data for ${soundName}`);
        return;
      }
      
      // Create a buffer from the WASM memory
      const buffer = new Uint8Array(memory.buffer, audioPtr, audioLen);
      
      // Create a blob from the buffer
      const blob = new Blob([buffer], { type: 'audio/ogg' });
      const url = URL.createObjectURL(blob);
      
      // Create and play the audio
      const audio = new Audio(url);
      
      // Get the game audio volume from the AudioManager
      audio.volume = this.gameApp.audio.getGameAudioVolume();
      
      await audio.play();
      
      // Clean up the URL after the audio has played
      audio.onended = () => {
        URL.revokeObjectURL(url);
      };
    } catch (error) {
      this.logger.error(`Error playing embedded sound ${soundName}: ${error}`);
    }
  }

  /**
   * Initialize the WASM module with the canvas dimensions
   * @param width Canvas width
   * @param height Canvas height
   */
  async initializeGame(width: number, height: number): Promise<void> {
    const wasm = await this.loadWasm();
    wasm.init(width, height);
    this.logger.log(`Game initialized with canvas size: ${width}x${height}`);
  }

  /**
   * Reset the game state
   */
  async resetGame(): Promise<void> {
    const wasm = await this.loadWasm();
    wasm.resetGame();
    this.logger.log("Game reset");
  }

  /**
   * Update the game state
   * @param deltaTime Time elapsed since the last frame in seconds
   */
  async updateGame(deltaTime: number): Promise<void> {
    const wasm = await this.loadWasm();
    wasm.update(deltaTime);
  }

  /**
   * Handle mouse click at the specified coordinates
   * @param x X coordinate
   * @param y Y coordinate
   */
  async handleClick(x: number, y: number): Promise<void> {
    const wasm = await this.loadWasm();
    wasm.handleClick(x, y);
  }

  /**
   * Select tower type to be placed
   * @param towerType Tower type identifier
   */
  async selectTowerType(towerType: number): Promise<void> {
    const wasm = await this.loadWasm();
    wasm.selectTowerType(towerType);
  }

  /**
   * Check if a tower can be placed at the specified coordinates
   * @param x X coordinate
   * @param y Y coordinate
   * @returns True if a tower can be placed, false otherwise
   */
  async canPlaceTower(x: number, y: number): Promise<boolean> {
    const wasm = await this.loadWasm();
    return wasm.canPlaceTower(x, y);
  }

  /**
   * Get the range of the currently selected tower type
   * @returns The tower range value
   */
  async getTowerRange(): Promise<number> {
    const wasm = await this.loadWasm();
    return wasm.getTowerRange();
  }
} 