/**
 * Coconut Breaker - Core Game Logic & Audio Synthesizer
 */

// --- Audio Synthesizer (Web Audio API - Zero External Assets) ---
class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playHit(isCrit = false) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Woody thud / impact
    osc.type = isCrit ? 'triangle' : 'sine';
    const startFreq = isCrit ? 340 : 200;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.09);

    gain.gain.setValueAtTime(isCrit ? 0.35 : 0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.1);

    // Crack high-frequency click
    const crackOsc = this.ctx.createOscillator();
    const crackGain = this.ctx.createGain();
    crackOsc.type = 'sawtooth';
    crackOsc.frequency.setValueAtTime(isCrit ? 1200 : 750, t);
    crackOsc.frequency.exponentialRampToValueAtTime(100, t + 0.04);
    crackGain.gain.setValueAtTime(0.15, t);
    crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    crackOsc.connect(crackGain);
    crackGain.connect(this.ctx.destination);
    crackOsc.start(t);
    crackOsc.stop(t + 0.05);
  }

  playCrack() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Shell fracturing sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.linearRampToValueAtTime(220, t + 0.08);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  playShatter() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Splash sound (noise simulation + water tone)
    const splash = this.ctx.createOscillator();
    const splashGain = this.ctx.createGain();
    splash.type = 'sine';
    splash.frequency.setValueAtTime(600, t);
    splash.frequency.exponentialRampToValueAtTime(120, t + 0.25);

    splashGain.gain.setValueAtTime(0.3, t);
    splashGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    splash.connect(splashGain);
    splashGain.connect(this.ctx.destination);
    splash.start(t);
    splash.stop(t + 0.3);

    // Reward celebratory arpeggio chime
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const chimeOsc = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();
      const start = t + idx * 0.05;

      chimeOsc.type = 'triangle';
      chimeOsc.frequency.setValueAtTime(freq, start);

      chimeGain.gain.setValueAtTime(0.18, start);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(this.ctx.destination);

      chimeOsc.start(start);
      chimeOsc.stop(start + 0.25);
    });
  }

  playBuy() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.12);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  }
}

// --- Particle VFX Engine (Coconut Shell Shards & Coconut Water Splashes) ---
class ParticleEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.loop();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  spawnBurst(x, y, count = 25, isGolden = false) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 8 + 3;
      const size = Math.random() * 10 + 4;
      const isWater = Math.random() > 0.45;

      let color;
      if (isGolden) {
        color = isWater ? '#fef08a' : '#d97706';
      } else if (isWater) {
        // Splash milk / water drop
        color = Math.random() > 0.5 ? '#ffffff' : '#38bdf8';
      } else {
        // Shell wood fragment
        color = Math.random() > 0.5 ? '#78350f' : '#451a03';
      }

      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        size: size,
        color: color,
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.25,
        gravity: 0.28,
        shape: isWater ? 'circle' : 'poly'
      });
    }
  }

  loop() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.vRot;
      p.alpha -= 0.018;

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);

      this.ctx.fillStyle = p.color;
      if (p.shape === 'circle') {
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        this.ctx.beginPath();
        this.ctx.rect(-p.size / 2, -p.size / 2, p.size, p.size * 0.75);
        this.ctx.fill();
      }
      this.ctx.restore();
    }

    requestAnimationFrame(() => this.loop());
  }
}

// --- Coconut Species Catalog ---
const COCONUT_TYPES = [
  { name: 'Common Green Coconut', hp: 30, reward: 8, shellColor: '#16a34a', bgGrad: 'url(#huskGrad)' },
  { name: 'Hard Shell Brown Nut', hp: 75, reward: 22, shellColor: '#78350f', bgGrad: 'url(#coconutGrad)' },
  { name: 'Stone Husk Coconut', hp: 160, reward: 55, shellColor: '#475569', bgGrad: 'url(#coconutGrad)' },
  { name: 'Island Golden Coconut ✨', hp: 320, reward: 160, shellColor: '#eab308', bgGrad: 'url(#goldenGrad)' },
  { name: 'Volcanic Obsidian Nut 🔥', hp: 700, reward: 400, shellColor: '#1e1b4b', bgGrad: 'url(#coconutGrad)' }
];

