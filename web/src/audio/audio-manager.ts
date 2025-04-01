// Audio manager for handling game sounds and music

interface Logger {
  log(message: string): void;
  error(message: string): void;
  warn(message: string): void;
}

export class AudioManager {
  private backgroundMusic: HTMLAudioElement | null = null;
  private logger: Logger;
  private isMuted: boolean = false;
  private backgroundVolume: number = 0.3; // Default background volume
  private gameAudioVolume: number = 0.7; // Default game audio volume
  private volumeSliders: {
    background: HTMLInputElement | null;
    gameAudio: HTMLInputElement | null;
    backgroundValue: HTMLElement | null;
    gameAudioValue: HTMLElement | null;
  } = {
    background: null,
    gameAudio: null,
    backgroundValue: null,
    gameAudioValue: null
  };

  constructor(logger?: Logger) {
    this.logger = logger || console;
  }

  /**
   * Load all game sound effects and music
   */
  async loadSounds(): Promise<void> {
    try {
      this.logger.log('Loading audio assets...');

      // We no longer load individual sound effects from files
      // All game sound effects are now embedded in the WASM module
      // Only load background music from public directory
      try {
        this.backgroundMusic = new Audio('audio/background.ogg');
        this.backgroundMusic.loop = true;
        this.backgroundMusic.volume = this.backgroundVolume; // Set initial volume
        await this.preloadAudio(this.backgroundMusic);
        this.logger.log('Background music loaded from public directory');
      } catch (err) {
        this.logger.warn('Failed to load background music');
      }

      // Initialize volume controls
      this.initVolumeControls();

      this.logger.log('Audio initialization complete');
    } catch (error) {
      this.logger.error(`Error loading audio: ${error}`);
      throw error;
    }
  }

  /**
   * Initialize volume control sliders
   */
  private initVolumeControls(): void {
    // Get volume slider elements
    this.volumeSliders.background = document.getElementById('background-volume') as HTMLInputElement;
    this.volumeSliders.gameAudio = document.getElementById('game-audio-volume') as HTMLInputElement;
    this.volumeSliders.backgroundValue = document.getElementById('background-volume-value');
    this.volumeSliders.gameAudioValue = document.getElementById('game-audio-volume-value');

    // Set initial values
    if (this.volumeSliders.background) {
      this.volumeSliders.background.value = String(this.backgroundVolume * 100);
      
      // Add event listener for background volume changes
      this.volumeSliders.background.addEventListener('input', () => {
        const value = parseInt(this.volumeSliders.background?.value || '30', 10);
        this.setBackgroundVolume(value / 100);
        
        if (this.volumeSliders.backgroundValue) {
          this.volumeSliders.backgroundValue.textContent = `${value}%`;
        }
      });
    }

    if (this.volumeSliders.gameAudio) {
      this.volumeSliders.gameAudio.value = String(this.gameAudioVolume * 100);
      
      // Add event listener for game audio volume changes
      this.volumeSliders.gameAudio.addEventListener('input', () => {
        const value = parseInt(this.volumeSliders.gameAudio?.value || '70', 10);
        this.setGameAudioVolume(value / 100);
        
        if (this.volumeSliders.gameAudioValue) {
          this.volumeSliders.gameAudioValue.textContent = `${value}%`;
        }
      });
    }
  }

  /**
   * Set background music volume
   * @param volume Volume level (0.0 to 1.0)
   */
  setBackgroundVolume(volume: number): void {
    this.backgroundVolume = Math.max(0, Math.min(1, volume));
    
    if (this.backgroundMusic) {
      this.backgroundMusic.volume = this.isMuted ? 0 : this.backgroundVolume;
    }
    
    this.logger.log(`Background music volume set to ${Math.round(this.backgroundVolume * 100)}%`);
  }

  /**
   * Set game audio volume
   * @param volume Volume level (0.0 to 1.0)
   */
  setGameAudioVolume(volume: number): void {
    this.gameAudioVolume = Math.max(0, Math.min(1, volume));
    this.logger.log(`Game audio volume set to ${Math.round(this.gameAudioVolume * 100)}%`);
  }

  /**
   * Get the current game audio volume
   * @returns Current game audio volume (0.0 to 1.0)
   */
  getGameAudioVolume(): number {
    return this.isMuted ? 0 : this.gameAudioVolume;
  }

  /**
   * Preload an audio element by forcing it to load its data
   */
  private preloadAudio(audio: HTMLAudioElement): Promise<void> {
    return new Promise((resolve, reject) => {
      audio.addEventListener('canplaythrough', () => resolve(), { once: true });
      audio.addEventListener('error', (e) => reject(e), { once: true });
      audio.load();
    });
  }

  /**
   * Play background music
   */
  playBackgroundMusic(): void {
    if (this.isMuted || !this.backgroundMusic) return;
    
    this.backgroundMusic.currentTime = 0;
    this.backgroundMusic.volume = this.backgroundVolume;
    this.backgroundMusic.play().catch(err => 
      this.logger.error(`Error playing background music: ${err}`)
    );
  }

  /**
   * Stop background music
   */
  stopBackgroundMusic(): void {
    if (!this.backgroundMusic) return;
    
    this.backgroundMusic.pause();
    this.backgroundMusic.currentTime = 0;
  }

  /**
   * Toggle mute state for all audio
   */
  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    
    if (this.isMuted) {
      this.stopBackgroundMusic();
    } else if (this.backgroundMusic) {
      this.playBackgroundMusic();
    }
    
    return this.isMuted;
  }

  // The following methods are kept for API compatibility
  // but they don't do anything since sounds are now handled by WASM
  
  playEnemyHitSound(): void {}
  playLevelCompleteSound(): void {}
  playLevelFailSound(): void {}
  playTowerShootSound(): void {}
  playEnemyExplosionSound(): void {}
  playSound(name: string): void {}
} 