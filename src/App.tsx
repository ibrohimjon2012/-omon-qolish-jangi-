/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy, Play, RotateCcw, Volume2, VolumeX, Shield, Heart, Zap,
  Swords, Target, Crosshair, Pause, Star, Crown, RefreshCw,
  Sparkles, HelpCircle, Gamepad2, AlertTriangle, ChevronRight
} from 'lucide-react';
import {
  GameState, PlayerStats, Enemy, EnemyType, Bullet, LootItem, LootType,
  Particle, FloatingText, HighScore, Perk
} from './types';

// Web Audio API Synthesizer for Retro Game SFX
class RetroAudioSynth {
  ctx: AudioContext | null = null;
  muted: boolean = false;

  init() {
    if (!this.ctx) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioContextClass();
      } catch (e) {
        console.warn('Web Audio API is not supported in this browser', e);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playShoot() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.12);
    
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playHit() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.08);
    
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playExplode(isBoss = false) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    
    const now = this.ctx.currentTime;
    const duration = isBoss ? 0.6 : 0.25;
    
    // Create white noise buffer
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isBoss ? 200 : 500, now);
    filter.frequency.exponentialRampToValueAtTime(20, now + duration);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    noise.start(now);
  }

  playCollect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(250, now);
    osc.frequency.setValueAtTime(400, now + 0.06);
    osc.frequency.setValueAtTime(600, now + 0.12);
    
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playWaveStart() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    
    const now = this.ctx.currentTime;
    const freqs = [196, 246.94, 293.66, 392]; // G major chord notes
    
    freqs.forEach((f, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + idx * 0.06);
      
      gain.gain.setValueAtTime(0.06, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.005, now + idx * 0.06 + 0.5);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.5);
    });
  }

  playLevelUp() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(800, now + 0.35);
    
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.005, now + 0.35);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.35);
  }

  playGameOver() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.7);
    
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.005, now + 0.7);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.7);
  }
}

// Global Synth instance
const sfx = new RetroAudioSynth();

const MAP_SIZE = 2200; // Large 2200x2200 virtual arena