// --- Upgrades / Shop Config ---
const TOOLS = [
  { id: 'fist', name: 'Bare Fist', icon: '✊', baseCost: 0, power: 1, owned: true },
  { id: 'stick', name: 'Bamboo Club', icon: '🎋', baseCost: 20, power: 3, owned: false },
  { id: 'rock', name: 'Sharp Coral Rock', icon: '🪨', baseCost: 80, power: 8, owned: false },
  { id: 'machete', name: 'Island Machete', icon: '🗡️', baseCost: 250, power: 22, owned: false },
  { id: 'hammer', name: 'Blacksmith Sledge', icon: '🔨', baseCost: 750, power: 65, owned: false },
  { id: 'drill', name: 'Steam Drill', icon: '⚙️', baseCost: 2400, power: 200, owned: false },
  { id: 'laser', name: 'Solar Coconut Cannon', icon: '⚡', baseCost: 8000, power: 650, owned: false }
];

const HELPERS = [
  { id: 'crab', name: 'Beach Crab', icon: '🦀', cost: 35, dps: 1.5, count: 0, costMultiplier: 1.25, desc: 'Clacks claw repeatedly at the shell.' },
  { id: 'monkey', name: 'Trained Monkey', icon: '🐒', cost: 160, dps: 7, count: 0, costMultiplier: 1.25, desc: 'Throws rocks and cracks coconuts enthusiastically.' },
  { id: 'pirate', name: 'Friendly Pirate', icon: '🏴‍☠️', cost: 700, dps: 32, count: 0, costMultiplier: 1.25, desc: 'Slices nuts with pirate precision.' },
  { id: 'cannon', name: 'Nutcracker Cannon', icon: '💥', cost: 2600, dps: 130, count: 0, costMultiplier: 1.25, desc: 'Automated rapid-fire island defense.' }
];

const PERKS = [
  { id: 'crit1', name: 'Sharp Angles', icon: '🎯', cost: 120, level: 0, maxLevel: 5, effect: 'Crit chance +5%', costMultiplier: 2.2 },
  { id: 'frenzy1', name: 'Tropical Rush', icon: '🍹', cost: 300, level: 0, maxLevel: 3, effect: 'Frenzy multiplier +1x', costMultiplier: 2.5 },
  { id: 'milk1', name: 'Extra Juicy', icon: '🥛', cost: 200, level: 0, maxLevel: 5, effect: 'Milk Coin reward +25%', costMultiplier: 2.0 }
];

// --- Main Game State ---
class CoconutBreakerGame {
  constructor() {
    this.milkCoins = 0;
    this.totalSmashed = 0;
    this.islandLevel = 1;
    this.islandTarget = 10;

    // Coconut State
    this.currentSpeciesIndex = 0;
    this.currentHp = 30;
    this.maxHp = 30;

    // Active tool
    this.activeToolId = 'fist';

    // Frenzy / Combo System
    this.frenzyCharge = 0; // 0 to 100
    this.isFrenzyActive = false;
    this.frenzyTimer = 0;
    this.combo = 1;
    this.comboTimer = null;

    // Init modules
    this.sound = new SoundManager();
    this.particles = new ParticleEngine(document.getElementById('particleCanvas'));

    // DOM Elements
    this.coconutWrapper = document.getElementById('coconutWrapper');
    this.coconutChar = document.getElementById('coconutChar');
    this.shellBase = document.getElementById('shellBase');
    this.crack1 = document.getElementById('crackOverlay1');
    this.crack2 = document.getElementById('crackOverlay2');
    this.crack3 = document.getElementById('crackOverlay3');

    this.hpBarFill = document.getElementById('hpBarFill');
    this.currHpEl = document.getElementById('currHp');
    this.maxHpEl = document.getElementById('maxHp');
    this.coconutTypeTag = document.getElementById('coconutTypeTag');

    this.frenzyBarFill = document.getElementById('frenzyBarFill');
    this.frenzyText = document.getElementById('frenzyText');
    this.frenzyContainer = document.getElementById('frenzyContainer');

    this.milkValEl = document.getElementById('coconutMilk');
    this.smashedValEl = document.getElementById('totalSmashed');
    this.comboValEl = document.getElementById('comboVal');
    this.comboCounterEl = document.getElementById('comboCounter');

    this.statPowerEl = document.getElementById('statPower');
    this.statCritEl = document.getElementById('statCrit');
    this.statAutoEl = document.getElementById('statAuto');

    this.toolCursorIcon = document.getElementById('toolCursorIcon');

    this.loadState();
    this.spawnNewCoconut(true);
    this.setupFloatingLeaves();
    this.initTabs();
    this.renderShop();
    this.bindEvents();
    this.startGameLoop();
  }

