// Chrono Dino - Premium Retro Arcade Canvas Game
(() => {
  // DOM Elements
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreDisplay = document.getElementById('score-display');
  const hiscoreDisplay = document.getElementById('hiscore-display');
  const speedDisplay = document.getElementById('speed-display');
  const overlayScreen = document.getElementById('overlay-screen');
  const overlayTitle = document.getElementById('overlay-title');
  const overlaySubtitle = document.getElementById('overlay-subtitle');
  const overlayIcon = document.getElementById('overlay-icon');
  const startBtn = document.getElementById('start-btn');
  const jumpBtn = document.getElementById('jump-btn');
  const duckBtn = document.getElementById('duck-btn');
  const starsContainer = document.getElementById('stars');

  // Generate background starry night
  function createBackgroundStars() {
    starsContainer.innerHTML = '';
    const starCount = 45;
    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div');
      star.classList.add('star');
      const size = Math.random() * 2.5 + 1;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.setProperty('--duration', `${Math.random() * 3 + 2}s`);
      starsContainer.appendChild(star);
    }
  }
  createBackgroundStars();

  // Web Audio Synthesizer (Zero asset dependencies, instant retro sounds)
  const AudioEngine = {
    ctx: null,
    muted: false,
    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    },
    playJump() {
      if (this.muted || !this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.12);
      } catch (e) {}
    },
    playScoreMilestone() {
      if (this.muted || !this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + i * 0.08);
          gain.gain.setValueAtTime(0.12, now + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.12);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.12);
        });
      } catch (e) {}
    },
    playCrash() {
      if (this.muted || !this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.3);
      } catch (e) {}
    }
  };

  // Game Constants & Configuration
  const CANVAS_WIDTH = 900;
  const CANVAS_HEIGHT = 320;
  const GROUND_Y = 260;
  const GRAVITY = 0.65;
  const BASE_SPEED = 6.5;

  let gameState = 'START'; // 'START' | 'PLAYING' | 'GAMEOVER' | 'PAUSED'
  let score = 0;
  let hiscore = parseInt(localStorage.getItem('chrono_dino_hiscore') || '0', 10);
  let currentSpeed = BASE_SPEED;
  let nextMilestone = 100;
  let animationId = null;
  let lastTime = 0;

  hiscoreDisplay.textContent = hiscore.toString().padStart(5, '0');

  // Particle System for jump dust & crash explosion
  let particles = [];
  function createDust(x, y, count = 4, color = '#00f2fe') {
    for (let i = 0; i < count; i++) {
      particles.push({
        x: x + (Math.random() * 10 - 5),
        y: y,
        vx: (Math.random() - 0.7) * 3,
        vy: (Math.random() - 0.8) * 2,
        radius: Math.random() * 3 + 1,
        color: color,
        life: 1,
        decay: Math.random() * 0.04 + 0.03
      });
    }
  }

  function createExplosion(x, y) {
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 4 + 2,
        color: Math.random() > 0.5 ? '#ff007f' : '#00f2fe',
        life: 1,
        decay: Math.random() * 0.03 + 0.02
      });
    }
  }

  // Dino Character Definition
  const dino = {
    x: 60,
    y: GROUND_Y - 44,
    standWidth: 44,
    standHeight: 46,
    duckWidth: 54,
    duckHeight: 28,
    width: 44,
    height: 46,
    vy: 0,
    jumpPower: -13.2,
    isJumping: false,
    isDucking: false,
    animFrame: 0,
    legTimer: 0,

    reset() {
      this.width = this.standWidth;
      this.height = this.standHeight;
      this.y = GROUND_Y - this.height;
      this.vy = 0;
      this.isJumping = false;
      this.isDucking = false;
    },

    jump() {
      if (!this.isJumping && gameState === 'PLAYING') {
        this.vy = this.jumpPower;
        this.isJumping = true;
        AudioEngine.playJump();
        createDust(this.x + 15, GROUND_Y, 6, '#00f2fe');
      }
    },

    duck(active) {
      if (gameState !== 'PLAYING') return;
      this.isDucking = active;
      if (active) {
        this.width = this.duckWidth;
        this.height = this.duckHeight;
        if (this.isJumping) {
          // Fast drop if ducking mid-air
          this.vy += 2.0;
        }
      } else {
        this.width = this.standWidth;
        this.height = this.standHeight;
      }
      if (!this.isJumping) {
        this.y = GROUND_Y - this.height;
      }
    },

    update() {
      // Physics
      if (this.isJumping) {
        this.vy += GRAVITY;
        this.y += this.vy;
        if (this.y >= GROUND_Y - this.height) {
          this.y = GROUND_Y - this.height;
          this.vy = 0;
          this.isJumping = false;
          createDust(this.x + 15, GROUND_Y, 5, '#4facfe');
        }
      } else {
        this.y = GROUND_Y - this.height;
      }

      // Animation cycle
      this.legTimer += currentSpeed * 0.08;
      if (this.legTimer > 1) {
        this.animFrame = (this.animFrame + 1) % 2;
        this.legTimer = 0;
      }
    },

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      // Cyber Glow
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#00f2fe';

      const w = this.width;
      const h = this.height;

      if (!this.isDucking) {
        // --- Standing / Running Dino Pixel Geometry ---
        // Head & snout
        ctx.fillRect(w - 22, 0, 22, 16);
        // Snout nostril / mouth cut
        ctx.fillStyle = '#0a0c16';
        ctx.fillRect(w - 8, 12, 8, 4);
        // Eye (Neon pink glow)
        ctx.fillStyle = '#ff007f';
        ctx.fillRect(w - 18, 4, 4, 4);
        ctx.fillStyle = '#00f2fe';

        // Neck & Torso
        ctx.fillRect(w - 26, 12, 16, 12);
        ctx.fillRect(4, 18, 26, 18);

        // Cyber back-spikes / plates (Purple Neon)
        ctx.fillStyle = '#9d4edd';
        ctx.fillRect(0, 16, 4, 6);
        ctx.fillRect(6, 12, 4, 6);
        ctx.fillRect(12, 10, 4, 6);
        ctx.fillStyle = '#00f2fe';

        // Tiny Arms
        ctx.fillRect(w - 12, 24, 8, 4);
        ctx.fillRect(w - 6, 26, 3, 5);

        // Tail
        ctx.fillRect(0, 22, 6, 10);
        ctx.fillRect(-6, 20, 6, 6);

        // Legs
        if (this.isJumping) {
          // Bent legs
          ctx.fillRect(10, 36, 6, 6);
          ctx.fillRect(20, 36, 6, 6);
        } else {
          // Alternating running legs
          if (this.animFrame === 0) {
            ctx.fillRect(12, 36, 6, 10); // Leg 1 down
            ctx.fillRect(12, 44, 9, 2);  // Foot 1
            ctx.fillRect(22, 36, 6, 6);  // Leg 2 up
          } else {
            ctx.fillRect(12, 36, 6, 6);  // Leg 1 up
            ctx.fillRect(22, 36, 6, 10); // Leg 2 down
            ctx.fillRect(22, 44, 9, 2);  // Foot 2
          }
        }
      } else {
        // --- Ducking / Crawling Dino Pixel Geometry ---
        // Stretched Body
        ctx.fillRect(6, 8, 36, 14);
        // Head thrust forward
        ctx.fillRect(36, 6, 18, 12);
        // Eye
        ctx.fillStyle = '#ff007f';
        ctx.fillRect(44, 8, 3, 3);
        ctx.fillStyle = '#00f2fe';
        // Tail
        ctx.fillRect(0, 12, 6, 6);
        // Tiny Arm
        ctx.fillRect(34, 16, 6, 4);
        // Crawling legs
        if (this.animFrame === 0) {
          ctx.fillRect(12, 20, 10, 8);
          ctx.fillRect(26, 20, 8, 5);
        } else {
          ctx.fillRect(12, 20, 8, 5);
          ctx.fillRect(26, 20, 10, 8);
        }
      }

      ctx.restore();
    }
  };

  // Obstacle Management
  let obstacles = [];
  let obstacleTimer = 0;
  let minObstacleInterval = 85;

  class Obstacle {
    constructor(type) {
      this.type = type; // 'CACTUS_S' | 'CACTUS_D' | 'CACTUS_T' | 'PTERODACTYL'
      this.x = CANVAS_WIDTH + 20;

      if (type.startsWith('CACTUS')) {
        this.y = GROUND_Y;
        if (type === 'CACTUS_S') {
          this.width = 18;
          this.height = 38;
        } else if (type === 'CACTUS_D') {
          this.width = 34;
          this.height = 44;
        } else {
          this.width = 48;
          this.height = 48;
        }
        this.y = GROUND_Y - this.height;
      } else {
        // Pterodactyl flying enemy: 3 potential heights (low, mid, high)
        this.width = 42;
        this.height = 28;
        const heights = [GROUND_Y - 32, GROUND_Y - 55, GROUND_Y - 80];
        this.y = heights[Math.floor(Math.random() * heights.length)];
        this.wingFrame = 0;
        this.wingTimer = 0;
      }
    }

    update() {
      this.x -= currentSpeed;
      if (this.type === 'PTERODACTYL') {
        this.wingTimer += 0.15;
        if (this.wingTimer > 1) {
          this.wingFrame = (this.wingFrame + 1) % 2;
          this.wingTimer = 0;
        }
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);

      if (this.type.startsWith('CACTUS')) {
        // Cyber Cactus / Laser Barrier style
        ctx.shadowColor = '#00f2fe';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#00f2fe';

        if (this.type === 'CACTUS_S') {
          // Single tall cactus with side arms
          ctx.fillRect(6, 0, 6, this.height);
          ctx.fillRect(0, 10, 6, 12);
          ctx.fillRect(0, 10, 4, 3);
          ctx.fillRect(12, 14, 6, 10);
          ctx.fillRect(14, 14, 4, 3);
        } else if (this.type === 'CACTUS_D') {
          // Double cluster
          ctx.fillRect(4, 4, 7, this.height - 4);
          ctx.fillRect(18, 0, 8, this.height);
          ctx.fillRect(0, 14, 5, 8);
          ctx.fillRect(26, 12, 6, 8);
        } else {
          // Triple dense spikes
          ctx.fillRect(4, 6, 7, this.height - 6);
          ctx.fillRect(18, 0, 8, this.height);
          ctx.fillRect(32, 8, 7, this.height - 8);
        }

        // Circuit core accents inside cactus
        ctx.fillStyle = '#ffd60a';
        ctx.fillRect(8, 8, 2, this.height - 18);
      } else {
        // Cyber Pterodactyl Drone
        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#ff007f';

        // Body & Beak
        ctx.fillRect(12, 10, 22, 8);
        ctx.fillRect(0, 12, 12, 4); // Head/beak
        // Glowing Visor
        ctx.fillStyle = '#00f2fe';
        ctx.fillRect(8, 11, 4, 2);
        ctx.fillStyle = '#ff007f';

        // Wings (Flapping state)
        if (this.wingFrame === 0) {
          // Wings Up
          ctx.fillRect(16, 0, 12, 10);
          ctx.fillRect(20, -4, 6, 6);
        } else {
          // Wings Down
          ctx.fillRect(16, 18, 12, 10);
          ctx.fillRect(20, 26, 6, 4);
        }
      }

      ctx.restore();
    }

    // Precise Collision Bounds
    getBounds() {
      // Inset bounding box slightly to make gameplay feel fair and forgiving
      const padX = 5;
      const padY = 4;
      return {
        x: this.x + padX,
        y: this.y + padY,
        width: this.width - padX * 2,
        height: this.height - padY * 2
      };
    }
  }

  // Parallax Clouds and Horizon Mountains
  let sceneryObjects = [];
  function initScenery() {
    sceneryObjects = [
      { x: 120, y: 50, speed: 0.8, type: 'CLOUD', width: 56 },
      { x: 380, y: 80, speed: 0.6, type: 'CLOUD', width: 44 },
      { x: 650, y: 40, speed: 1.0, type: 'CLOUD', width: 68 },
      { x: 880, y: 70, speed: 0.7, type: 'CLOUD', width: 50 },
    ];
  }
  initScenery();

  function updateScenery() {
    sceneryObjects.forEach(obj => {
      obj.x -= obj.speed * (currentSpeed / BASE_SPEED);
      if (obj.x + obj.width < 0) {
        obj.x = CANVAS_WIDTH + Math.random() * 100;
        obj.y = 30 + Math.random() * 80;
      }
    });
  }

  function drawScenery(ctx) {
    // Distant Cyber Grid & Horizon Line
    ctx.strokeStyle = 'rgba(157, 78, 221, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
    ctx.stroke();

    // Floating Cyber Data-Clouds
    sceneryObjects.forEach(cloud => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.fillRect(cloud.x, cloud.y, cloud.width, 10);
      ctx.fillRect(cloud.x + 10, cloud.y - 6, cloud.width - 20, 6);
      ctx.fillRect(cloud.x + 16, cloud.y - 10, cloud.width - 32, 4);
    });
  }

  // Ground Track Animation
  let groundOffset = 0;
  function drawGround(ctx) {
    groundOffset = (groundOffset + currentSpeed) % 40;

    // Main ground neon border
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#00f2fe';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 2);
    ctx.shadowBlur = 0;

    // Moving grid segments / dashes below ground
    ctx.fillStyle = 'rgba(0, 242, 254, 0.2)';
    for (let x = -groundOffset; x < CANVAS_WIDTH; x += 40) {
      ctx.fillRect(x, GROUND_Y + 8, 24, 2);
      ctx.fillRect(x + 15, GROUND_Y + 18, 12, 2);
      ctx.fillRect(x + 5, GROUND_Y + 28, 18, 2);
    }
  }

  // Collision Detection (Axis-Aligned Bounding Box)
  function checkCollision(box1, box2) {
    return (
      box1.x < box2.x + box2.width &&
      box1.x + box1.width > box2.x &&
      box1.y < box2.y + box2.height &&
      box1.y + box1.height > box2.y
    );
  }

  // Core Game Loop
  function gameLoop(timestamp) {
    if (gameState !== 'PLAYING') return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 1. Update and Render Scenery & Ground
    updateScenery();
    drawScenery(ctx);
    drawGround(ctx);

    // 2. Update and Render Dino
    dino.update();
    dino.draw(ctx);

    // 3. Obstacle Spawning & Management
    obstacleTimer++;
    if (obstacleTimer > minObstacleInterval) {
      if (Math.random() < 0.45) {
        // Decide obstacle type
        const rand = Math.random();
        let type = 'CACTUS_S';
        if (score > 120 && rand < 0.25) {
          type = 'PTERODACTYL';
        } else if (rand > 0.65) {
          type = 'CACTUS_D';
        } else if (rand > 0.4) {
          type = 'CACTUS_T';
        }

        obstacles.push(new Obstacle(type));
        obstacleTimer = 0;
        // Dynamically adjust gap based on speed to ensure jumpability
        minObstacleInterval = Math.max(48, Math.floor(100 - (currentSpeed * 3)));
      }
    }

    // Dino Bounding Box for collision
    const dinoBounds = {
      x: dino.x + 6,
      y: dino.y + 4,
      width: dino.width - 12,
      height: dino.height - 6
    };

    // Update and draw obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.update();
      obs.draw(ctx);

      // Check collision
      if (checkCollision(dinoBounds, obs.getBounds())) {
        gameOver();
        return;
      }

      // Remove obstacles offscreen
      if (obs.x + obs.width < -30) {
        obstacles.splice(i, 1);
      }
    }

    // 4. Update and Draw Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 5. Update Score & Velocity
    score++;
    scoreDisplay.textContent = Math.floor(score / 5).toString().padStart(5, '0');

    // Milestones sound
    const currentNormScore = Math.floor(score / 5);
    if (currentNormScore >= nextMilestone) {
      AudioEngine.playScoreMilestone();
      nextMilestone += 100;
      // Slight speed boost
      currentSpeed += 0.35;
      speedDisplay.textContent = `${(currentSpeed / BASE_SPEED).toFixed(1)}x`;
    }

    animationId = requestAnimationFrame(gameLoop);
  }

  // Start / Restart Game
  function startGame() {
    AudioEngine.init();
    gameState = 'PLAYING';
    score = 0;
    currentSpeed = BASE_SPEED;
    nextMilestone = 100;
    obstacles = [];
    particles = [];
    obstacleTimer = 0;
    dino.reset();

    scoreDisplay.textContent = '00000';
    speedDisplay.textContent = '1.0x';

    overlayScreen.classList.remove('visible');
    cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(gameLoop);
  }

  // Game Over
  function gameOver() {
    gameState = 'GAMEOVER';
    cancelAnimationFrame(animationId);
    AudioEngine.playCrash();

    // Particle explosion at Dino crash point
    createExplosion(dino.x + dino.width / 2, dino.y + dino.height / 2);
    // Draw explosion frame
    particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    const finalScore = Math.floor(score / 5);
    if (finalScore > hiscore) {
      hiscore = finalScore;
      localStorage.setItem('chrono_dino_hiscore', hiscore.toString());
      hiscoreDisplay.textContent = hiscore.toString().padStart(5, '0');
    }

    // Setup overlay
    overlayIcon.textContent = '💥';
    overlayTitle.textContent = 'SYSTEM OVERLOAD!';
    overlaySubtitle.innerHTML = `You reached a score of <strong>${finalScore}</strong>.<br>Press <kbd>Space</kbd> or click below to reboot run.`;
    startBtn.querySelector('.btn-text').textContent = 'RETRY RUN';
    overlayScreen.classList.add('visible');
  }

  // Keyboard Handlers
  const keys = {};
  window.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
      e.preventDefault();
      if (gameState === 'START' || gameState === 'GAMEOVER') {
        startGame();
      } else if (gameState === 'PLAYING') {
        dino.jump();
      }
    } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
      e.preventDefault();
      if (gameState === 'PLAYING') {
        dino.duck(true);
      }
    } else if (e.code === 'KeyP') {
      if (gameState === 'PLAYING') {
        gameState = 'PAUSED';
        overlayTitle.textContent = 'PAUSED';
        overlaySubtitle.textContent = 'Press P or click Continue to resume';
        startBtn.querySelector('.btn-text').textContent = 'RESUME';
        overlayScreen.classList.add('visible');
      } else if (gameState === 'PAUSED') {
        gameState = 'PLAYING';
        overlayScreen.classList.remove('visible');
        animationId = requestAnimationFrame(gameLoop);
      }
    } else if (e.code === 'KeyM') {
      AudioEngine.muted = !AudioEngine.muted;
    }
  });

  window.addEventListener('keyup', (e) => {
    if (['ArrowDown', 'KeyS'].includes(e.code)) {
      dino.duck(false);
    }
  });

  // Touch and Click Handlers
  startBtn.addEventListener('click', () => {
    if (gameState === 'PAUSED') {
      gameState = 'PLAYING';
      overlayScreen.classList.remove('visible');
      animationId = requestAnimationFrame(gameLoop);
    } else {
      startGame();
    }
  });

  jumpBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState !== 'PLAYING') startGame();
    else dino.jump();
  });
  jumpBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (gameState !== 'PLAYING') startGame();
    else dino.jump();
  });

  duckBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    dino.duck(true);
  });
  duckBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    dino.duck(false);
  });
  duckBtn.addEventListener('mousedown', (e) => {
    e.preventDefault();
    dino.duck(true);
  });
  duckBtn.addEventListener('mouseup', (e) => {
    e.preventDefault();
    dino.duck(false);
  });

  // Initial single frame render for title screen
  function initialRender() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawScenery(ctx);
    drawGround(ctx);
    dino.draw(ctx);
  }
  initialRender();
})();
