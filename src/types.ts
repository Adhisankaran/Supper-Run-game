/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAMEOVER = 'GAMEOVER',
}

export enum PlayerState {
  SMALL = 'SMALL',
  BIG = 'BIG',
  INVINCIBLE = 'INVINCIBLE',
}

export enum ObstacleType {
  PIPE = 'PIPE',          // Static pipe you have to jump over
  GOOMBA = 'GOOMBA',      // Walking enemy you can jump over or stomp
  BIRD = 'BIRD',          // Flying enemy you have to crouch under or jump over
  PLANT = 'PLANT',        // Piranha plant inside a pipe
  GAP = 'GAP',            // Dynamic pit / hole in the ground
}

export enum CollectibleType {
  COIN = 'COIN',
  MUSHROOM = 'MUSHROOM',  // Gives "BIG" state, acts as a shield
  STAR = 'STAR',          // Gives "INVINCIBLE" state, smashes everything
}

export interface HighScoreEntry {
  name: string;
  score: number;
  date: string;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}