export default function App() {
  // Game states & menus
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState<number>(0);
  const [wave, setWave] = useState<number>(1);
  const [level, setLevel] = useState<number>(1);
  const [xp, setXp] = useState<number>(0);
  const [xpNeeded, setXpNeeded] = useState<number>(100);
  const [playerHp, setPlayerHp] = useState<number>(100);
  const [playerMaxHp, setPlayerMaxHp] = useState<number>(100);
  const [playerShield, setPlayerShield] = useState<number>(0);
  const [playerMaxShield, setPlayerMaxShield] = useState<number>(0);
  const [gameTime, setGameTime] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [playerName, setPlayerName] = useState<string>('Jangchi');
  const [showScoreSaved, setShowScoreSaved] = useState<boolean>(false);

  // Responsive layout state
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 800, height: 600 });
  const [waveAlert, setWaveAlert] = useState<string | null>(null);
  const [upgradePool, setUpgradePool] = useState<Perk[]>([]);

  // Toggle for Touch controls on screen
  const [touchControlsEnabled, setTouchControlsEnabled] = useState<boolean>(false);
  const [autoShootEnabled, setAutoShootEnabled] = useState<boolean>(true);

  // Power-up indicators
  const [activeSpeedPowerupTime, setActiveSpeedPowerupTime] = useState<number>(0);
  const [activeDmgPowerupTime, setActiveDmgPowerupTime] = useState<number>(0);

  // Refs for low-latency game loop
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loopRef = useRef<number | null>(null);
  
  // Player state references
  const playerRef = useRef<PlayerStats>({
    x: MAP_SIZE / 2,
    y: MAP_SIZE / 2,
    radius: 18,
    hp: 100,
    maxHp: 100,
    speed: 4.2,
    level: 1,
    xp: 0,
    xpNeeded: 100,
    dmg: 20,
    fireCooldown: 0,
    fireRate: 280,
    bulletSpeed: 9,
    pierceCount: 1,
    isInvulnerable: 0,
    shieldHp: 0,
    maxShieldHp: 0,
    doubleShot: false,
    tripleShot: false,
    magnetRadius: 130,
    critChance: 0.1,
    angle: 0
  });

  // Controls & Tracking refs
  const keysPressedRef = useRef<{ [key: string]: boolean }>({});
  const mouseRef = useRef<{ x: number; y: number; isDown: boolean }>({ x: 0, y: 0, isDown: false });
  const touchStartRef = useRef<{ x: number; y: number; id: number | null }>({ x: 0, y: 0, id: null });
  const touchMoveRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchAimStartRef = useRef<{ x: number; y: number; id: number | null }>({ x: 0, y: 0, id: null });
  const touchAimMoveRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const joystickRef = useRef<{ moveX: number; moveY: number; isMoving: boolean; aimX: number; aimY: number; isAiming: boolean }>({
    moveX: 0,
    moveY: 0,
    isMoving: false,
    aimX: 0,
    aimY: 0,
    isAiming: false
  });

  // Game arrays refs
  const enemiesRef = useRef<Enemy[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const lootRef = useRef<LootItem[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const textsRef = useRef<FloatingText[]>([]);

  // Screen shake and tracking refs
  const shakeRef = useRef<{ duration: number; intensity: number }>({ duration: 0, intensity: 0 });
  const lastTimeRef = useRef<number>(0);
  const totalPlayTimeRef = useRef<number>(0);
  const currentWaveRef = useRef<number>(1);
  const scoreRef = useRef<number>(0);
  const waveActiveRef = useRef<boolean>(false);
  const waveEnemyCountToSpawnRef = useRef<number>(0);
  const waveSpawnCooldownRef = useRef<number>(0);
  const gamePausedRef = useRef<boolean>(false);

  // Powerup active frames refs
  const speedPowerupFramesRef = useRef<number>(0);
  const dmgPowerupFramesRef = useRef<number>(0);

  // Fetch High Scores on Mount
  useEffect(() => {
    const scores = localStorage.getItem('omon_qolish_highscores');
    if (scores) {
      try {
        setHighScores(JSON.parse(scores));
      } catch (e) {
        setHighScores([]);
      }
    } else {
      // Seed default scores
      const defaults: HighScore[] = [
        { name: 'Sardor', score: 2500, wave: 8, time: 210, date: '2026-07-01' },
        { name: 'Laylo', score: 1200, wave: 5, time: 135, date: '2026-07-02' },
        { name: 'Ibrohim', score: 800, wave: 3, time: 90, date: '2026-07-03' }
      ];
      localStorage.setItem('omon_qolish_highscores', JSON.stringify(defaults));
      setHighScores(defaults);
    }

    // Check if the user is on a touch device
    const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    setTouchControlsEnabled(isTouch);
  }, []);

  // Sync mute state to Synth
  useEffect(() => {
    sfx.muted = isMuted;
  }, [isMuted]);

  // Handle ResizeObserver to resize Canvas properly
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // Keep a minimum height & aspect ratio
        const finalWidth = width || 800;
        const finalHeight = Math.max(height || 500, 400);
        setCanvasDimensions({ width: finalWidth, height: finalHeight });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // All Perks List Definition
  const ALL_PERKS: Perk[] = useMemo(() => [
    {
      id: 'max_hp',
      title: "Maksimal Sog'liq +25",
      description: "Maksimal sog'liq (HP) miqdorini 25 taga oshiradi va to'liq davolaydi.",
      iconName: 'Heart',
      color: '#ef4444',
      effect: (p) => {
        p.maxHp += 25;
        p.hp = p.maxHp;
      }
    },
    {
      id: 'speed_boost',
      title: "Tezkor Qadam",
      description: "Harakat tezligini doimiy ravishha 15% ga oshiradi.",
      iconName: 'Zap',
      color: '#06b6d4',
      effect: (p) => {
        p.speed *= 1.15;
      }
    },
    {
      id: 'fire_rate',
      title: "Tezkor Otish",
      description: "Qurol otish tezligini 20% ga oshiradi.",
      iconName: 'Swords',
      color: '#fbbf24',
      effect: (p) => {
        p.fireRate = Math.max(100, p.fireRate * 0.8);
      }
    },
    {
      id: 'damage_boost',
      title: "Og'ir Kalibr",
      description: "O'q zarar berish kuchini doimiy 25% ga oshiradi.",
      iconName: 'Flame',
      color: '#f97316',
      effect: (p) => {
        p.dmg = Math.round(p.dmg * 1.25);
      }
    },
    {
      id: 'double_shot',
      title: "Qo'shaloq O'q",
      description: "Yonma-yon ikkita o'q otadi (Duble shot).",
      iconName: 'Crosshair',
      color: '#10b981',
      effect: (p) => {
        p.doubleShot = true;
      }
    },
    {
      id: 'triple_shot',
      title: "Uch Tarmoqli O'q",
      description: "Keng burchak ostida uchta o'q otadi (Triple shot).",
      iconName: 'Target',
      color: '#8b5cf6',
      effect: (p) => {
        p.tripleShot = true;
      }
    },
    {
      id: 'shield_up',
      title: "Energetik Qalqon",
      description: "Maksimal Qalqonni +30 HP ga oshiradi va to'liq to'ldiradi.",
      iconName: 'Shield',
      color: '#3b82f6',
      effect: (p) => {
        p.maxShieldHp += 30;
        p.shieldHp = p.maxShieldHp;
      }
    },
    {
      id: 'pierce_up',
      title: "O'tuvchi O'q",
      description: "O'q dushmanlar ichidan teshib o'tish sonini +1 taga oshiradi.",
      iconName: 'Sparkles',
      color: '#ec4899',
      effect: (p) => {
        p.pierceCount += 1;
      }
    },
    {
      id: 'magnet_up',
      title: "Gems Magniti",
      description: "Tajriba toshlarini (XP gems) tortish radiusini +60px ga oshiradi.",
      iconName: 'Magnet',
      color: '#14b8a6',
      effect: (p) => {
        p.magnetRadius += 60;
      }
    },
    {
      id: 'crit_chance',
      title: "Kritik Zarba Ehtimoli",
      description: "2 barobar kuchliroq zarar beruvchi Kritik zarba imkoniyatini +15% ga oshiradi.",
      iconName: 'Trophy',
      color: '#e11d48',
      effect: (p) => {
        p.critChance = Math.min(0.8, p.critChance + 0.15);
      }
    }
  ], []);

  // Start the Game
  const startGame = () => {
    sfx.init();
    
    // Reset core stats refs
    playerRef.current = {
      x: MAP_SIZE / 2,
      y: MAP_SIZE / 2,
      radius: 18,
      hp: 100,
      maxHp: 100,
      speed: 4.2,
      level: 1,
      xp: 0,
      xpNeeded: 100,
      dmg: 20,
      fireCooldown: 0,
      fireRate: 280,
      bulletSpeed: 9,
      pierceCount: 1,
      isInvulnerable: 0,
      shieldHp: 0,
      maxShieldHp: 0,
      doubleShot: false,
      tripleShot: false,
      magnetRadius: 130,
      critChance: 0.1,
      angle: 0
    };

    enemiesRef.current = [];
    bulletsRef.current = [];
    lootRef.current = [];
    particlesRef.current = [];
    textsRef.current = [];
    
    shakeRef.current = { duration: 0, intensity: 0 };
    lastTimeRef.current = performance.now();
    totalPlayTimeRef.current = 0;
    currentWaveRef.current = 1;
    scoreRef.current = 0;
    waveActiveRef.current = false;
    waveEnemyCountToSpawnRef.current = 0;
    waveSpawnCooldownRef.current = 0;
    gamePausedRef.current = false;

    speedPowerupFramesRef.current = 0;
    dmgPowerupFramesRef.current = 0;

    // React state reset
    setScore(0);
    setWave(1);
    setLevel(1);
    setXp(0);
    setXpNeeded(100);
    setPlayerHp(100);
    setPlayerMaxHp(100);
    setPlayerShield(0);
    setPlayerMaxShield(0);
    setGameTime(0);
    setShowScoreSaved(false);

    setGameState('PLAYING');
    startWave(1);
  };

  // Trigger New Wave
  const startWave = (waveNum: number) => {
    currentWaveRef.current = waveNum;
    setWave(waveNum);
    waveActiveRef.current = true;
    
    // Set total enemies to spawn based on wave difficulty
    waveEnemyCountToSpawnRef.current = 8 + waveNum * 4;
    waveSpawnCooldownRef.current = 60; // short buffer before spawns begin

    sfx.playWaveStart();
    setWaveAlert(`${waveNum}-TO'LQIN BOSHLANDI!`);
    setTimeout(() => {
      setWaveAlert(null);
    }, 2500);

    // Add floating text
    addFloatingText(MAP_SIZE / 2, MAP_SIZE / 2 - 100, `Hujumga tayyorlaning! Wave ${waveNum}`, '#ef4444', 24);
  };

  // Helper to add floating texts
  const addFloatingText = (x: number, y: number, text: string, color: string, size = 16) => {
    textsRef.current.push({
      id: Math.random().toString(),
      x,
      y,
      text,
      color,
      size,
      alpha: 1,
      life: 60
    });
  };

  // Helper to spawn explosion particles
  const spawnExplosion = (x: number, y: number, color: string, count = 15, size = 3) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1.5;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * size + 1.5,
        color,
        alpha: 1,
        decay: Math.random() * 0.02 + 0.015,
        life: 60
      });
    }
  };

  // Trigger Level Up Perk Selection
  const triggerLevelUp = () => {
    sfx.playLevelUp();
    gamePausedRef.current = true;

    // Select 3 random perks from pool
    const poolCopy = [...ALL_PERKS];
    const chosenPerks: Perk[] = [];
    
    // Ensure we don't get duplicate perks in one screen
    for (let i = 0; i < 3; i++) {
      if (poolCopy.length === 0) break;
      const rIdx = Math.floor(Math.random() * poolCopy.length);
      chosenPerks.push(poolCopy[rIdx]);
      poolCopy.splice(rIdx, 1);
    }

    setUpgradePool(chosenPerks);
    setGameState('UPGRADE');
  };

  // Apply Selected Perk
  const selectPerk = (perk: Perk) => {
    perk.effect(playerRef.current);
    
    // Sync to React HUD state
    setPlayerMaxHp(playerRef.current.maxHp);
    setPlayerHp(playerRef.current.hp);
    setPlayerMaxShield(playerRef.current.maxShieldHp);
    setPlayerShield(playerRef.current.shieldHp);

    sfx.playCollect();
    
    // Resume game
    gamePausedRef.current = false;
    setGameState('PLAYING');
    
    // Clear pressed keys buffer to avoid slide bugs
    keysPressedRef.current = {};
    joystickRef.current = { moveX: 0, moveY: 0, isMoving: false, aimX: 0, aimY: 0, isAiming: false };
    
    addFloatingText(playerRef.current.x, playerRef.current.y - 40, `${perk.title} faollashdi!`, '#10b981', 18);
  };

  // Save Score
  const saveHighScore = () => {
    const newEntry: HighScore = {
      name: playerName.trim() || 'Jangchi',
      score: scoreRef.current,
      wave: currentWaveRef.current,
      time: Math.floor(totalPlayTimeRef.current),
      date: new Date().toISOString().split('T')[0]
    };

    const updated = [...highScores, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 8); // Keep top 8 scores

    localStorage.setItem('omon_qolish_highscores', JSON.stringify(updated));
    setHighScores(updated);
    setShowScoreSaved(true);
  };

  // Fire Projectile
  const firePlayerBullet = () => {
    const player = playerRef.current;
    
    // Apply double damage powerup visual boost
    const dmgVal = dmgPowerupFramesRef.current > 0 ? player.dmg * 2 : player.dmg;
    const bulletColor = dmgPowerupFramesRef.current > 0 ? '#fbbf24' : '#22d3ee';

    sfx.playShoot();
    
    // Weapon shake!
    shakeRef.current = { duration: 5, intensity: player.doubleShot || player.tripleShot ? 3 : 1.5 };

    if (player.tripleShot) {
      // 3 bullets: center, left, right spreads
      const spreadAngles = [player.angle, player.angle - 0.25, player.angle + 0.25];
      spreadAngles.forEach((angle) => {
        bulletsRef.current.push({
          id: Math.random().toString(),
          x: player.x + Math.cos(player.angle) * player.radius,
          y: player.y + Math.sin(player.angle) * player.radius,
          vx: Math.cos(angle) * player.bulletSpeed,
          vy: Math.sin(angle) * player.bulletSpeed,
          radius: 5,
          dmg: dmgVal,
          isEnemy: false,
          pierceLeft: player.pierceCount,
          color: bulletColor
        });
      });
    } else if (player.doubleShot) {
      // 2 parallel bullets spaced slightly
      const perpAngle = player.angle + Math.PI / 2;
      const offsets = [-8, 8];
      offsets.forEach((offset) => {
        const bx = player.x + Math.cos(player.angle) * player.radius + Math.cos(perpAngle) * offset;
        const by = player.y + Math.sin(player.angle) * player.radius + Math.sin(perpAngle) * offset;
        bulletsRef.current.push({
          id: Math.random().toString(),
          x: bx,
          y: by,
          vx: Math.cos(player.angle) * player.bulletSpeed,
          vy: Math.sin(player.angle) * player.bulletSpeed,
          radius: 5,
          dmg: dmgVal,
          isEnemy: false,
          pierceLeft: player.pierceCount,
          color: bulletColor
        });
      });
    } else {
      // 1 standard bullet
      bulletsRef.current.push({
        id: Math.random().toString(),
        x: player.x + Math.cos(player.angle) * player.radius,
        y: player.y + Math.sin(player.angle) * player.radius,
        vx: Math.cos(player.angle) * player.bulletSpeed,
        vy: Math.sin(player.angle) * player.bulletSpeed,
        radius: 5.5,
        dmg: dmgVal,
        isEnemy: false,
        pierceLeft: player.pierceCount,
        color: bulletColor
      });
    }

    // Spawn tiny muzzle flash particles
    for (let i = 0; i < 3; i++) {
      const angle = player.angle + (Math.random() - 0.5) * 0.4;
      const speed = Math.random() * 3 + player.bulletSpeed * 0.4;
      particlesRef.current.push({
        x: player.x + Math.cos(player.angle) * player.radius,
        y: player.y + Math.sin(player.angle) * player.radius,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 2 + 1,
        color: bulletColor,
        alpha: 0.8,
        decay: 0.05,
        life: 20
      });
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      keysPressedRef.current[e.key] = true;
      keysPressedRef.current[e.key.toLowerCase()] = true;

      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        if (gameState === 'PLAYING') {
          gamePausedRef.current = !gamePausedRef.current;
          setGameState(gamePausedRef.current ? 'PAUSE' : 'PLAYING');
        } else if (gameState === 'PAUSE') {
          gamePausedRef.current = false;
          setGameState('PLAYING');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressedRef.current[e.key] = false;
      keysPressedRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // Main Canvas Core Loop
  useEffect(() => {
    if (gameState !== 'PLAYING') {
      if (loopRef.current) {
        cancelAnimationFrame(loopRef.current);
        loopRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localFrameCount = 0;

    const gameLoop = (timestamp: number) => {
      if (gamePausedRef.current) {
        loopRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      const dt = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;
      
      // Update timer state
      totalPlayTimeRef.current += dt / 1000;
      localFrameCount++;
      if (localFrameCount % 30 === 0) {
        setGameTime(Math.floor(totalPlayTimeRef.current));
      }

      // Update game entities
      updateGame();

      // Render Everything
      drawGame(ctx, canvas.width, canvas.height);

      loopRef.current = requestAnimationFrame(gameLoop);
    };

    loopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (loopRef.current) {
        cancelAnimationFrame(loopRef.current);
        loopRef.current = null;
      }
    };
  }, [gameState, canvasDimensions]);

  // Update Game Entities Mantiqi
  const updateGame = () => {
    const player = playerRef.current;

    // 1. Harmful/Powerup timers decrement
    if (player.isInvulnerable > 0) player.isInvulnerable--;
    if (speedPowerupFramesRef.current > 0) {
      speedPowerupFramesRef.current--;
      if (speedPowerupFramesRef.current % 30 === 0) {
        setActiveSpeedPowerupTime(Math.ceil(speedPowerupFramesRef.current / 60));
      }
    }
    if (dmgPowerupFramesRef.current > 0) {
      dmgPowerupFramesRef.current--;
      if (dmgPowerupFramesRef.current % 30 === 0) {
        setActiveDmgPowerupTime(Math.ceil(dmgPowerupFramesRef.current / 60));
      }
    }

    // 2. Keyboard/Joystick Movement Calculation
    let moveX = 0;
    let moveY = 0;

    if (keysPressedRef.current['w'] || keysPressedRef.current['arrowup']) moveY -= 1;
    if (keysPressedRef.current['s'] || keysPressedRef.current['arrowdown']) moveY += 1;
    if (keysPressedRef.current['a'] || keysPressedRef.current['arrowleft']) moveX -= 1;
    if (keysPressedRef.current['d'] || keysPressedRef.current['arrowright']) moveX += 1;

    // Apply Touch virtual joystick movement if moving
    if (joystickRef.current.isMoving) {
      moveX = joystickRef.current.moveX;
      moveY = joystickRef.current.moveY;
    }

    // Normalize diagonal speed
    const moveLen = Math.hypot(moveX, moveY);
    let finalSpeed = player.speed;
    if (speedPowerupFramesRef.current > 0) {
      finalSpeed *= 1.4; // 40% speed power-up multiplier
    }

    if (moveLen > 0) {
      player.x += (moveX / moveLen) * finalSpeed;
      player.y += (moveY / moveLen) * finalSpeed;
    }

    // Clamp player to MAP_SIZE borders
    player.x = Math.max(player.radius + 15, Math.min(MAP_SIZE - player.radius - 15, player.x));
    player.y = Math.max(player.radius + 15, Math.min(MAP_SIZE - player.radius - 15, player.y));

    // 3. Player Rotation (Mouse Aim vs Virtual joystick aim vs Auto Aim)
    let aimAngle = player.angle;

    // Find closest enemy if auto-aiming or on mobile
    let closestEnemy: Enemy | null = null;
    let minDistance = 99999;
    
    enemiesRef.current.forEach((enemy) => {
      const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
      if (dist < minDistance) {
        minDistance = dist;
        closestEnemy = enemy;
      }
    });

    if (autoShootEnabled && closestEnemy) {
      // Rotate automatically to nearest enemy
      const enemy: Enemy = closestEnemy;
      aimAngle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
    } else if (joystickRef.current.isAiming) {
      aimAngle = Math.atan2(joystickRef.current.aimY, joystickRef.current.aimX);
    } else {
      // Aim towards mouse position in virtual coordinates (incorporating camera offset)
      const canvas = canvasRef.current;
      if (canvas) {
        // Camera offsets (how mapping centers around player)
        const cameraX = player.x - canvas.width / 2;
        const cameraY = player.y - canvas.height / 2;
        
        const targetWorldX = mouseRef.current.x + cameraX;
        const targetWorldY = mouseRef.current.y + cameraY;
        aimAngle = Math.atan2(targetWorldY - player.y, targetWorldX - player.x);
      }
    }
    player.angle = aimAngle;

    // 4. Weapon fire trigger cooldowns
    if (player.fireCooldown > 0) {
      player.fireCooldown -= 16.67; // approx ms per frame
    }

    const fireRequest = mouseRef.current.isDown || 
                          keysPressedRef.current[' '] || 
                          (autoShootEnabled && enemiesRef.current.length > 0) ||
                          joystickRef.current.isAiming;

    if (fireRequest && player.fireCooldown <= 0) {
      firePlayerBullet();
      player.fireCooldown = player.fireRate;
    }

    // 5. Update Bullets
    const bullets = bulletsRef.current;
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.x += b.vx;
      b.y += b.vy;

      // Add a tiny bullet smoke trail particle
      if (Math.random() < 0.2) {
        particlesRef.current.push({
          x: b.x,
          y: b.y,
          vx: (Math.random() - 0.5) * 1,
          vy: (Math.random() - 0.5) * 1,
          radius: 1.5,
          color: b.color,
          alpha: 0.4,
          decay: 0.03,
          life: 15
        });
      }

      // Remove bullet out of maps or out of camera viewport bounds (optional, let's keep it strictly in arena boundaries)
      if (b.x < 0 || b.x > MAP_SIZE || b.y < 0 || b.y > MAP_SIZE) {
        bullets.splice(i, 1);
      }
    }

    // 6. Update Enemies & Spawns
    const enemies = enemiesRef.current;

    // Handle Spawning Wave Dushmanlar
    if (waveActiveRef.current) {
      if (waveSpawnCooldownRef.current > 0) {
        waveSpawnCooldownRef.current--;
      } else if (waveEnemyCountToSpawnRef.current > 0) {
        spawnWaveEnemy();
        // Spawning cooldown scales slightly down for faster actions on high waves
        waveSpawnCooldownRef.current = Math.max(15, 60 - currentWaveRef.current * 3);
      } else if (enemies.length === 0) {
        // Wave cleared!
        waveActiveRef.current = false;
        const nextW = currentWaveRef.current + 1;
        
        // Give bonuses on clearing wave
        addFloatingText(player.x, player.y - 70, `TO'LQIN ${currentWaveRef.current} CLEAR!`, '#3b82f6', 22);
        scoreRef.current += currentWaveRef.current * 150;
        setScore(scoreRef.current);

        // Transition to next wave automatically after a brief pause
        setTimeout(() => {
          if (gamePausedRef.current) return;
          // Trigger upgrade or trigger next wave
          // Every level/wave clear can trigger perk upgrade
          startWave(nextW);
        }, 3000);
      }
    }

    // Move, update, and steer enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      
      if (enemy.hitFlash > 0) enemy.hitFlash--;

      // Follow player vector calculation
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 5) {
        enemy.x += (dx / dist) * enemy.speed;
        enemy.y += (dy / dist) * enemy.speed;
      }

      // BOSS shooting mechanism
      if (enemy.type === 'BOSS') {
        if (enemy.bossShootCooldown === undefined) enemy.bossShootCooldown = 120;
        enemy.bossShootCooldown--;
        if (enemy.bossShootCooldown <= 0) {
          enemy.bossShootCooldown = 130 - Math.min(60, currentWaveRef.current * 5); // Shoots faster in higher waves
          // Fire circular projectiles
          const shotCount = 8;
          for (let j = 0; j < shotCount; j++) {
            const bAngle = (Math.PI * 2 / shotCount) * j;
            bulletsRef.current.push({
              id: Math.random().toString(),
              x: enemy.x + Math.cos(bAngle) * enemy.radius,
              y: enemy.y + Math.sin(bAngle) * enemy.radius,
              vx: Math.cos(bAngle) * 4.5,
              vy: Math.sin(bAngle) * 4.5,
              radius: 7,
              dmg: 20,
              isEnemy: true,
              pierceLeft: 1,
              color: '#a78bfa' // purple enemy bullets
            });
          }
          addFloatingText(enemy.x, enemy.y - enemy.radius - 10, 'Yulduz Hujumi!', '#a78bfa', 15);
        }
      }

      // Avoidance / Soft steering force (push away from overlapping enemies)
      for (let j = i - 1; j >= 0; j--) {
        const other = enemies[j];
        const ex = other.x - enemy.x;
        const ey = other.y - enemy.y;
        const edist = Math.hypot(ex, ey);
        const minDist = enemy.radius + other.radius;
        if (edist < minDist && edist > 0) {
          const overlap = minDist - edist;
          const forceX = (ex / edist) * overlap * 0.25;
          const forceY = (ey / edist) * overlap * 0.25;
          
          enemy.x -= forceX;
          enemy.y -= forceY;
          other.x += forceX;
          other.y += forceY;
        }
      }

      // Clash with player
      const pDist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
      if (pDist < player.radius + enemy.radius) {
        if (enemy.type === 'KAMIKADZE') {
          // Kamikadze explodes on contact, doing high damage
          damagePlayer(enemy.dmg);
          spawnExplosion(enemy.x, enemy.y, '#ec4899', 20, 4);
          sfx.playExplode();
          enemies.splice(i, 1);
          continue;
        } else {
          damagePlayer(enemy.dmg);
        }
      }
    }

    // 7. Check Bullet Collisions
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];

      if (b.isEnemy) {
        // Enemy bullet vs Player
        const dist = Math.hypot(player.x - b.x, player.y - b.y);
        if (dist < player.radius + b.radius) {
          damagePlayer(b.dmg);
          bullets.splice(i, 1);
          continue;
        }
      } else {
        // Player bullet vs Enemies
        for (let j = enemies.length - 1; j >= 0; j--) {
          const enemy = enemies[j];
          const dist = Math.hypot(enemy.x - b.x, enemy.y - b.y);
          if (dist < enemy.radius + b.radius) {
            // Collision!
            enemy.hitFlash = 5;
            
            // Critical calculation
            const isCrit = Math.random() < player.critChance;
            const finalDmg = isCrit ? b.dmg * 2 : b.dmg;

            enemy.hp -= finalDmg;
            
            // Sound and text feedback
            sfx.playHit();
            addFloatingText(enemy.x, enemy.y - 15, `${finalDmg}${isCrit ? '!' : ''}`, isCrit ? '#fbbf24' : '#ffffff', isCrit ? 20 : 15);

            // Splash particles at impact site
            const angle = Math.atan2(b.vy, b.vx);
            for (let k = 0; k < 5; k++) {
              const sparkAngle = angle + Math.PI + (Math.random() - 0.5) * 1.5;
              const speed = Math.random() * 3 + 1;
              particlesRef.current.push({
                x: b.x,
                y: b.y,
                vx: Math.cos(sparkAngle) * speed,
                vy: Math.sin(sparkAngle) * speed,
                radius: Math.random() * 2 + 1,
                color: enemy.color,
                alpha: 0.8,
                decay: 0.04,
                life: 30
              });
            }

            // Reduce pierce left
            b.pierceLeft--;
            if (b.pierceLeft <= 0) {
              bullets.splice(i, 1);
              break; // break out of enemy collision loop for this bullet
            }

            // Check if enemy is dead
            if (enemy.hp <= 0) {
              handleEnemyKilled(enemy);
              enemies.splice(j, 1);
            }
          }
        }
      }
    }

    // 8. Update Loot and Magnets Pull
    const loots = lootRef.current;
    for (let i = loots.length - 1; i >= 0; i--) {
      const item = loots[i];
      item.pulseTimer += 0.07;

      const dx = player.x - item.x;
      const dy = player.y - item.y;
      const dist = Math.hypot(dx, dy);

      // Check Magnetic Attraction
      if (dist < player.magnetRadius) {
        const pullSpeed = Math.max(2, (player.magnetRadius - dist) * 0.08);
        item.x += (dx / dist) * pullSpeed;
        item.y += (dy / dist) * pullSpeed;
      }

      // Pick up item collision
      const checkRadius = player.radius + item.radius;
      if (dist < checkRadius) {
        collectLootItem(item);
        loots.splice(i, 1);
        continue;
      }

      // Expire old items (excluding gems) - they blink after 10s and die at 15s
      const age = Date.now() - item.createdAt;
      if (item.type !== 'XP' && age > 15000) {
        loots.splice(i, 1);
      }
    }

    // 9. Update Particles
    const particles = particlesRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96; // drag
      p.vy *= 0.96;
      p.alpha -= p.decay;
      p.life--;

      if (p.alpha <= 0 || p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // 10. Update Floating texts
    const texts = textsRef.current;
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      t.y -= 0.8; // Float up
      t.life--;
      t.alpha = t.life / 60;

      if (t.life <= 0) {
        texts.splice(i, 1);
      }
    }
  };

  // Damage Player Logic
  const damagePlayer = (dmgAmount: number) => {
    const player = playerRef.current;
    if (player.isInvulnerable > 0) return;

    // Apply shield absorption
    if (player.shieldHp > 0) {
      player.shieldHp -= dmgAmount;
      addFloatingText(player.x, player.y - 30, `Qalqon -${dmgAmount}`, '#3b82f6', 15);
      sfx.playHit();
      
      if (player.shieldHp < 0) {
        // Shield broke
        const carryOver = Math.abs(player.shieldHp);
        player.shieldHp = 0;
        player.hp -= carryOver;
        addFloatingText(player.x, player.y - 50, `Sog'liq -${carryOver}`, '#ef4444', 16);
      }
    } else {
      player.hp -= dmgAmount;
      addFloatingText(player.x, player.y - 30, `-${dmgAmount}`, '#ef4444', 16);
      sfx.playHit();
    }

    // Render feedback state
    setPlayerHp(Math.max(0, player.hp));
    setPlayerShield(Math.max(0, player.shieldHp));

    // Shake camera!
    shakeRef.current = { duration: 15, intensity: 8 };

    // Invulnerability frames
    player.isInvulnerable = 35; // ~0.6 seconds

    // Spark damage particles around player
    spawnExplosion(player.x, player.y, '#ef4444', 10, 2);

    if (player.hp <= 0) {
      // Game over!
      setGameState('GAMEOVER');
      sfx.playGameOver();
      if (loopRef.current) {
        cancelAnimationFrame(loopRef.current);
        loopRef.current = null;
      }
    }
  };

  // Collect Loot
  const collectLootItem = (item: LootItem) => {
    const player = playerRef.current;
    sfx.playCollect();

    if (item.type === 'XP') {
      const xpVal = item.amount || 10;
      player.xp += xpVal;
      setXp(player.xp);

      // Spark purple particles
      for (let i = 0; i < 4; i++) {
        particlesRef.current.push({
          x: item.x,
          y: item.y,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3,
          radius: 1.5,
          color: '#c084fc',
          alpha: 0.9,
          decay: 0.05,
          life: 20
        });
      }

      // Check level-up
      if (player.xp >= player.xpNeeded) {
        player.xp -= player.xpNeeded;
        player.level += 1;
        player.xpNeeded = 100 + (player.level - 1) * 60;
        
        setLevel(player.level);
        setXp(player.xp);
        setXpNeeded(player.xpNeeded);

        triggerLevelUp();
      }
    } else if (item.type === 'APTECHKA') {
      const healAmt = Math.round(player.maxHp * 0.3); // 30% restore
      player.hp = Math.min(player.maxHp, player.hp + healAmt);
      setPlayerHp(player.hp);
      addFloatingText(player.x, player.y - 45, `+${healAmt} SOG'LIQ`, '#10b981', 17);
      spawnExplosion(player.x, player.y, '#10b981', 12, 2.5);
    } else if (item.type === 'TEZLIK') {
      speedPowerupFramesRef.current = 480; // 8 seconds at 60 FPS
      setActiveSpeedPowerupTime(8);
      addFloatingText(player.x, player.y - 45, `TEZLIK SHIDDATI!`, '#06b6d4', 17);
      spawnExplosion(player.x, player.y, '#06b6d4', 12, 2.5);
    } else if (item.type === 'KUCH') {
      dmgPowerupFramesRef.current = 360; // 6 seconds at 60 FPS
      setActiveDmgPowerupTime(6);
      addFloatingText(player.x, player.y - 45, `ZARAR KUCHI X2!`, '#fbbf24', 17);
      spawnExplosion(player.x, player.y, '#fbbf24', 12, 2.5);
    } else if (item.type === 'QALQON') {
      const maxShield = player.maxShieldHp || 50;
      if (player.maxShieldHp === 0) {
        player.maxShieldHp = 50;
        setPlayerMaxShield(50);
      }
      player.shieldHp = Math.min(player.maxShieldHp, player.shieldHp + 40);
      setPlayerShield(player.shieldHp);
      addFloatingText(player.x, player.y - 45, `QALQON TIKLANDI`, '#3b82f6', 17);
      spawnExplosion(player.x, player.y, '#3b82f6', 12, 2.5);
    }
  };

  // Enemy Killed Handler
  const handleEnemyKilled = (enemy: Enemy) => {
    sfx.playExplode(enemy.type === 'BOSS');
    spawnExplosion(enemy.x, enemy.y, enemy.color, enemy.type === 'BOSS' ? 45 : 12, enemy.type === 'BOSS' ? 6 : 3);
    
    // Add score
    scoreRef.current += enemy.scoreValue;
    setScore(scoreRef.current);

    // Drop XP Gem
    lootRef.current.push({
      id: Math.random().toString(),
      type: 'XP',
      x: enemy.x,
      y: enemy.y,
      radius: 5,
      color: '#c084fc', // purple xp gem
      amount: enemy.xpValue,
      createdAt: Date.now(),
      pulseTimer: Math.random() * 10
    });

    // Loot Drop Chance (14% regular, 100% for Boss)
    const dropChance = enemy.type === 'BOSS' ? 1.0 : 0.14;
    if (Math.random() < dropChance) {
      const types: LootType[] = ['APTECHKA', 'TEZLIK', 'KUCH', 'QALQON'];
      // Random choice
      const randomType = types[Math.floor(Math.random() * types.length)];
      
      let itemColor = '#10b981';
      if (randomType === 'TEZLIK') itemColor = '#06b6d4';
      if (randomType === 'KUCH') itemColor = '#fbbf24';
      if (randomType === 'QALQON') itemColor = '#3b82f6';

      lootRef.current.push({
        id: Math.random().toString(),
        type: randomType,
        x: enemy.x + (Math.random() - 0.5) * 20,
        y: enemy.y + (Math.random() - 0.5) * 20,
        radius: 9,
        color: itemColor,
        createdAt: Date.now(),
        pulseTimer: Math.random() * 10
      });

      // Spawn special sparks for drops
      for (let k = 0; k < 6; k++) {
        particlesRef.current.push({
          x: enemy.x,
          y: enemy.y,
          vx: (Math.random() - 0.5) * 4,
          vy: (Math.random() - 0.5) * 4,
          radius: 2,
          color: itemColor,
          alpha: 0.9,
          decay: 0.04,
          life: 30
        });
      }
    }
  };

  // Spawn Enemy Logic based on Wave Difficulty
  const spawnWaveEnemy = () => {
    waveEnemyCountToSpawnRef.current--;

    const waveNum = currentWaveRef.current;
    
    // Pick type based on wave weight ratios
    let type: EnemyType = 'KICHIK';
    const r = Math.random();

    if (waveNum === 5 && waveEnemyCountToSpawnRef.current === 0) {
      // Last spawn of Wave 5 is a giant BOSS
      type = 'BOSS';
    } else if (waveNum >= 5 && r < 0.05) {
      type = 'BOSS'; // Rare boss in later waves
    } else if (waveNum >= 4 && r < 0.20) {
      type = 'KATTA';
    } else if (waveNum >= 3 && r < 0.45) {
      type = 'KAMIKADZE';
    } else if (waveNum >= 2 && r < 0.70) {
      type = 'ORTA';
    } else {
      type = 'KICHIK';
    }

    // Calculate spawning position: Offscreen circular boundary, centered around player, but clamped in virtual MAP
    const player = playerRef.current;
    const spawnDist = 450; // just beyond standard viewport
    const angle = Math.random() * Math.PI * 2;
    
    let sx = player.x + Math.cos(angle) * spawnDist;
    let sy = player.y + Math.sin(angle) * spawnDist;

    // Clamp coordinates to map
    sx = Math.max(40, Math.min(MAP_SIZE - 40, sx));
    sy = Math.max(40, Math.min(MAP_SIZE - 40, sy));

    // Dynamic stats scale per wave
    const waveHpMult = 1 + (waveNum - 1) * 0.16;
    const waveSpdMult = Math.min(1.4, 1 + (waveNum - 1) * 0.04);

    let enemyStats = {
      radius: 12,
      hp: Math.round(30 * waveHpMult),
      speed: 2.5 * waveSpdMult,
      dmg: 8,
      scoreValue: 50,
      xpValue: 12,
      color: '#10b981' // emerald green
    };

    if (type === 'ORTA') {
      enemyStats = {
        radius: 16,
        hp: Math.round(60 * waveHpMult),
        speed: 1.8 * waveSpdMult,
        dmg: 15,
        scoreValue: 100,
        xpValue: 24,
        color: '#f59e0b' // amber
      };
    } else if (type === 'KATTA') {
      enemyStats = {
        radius: 23,
        hp: Math.round(180 * waveHpMult),
        speed: 1.1 * waveSpdMult,
        dmg: 28,
        scoreValue: 250,
        xpValue: 60,
        color: '#ef4444' // red rose
      };
    } else if (type === 'KAMIKADZE') {
      enemyStats = {
        radius: 11,
        hp: Math.round(20 * waveHpMult),
        speed: 3.4 * waveSpdMult,
        dmg: 22,
        scoreValue: 80,
        xpValue: 20,
        color: '#ec4899' // hot pink
      };
    } else if (type === 'BOSS') {
      enemyStats = {
        radius: 35,
        hp: Math.round((450 + waveNum * 120) * waveHpMult * 0.7),
        speed: 0.95 * waveSpdMult,
        dmg: 35,
        scoreValue: 1000,
        xpValue: 200,
        color: '#8b5cf6' // violet purple
      };
    }

    enemiesRef.current.push({
      id: Math.random().toString(),
      type,
      x: sx,
      y: sy,
      radius: enemyStats.radius,
      hp: enemyStats.hp,
      maxHp: enemyStats.hp,
      speed: enemyStats.speed,
      dmg: enemyStats.dmg,
      scoreValue: enemyStats.scoreValue,
      xpValue: enemyStats.xpValue,
      color: enemyStats.color,
      hitFlash: 0
    });
  };

  // Draw Game Loop Canvas Elements
  const drawGame = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const player = playerRef.current;

    // Reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Clear Canvas with dark gradient
    ctx.fillStyle = '#0a050f';
    ctx.fillRect(0, 0, width, height);

    // Calculate camera target offset
    // Camera is centered around player, clamped to MAP_SIZE borders
    const cameraX = Math.max(0, Math.min(MAP_SIZE - width, player.x - width / 2));
    const cameraY = Math.max(0, Math.min(MAP_SIZE - height, player.y - height / 2));

    ctx.save();

    // Screen Shake apply
    if (shakeRef.current.duration > 0) {
      const shakeX = (Math.random() - 0.5) * shakeRef.current.intensity;
      const shakeY = (Math.random() - 0.5) * shakeRef.current.intensity;
      ctx.translate(shakeX, shakeY);
      shakeRef.current.duration--;
    }

    // Apply Camera translation
    ctx.translate(-cameraX, -cameraY);

    // 1. Draw Grid Arena Floor Lines
    ctx.strokeStyle = '#1d0b28';
    ctx.lineWidth = 1.2;
    const gridSize = 80;
    
    // Draw horizontal lines
    for (let y = 0; y <= MAP_SIZE; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(MAP_SIZE, y);
      ctx.stroke();
    }
    // Draw vertical lines
    for (let x = 0; x <= MAP_SIZE; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, MAP_SIZE);
      ctx.stroke();
    }

    // 2. Draw Arena Borders Red Alert Danger Area
    ctx.strokeStyle = '#e11d48';
    ctx.lineWidth = 12;
    ctx.lineJoin = 'round';
    ctx.strokeRect(0, 0, MAP_SIZE, MAP_SIZE);
    
    // Highlight inner caution area
    ctx.strokeStyle = 'rgba(225, 29, 72, 0.15)';
    ctx.lineWidth = 30;
    ctx.strokeRect(15, 15, MAP_SIZE - 30, MAP_SIZE - 30);

    // 3. Draw Loot Items
    lootRef.current.forEach((item) => {
      ctx.save();
      
      // Floating pulse size
      const pulseSize = Math.sin(item.pulseTimer) * 1.8;
      const currentRadius = item.radius + pulseSize;

      // Glow effect shadow
      ctx.shadowBlur = 12;
      ctx.shadowColor = item.color;

      if (item.type === 'XP') {
        // Draw purple diamond
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.moveTo(item.x, item.y - currentRadius);
        ctx.lineTo(item.x + currentRadius, item.y);
        ctx.lineTo(item.x, item.y + currentRadius);
        ctx.lineTo(item.x - currentRadius, item.y);
        ctx.closePath();
        ctx.fill();
        
        // Inner white shine
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(item.x, item.y - currentRadius * 0.4);
        ctx.lineTo(item.x + currentRadius * 0.4, item.y);
        ctx.lineTo(item.x, item.y + currentRadius * 0.4);
        ctx.lineTo(item.x - currentRadius * 0.4, item.y);
        ctx.closePath();
        ctx.fill();
      } else {
        // Draw powerup canisters with outline
        ctx.fillStyle = '#000000';
        ctx.strokeStyle = item.color;
        ctx.lineWidth = 2.5;
        
        ctx.beginPath();
        ctx.arc(item.x, item.y, currentRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw inner symbols for visual cues
        ctx.fillStyle = item.color;
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let label = '+';
        if (item.type === 'APTECHKA') label = 'H';
        if (item.type === 'TEZLIK') label = '⚡';
        if (item.type === 'KUCH') label = '★';
        if (item.type === 'QALQON') label = '🛡';
        
        ctx.fillText(label, item.x, item.y);
      }
      ctx.restore();
    });

    // 4. Draw Bullets
    bulletsRef.current.forEach((b) => {
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = b.color;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // 5. Draw Enemies
    enemiesRef.current.forEach((enemy) => {
      ctx.save();

      // Flash on hit effect
      if (enemy.hitFlash > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffffff';
      } else {
        ctx.fillStyle = enemy.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = enemy.color;
      }

      // Draw specialized graphics per enemy type
      if (enemy.type === 'KICHIK') {
        // Starry/Insect style
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Antenna/claws towards player
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const angle = Math.atan2(dy, dx);
        
        ctx.strokeStyle = enemy.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y);
        ctx.lineTo(enemy.x + Math.cos(angle - 0.4) * (enemy.radius + 6), enemy.y + Math.sin(angle - 0.4) * (enemy.radius + 6));
        ctx.moveTo(enemy.x, enemy.y);
        ctx.lineTo(enemy.x + Math.cos(angle + 0.4) * (enemy.radius + 6), enemy.y + Math.sin(angle + 0.4) * (enemy.radius + 6));
        ctx.stroke();
      } else if (enemy.type === 'ORTA') {
        // Hexagonal Spikey look
        const spikes = 6;
        ctx.beginPath();
        for (let j = 0; j < spikes; j++) {
          const angle = (Math.PI * 2 / spikes) * j;
          const rx = enemy.x + Math.cos(angle) * (enemy.radius + 4);
          const ry = enemy.y + Math.sin(angle) * (enemy.radius + 4);
          ctx.lineTo(rx, ry);
          const innerAngle = angle + (Math.PI / spikes);
          const irx = enemy.x + Math.cos(innerAngle) * enemy.radius;
          const iry = enemy.y + Math.sin(innerAngle) * enemy.radius;
          ctx.lineTo(irx, iry);
        }
        ctx.closePath();
        ctx.fill();
      } else if (enemy.type === 'KATTA') {
        // Rugged square-like heavy fortress dushman
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 3;
        ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius, enemy.radius * 2, enemy.radius * 2);
        ctx.strokeRect(enemy.x - enemy.radius, enemy.y - enemy.radius, enemy.radius * 2, enemy.radius * 2);
        
        // Inner glowing core
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (enemy.type === 'KAMIKADZE') {
        // Pulsing core triangle/spiky mine
        const agePulse = Math.sin(Date.now() * 0.02) * 2;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius + agePulse, 0, Math.PI * 2);
        ctx.fill();
        
        // Danger glowing line indicators
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, (enemy.radius + agePulse) * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      } else if (enemy.type === 'BOSS') {
        // Epic giant core with rotating spikes
        const rAngle = (Date.now() * 0.002) % (Math.PI * 2);
        const spikes = 8;
        
        // Spinning ring
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius * 1.15, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        for (let j = 0; j < spikes; j++) {
          const angle = rAngle + (Math.PI * 2 / spikes) * j;
          const rx = enemy.x + Math.cos(angle) * (enemy.radius * 1.35);
          const ry = enemy.y + Math.sin(angle) * (enemy.radius * 1.35);
          ctx.lineTo(rx, ry);
          const innerAngle = angle + (Math.PI / spikes);
          const irx = enemy.x + Math.cos(innerAngle) * enemy.radius;
          const iry = enemy.y + Math.sin(innerAngle) * enemy.radius;
          ctx.lineTo(irx, iry);
        }
        ctx.closePath();
        ctx.fill();

        // Draw BOSS individual health bar directly above its head
        const barW = enemy.radius * 2;
        const barH = 6;
        const bx = enemy.x - enemy.radius;
        const by = enemy.y - enemy.radius - 18;
        
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(bx, by, barW, barH);
        
        const healthPct = Math.max(0, enemy.hp / enemy.maxHp);
        ctx.fillStyle = '#a78bfa'; // violet purple hp
        ctx.fillRect(bx, by, barW * healthPct, barH);
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, barW, barH);
      }

      ctx.restore();
    });

    // 6. Draw Player (Hero Ship/Robot Mech)
    ctx.save();
    
    // Draw invulnerability blinking frame
    if (player.isInvulnerable > 0 && Math.floor(player.isInvulnerable / 4) % 2 === 0) {
      // Blink skip render to show immunity
    } else {
      // Glow player
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#06b6d4';

      // Draw glowing thrust trail if moving
      const isMoving = keysPressedRef.current['w'] || keysPressedRef.current['s'] || keysPressedRef.current['a'] || keysPressedRef.current['d'] || joystickRef.current.isMoving;
      if (isMoving) {
        ctx.save();
        const trailAngle = player.angle + Math.PI;
        ctx.fillStyle = 'rgba(6, 182, 212, 0.7)';
        ctx.beginPath();
        ctx.arc(
          player.x + Math.cos(trailAngle) * player.radius,
          player.y + Math.sin(trailAngle) * player.radius,
          player.radius * 0.45,
          0,
          Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
      }

      // Main circular ship body
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3.5;
      
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Gun turret barrel pointing towards cursor angle
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.angle);
      
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2.5;
      
      // Draw twin barrels if double or triple shot
      if (player.doubleShot || player.tripleShot) {
        ctx.fillRect(5, -7, 18, 5);
        ctx.strokeRect(5, -7, 18, 5);
        ctx.fillRect(5, 2, 18, 5);
        ctx.strokeRect(5, 2, 18, 5);
      } else {
        ctx.fillRect(5, -3.5, 20, 7);
        ctx.strokeRect(5, -3.5, 20, 7);
      }
      ctx.restore();

      // Draw subtle green HP ring below player
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 6, 0, Math.PI * 2 * (player.hp / player.maxHp));
      ctx.stroke();

      // Draw energetic protective shield bubble
      if (player.shieldHp > 0) {
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.85)';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#3b82f6';
        ctx.shadowBlur = 12;
        
        // Spinning dash pattern
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius + 12, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.restore();

    // 7. Draw Visual Splash & Explosion Particles
    particlesRef.current.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 8. Draw Floating Damage & Bonus Texts
    textsRef.current.forEach((t) => {
      ctx.save();
      ctx.globalAlpha = t.alpha;
      ctx.fillStyle = t.color;
      ctx.shadowColor = 'rgba(0,0,0,1)';
      ctx.shadowBlur = 5;
      ctx.font = `bold ${t.size}px "Space Grotesk", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    });

    ctx.restore(); // restore camera transform
  };

  // Keyboard and Drag Event handlers on Canvas wrapper
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    mouseRef.current.x = e.clientX - rect.left;
    mouseRef.current.y = e.clientY - rect.top;
  };

  const handleMouseDown = () => {
    mouseRef.current.isDown = true;
    sfx.init();
  };

  const handleMouseUp = () => {
    mouseRef.current.isDown = false;
  };

  // Touch handlers for mobile virtual joystick movement
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    sfx.init();
    
    // Find touch list
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const pageX = touch.clientX;
      const pageY = touch.clientY;

      // Split screen: left for movement joystick, right for aiming joystick
      const isLeft = pageX < window.innerWidth / 2;

      if (isLeft && touchStartRef.current.id === null) {
        touchStartRef.current = { x: pageX, y: pageY, id: touch.identifier };
        touchMoveRef.current = { x: pageX, y: pageY };
        joystickRef.current.isMoving = true;
      } else if (!isLeft && touchAimStartRef.current.id === null) {
        touchAimStartRef.current = { x: pageX, y: pageY, id: touch.identifier };
        touchAimMoveRef.current = { x: pageX, y: pageY };
        joystickRef.current.isAiming = true;
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const pageX = touch.clientX;
      const pageY = touch.clientY;

      if (touch.identifier === touchStartRef.current.id) {
        touchMoveRef.current = { x: pageX, y: pageY };
        
        // Calculate offsets
        const dx = pageX - touchStartRef.current.x;
        const dy = pageY - touchStartRef.current.y;
        const dist = Math.hypot(dx, dy);
        
        const maxDist = 60; // max joystick range
        if (dist > 0) {
          const mult = Math.min(dist, maxDist) / dist;
          joystickRef.current.moveX = (dx * mult) / maxDist;
          joystickRef.current.moveY = (dy * mult) / maxDist;
        } else {
          joystickRef.current.moveX = 0;
          joystickRef.current.moveY = 0;
        }
      } else if (touch.identifier === touchAimStartRef.current.id) {
        touchAimMoveRef.current = { x: pageX, y: pageY };

        const dx = pageX - touchAimStartRef.current.x;
        const dy = pageY - touchAimStartRef.current.y;
        
        joystickRef.current.aimX = dx;
        joystickRef.current.aimY = dy;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      if (touch.identifier === touchStartRef.current.id) {
        touchStartRef.current = { x: 0, y: 0, id: null };
        joystickRef.current.isMoving = false;
        joystickRef.current.moveX = 0;
        joystickRef.current.moveY = 0;
      } else if (touch.identifier === touchAimStartRef.current.id) {
        touchAimStartRef.current = { x: 0, y: 0, id: null };
        joystickRef.current.isAiming = false;
        joystickRef.current.aimX = 0;
        joystickRef.current.aimY = 0;
      }
    }
  };

  // Convert seconds to readable mm:ss format
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div 
      className="relative flex flex-col w-full h-screen overflow-hidden bg-slate-950 font-sans text-gray-200 select-none touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      id="root-container"
    >
      {/* 1. HEADER HUD OVERLAY - ACTIVE IN GAMEPLAY / PAUSE / UPGRADE */}
      {gameState !== 'START' && (
        <div 
          className="absolute top-0 left-0 right-0 z-20 flex flex-col gap-2 p-3 bg-gradient-to-b from-slate-950/90 to-transparent backdrop-blur-[2px]"
          id="game-hud"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 md:flex-nowrap">
            {/* Left side: HP, Shield & Level */}
            <div className="flex flex-col gap-1.5 w-full md:w-auto min-w-[240px]" id="hud-left-stats">
              {/* Health and Shield Bars */}
              <div className="flex flex-col gap-1">
                {/* HP progress bar */}
                <div className="flex items-center justify-between text-xs font-semibold px-0.5">
                  <span className="flex items-center gap-1 text-rose-400">
                    <Heart className="w-4 h-4 fill-rose-500/30" /> Sog'liq (HP)
                  </span>
                  <span className="font-mono text-rose-300">{playerHp} / {playerMaxHp}</span>
                </div>
                <div className="w-full h-3 bg-slate-900 border border-slate-700/60 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-150 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                    style={{ width: `${Math.min(100, Math.max(0, (playerHp / playerMaxHp) * 100))}%` }}
                  />
                </div>

                {/* Shield progress bar (Render only if enabled) */}
                {playerMaxShield > 0 && (
                  <div className="flex flex-col gap-1 mt-0.5 animate-fadeIn">
                    <div className="flex items-center justify-between text-xs font-semibold px-0.5">
                      <span className="flex items-center gap-1 text-blue-400">
                        <Shield className="w-4 h-4 fill-blue-500/30" /> Energetik Qalqon
                      </span>
                      <span className="font-mono text-blue-300">{playerShield} / {playerMaxShield}</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-900 border border-slate-700/60 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-150 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                        style={{ width: `${Math.min(100, Math.max(0, (playerShield / playerMaxShield) * 100))}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Level and XP */}
              <div className="flex flex-col gap-0.5 mt-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 px-0.5">
                  <span className="text-purple-400">Lvl {level}</span>
                  <span className="font-mono">{xp} / {xpNeeded} XP</span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-400 transition-all duration-150 shadow-[0_0_6px_rgba(168,85,247,0.5)]"
                    style={{ width: `${Math.min(100, Math.max(0, (xp / xpNeeded) * 100))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Middle side: Wave information */}
            <div className="flex items-center justify-center gap-4 bg-slate-950/80 border border-slate-800/80 px-4 py-2 rounded-xl shadow-lg" id="hud-center-stats">
              <div className="text-center">
                <div className="text-[10px] text-slate-500 tracking-wider uppercase font-semibold">To'lqin</div>
                <div className="text-xl font-bold text-amber-500 font-mono tracking-tight">{wave}</div>
              </div>
              <div className="w-[1px] h-8 bg-slate-800" />
              <div className="text-center">
                <div className="text-[10px] text-slate-500 tracking-wider uppercase font-semibold">Vaqt</div>
                <div className="text-xl font-bold text-slate-200 font-mono tracking-tight">{formatTime(gameTime)}</div>
              </div>
            </div>

            {/* Right side: Score & High Score */}
            <div className="flex items-center gap-3.5" id="hud-right-stats">
              {/* Power-ups timers indicators */}
              <div className="flex gap-1.5">
                {activeSpeedPowerupTime > 0 && (
                  <div className="flex items-center gap-1 bg-cyan-950/80 border border-cyan-800 px-2 py-1 rounded-lg text-cyan-400 text-xs font-bold animate-pulse">
                    <Zap className="w-3.5 h-3.5 fill-cyan-400/20" />
                    <span>{activeSpeedPowerupTime}s</span>
                  </div>
                )}
                {activeDmgPowerupTime > 0 && (
                  <div className="flex items-center gap-1 bg-amber-950/80 border border-amber-800 px-2 py-1 rounded-lg text-amber-400 text-xs font-bold animate-pulse">
                    <Swords className="w-3.5 h-3.5" />
                    <span>{activeDmgPowerupTime}s</span>
                  </div>
                )}
              </div>

              {/* Total points */}
              <div className="text-right">
                <div className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">Ball</div>
                <div className="text-2xl font-black text-white font-mono tracking-tight drop-shadow">{score}</div>
              </div>

              {/* Controls triggers */}
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 transition rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
                  title={isMuted ? 'Tovushni yoqish' : "Tovushni o'chirish"}
                  id="mute-hud-btn"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => {
                    gamePausedRef.current = !gamePausedRef.current;
                    setGameState(gamePausedRef.current ? 'PAUSE' : 'PLAYING');
                  }}
                  className="p-2 transition rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
                  title="O'yinni vaqtincha to'xtatish"
                  id="pause-hud-btn"
                >
                  <Pause className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. MAIN MENU SCREEN (START STATE) */}
      <AnimatePresence>
        {gameState === 'START' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center p-4 bg-radial from-slate-900 via-slate-950 to-black overflow-y-auto"
            id="start-screen-overlay"
          >
            <div className="max-w-2xl w-full flex flex-col items-center text-center gap-6 my-auto py-8">
              {/* Title Section */}
              <div className="space-y-2">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.5 }}
                  className="relative"
                >
                  <h1 className="text-5xl md:text-7xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-500 to-rose-600 uppercase drop-shadow-[0_0_15px_rgba(239,68,68,0.3)] font-sans">
                    Omon Qolish Jangi
                  </h1>
                  <span className="absolute -top-6 right-4 text-xs font-semibold tracking-widest text-orange-400 bg-orange-950/80 border border-orange-800/80 px-2 py-0.5 rounded-full uppercase">
                    V1.1 Survival
                  </span>
                </motion.div>
                <p className="text-slate-400 md:text-base text-sm max-w-lg mx-auto">
                  Dushmanlar to'lqinlariga qarshi kurash. Maydon markazida omon qoling, qahramoningizni kuchaytiring va rekord o'rnating!
                </p>
              </div>

              {/* Action play button */}
              <motion.button 
                whileHover={{ scale: 1.05, boxShadow: '0 0 25px rgba(239,68,68,0.45)' }}
                whileTap={{ scale: 0.98 }}
                onClick={startGame}
                className="group flex items-center justify-center gap-3 px-10 py-5 bg-gradient-to-r from-red-600 to-orange-500 text-white rounded-2xl text-xl font-bold shadow-[0_0_15px_rgba(239,68,68,0.3)] transition cursor-pointer"
                id="btn-play-game"
              >
                <Play className="w-6 h-6 fill-white animate-pulse" />
                <span>JANGNI BOSHLASH</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition" />
              </motion.button>

              {/* Game Guide Instructions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-2 text-left" id="game-guide-grid">
                <div className="bg-slate-900/70 border border-slate-800/80 p-4 rounded-2xl flex gap-3.5">
                  <div className="p-3 bg-red-950/60 text-red-400 rounded-xl h-fit">
                    <Gamepad2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider text-rose-400">Harakatlanish</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Kompyuterda: <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-200 rounded font-mono font-bold text-[10px]">W</kbd> <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-200 rounded font-mono font-bold text-[10px]">A</kbd> <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-200 rounded font-mono font-bold text-[10px]">S</kbd> <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-200 rounded font-mono font-bold text-[10px]">D</kbd> yoki yo'nalish strelkalari orqali boshqariladi.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900/70 border border-slate-800/80 p-4 rounded-2xl flex gap-3.5">
                  <div className="p-3 bg-blue-950/60 text-blue-400 rounded-xl h-fit">
                    <Target className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider text-cyan-400">Otish va Mo'ljal</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Sichqonchani harakatlantirish orqali o'q yo'nalishini belgilang. Otish uchun sichqonchani bosing, <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-200 rounded font-mono font-bold text-[10px]">Space</kbd> bosing, yoki <b>Avto-Otish</b> tizimini yoqing!
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900/70 border border-slate-800/80 p-4 rounded-2xl flex gap-3.5">
                  <div className="p-3 bg-amber-950/60 text-amber-400 rounded-xl h-fit">
                    <Star className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider text-amber-400">Yaxshilash & Bonuslar</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Yiqilgan dushmanlardan dori (H), Tezlik (⚡) va Zarar (★) bonuslarini terib oling. Gems yig'ib darajangizni (XP) oshiring va yangi qurol perklarini tanlang!
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900/70 border border-slate-800/80 p-4 rounded-2xl flex gap-3.5">
                  <div className="p-3 bg-purple-950/60 text-purple-400 rounded-xl h-fit">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider text-purple-400">Mobil / Touch Boshqaruv</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Ekrandagi chap tomonda harakatlanish joystigi joylashgan. Avto-otish rejimi yoqilgan bo'lsa, qahramon avtomatik ravishda eng yaqin dushmanga qarata o'q otadi.
                    </p>
                  </div>
                </div>
              </div>

              {/* Mobile controls toggles */}
              <div className="flex gap-4" id="config-toggles">
                <label className="flex items-center gap-2 text-sm bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={touchControlsEnabled} 
                    onChange={(e) => setTouchControlsEnabled(e.target.checked)}
                    className="w-4 h-4 text-red-500 rounded focus:ring-red-500"
                  />
                  <span>Mobil Tugmalar (Joystik)</span>
                </label>
                <label className="flex items-center gap-2 text-sm bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={autoShootEnabled} 
                    onChange={(e) => setAutoShootEnabled(e.target.checked)}
                    className="w-4 h-4 text-red-500 rounded focus:ring-red-500"
                  />
                  <span>Avto-Otish (Auto-Shoot)</span>
                </label>
              </div>

              {/* High Scores Leaderboard */}
              <div className="w-full bg-slate-900/60 border border-slate-800/60 rounded-3xl p-5 shadow-2xl mt-4" id="leaderboard-card">
                <div className="flex items-center justify-center gap-2 text-xl font-bold text-amber-400 mb-4 uppercase tracking-wider">
                  <Trophy className="w-5 h-5 fill-amber-400/20" /> Eng Yuqori Natijalar
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse" id="leaderboard-table">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-widest text-[10px] font-bold">
                        <th className="py-2 px-3">O'yinchi</th>
                        <th className="py-2 px-3 text-center">To'lqin</th>
                        <th className="py-2 px-3 text-center">Vaqt</th>
                        <th className="py-2 px-3 text-right">Ball</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-slate-300 font-medium">
                      {highScores.map((scoreObj, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/25 transition">
                          <td className="py-2 px-3 flex items-center gap-2 font-semibold">
                            {idx === 0 && <Crown className="w-4 h-4 text-amber-400 fill-amber-400/10" />}
                            <span>{scoreObj.name}</span>
                          </td>
                          <td className="py-2 px-3 text-center font-mono">{scoreObj.wave}-to'lqin</td>
                          <td className="py-2 px-3 text-center font-mono">{formatTime(scoreObj.time)}</td>
                          <td className="py-2 px-3 text-right font-bold text-white font-mono">{scoreObj.score}</td>
                        </tr>
                      ))}
                      {highScores.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-500">Hech qanday natija yo'q</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. GAMEPLAY CANVAS WORKSPACE */}
      <div 
        ref={containerRef}
        className="flex-1 w-full h-full relative"
        id="canvas-container-box"
      >
        <canvas 
          ref={canvasRef}
          width={canvasDimensions.width}
          height={canvasDimensions.height}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          className="block cursor-crosshair"
          id="game-canvas"
        />

        {/* Dynamic New Wave Alert Modal Overlay */}
        <AnimatePresence>
          {waveAlert && (
            <motion.div 
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
              id="wave-alert-modal"
            >
              <div className="bg-black/80 border border-red-500/50 backdrop-blur px-8 py-5 rounded-3xl shadow-2xl flex flex-col items-center gap-2">
                <AlertTriangle className="w-8 h-8 text-red-500 animate-bounce" />
                <h2 className="text-3xl md:text-5xl font-black tracking-widest text-red-500 uppercase font-sans animate-pulse">
                  {waveAlert}
                </h2>
                <span className="text-slate-400 text-xs md:text-sm tracking-wider font-semibold">
                  Dushmanlar bostirib kelmoqda!
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4. VIRTUAL JOYSTICKS FOR MOBILE/TOUCH SCREEN COMFORT */}
        {gameState === 'PLAYING' && touchControlsEnabled && (
          <div className="absolute inset-x-0 bottom-0 top-1/2 pointer-events-none z-10 select-none flex justify-between px-6 pb-6 items-end" id="mobile-joysticks-layout">
            
            {/* Left Joystick: Movement */}
            <div className="w-36 h-36 bg-slate-900/35 backdrop-blur-sm rounded-full border border-slate-700/30 flex items-center justify-center pointer-events-auto relative shadow-inner" id="movement-joystick-pad">
              <div 
                className="w-14 h-14 bg-gradient-to-r from-red-600 to-rose-500 rounded-full border border-slate-400 flex items-center justify-center shadow-lg active:scale-95 transition"
                style={{
                  transform: `translate(${joystickRef.current.moveX * 36}px, ${joystickRef.current.moveY * 36}px)`
                }}
              >
                <Gamepad2 className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Right Panel Actions: Auto Shoot & Weapon Manual aiming pads */}
            <div className="flex flex-col gap-3 items-end pointer-events-auto" id="aiming-joystick-pad">
              <button
                onClick={() => setAutoShootEnabled(!autoShootEnabled)}
                className={`px-4 py-2.5 rounded-xl font-bold border flex items-center gap-1.5 text-xs shadow-lg transition duration-150 ${
                  autoShootEnabled 
                  ? 'bg-amber-600 hover:bg-amber-500 border-amber-500 text-white' 
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-400'
                }`}
                id="toggle-autoaim-btn"
              >
                <Target className="w-4 h-4" />
                <span>{autoShootEnabled ? 'AVTO MO\'LJAL: ON' : 'AVTO MO\'LJAL: OFF'}</span>
              </button>

              <div className="w-36 h-36 bg-slate-900/35 backdrop-blur-sm rounded-full border border-slate-700/30 flex items-center justify-center relative shadow-inner">
                <div 
                  className="w-14 h-14 bg-gradient-to-r from-cyan-600 to-blue-500 rounded-full border border-slate-400 flex items-center justify-center shadow-lg"
                  style={{
                    transform: `translate(${joystickRef.current.isAiming ? (joystickRef.current.aimX / Math.hypot(joystickRef.current.aimX, joystickRef.current.aimY) || 0) * 36 : 0}px, ${joystickRef.current.isAiming ? (joystickRef.current.aimY / Math.hypot(joystickRef.current.aimX, joystickRef.current.aimY) || 0) * 36 : 0}px)`
                  }}
                >
                  <Crosshair className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* 5. PAUSE MENU MODAL OVERLAY */}
      <AnimatePresence>
        {gameState === 'PAUSE' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 backdrop-blur-md"
            id="pause-menu-overlay"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 max-w-sm w-full text-center flex flex-col gap-5 shadow-2xl mx-4"
            >
              <h2 className="text-3xl font-black text-white uppercase tracking-wider">O'yin To'xtatildi</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Hozirgi to'lqin: <strong className="text-amber-400 font-mono">{wave}</strong><br />
                To'plangan ball: <strong className="text-white font-mono">{score}</strong><br />
                Omon qolingan vaqt: <strong className="text-slate-300 font-mono">{formatTime(gameTime)}</strong>
              </p>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    gamePausedRef.current = false;
                    setGameState('PLAYING');
                  }}
                  className="w-full py-3 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white rounded-xl font-bold shadow-lg transition cursor-pointer"
                  id="btn-resume-game"
                >
                  O'yinni Davom Ettirish
                </button>
                <button 
                  onClick={() => setGameState('START')}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl font-bold transition cursor-pointer"
                  id="btn-return-mainmenu"
                >
                  Asosiy Menyuga Qaytish
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. UPGRADE SELECTION PERK SELECTION SCREEN */}
      <AnimatePresence>
        {gameState === 'UPGRADE' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto"
            id="upgrade-screen-overlay"
          >
            <div className="max-w-3xl w-full flex flex-col items-center gap-6 py-6">
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-2 text-purple-400 text-sm uppercase tracking-wider font-extrabold">
                  <Sparkles className="w-4 h-4 text-purple-400 animate-spin" /> Daraja Oshdi (LEVEL UP)!
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight uppercase">
                  Qahramonni Kuchaytiring
                </h2>
                <p className="text-slate-400 text-xs md:text-sm max-w-md mx-auto">
                  Jang maydonida omon qolish uchun quyidagi qobiliyatlardan birini tanlang. Har bir perk dushmanlar bilan olishuvda qo'l keladi!
                </p>
              </div>

              {/* Grid of 3 randomly chosen perk cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full mt-2" id="upgrade-perks-grid">
                {upgradePool.map((perk, idx) => {
                  return (
                    <motion.div 
                      key={perk.id}
                      initial={{ scale: 0.9, opacity: 0, y: 15 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1, type: 'spring', stiffness: 100 }}
                      whileHover={{ scale: 1.04, borderColor: perk.color, boxShadow: `0 0 20px ${perk.color}25` }}
                      onClick={() => selectPerk(perk)}
                      className="bg-slate-900/90 border border-slate-800/80 p-5 rounded-3xl flex flex-col justify-between text-center items-center gap-4 cursor-pointer relative overflow-hidden transition-all duration-300"
                    >
                      {/* Top shine decorative glow color */}
                      <div 
                        className="absolute top-0 inset-x-0 h-1" 
                        style={{ backgroundColor: perk.color }}
                      />

                      {/* Icon wrapper glowing */}
                      <div 
                        className="p-4 rounded-2xl flex items-center justify-center"
                        style={{ backgroundColor: `${perk.color}15`, color: perk.color }}
                      >
                        {perk.iconName === 'Heart' && <Heart className="w-8 h-8 fill-rose-500/20" />}
                        {perk.iconName === 'Zap' && <Zap className="w-8 h-8 fill-cyan-400/20" />}
                        {perk.iconName === 'Shield' && <Shield className="w-8 h-8 fill-blue-500/20" />}
                        {perk.iconName === 'Flame' && <Swords className="w-8 h-8" />}
                        {perk.iconName === 'Crosshair' && <Target className="w-8 h-8" />}
                        {perk.iconName === 'Target' && <Crosshair className="w-8 h-8" />}
                        {perk.iconName === 'Sparkles' && <Sparkles className="w-8 h-8" />}
                        {perk.iconName === 'Magnet' && <RefreshCw className="w-8 h-8 animate-spin" />}
                        {perk.iconName === 'Trophy' && <Trophy className="w-8 h-8" />}
                      </div>

                      {/* Info text */}
                      <div className="space-y-1">
                        <h3 className="font-extrabold text-white text-lg tracking-tight group-hover:text-amber-400">
                          {perk.title}
                        </h3>
                        <p className="text-slate-400 text-xs leading-relaxed">
                          {perk.description}
                        </p>
                      </div>

                      {/* Select button */}
                      <button 
                        className="mt-2 w-full py-2 rounded-xl text-xs font-bold border transition"
                        style={{ 
                          borderColor: `${perk.color}50`, 
                          color: '#ffffff',
                          backgroundColor: `${perk.color}15`
                        }}
                      >
                        TANLASH
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 7. GAME OVER SCREEN OVERLAY */}
      <AnimatePresence>
        {gameState === 'GAMEOVER' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-center p-4 bg-radial from-red-950/40 via-slate-950 to-black overflow-y-auto"
            id="gameover-screen-overlay"
          >
            <div className="max-w-md w-full flex flex-col items-center text-center gap-5 my-auto py-8">
              
              {/* Giant Red skull/shield icon */}
              <div className="p-4 bg-red-950/60 text-red-500 border border-red-500/30 rounded-3xl animate-bounce">
                <AlertTriangle className="w-12 h-12" />
              </div>

              {/* Title Game Over */}
              <div className="space-y-1.5">
                <h2 className="text-4xl md:text-5xl font-black tracking-tight text-red-500 uppercase font-sans">
                  O'yin Tugadi!
                </h2>
                <p className="text-slate-400 text-sm">
                  Dushmanlar sizni qurshab oldi. Ammo siz munosib jang qildingiz!
                </p>
              </div>

              {/* Final statistics board */}
              <div className="bg-slate-900/80 border border-slate-800 w-full p-6 rounded-2xl flex flex-col gap-3 shadow-xl" id="gameover-stats-board">
                <h3 className="font-bold text-slate-400 uppercase text-xs tracking-wider border-b border-slate-800 pb-2">
                  Sizning Jang Ko'rsatkichlaringiz
                </h3>
                
                <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
                  <span className="text-slate-500 font-medium">To'plangan Ball:</span>
                  <span className="text-2xl font-black text-white font-mono">{score}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
                  <span className="text-slate-500 font-medium">Maksimal To'lqin:</span>
                  <span className="text-lg font-bold text-amber-500 font-mono">{wave}-to'lqin</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 font-medium">Omon Qolingan Vaqt:</span>
                  <span className="text-lg font-bold text-slate-200 font-mono">{formatTime(gameTime)}</span>
                </div>
              </div>

              {/* High Score Submit form */}
              {!showScoreSaved ? (
                <div className="w-full flex flex-col gap-2.5 bg-slate-900/50 p-4 border border-slate-850 rounded-2xl" id="leaderboard-submission-form">
                  <label className="text-xs font-bold text-left text-slate-400 uppercase tracking-wide">
                    Rekordlar ro'yxatiga yozish:
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value.slice(0, 15))}
                      placeholder="Ismingiz"
                      className="flex-1 px-4 py-2 bg-slate-950 border border-slate-700/60 rounded-xl focus:outline-none focus:border-red-500 text-white font-medium text-sm"
                    />
                    <button 
                      onClick={saveHighScore}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-sm transition"
                    >
                      Saqlash
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full py-2 px-4 bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-xs font-bold rounded-xl text-center">
                  Sizning natijangiz muvaffaqiyatli saqlandi!
                </div>
              )}

              {/* Actions Button */}
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button 
                  onClick={startGame}
                  className="flex-1 py-4 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
                  id="btn-play-again"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span>QAYTA O'YNASH</span>
                </button>
                <button 
                  onClick={() => setGameState('START')}
                  className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl font-bold border border-slate-750 transition cursor-pointer"
                  id="btn-return-menu-from-gameover"
                >
                  BOSH MENYU
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