  // --- Calculations ---
  getActiveTool() {
    return TOOLS.find(t => t.id === this.activeToolId) || TOOLS[0];
  }

  getBaseClickPower() {
    return this.getActiveTool().power;
  }

  getCritChance() {
    const perk = PERKS.find(p => p.id === 'crit1');
    return 0.05 + (perk ? perk.level * 0.05 : 0);
  }

  getFrenzyMult() {
    const perk = PERKS.find(p => p.id === 'frenzy1');
    return 2 + (perk ? perk.level * 1 : 0);
  }

  getMilkMultiplier() {
    const perk = PERKS.find(p => p.id === 'milk1');
    const perkMult = 1 + (perk ? perk.level * 0.25 : 0);
    const islandMult = 1 + (this.islandLevel - 1) * 0.2;
    return perkMult * islandMult;
  }

  getTotalAutoDPS() {
    return HELPERS.reduce((sum, h) => sum + (h.count * h.dps), 0);
  }

  // --- Spawn Coconut ---
  spawnNewCoconut(initial = false) {
    // Pick appropriate coconut species according to progress
    const maxUnlockedSpecies = Math.min(COCONUT_TYPES.length - 1, Math.floor(this.totalSmashed / 8));
    // 25% chance of a rarer species if unlocked
    let idx = Math.floor(Math.random() * (maxUnlockedSpecies + 1));
    if (Math.random() < 0.2 && maxUnlockedSpecies > 0) {
      idx = maxUnlockedSpecies;
    }

    this.currentSpeciesIndex = idx;
    const species = COCONUT_TYPES[idx];

    // HP scales with island level
    this.maxHp = Math.round(species.hp * (1 + (this.islandLevel - 1) * 0.35));
    this.currentHp = this.maxHp;

    this.coconutTypeTag.textContent = species.name;
    this.shellBase.setAttribute('fill', species.bgGrad);

    this.crack1.setAttribute('opacity', '0');
    this.crack2.setAttribute('opacity', '0');
    this.crack3.setAttribute('opacity', '0');

    this.coconutWrapper.classList.remove('shattered');
    this.updateHpUI();
  }

  updateHpUI() {
    this.currHpEl.textContent = Math.ceil(this.currentHp);
    this.maxHpEl.textContent = this.maxHp;

    const ratio = Math.max(0, this.currentHp / this.maxHp);
    this.hpBarFill.style.width = `${ratio * 100}%`;

    if (ratio > 0.5) {
      this.hpBarFill.className = 'hp-bar-fill';
    } else if (ratio > 0.25) {
      this.hpBarFill.className = 'hp-bar-fill medium';
    } else {
      this.hpBarFill.className = 'hp-bar-fill low';
    }

    // Dynamic cracks based on health left
    if (ratio <= 0.75) this.crack1.setAttribute('opacity', '1');
    else this.crack1.setAttribute('opacity', '0');

    if (ratio <= 0.45) this.crack2.setAttribute('opacity', '1');
    else this.crack2.setAttribute('opacity', '0');

    if (ratio <= 0.2) this.crack3.setAttribute('opacity', '1');
    else this.crack3.setAttribute('opacity', '0');
  }

