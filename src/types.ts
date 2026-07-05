/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameState = 'START' | 'PLAYING' | 'UPGRADE' | 'GAMEOVER' | 'PAUSE';

export interface PlayerStats {
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  level: number;
  xp: number;
  xpNeeded: number;
  dmg: number;
  fireCooldown: number;
  fireRate: number; // millisecond delay between shots
  bulletSpeed: number;
  pierceCount: number;
  isInvulnerable: number; // frame timer
  shieldHp: number;
  maxShieldHp: number;
  doubleShot: boolean;
  tripleShot: boolean;
  magnetRadius: number;
  critChance: number; // 0 to 1
  angle: number;
}

export type EnemyType = 'KICHIK' | 'ORTA' | 'KATTA' | 'KAMIKADZE' | 'BOSS';

export interface Enemy {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  dmg: number;
  scoreValue: number;
  xpValue: number;
  color: string;
  hitFlash: number; // frame timer
  bossShootCooldown?: number;
}

export interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  dmg: number;
  isEnemy: boolean;
  pierceLeft: number;
  color: string;
}

export type LootType = 'XP' | 'APTECHKA' | 'TEZLIK' | 'KUCH' | 'QALQON';

export interface LootItem {
  id: string;
  type: LootType;
  x: number;
  y: number;
  radius: number;
  color: string;
  amount?: number;
  createdAt: number;
  pulseTimer: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
  life: number;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  alpha: number;
  life: number;
}

export interface HighScore {
  name: string;
  score: number;
  wave: number;
  time: number;
  date: string;
}

export interface Perk {
  id: string;
  title: string;
  description: string;
  iconName: 'Heart' | 'Zap' | 'Shield' | 'Flame' | 'Crosshair' | 'Sparkles' | 'RefreshCw' | 'Magnet' | 'Trophy';
  color: string;
  effect: (player: PlayerStats) => void;
}
