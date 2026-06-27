/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { GameState, PlayerState, ObstacleType, CollectibleType } from '../types';
import { retroAudio } from '../audio';

interface GameCanvasProps {
  gameState: GameState;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  soundEnabled: boolean;
  onGameOver: (score: number, coins: number, distance: number) => void;
  onScoreUpdate: (score: number, coins: number, distance: number) => void;
  isPaused: boolean;
}

// Particle class for visual effects (jump dust, coin sparkle, stomp splash)
class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  shape: 'circle' | 'star' | 'square';

  constructor(x: number, y: number, color: string, shape: 'circle' | 'star' | 'square' = 'circle') {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = (Math.random() - 0.5) * 4 - 1;
    this.size = Math.random() * 5 + 3;
    this.color = color;
    this.alpha = 1;
    this.decay = Math.random() * 0.03 + 0.015;
    this.shape = shape;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.decay;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.fillStyle = this.color;
    
    if (this.shape === 'star') {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        ctx.lineTo(
          this.x + Math.cos(((18 + i * 72) * Math.PI) / 180) * this.size,
          this.y + Math.sin(((18 + i * 72) * Math.PI) / 180) * this.size
        );
        ctx.lineTo(
          this.x + Math.cos(((54 + i * 72) * Math.PI) / 180) * (this.size / 2),
          this.y + Math.sin(((54 + i * 72) * Math.PI) / 180) * (this.size / 2)
        );
      }
      ctx.closePath();
      ctx.fill();
    } else if (this.shape === 'square') {
      ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  difficulty,
  soundEnabled,
  onGameOver,
  onScoreUpdate,
  isPaused,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Game metrics
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [distance, setDistance] = useState(0);

  // References to keep game state across frames
  const stateRef = useRef({
    gameState,
    difficulty,
    isPaused,
    gameFrame: 0,
    speed: 6,
    maxSpeed: 14,
    score: 0,
    coins: 0,
    distance: 0,
    groundY: 340,
    
    // Player specs
    player: {
      x: 100,
      y: 200,
      width: 32,
      height: 48,
      vy: 0,
      gravity: 0.6,
      jumpForce: -13,
      isGrounded: false,
      doubleJumpsLeft: 1,
      isCrouching: false,
      state: PlayerState.SMALL,
      invincibilityFrames: 0,
      animFrame: 0,
      isSliding: false,
    },

    // Obstacles
    obstacles: [] as any[],
    nextObstacleFrame: 100,

    // Collectibles
    collectibles: [] as any[],
    nextCollectibleFrame: 60,

    // Particles
    particles: [] as Particle[],

    // Background Layers (Parallax)
    bgLayers: {
      clouds: [] as { x: number; y: number; size: number; speed: number }[],
      mountains: [] as { x: number; height: number; width: number; speed: number }[],
      bushes: [] as { x: number; width: number; height: number; speed: number }[],
    },
    
    // Inputs
    keys: {
      Space: false,
      ArrowUp: false,
      ArrowDown: false,
      KeyS: false,
      KeyW: false,
    },
  });

  // Sync props to refs
  useEffect(() => {
    stateRef.current.gameState = gameState;
    stateRef.current.difficulty = difficulty;
    stateRef.current.isPaused = isPaused;

    // Reset game state on transition to PLAYING
    if (gameState === GameState.PLAYING) {
      const state = stateRef.current;
      state.score = 0;
      state.coins = 0;
      state.distance = 0;
      state.gameFrame = 0;
      
      // Speed adjustments based on difficulty
      if (difficulty === 'EASY') {
        state.speed = 5;
        state.maxSpeed = 10;
        state.player.gravity = 0.55;
        state.player.jumpForce = -12;
      } else if (difficulty === 'MEDIUM') {
        state.speed = 7;
        state.maxSpeed = 13;
        state.player.gravity = 0.65;
        state.player.jumpForce = -13.5;
      } else {
        state.speed = 9;
        state.maxSpeed = 16;
        state.player.gravity = 0.75;
        state.player.jumpForce = -15;
      }

      state.player.x = 100;
      state.player.y = state.groundY - state.player.height;
      state.player.vy = 0;
      state.player.isGrounded = true;
      state.player.doubleJumpsLeft = 1;
      state.player.isCrouching = false;
      state.player.state = PlayerState.SMALL;
      state.player.width = 32;
      state.player.height = 48;
      state.player.invincibilityFrames = 0;
      state.player.isSliding = false;

      state.obstacles = [];
      state.collectibles = [];
      state.particles = [];
      state.nextObstacleFrame = 120;
      state.nextCollectibleFrame = 40;

      setScore(0);
      setCoins(0);
      setDistance(0);
    }
  }, [gameState, difficulty, isPaused]);

  // Handle resizing canvas to fill container
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      canvas.width = container.clientWidth;
      canvas.height = 400; // Fixed aesthetic height, matches coordinates
      stateRef.current.groundY = 340;
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keys = stateRef.current.keys;
      const p = stateRef.current.player;
      const gs = stateRef.current.gameState;

      if (['Space', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(e.code)) {
        e.preventDefault(); // Stop scrolling the page
      }

      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        if (gs === GameState.PLAYING && !stateRef.current.isPaused) {
          // Trigger jump
          if (p.isGrounded) {
            p.vy = p.jumpForce;
            p.isGrounded = false;
            retroAudio.playJump();
            // Generate jump dust particles
            for (let i = 0; i < 6; i++) {
              stateRef.current.particles.push(
                new Particle(p.x + p.width / 2, stateRef.current.groundY, '#E2E8F0', 'circle')
              );
            }
          } else if (p.doubleJumpsLeft > 0) {
            p.vy = p.jumpForce * 0.85; // Slightly weaker second jump
            p.doubleJumpsLeft--;
            retroAudio.playDoubleJump();
            // Star dust particles for double jump
            for (let i = 0; i < 8; i++) {
              stateRef.current.particles.push(
                new Particle(p.x + p.width / 2, p.y + p.height / 2, '#FED7AA', 'star')
              );
            }
          }
        }
      }

      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        if (gs === GameState.PLAYING && !stateRef.current.isPaused) {
          p.isCrouching = true;
          // Shrink height for slide, offset Y so they don't fall through ground
          if (!p.isSliding) {
            p.y += p.height / 2;
            p.height = p.state === PlayerState.BIG ? 48 : 24;
            p.isSliding = true;
          }
        }
      }

      // Record state
      if (e.code in keys) {
        (keys as any)[e.code] = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const keys = stateRef.current.keys;
      const p = stateRef.current.player;

      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        p.isCrouching = false;
        if (p.isSliding) {
          const originalHeight = p.state === PlayerState.BIG ? 96 : 48;
          p.y -= originalHeight / 2;
          p.height = originalHeight;
          p.isSliding = false;
        }
      }

      // Variable jump height: release early to jump lower
      if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') && p.vy < -4) {
        p.vy = -4;
      }

      if (e.code in keys) {
        (keys as any)[e.code] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // UI triggerable controls for mobile/buttons
  const triggerMobileJump = () => {
    const p = stateRef.current.player;
    if (stateRef.current.gameState !== GameState.PLAYING || stateRef.current.isPaused) return;
    
    if (p.isGrounded) {
      p.vy = p.jumpForce;
      p.isGrounded = false;
      retroAudio.playJump();
      for (let i = 0; i < 6; i++) {
        stateRef.current.particles.push(
          new Particle(p.x + p.width / 2, stateRef.current.groundY, '#E2E8F0', 'circle')
        );
      }
    } else if (p.doubleJumpsLeft > 0) {
      p.vy = p.jumpForce * 0.85;
      p.doubleJumpsLeft--;
      retroAudio.playDoubleJump();
      for (let i = 0; i < 8; i++) {
        stateRef.current.particles.push(
          new Particle(p.x + p.width / 2, p.y + p.height / 2, '#FED7AA', 'star')
        );
      }
    }
  };

  const triggerMobileSlideStart = () => {
    const p = stateRef.current.player;
    if (stateRef.current.gameState !== GameState.PLAYING || stateRef.current.isPaused) return;
    p.isCrouching = true;
    if (!p.isSliding) {
      p.y += p.height / 2;
      p.height = p.state === PlayerState.BIG ? 48 : 24;
      p.isSliding = true;
    }
  };

  const triggerMobileSlideEnd = () => {
    const p = stateRef.current.player;
    p.isCrouching = false;
    if (p.isSliding) {
      const originalHeight = p.state === PlayerState.BIG ? 96 : 48;
      p.y -= originalHeight / 2;
      p.height = originalHeight;
      p.isSliding = false;
    }
  };

  // Initialize background parallax layers once
  useEffect(() => {
    const state = stateRef.current;
    
    // Pre-populate background clouds
    state.bgLayers.clouds = Array.from({ length: 6 }, (_, i) => ({
      x: i * 200 + Math.random() * 100,
      y: 40 + Math.random() * 80,
      size: Math.random() * 40 + 30,
      speed: 0.15 + Math.random() * 0.1,
    }));

    // Pre-populate background mountains
    state.bgLayers.mountains = Array.from({ length: 5 }, (_, i) => ({
      x: i * 280,
      height: 100 + Math.random() * 80,
      width: 150 + Math.random() * 100,
      speed: 0.4,
    }));

    // Pre-populate bushes
    state.bgLayers.bushes = Array.from({ length: 8 }, (_, i) => ({
      x: i * 160 + Math.random() * 50,
      width: 40 + Math.random() * 40,
      height: 20 + Math.random() * 15,
      speed: 1.2,
    }));
  }, []);

  // Main Game Loop Effect
  useEffect(() => {
    let animationId: number;
    
    const updateGame = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const state = stateRef.current;
      
      // Handle Pause or Gameover rendering vs simulation
      if (state.gameState === GameState.PLAYING && !state.isPaused) {
        simulateFrame(canvas.width);
      }

      renderFrame(ctx, canvas.width, canvas.height);
      
      animationId = requestAnimationFrame(updateGame);
    };

    const simulateFrame = (canvasWidth: number) => {
      const state = stateRef.current;
      state.gameFrame++;
      
      // Increment stats
      state.distance += state.speed / 50; // virtual meters
      
      // Gradually increase scrolling speed for endless pacing
      if (state.gameFrame % 200 === 0 && state.speed < state.maxSpeed) {
        state.speed += 0.15;
      }

      const p = state.player;
      
      // Update running tick sound effects rhythmically
      if (p.isGrounded && !p.isCrouching && state.gameFrame % 14 === 0) {
        retroAudio.playRunTick();
      }

      // --- PLAYER PHYSICS ---
      p.vy += p.gravity;
      p.y += p.vy;

      const currentGroundY = state.groundY;

      // Handle falling below ground (death or ground landing)
      if (p.y + p.height >= currentGroundY) {
        // Detect if player is above a dynamic "GAP" obstacle
        const overGap = state.obstacles.some(obs => 
          obs.type === ObstacleType.GAP && 
          p.x + p.width - 6 > obs.x && 
          p.x + 6 < obs.x + obs.width
        );

        if (overGap) {
          // Let gravity pull down player into the pit
          if (p.y > 450) {
            handlePlayerHit(true); // Instant death by pit
          }
        } else {
          // Land on solid ground
          p.y = currentGroundY - p.height;
          p.vy = 0;
          if (!p.isGrounded) {
            p.isGrounded = true;
            p.doubleJumpsLeft = 1;
            // Generate landing puff
            for (let i = 0; i < 4; i++) {
              state.particles.push(new Particle(p.x + p.width / 2, currentGroundY, '#E2E8F0', 'circle'));
            }
          }
        }
      }

      // Invincibility frame countdown
      if (p.invincibilityFrames > 0) {
        p.invincibilityFrames--;
      }

      // --- BACKGROUND SCROLLING (Parallax) ---
      state.bgLayers.clouds.forEach(cloud => {
        cloud.x -= cloud.speed * (state.speed / 4);
        if (cloud.x < -cloud.size * 2) {
          cloud.x = canvasWidth + Math.random() * 100;
          cloud.y = 30 + Math.random() * 90;
        }
      });

      state.bgLayers.mountains.forEach(mountain => {
        mountain.x -= mountain.speed * (state.speed / 4);
        if (mountain.x < -mountain.width) {
          mountain.x = canvasWidth + Math.random() * 100;
        }
      });

      state.bgLayers.bushes.forEach(bush => {
        bush.x -= bush.speed * (state.speed / 4);
        if (bush.x < -bush.width) {
          bush.x = canvasWidth + Math.random() * 120;
        }
      });

      // --- SPARKLE PARTICLES UPDATE ---
      state.particles.forEach((part, index) => {
        part.update();
        if (part.alpha <= 0) {
          state.particles.splice(index, 1);
        }
      });

      // --- COLLECTIBLES GENERATION ---
      state.nextCollectibleFrame--;
      if (state.nextCollectibleFrame <= 0) {
        spawnCollectible(canvasWidth);
        // Random time to next collectible
        state.nextCollectibleFrame = 80 + Math.random() * 120;
      }

      // --- COLLECTIBLES SIMULATION & COLLISION ---
      state.collectibles.forEach((item, index) => {
        item.x -= state.speed;

        // Bouncing mushroom physics
        if (item.type === CollectibleType.MUSHROOM) {
          item.vy += 0.4;
          item.y += item.vy;
          if (item.y + item.size >= state.groundY) {
            item.y = state.groundY - item.size;
            item.vy = -4.5; // bounce up
          }
        }

        // Bouncing Star physics
        if (item.type === CollectibleType.STAR) {
          item.vy += 0.5;
          item.y += item.vy;
          if (item.y + item.size >= state.groundY) {
            item.y = state.groundY - item.size;
            item.vy = -6; // bounce higher
          }
        }

        // Detect collection
        if (
          p.x < item.x + item.size &&
          p.x + p.width > item.x &&
          p.y < item.y + item.size &&
          p.y + p.height > item.y
        ) {
          handleCollect(item);
          state.collectibles.splice(index, 1);
        } else if (item.x < -100) {
          state.collectibles.splice(index, 1);
        }
      });

      // --- OBSTACLES GENERATION ---
      state.nextObstacleFrame--;
      if (state.nextObstacleFrame <= 0) {
        spawnObstacle(canvasWidth);
        // Dynamic pacing: shorter spacing as speed/score increases
        const baseInterval = state.difficulty === 'EASY' ? 140 : state.difficulty === 'MEDIUM' ? 110 : 80;
        state.nextObstacleFrame = baseInterval + Math.random() * 100 - (state.speed * 2);
      }

      // --- OBSTACLES SIMULATION & COLLISION ---
      state.obstacles.forEach((obs, index) => {
        obs.x -= state.speed;

        // Goomba walking leg cycles and patrol
        if (obs.type === ObstacleType.GOOMBA) {
          obs.legCycle += 0.2;
        }

        // Flying bird hovering wave and wings flapping
        if (obs.type === ObstacleType.BIRD) {
          obs.y += Math.sin(state.gameFrame * 0.08) * 1.5;
          obs.wingCycle += 0.25;
        }

        // Collision Check
        // If it's a Gap, we handle it specially during landing checks.
        if (obs.type !== ObstacleType.GAP) {
          const bufferX = 6; // slightly forgiving horizontal bounds
          const bufferY = 4;

          if (
            p.x + bufferX < obs.x + obs.width &&
            p.x + p.width - bufferX > obs.x &&
            p.y + bufferY < obs.y + obs.height &&
            p.y + p.height > obs.y
          ) {
            // Check for Mario stomp on walking Goomba or flying Bird!
            // Stomp criteria: player is moving downwards and player's bottom is close to obstacle's top
            const isMovingDown = p.vy > 0;
            const playerFeetY = p.y + p.height;
            const isStompable = obs.type === ObstacleType.GOOMBA || obs.type === ObstacleType.BIRD;
            
            if (isMovingDown && playerFeetY <= obs.y + 18 && isStompable) {
              // STOMP SUCCESS!
              retroAudio.playStomp();
              p.vy = p.jumpForce * 0.75; // Bounce Mario back up!
              p.doubleJumpsLeft = 1; // Refresh double jump on stomp!
              
              // Points and particle burst
              state.score += 200;
              for (let i = 0; i < 12; i++) {
                state.particles.push(new Particle(obs.x + obs.width / 2, obs.y, '#EAB308', 'star'));
              }

              // Remove enemy
              state.obstacles.splice(index, 1);
            } else {
              // HURT / COLLIDE
              if (p.invincibilityFrames === 0) {
                if (p.state === PlayerState.INVINCIBLE) {
                  // Star invincibility: smash enemy on contact!
                  retroAudio.playStomp();
                  state.score += 200;
                  for (let i = 0; i < 8; i++) {
                    state.particles.push(new Particle(obs.x + obs.width / 2, obs.y + obs.height / 2, '#3B82F6', 'square'));
                  }
                  state.obstacles.splice(index, 1);
                } else {
                  handlePlayerHit(false);
                }
              }
            }
          }
        }

        // Clean off-screen obstacles
        if (obs.x + obs.width < -150) {
          state.obstacles.splice(index, 1);
          // Reward points for successfully jumping past obstacles
          if (obs.type !== ObstacleType.GAP) {
            state.score += 50;
          }
        }
      });

      // Update score & callback
      state.score += Math.floor(state.speed / 6);
      onScoreUpdate(state.score, state.coins, Math.floor(state.distance));
      setScore(state.score);
      setCoins(state.coins);
      setDistance(Math.floor(state.distance));
    };

    // Spawn a customizable obstacle
    const spawnObstacle = (canvasWidth: number) => {
      const state = stateRef.current;
      const r = Math.random();
      
      // Gather pool of obstacle options based on difficulty and score
      let pool: ObstacleType[] = [ObstacleType.PIPE, ObstacleType.GOOMBA];
      
      if (state.score > 800) {
        pool.push(ObstacleType.GAP);
      }
      if (state.score > 1200) {
        pool.push(ObstacleType.BIRD);
      }

      const choice = pool[Math.floor(Math.random() * pool.length)];

      if (choice === ObstacleType.PIPE) {
        // High-quality Pipe obstacle
        const pipeHeights = [40, 60, 80];
        const h = pipeHeights[Math.floor(Math.random() * pipeHeights.length)];
        state.obstacles.push({
          type: ObstacleType.PIPE,
          x: canvasWidth,
          y: state.groundY - h,
          width: 48,
          height: h,
        });
      } else if (choice === ObstacleType.GOOMBA) {
        // Moving Goomba goomba
        state.obstacles.push({
          type: ObstacleType.GOOMBA,
          x: canvasWidth,
          y: state.groundY - 32,
          width: 32,
          height: 32,
          legCycle: 0,
        });
      } else if (choice === ObstacleType.BIRD) {
        // Flying Bird
        const flyHeights = [200, 240, 270]; // can be crouched under or jumped over
        const h = flyHeights[Math.floor(Math.random() * flyHeights.length)];
        state.obstacles.push({
          type: ObstacleType.BIRD,
          x: canvasWidth,
          y: h,
          width: 36,
          height: 28,
          wingCycle: 0,
        });
      } else if (choice === ObstacleType.GAP) {
        // Pit / hole in the ground
        state.obstacles.push({
          type: ObstacleType.GAP,
          x: canvasWidth,
          y: state.groundY,
          width: 60 + Math.random() * 40,
          height: 60,
        });
      }
    };

    // Spawn high value rewards
    const spawnCollectible = (canvasWidth: number) => {
      const state = stateRef.current;
      const r = Math.random();

      if (r < 0.1) {
        // Spawn Mario Powerup (Mushroom or Star)
        const isStar = Math.random() < 0.35 && state.score > 1500;
        state.collectibles.push({
          type: isStar ? CollectibleType.STAR : CollectibleType.MUSHROOM,
          x: canvasWidth,
          y: state.groundY - 140, // spawned in air, drops down
          vy: 0,
          size: 28,
        });
      } else {
        // Spawn Coins (patterns of 3 in a row or arch)
        const pattern = Math.random() < 0.5 ? 'row' : 'arch';
        const height = state.groundY - 70 - Math.random() * 80;
        
        if (pattern === 'row') {
          for (let i = 0; i < 3; i++) {
            state.collectibles.push({
              type: CollectibleType.COIN,
              x: canvasWidth + i * 40,
              y: height,
              size: 20,
            });
          }
        } else {
          // Arc shape
          for (let i = 0; i < 3; i++) {
            const arcY = height - (i === 1 ? 30 : 0);
            state.collectibles.push({
              type: CollectibleType.COIN,
              x: canvasWidth + i * 40,
              y: arcY,
              size: 20,
            });
          }
        }
      }
    };

    const handleCollect = (item: any) => {
      const state = stateRef.current;
      const p = state.player;

      if (item.type === CollectibleType.COIN) {
        retroAudio.playCoin();
        state.coins++;
        state.score += 100;
        
        // Generate neat coin spark particles
        for (let i = 0; i < 6; i++) {
          state.particles.push(new Particle(item.x + item.size / 2, item.y + item.size / 2, '#F59E0B', 'star'));
        }
      } else if (item.type === CollectibleType.MUSHROOM) {
        retroAudio.playPowerup();
        state.score += 500;
        
        if (p.state === PlayerState.SMALL) {
          p.state = PlayerState.BIG;
          // Dynamically enlarge Mario sizes
          p.y -= 24;
          p.height = p.isSliding ? 48 : 96;
          p.width = 36;
        }

        for (let i = 0; i < 12; i++) {
          state.particles.push(new Particle(item.x + item.size / 2, item.y + item.size / 2, '#EF4444', 'star'));
        }
      } else if (item.type === CollectibleType.STAR) {
        retroAudio.playPowerup();
        state.score += 1000;
        p.state = PlayerState.INVINCIBLE;
        p.invincibilityFrames = 300; // 5 seconds of invincibility
        
        for (let i = 0; i < 20; i++) {
          state.particles.push(new Particle(item.x + item.size / 2, item.y + item.size / 2, '#3B82F6', 'star'));
        }
      }
    };

    const handlePlayerHit = (instantDeath: boolean) => {
      const state = stateRef.current;
      const p = state.player;

      if (instantDeath) {
        // Pit fall is instant death
        triggerGameOver();
        return;
      }

      // If player is giant, shrink back to small
      if (p.state === PlayerState.BIG) {
        retroAudio.playPowerdown();
        p.state = PlayerState.SMALL;
        p.height = p.isSliding ? 24 : 48;
        p.width = 32;
        p.invincibilityFrames = 90; // temporary invulnerability frames
        
        // Ring of cloud sparks
        for (let i = 0; i < 10; i++) {
          state.particles.push(new Particle(p.x + p.width / 2, p.y + p.height / 2, '#FFFFFF', 'circle'));
        }
      } else {
        // Small Mario dies
        triggerGameOver();
      }
    };

    const triggerGameOver = () => {
      const state = stateRef.current;
      retroAudio.playGameOver();
      
      // Explosion particles of blood/dust
      for (let i = 0; i < 24; i++) {
        state.particles.push(new Particle(state.player.x + 16, state.player.y + 24, '#EF4444', 'square'));
      }

      onGameOver(state.score, state.coins, Math.floor(state.distance));
    };

    // --- CANVAS RENDER ---
    const renderFrame = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const state = stateRef.current;
      
      // 1. Draw Sky Background Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#1E1B4B'); // dark midnight blue
      skyGrad.addColorStop(0.4, '#1E293B'); // deep charcoal blue
      skyGrad.addColorStop(0.8, '#0F172A'); // darkest slate
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Draw dynamic glowing distant stars/pixels in background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let i = 0; i < 20; i++) {
        const sx = (i * 97 + state.gameFrame * 0.05) % width;
        const sy = (i * 37) % 200;
        ctx.fillRect(sx, sy, 2, 2);
      }

      // 2. Draw Clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      state.bgLayers.clouds.forEach(cloud => {
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.size * 0.6, cloud.y - cloud.size * 0.2, cloud.size * 0.8, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.size * 1.2, cloud.y, cloud.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Draw Parallax mountains
      state.bgLayers.mountains.forEach(mountain => {
        ctx.fillStyle = '#1E293B'; // charcoal mountain
        ctx.beginPath();
        ctx.moveTo(mountain.x, state.groundY);
        ctx.lineTo(mountain.x + mountain.width / 2, state.groundY - mountain.height);
        ctx.lineTo(mountain.x + mountain.width, state.groundY);
        ctx.closePath();
        ctx.fill();

        // Mountain light edge highlight
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(mountain.x, state.groundY);
        ctx.lineTo(mountain.x + mountain.width / 2, state.groundY - mountain.height);
        ctx.stroke();
      });

      // 4. Draw Ground Bushes / Hills
      state.bgLayers.bushes.forEach(bush => {
        ctx.fillStyle = '#15803D'; // Dark green bush
        ctx.beginPath();
        ctx.arc(bush.x + bush.width * 0.25, state.groundY - bush.height, bush.height, 0, Math.PI * 2);
        ctx.arc(bush.x + bush.width * 0.75, state.groundY - bush.height, bush.height * 0.8, 0, Math.PI * 2);
        ctx.arc(bush.x + bush.width * 0.5, state.groundY - bush.height * 1.2, bush.height, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Draw Solid Ground (or render missing GAPs)
      const groundY = state.groundY;
      ctx.fillStyle = '#78350F'; // Deep brown soil
      ctx.fillRect(0, groundY, width, height - groundY);

      // Draw Top Grass Line
      ctx.fillStyle = '#22C55E'; // Rich green grass
      ctx.fillRect(0, groundY, width, 12);

      // Overlay soil details (blocks / stones)
      ctx.fillStyle = '#451A03';
      for (let gx = 0; gx < width + 64; gx += 32) {
        // dynamic offset for ground moving effect
        const dynamicX = gx - (state.speed % 32);
        ctx.fillRect(dynamicX + 4, groundY + 18, 12, 12);
        ctx.fillRect(dynamicX + 18, groundY + 34, 10, 10);
      }

      // Draw GAPs/Pits if any
      state.obstacles.forEach(obs => {
        if (obs.type === ObstacleType.GAP) {
          // Erase the ground in this region
          ctx.fillStyle = '#0F172A'; // deep background void
          ctx.fillRect(obs.x, groundY, obs.width, height - groundY);
          
          // Draw simple red hazard caution warning poles on the edges
          ctx.fillStyle = '#EF4444'; // Red edge hazard
          ctx.fillRect(obs.x - 4, groundY, 4, 12);
          ctx.fillRect(obs.x + obs.width, groundY, 4, 12);
          
          // Draw caution lines/warning arrow
          ctx.fillStyle = '#FBBF24'; // Yellow safety light
          ctx.fillRect(obs.x - 3, groundY + 20, 3, 3);
          ctx.fillRect(obs.x + obs.width, groundY + 20, 3, 3);
        }
      });

      // 6. Draw Collectibles (Coins & Mushroom Powerups)
      state.collectibles.forEach(item => {
        if (item.type === CollectibleType.COIN) {
          // Spinning golden coin
          const spinScale = Math.abs(Math.sin(state.gameFrame * 0.12));
          ctx.save();
          ctx.translate(item.x + item.size / 2, item.y + item.size / 2);
          ctx.scale(spinScale, 1);
          
          // Outer Gold Rim
          ctx.fillStyle = '#F59E0B';
          ctx.beginPath();
          ctx.arc(0, 0, item.size / 2, 0, Math.PI * 2);
          ctx.fill();

          // Inner Light Gold Center
          ctx.fillStyle = '#FCD34D';
          ctx.beginPath();
          ctx.arc(0, 0, item.size / 3, 0, Math.PI * 2);
          ctx.fill();

          // Coin slot detail
          ctx.fillStyle = '#B45309';
          ctx.fillRect(-2, -item.size / 6, 4, item.size / 3);

          ctx.restore();
        } else if (item.type === CollectibleType.MUSHROOM) {
          // Classic Mario Super Mushroom
          const radius = item.size / 2;
          const mx = item.x + radius;
          const my = item.y + radius;

          // Red dome cap
          ctx.fillStyle = '#EF4444';
          ctx.beginPath();
          ctx.arc(mx, my, radius, Math.PI, 0, false);
          ctx.fill();

          // Spots on Mushroom
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(mx, my - radius * 0.5, radius * 0.35, 0, Math.PI * 2);
          ctx.arc(mx - radius * 0.7, my - radius * 0.2, radius * 0.25, 0, Math.PI * 2);
          ctx.arc(mx + radius * 0.7, my - radius * 0.2, radius * 0.25, 0, Math.PI * 2);
          ctx.fill();

          // Mushroom Cream Body
          ctx.fillStyle = '#FEF08A';
          ctx.fillRect(mx - radius * 0.6, my, radius * 1.2, radius * 0.9);
          
          // Little cute black eyes
          ctx.fillStyle = '#000000';
          ctx.fillRect(mx - radius * 0.3, my + radius * 0.2, 2, radius * 0.4);
          ctx.fillRect(mx + radius * 0.1, my + radius * 0.2, 2, radius * 0.4);
        } else if (item.type === CollectibleType.STAR) {
          // Bouncing gold star
          ctx.save();
          ctx.translate(item.x + item.size / 2, item.y + item.size / 2);
          ctx.rotate(state.gameFrame * 0.05);

          ctx.fillStyle = '#FBBF24'; // Golden glow yellow
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            ctx.lineTo(
              Math.cos(((18 + i * 72) * Math.PI) / 180) * (item.size / 2),
              Math.sin(((18 + i * 72) * Math.PI) / 180) * (item.size / 2)
            );
            ctx.lineTo(
              Math.cos(((54 + i * 72) * Math.PI) / 180) * (item.size / 4),
              Math.sin(((54 + i * 72) * Math.PI) / 180) * (item.size / 4)
            );
          }
          ctx.closePath();
          ctx.fill();

          // Cute tiny starry eyes
          ctx.fillStyle = '#000000';
          ctx.fillRect(-3, -2, 1.5, 4);
          ctx.fillRect(1.5, -2, 1.5, 4);

          ctx.restore();
        }
      });

      // 7. Draw Obstacles (Pipes, Walking Goombas, Birds)
      state.obstacles.forEach(obs => {
        if (obs.type === ObstacleType.PIPE) {
          // Green Pipe
          ctx.fillStyle = '#15803D'; // Pipe base green
          ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

          // Pipe Rim / Lip
          ctx.fillStyle = '#166534'; // Dark green lip border
          ctx.fillRect(obs.x - 4, obs.y, obs.width + 8, 18);
          ctx.fillStyle = '#22C55E'; // Rich green highlight lip
          ctx.fillRect(obs.x - 2, obs.y + 2, obs.width + 4, 14);

          // Pipe 3D visual shine lines
          ctx.fillStyle = '#4ADE80'; // Bright light highlights
          ctx.fillRect(obs.x + 6, obs.y, 4, obs.height);
          ctx.fillRect(obs.x - 2 + 6, obs.y + 2, 4, 14);

          ctx.fillStyle = '#14532D'; // Deep green shadow
          ctx.fillRect(obs.x + obs.width - 8, obs.y, 6, obs.height);
          ctx.fillRect(obs.x + obs.width - 4, obs.y + 2, 6, 14);
        } else if (obs.type === ObstacleType.GOOMBA) {
          // Walking 8-bit brown Goomba goomba
          const gx = obs.x;
          const gy = obs.y;
          const gw = obs.width;
          const gh = obs.height;

          // Head dome
          ctx.fillStyle = '#9A3412'; // Brown head
          ctx.beginPath();
          ctx.arc(gx + gw / 2, gy + gh * 0.4, gw / 2, Math.PI, 0, false);
          ctx.fill();
          
          // Mouth/Jaw cheeks
          ctx.fillRect(gx, gy + gh * 0.35, gw, gh * 0.35);

          // Cream colored face/eyes background
          ctx.fillStyle = '#FED7AA';
          ctx.fillRect(gx + 4, gy + gh * 0.5, gw - 8, gh * 0.25);

          // Angry eyebrows & black eyes
          ctx.fillStyle = '#000000';
          // Angry brow lines
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(gx + 4, gy + gh * 0.45);
          ctx.lineTo(gx + gw / 2 - 2, gy + gh * 0.55);
          ctx.moveTo(gx + gw - 4, gy + gh * 0.45);
          ctx.lineTo(gx + gw / 2 + 2, gy + gh * 0.55);
          ctx.stroke();

          // Pupils
          ctx.fillRect(gx + 7, gy + gh * 0.53, 3, 6);
          ctx.fillRect(gx + gw - 10, gy + gh * 0.53, 3, 6);

          // Black walking boots
          ctx.fillStyle = '#1E293B';
          const leftLegOffset = Math.sin(obs.legCycle) * 3;
          const rightLegOffset = -Math.sin(obs.legCycle) * 3;
          ctx.fillRect(gx + 2, gy + gh * 0.75 + leftLegOffset, 10, 8);
          ctx.fillRect(gx + gw - 12, gy + gh * 0.75 + rightLegOffset, 10, 8);
        } else if (obs.type === ObstacleType.BIRD) {
          // Flying Bird/Bat
          const bx = obs.x;
          const by = obs.y;
          const bw = obs.width;
          const bh = obs.height;

          // Cute pink wings flapping
          ctx.fillStyle = '#F43F5E'; // Red wings
          const flapHeight = Math.sin(obs.wingCycle) * bh * 0.6;
          
          ctx.beginPath();
          ctx.moveTo(bx, by + bh / 2);
          ctx.lineTo(bx + bw / 2, by + bh / 2 - flapHeight);
          ctx.lineTo(bx + bw, by + bh / 2);
          ctx.lineTo(bx + bw / 2, by + bh / 2 + flapHeight);
          ctx.closePath();
          ctx.fill();

          // Round head body center
          ctx.fillStyle = '#FB7185';
          ctx.beginPath();
          ctx.arc(bx + bw / 2, by + bh / 2, bh / 3, 0, Math.PI * 2);
          ctx.fill();

          // Big goggles/eyes
          ctx.fillStyle = '#FFFFFF';
          ctx.beginPath();
          ctx.arc(bx + bw / 2 - 3, by + bh / 2 - 1, 3, 0, Math.PI * 2);
          ctx.arc(bx + bw / 2 + 3, by + bh / 2 - 1, 3, 0, Math.PI * 2);
          ctx.fill();

          // black pupil dots
          ctx.fillStyle = '#000000';
          ctx.fillRect(bx + bw / 2 - 4, by + bh / 2 - 2, 1.5, 1.5);
          ctx.fillRect(bx + bw / 2 + 2, by + bh / 2 - 2, 1.5, 1.5);

          // Yellow beak
          ctx.fillStyle = '#F59E0B';
          ctx.beginPath();
          ctx.moveTo(bx + bw / 2 - 3, by + bh / 2 + 1);
          ctx.lineTo(bx + bw / 2 + 3, by + bh / 2 + 1);
          ctx.lineTo(bx + bw / 2, by + bh / 2 + 5);
          ctx.closePath();
          ctx.fill();
        }
      });

      // 8. Draw Player (Animated Mario)
      const p = state.player;
      
      // Flash player if invincible or currently recovering
      const isInvincible = p.state === PlayerState.INVINCIBLE;
      const isRecovering = p.invincibilityFrames > 0 && !isInvincible;
      
      let shouldDrawPlayer = true;
      if (isRecovering && Math.floor(state.gameFrame / 3) % 2 === 0) {
        shouldDrawPlayer = false; // blink during damage recovery
      }

      if (shouldDrawPlayer) {
        ctx.save();
        
        // Add color filters for invincibility stars
        if (isInvincible) {
          const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];
          const activeColorIndex = Math.floor(state.gameFrame / 4) % colors.length;
          ctx.shadowBlur = 15;
          ctx.shadowColor = colors[activeColorIndex];
        }

        // Draw Player character relative coordinates
        const px = p.x;
        const py = p.y;
        const pw = p.width;
        const ph = p.height;

        // Custom pixelized Plumber drawing
        // Head / Hat
        ctx.fillStyle = '#EF4444'; // Red cap
        if (isInvincible && Math.floor(state.gameFrame / 2) % 2 === 0) {
          ctx.fillStyle = '#FBBF24'; // golden cap
        }
        ctx.fillRect(px + 4, py, pw - 8, ph * 0.16);
        ctx.fillRect(px + 8, py + ph * 0.08, pw - 8, ph * 0.08); // visor brim

        // Plumber face / nose
        ctx.fillStyle = '#FFD8A8'; // Skin color
        ctx.fillRect(px + 6, py + ph * 0.16, pw - 12, ph * 0.16);
        ctx.fillStyle = '#78350F'; // Brown mustache
        ctx.fillRect(px + pw - 14, py + ph * 0.24, 10, ph * 0.06);

        // Eyes
        ctx.fillStyle = '#000000';
        ctx.fillRect(px + pw - 10, py + ph * 0.18, 3, ph * 0.07);

        // Body overalls
        ctx.fillStyle = '#EF4444'; // Red shirt underneath
        ctx.fillRect(px + 4, py + ph * 0.32, pw - 8, ph * 0.18);

        ctx.fillStyle = '#2563EB'; // Blue overalls!
        // Shoulder straps
        ctx.fillRect(px + 6, py + ph * 0.32, 4, ph * 0.35);
        ctx.fillRect(px + pw - 10, py + ph * 0.32, 4, ph * 0.35);
        // Overalls main base
        ctx.fillRect(px + 4, py + ph * 0.45, pw - 8, ph * 0.25);

        // Yellow buttons
        ctx.fillStyle = '#FBBF24';
        ctx.fillRect(px + 7, py + ph * 0.48, 2, 2);
        ctx.fillRect(px + pw - 9, py + ph * 0.48, 2, 2);

        // Legs / Boots
        ctx.fillStyle = '#451A03'; // Brown boots
        if (p.isGrounded) {
          if (p.isCrouching) {
            // Flattened legs
            ctx.fillRect(px + 2, py + ph * 0.82, 10, ph * 0.18);
            ctx.fillRect(px + pw - 12, py + ph * 0.82, 10, ph * 0.18);
          } else {
            // Walking Leg animations using sinus
            const legSwing = Math.sin(state.gameFrame * 0.18) * (ph * 0.08);
            ctx.fillRect(px + 2, py + ph * 0.7 + Math.max(0, legSwing), 10, ph * 0.25 - Math.max(0, legSwing));
            ctx.fillRect(px + pw - 12, py + ph * 0.7 + Math.max(0, -legSwing), 10, ph * 0.25 - Math.max(0, -legSwing));
          }
        } else {
          // Jumping Leg pose: pulled up
          ctx.fillRect(px + 2, py + ph * 0.7, 9, ph * 0.18);
          ctx.fillRect(px + pw - 11, py + ph * 0.7, 9, ph * 0.18);
        }

        // Hands / Gloves
        ctx.fillStyle = '#FFFFFF'; // White gloves
        if (!p.isGrounded) {
          // Jumping hands: raised up high
          ctx.fillRect(px - 4, py + ph * 0.1, 6, 6);
          ctx.fillRect(px + pw - 2, py + ph * 0.1, 6, 6);
        } else if (p.isCrouching) {
          // sliding hands
          ctx.fillRect(px - 4, py + ph * 0.6, 6, 6);
        } else {
          // Running arm swing
          const armSwing = Math.cos(state.gameFrame * 0.18) * (ph * 0.1);
          ctx.fillRect(px - 4, py + ph * 0.4 + armSwing, 6, 6);
          ctx.fillRect(px + pw - 2, py + ph * 0.4 - armSwing, 6, 6);
        }

        ctx.restore();
      }

      // 9. Draw Sparkle Particles
      state.particles.forEach(part => part.draw(ctx));

      // 10. Pause Screen overlay (rendered over the frame canvas)
      if (state.isPaused) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(0, 0, width, height);

        // Pause text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GAME PAUSED', width / 2, height / 2 - 10);
        ctx.font = '14px "JetBrains Mono", monospace';
        ctx.fillStyle = '#94A3B8';
        ctx.fillText('Press P or click Play to Resume', width / 2, height / 2 + 20);
      }
    };

    // Run core engine loop
    animationId = requestAnimationFrame(updateGame);
    return () => cancelAnimationFrame(animationId);
  }, [gameState, difficulty, soundEnabled, onGameOver, onScoreUpdate, isPaused]);

  return (
    <div className="relative w-full overflow-hidden flex flex-col items-center">
      
      {/* Canvas view */}
      <div ref={containerRef} className="w-full h-[400px] rounded-xl overflow-hidden shadow-2xl border-4 border-slate-700 bg-slate-900">
        <canvas ref={canvasRef} className="block w-full h-full" />
      </div>

      {/* On-screen controller buttons for mobile/pointer actions */}
      <div className="w-full flex justify-between items-center px-4 py-3 mt-4 bg-slate-800 rounded-xl border border-slate-700 max-w-2xl select-none">
        
        {/* Left Side: Crouch/Slide touch trigger */}
        <div className="flex flex-col items-center">
          <button
            onMouseDown={triggerMobileSlideStart}
            onMouseUp={triggerMobileSlideEnd}
            onTouchStart={(e) => { e.preventDefault(); triggerMobileSlideStart(); }}
            onTouchEnd={(e) => { e.preventDefault(); triggerMobileSlideEnd(); }}
            className="w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 border-b-4 border-blue-800 shadow-lg flex flex-col items-center justify-center text-white cursor-pointer active:scale-95 transition-all"
            id="btn-slide-crouch"
            title="Press down to slide under flying enemies"
          >
            <span className="text-xs uppercase font-mono tracking-wider font-bold">SLIDE</span>
            <svg className="w-5 h-5 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 13l-7 7-7-7" />
            </svg>
          </button>
          <span className="text-[10px] text-slate-400 mt-1 font-mono">S or ↓ Key</span>
        </div>

        {/* Center: Instruction HUD helper */}
        <div className="hidden sm:flex flex-col text-center text-slate-300 font-mono text-xs max-w-xs">
          <div><strong className="text-amber-400">JUMP/DOUBLE JUMP:</strong> Space / Up / W</div>
          <div><strong className="text-blue-400">CROUCH/SLIDE:</strong> Down / S</div>
          <div className="text-emerald-400 text-[10px] mt-1">Stomp on walkies & flying ones for bonus!</div>
        </div>

        {/* Right Side: Jump Action Touch button */}
        <div className="flex flex-col items-center">
          <button
            onMouseDown={triggerMobileJump}
            onTouchStart={(e) => { e.preventDefault(); triggerMobileJump(); }}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 active:bg-red-700 border-b-4 border-red-800 shadow-lg flex flex-col items-center justify-center text-white cursor-pointer active:scale-95 transition-all"
            id="btn-jump-action"
            title="Press to Jump / Double Jump"
          >
            <span className="text-xs uppercase font-mono tracking-wider font-bold">JUMP</span>
            <svg className="w-5 h-5 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 11l7-7 7 7M12 4v16" />
            </svg>
          </button>
          <span className="text-[10px] text-slate-400 mt-1 font-mono">Space or ↑ Key</span>
        </div>

      </div>
    </div>
  );
};