  // --- Click & Strike Handler ---
  handleStrike(event) {
    if (this.currentHp <= 0) return;

    let damage = this.getBaseClickPower();
    const isCrit = Math.random() < this.getCritChance();

    if (isCrit) damage *= 2.5;
    if (this.isFrenzyActive) damage *= this.getFrenzyMult();
    damage = Math.round(damage);

    this.currentHp -= damage;

    // Frenzy meter progress
    if (!this.isFrenzyActive) {
      this.frenzyCharge = Math.min(100, this.frenzyCharge + 4);
      if (this.frenzyCharge >= 100) {
        this.activateFrenzy();
      }
    }

    // Combo system
    this.combo++;
    this.comboValEl.textContent = this.combo;
    this.comboCounterEl.classList.remove('pulse');
    void this.comboCounterEl.offsetWidth; // retrigger anim
    this.comboCounterEl.classList.add('pulse');

    clearTimeout(this.comboTimer);
    this.comboTimer = setTimeout(() => {
      this.combo = 1;
      this.comboValEl.textContent = '1';
    }, 2000);

    // Audio & Visual Shake
    this.sound.playHit(isCrit);
    this.triggerHitAnimation();

    // Floating damage text
    const rect = this.coconutWrapper.getBoundingClientRect();
    const clickX = event ? (event.clientX || (rect.left + rect.width / 2)) : (rect.left + rect.width / 2);
    const clickY = event ? (event.clientY || (rect.top + rect.height / 2)) : (rect.top + rect.height / 2);

    this.spawnDamageFloat(clickX, clickY, damage, isCrit);
    this.particles.spawnBurst(clickX, clickY, isCrit ? 14 : 7, this.currentSpeciesIndex === 3);

    if (this.currentHp <= 0) {
      this.shatterCoconut(clickX, clickY);
    } else {
      this.sound.playCrack();
      this.updateHpUI();
    }

    this.updateStatsBar();
  }

  activateFrenzy() {
    this.isFrenzyActive = true;
    this.frenzyTimer = 8; // 8 seconds rush
    this.frenzyContainer.classList.add('frenzy-active');
  }

  triggerHitAnimation() {
    this.coconutWrapper.classList.remove('hit');
    void this.coconutWrapper.offsetWidth;
    this.coconutWrapper.classList.add('hit');
  }

  spawnDamageFloat(x, y, damage, isCrit) {
    const floatEl = document.createElement('div');
    floatEl.className = `damage-float-text ${isCrit ? 'crit' : ''}`;
    floatEl.textContent = isCrit ? `CRIT! -${damage}` : `-${damage}`;

    const container = document.getElementById('damageFloats');
    const containerRect = container.getBoundingClientRect();

    floatEl.style.left = `${x - containerRect.left + (Math.random() * 30 - 15)}px`;
    floatEl.style.top = `${y - containerRect.top + (Math.random() * 20 - 10)}px`;

    container.appendChild(floatEl);
    setTimeout(() => floatEl.remove(), 850);
  }

  shatterCoconut(x, y) {
    this.currentHp = 0;
    this.updateHpUI();
    this.sound.playShatter();

    const species = COCONUT_TYPES[this.currentSpeciesIndex];
    const earnedMilk = Math.round(species.reward * this.getMilkMultiplier());
    this.milkCoins += earnedMilk;
    this.totalSmashed++;

    // Large particle burst
    this.particles.spawnBurst(x, y, 45, this.currentSpeciesIndex === 3);

    // Spawn bonus text
    const container = document.getElementById('damageFloats');
    const containerRect = container.getBoundingClientRect();
    const bonusEl = document.createElement('div');
    bonusEl.className = 'damage-float-text crit';
    bonusEl.textContent = `+${earnedMilk} 🥥 MILK!`;
    bonusEl.style.left = `${containerRect.width / 2}px`;
    bonusEl.style.top = `${containerRect.height / 2 - 20}px`;
    container.appendChild(bonusEl);
    setTimeout(() => bonusEl.remove(), 1100);

    this.coconutWrapper.classList.add('shattered');

    this.checkPrestigeMilestone();
    this.updateTopUI();
    this.renderShop();

    setTimeout(() => {
      this.spawnNewCoconut();
    }, 380);
  }

  checkPrestigeMilestone() {
    const target = this.islandLevel * 12;
    this.islandTarget = target;
    const prestigeBtn = document.getElementById('prestigeBtn');
    const islandGoal = document.getElementById('islandGoal');

    if (this.totalSmashed >= target) {
      prestigeBtn.disabled = false;
      islandGoal.textContent = `Milestone reached! Upgrade island level!`;
    } else {
      prestigeBtn.disabled = true;
      islandGoal.textContent = `Break ${target - this.totalSmashed} more to level up island!`;
    }
  }

  claimIslandPrestige() {
    this.islandLevel++;
    const bonus = this.islandLevel * 75;
    this.milkCoins += bonus;
    document.getElementById('islandLevel').textContent = this.islandLevel;
    this.sound.playShatter();
    this.checkPrestigeMilestone();
    this.updateTopUI();
    this.renderShop();
  }

  // --- UI Update routines ---
  updateTopUI() {
    this.milkValEl.textContent = Math.floor(this.milkCoins);
    this.smashedValEl.textContent = this.totalSmashed;
  }

  updateStatsBar() {
    let power = this.getBaseClickPower();
    if (this.isFrenzyActive) power *= this.getFrenzyMult();
    this.statPowerEl.textContent = power;

    const critPct = Math.round(this.getCritChance() * 100);
    this.statCritEl.textContent = `${critPct}%`;

    const autoDPS = this.getTotalAutoDPS();
    this.statAutoEl.textContent = `${autoDPS.toFixed(1)}/s`;
  }

  // --- Game Loop (Auto DPS & Frenzy Countdown) ---
  startGameLoop() {
    let lastTime = performance.now();

    const loop = (now) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Auto DPS tick
      const autoDPS = this.getTotalAutoDPS();
      if (autoDPS > 0 && this.currentHp > 0) {
        const autoDamage = autoDPS * dt;
        this.currentHp -= autoDamage;

        if (this.currentHp <= 0) {
          const rect = this.coconutWrapper.getBoundingClientRect();
          this.shatterCoconut(rect.left + rect.width / 2, rect.top + rect.height / 2);
        } else {
          this.updateHpUI();
        }
      }

      // Frenzy mechanics
      if (this.isFrenzyActive) {
        this.frenzyTimer -= dt;
        const pct = Math.max(0, (this.frenzyTimer / 8) * 100);
        this.frenzyBarFill.style.width = `${pct}%`;
        this.frenzyText.textContent = `⚡ FEVER RUSH: ${this.frenzyTimer.toFixed(1)}s (${this.getFrenzyMult()}x DMG!)`;

        if (this.frenzyTimer <= 0) {
          this.isFrenzyActive = false;
          this.frenzyCharge = 0;
          this.frenzyContainer.classList.remove('frenzy-active');
        }
      } else {
        // Natural frenzy decay if not clicking
        this.frenzyCharge = Math.max(0, this.frenzyCharge - dt * 6);
        this.frenzyBarFill.style.width = `${this.frenzyCharge}%`;
        this.frenzyText.textContent = `⚡ FEVER RUSH: ${Math.round(this.frenzyCharge)}%`;
      }

      this.updateStatsBar();
      this.updateTopUI();
      this.updateShopButtons();

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  // --- Shop Rendering & Purchase Handlers ---
  renderShop() {
    // 1. Tools
    const toolsContainer = document.getElementById('toolsList');
    toolsContainer.innerHTML = '';
    TOOLS.forEach(tool => {
      const isEquipped = tool.id === this.activeToolId;
      const card = document.createElement('div');
      card.className = `shop-card ${isEquipped ? 'equipped' : ''}`;

      let actionBtn = '';
      if (!tool.owned) {
        actionBtn = `<button class="buy-btn" data-type="tool" data-id="${tool.id}" ${this.milkCoins < tool.baseCost ? 'disabled' : ''}>
          <span>🥥</span> ${tool.baseCost}
        </button>`;
      } else if (isEquipped) {
        actionBtn = `<button class="buy-btn equipped-badge">Equipped</button>`;
      } else {
        actionBtn = `<button class="buy-btn equip-btn" data-type="equip" data-id="${tool.id}">Equip</button>`;
      }

      card.innerHTML = `
        <div class="shop-card-left">
          <div class="shop-item-icon">${tool.icon}</div>
          <div class="shop-item-info">
            <h4>${tool.name}</h4>
            <p>Power: +${tool.power} dmg per hit</p>
          </div>
        </div>
        ${actionBtn}
      `;
      toolsContainer.appendChild(card);
    });

    // 2. Helpers
    const helpersContainer = document.getElementById('helpersList');
    helpersContainer.innerHTML = '';
    HELPERS.forEach(helper => {
      const cost = Math.round(helper.cost * Math.pow(helper.costMultiplier, helper.count));
      const card = document.createElement('div');
      card.className = 'shop-card';
      card.innerHTML = `
        <div class="shop-card-left">
          <div class="shop-item-icon">${helper.icon}</div>
          <div class="shop-item-info">
            <h4>${helper.name} <span class="item-extra">(x${helper.count})</span></h4>
            <p>${helper.desc}</p>
            <span class="item-extra">+${helper.dps} dmg/sec</span>
          </div>
        </div>
        <button class="buy-btn" data-type="helper" data-id="${helper.id}" ${this.milkCoins < cost ? 'disabled' : ''}>
          <span>🥥</span> ${cost}
        </button>
      `;
      helpersContainer.appendChild(card);
    });

    // 3. Perks
    const perksContainer = document.getElementById('perksList');
    perksContainer.innerHTML = '';
    PERKS.forEach(perk => {
      const isMax = perk.level >= perk.maxLevel;
      const cost = Math.round(perk.cost * Math.pow(perk.costMultiplier, perk.level));
      const card = document.createElement('div');
      card.className = 'shop-card';
      card.innerHTML = `
        <div class="shop-card-left">
          <div class="shop-item-icon">${perk.icon}</div>
          <div class="shop-item-info">
            <h4>${perk.name} <span class="item-extra">(Lv ${perk.level}/${perk.maxLevel})</span></h4>
            <p>${perk.effect}</p>
          </div>
        </div>
        ${isMax ? '<button class="buy-btn equipped-badge">MAX</button>' : 
          `<button class="buy-btn" data-type="perk" data-id="${perk.id}" ${this.milkCoins < cost ? 'disabled' : ''}>
            <span>🥥</span> ${cost}
          </button>`
        }
      `;
      perksContainer.appendChild(card);
    });
  }

  updateShopButtons() {
    // Dynamically enable/disable buy buttons without rerendering entire DOM tree
    document.querySelectorAll('.buy-btn[data-type]').forEach(btn => {
      const type = btn.getAttribute('data-type');
      const id = btn.getAttribute('data-id');

      if (type === 'tool') {
        const tool = TOOLS.find(t => t.id === id);
        if (tool && !tool.owned) {
          btn.disabled = this.milkCoins < tool.baseCost;
        }
      } else if (type === 'helper') {
        const helper = HELPERS.find(h => h.id === id);
        if (helper) {
          const cost = Math.round(helper.cost * Math.pow(helper.costMultiplier, helper.count));
          btn.disabled = this.milkCoins < cost;
        }
      } else if (type === 'perk') {
        const perk = PERKS.find(p => p.id === id);
        if (perk && perk.level < perk.maxLevel) {
          const cost = Math.round(perk.cost * Math.pow(perk.costMultiplier, perk.level));
          btn.disabled = this.milkCoins < cost;
        }
      }
    });
  }

  // --- Purchase Actions ---
  buyTool(id) {
    const tool = TOOLS.find(t => t.id === id);
    if (!tool || tool.owned || this.milkCoins < tool.baseCost) return;

    this.milkCoins -= tool.baseCost;
    tool.owned = true;
    this.activeToolId = tool.id;
    this.toolCursorIcon.textContent = tool.icon;
    this.sound.playBuy();
    this.renderShop();
    this.saveState();
  }

  equipTool(id) {
    const tool = TOOLS.find(t => t.id === id);
    if (!tool || !tool.owned) return;
    this.activeToolId = tool.id;
    this.toolCursorIcon.textContent = tool.icon;
    this.sound.playBuy();
    this.renderShop();
    this.saveState();
  }

  buyHelper(id) {
    const helper = HELPERS.find(h => h.id === id);
    if (!helper) return;
    const cost = Math.round(helper.cost * Math.pow(helper.costMultiplier, helper.count));
    if (this.milkCoins < cost) return;

    this.milkCoins -= cost;
    helper.count++;
    this.sound.playBuy();
    this.renderShop();
    this.saveState();
  }

  buyPerk(id) {
    const perk = PERKS.find(p => p.id === id);
    if (!perk || perk.level >= perk.maxLevel) return;
    const cost = Math.round(perk.cost * Math.pow(perk.costMultiplier, perk.level));
    if (this.milkCoins < cost) return;

    this.milkCoins -= cost;
    perk.level++;
    this.sound.playBuy();
    this.renderShop();
    this.saveState();
  }

  // --- Event Bindings & Tabs ---
  bindEvents() {
    // Coconut Strike Events (Pointerdown for ultra fast response)
    this.coconutWrapper.addEventListener('pointerdown', (e) => {
      this.handleStrike(e);
    });

    // Spacebar to strike
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'BUTTON') {
        e.preventDefault();
        this.handleStrike(null);
      }
    });

    // Shop item delegation
    document.querySelector('.shop-content').addEventListener('click', (e) => {
      const btn = e.target.closest('.buy-btn');
      if (!btn) return;

      const type = btn.getAttribute('data-type');
      const id = btn.getAttribute('data-id');

      if (type === 'tool') this.buyTool(id);
      else if (type === 'equip') this.equipTool(id);
      else if (type === 'helper') this.buyHelper(id);
      else if (type === 'perk') this.buyPerk(id);
    });

    // Sound Toggle
    const soundToggleBtn = document.getElementById('soundToggleBtn');
    soundToggleBtn.addEventListener('click', () => {
      this.sound.enabled = !this.sound.enabled;
      soundToggleBtn.textContent = this.sound.enabled ? '🔊' : '🔇';
    });

    // Island Milestone Claim
    document.getElementById('prestigeBtn').addEventListener('click', () => {
      this.claimIslandPrestige();
    });
  }

  initTabs() {
    const tabs = [
      { btn: document.getElementById('tabToolsBtn'), panel: document.getElementById('panelTools') },
      { btn: document.getElementById('tabHelpersBtn'), panel: document.getElementById('panelHelpers') },
      { btn: document.getElementById('tabUpgradesBtn'), panel: document.getElementById('panelUpgrades') }
    ];

    tabs.forEach(({ btn, panel }) => {
      btn.addEventListener('click', () => {
        tabs.forEach(t => {
          t.btn.classList.remove('active');
          t.panel.classList.remove('active');
        });
        btn.classList.add('active');
        panel.classList.add('active');
      });
    });
  }

  setupFloatingLeaves() {
    const container = document.getElementById('leavesContainer');
    const leafIcons = ['🍃', '🌿', '🥥', '🌴', '✨'];
    for (let i = 0; i < 14; i++) {
      const leaf = document.createElement('span');
      leaf.className = 'leaf-particle';
      leaf.textContent = leafIcons[Math.floor(Math.random() * leafIcons.length)];
      leaf.style.left = `${Math.random() * 100}%`;
      leaf.style.animationDuration = `${Math.random() * 8 + 8}s`;
      leaf.style.animationDelay = `${Math.random() * 6}s`;
      container.appendChild(leaf);
    }
  }

  // --- LocalStorage Persistence ---
  saveState() {
    try {
      const state = {
        milkCoins: this.milkCoins,
        totalSmashed: this.totalSmashed,
        islandLevel: this.islandLevel,
        activeToolId: this.activeToolId,
        tools: TOOLS.map(t => ({ id: t.id, owned: t.owned })),
        helpers: HELPERS.map(h => ({ id: h.id, count: h.count })),
        perks: PERKS.map(p => ({ id: p.id, level: p.level }))
      };
      localStorage.setItem('coconut_breaker_save', JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save state', e);
    }
  }

  loadState() {
    try {
      const saved = localStorage.getItem('coconut_breaker_save');
      if (!saved) return;
      const state = JSON.parse(saved);
      this.milkCoins = state.milkCoins || 0;
      this.totalSmashed = state.totalSmashed || 0;
      this.islandLevel = state.islandLevel || 1;
      this.activeToolId = state.activeToolId || 'fist';

      if (state.tools) {
        state.tools.forEach(st => {
          const match = TOOLS.find(t => t.id === st.id);
          if (match) match.owned = st.owned;
        });
      }
      if (state.helpers) {
        state.helpers.forEach(sh => {
          const match = HELPERS.find(h => h.id === sh.id);
          if (match) match.count = sh.count;
        });
      }
      if (state.perks) {
        state.perks.forEach(sp => {
          const match = PERKS.find(p => p.id === sp.id);
          if (match) match.level = sp.level;
        });
      }

      const activeTool = this.getActiveTool();
      if (this.toolCursorIcon) {
        this.toolCursorIcon.textContent = activeTool.icon;
      }
      document.getElementById('islandLevel').textContent = this.islandLevel;
    } catch (e) {
      console.warn('Could not restore state', e);
    }
  }
}

// Start application when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.game = new CoconutBreakerGame();
});
