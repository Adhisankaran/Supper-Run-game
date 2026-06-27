/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameState, HighScoreEntry, PlayerState } from './types';
import { GameCanvas } from './components/GameCanvas';
import { retroAudio } from './audio';
import { 
  Trophy, 
  Play, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Info, 
  Award, 
  Flame, 
  Music, 
  Gamepad2, 
  Sparkles,
  ChevronRight,
  UserCheck
} from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [musicEnabled, setMusicEnabled] = useState<boolean>(false);

  // Live game metrics
  const [score, setScore] = useState<number>(0);
  const [coins, setCoins] = useState<number>(0);
  const [distance, setDistance] = useState<number>(0);
  const [highScores, setHighScores] = useState<HighScoreEntry[]>([]);
  const [playerName, setPlayerName] = useState<string>('Plumber');
  const [showNameInput, setShowNameInput] = useState<boolean>(false);

  // High score submission states
  const [submitted, setSubmitted] = useState<boolean>(false);

  // Load High Scores from Local Storage
  useEffect(() => {
    const savedScores = localStorage.getItem('endless_platformer_highscores');
    if (savedScores) {
      try {
        setHighScores(JSON.parse(savedScores));
      } catch (e) {
        console.error('Failed to parse high scores', e);
      }
    } else {
      // Default high scores
      const defaults: HighScoreEntry[] = [
        { name: 'Mario', score: 5000, date: '1985-09-13' },
        { name: 'Luigi', score: 3200, date: '1985-09-13' },
        { name: 'Yoshi', score: 1800, date: '1990-11-21' },
      ];
      localStorage.setItem('endless_platformer_highscores', JSON.stringify(defaults));
      setHighScores(defaults);
    }
  }, []);

  // Sync Audio Settings to sound manager
  useEffect(() => {
    retroAudio.setSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  useEffect(() => {
    retroAudio.setMusicEnabled(musicEnabled);
  }, [musicEnabled]);

  // Audio initialization on initial click
  const initAudioAndPlay = () => {
    retroAudio.init();
    setGameState(GameState.PLAYING);
    setIsPaused(false);
    setScore(0);
    setCoins(0);
    setDistance(0);
    setSubmitted(false);
    if (musicEnabled) {
      retroAudio.setMusicEnabled(true);
    }
  };

  const handleGameOver = (finalScore: number, finalCoins: number, finalDistance: number) => {
    setScore(finalScore);
    setCoins(finalCoins);
    setDistance(finalDistance);
    setGameState(GameState.GAMEOVER);
    
    // Check if score warrants a high score entry
    const lowestHighScore = highScores.length < 5 ? 0 : highScores[highScores.length - 1]?.score || 0;
    if (finalScore > lowestHighScore || highScores.length < 5) {
      setShowNameInput(true);
    }
  };

  const submitHighScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    const newEntry: HighScoreEntry = {
      name: playerName.slice(0, 10),
      score: score,
      date: new Date().toISOString().split('T')[0]
    };

    const updated = [...highScores, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // keep top 5

    setHighScores(updated);
    localStorage.setItem('endless_platformer_highscores', JSON.stringify(updated));
    setShowNameInput(false);
    setSubmitted(true);
  };

  const handleScoreUpdate = (currentScore: number, currentCoins: number, currentDistance: number) => {
    setScore(currentScore);
    setCoins(currentCoins);
    setDistance(currentDistance);
  };

  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  // Listen for 'KeyP' keyboard event to pause
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.code === 'KeyP') {
        if (gameState === GameState.PLAYING) {
          togglePause();
        }
      }
      if (e.code === 'KeyR') {
        if (gameState === GameState.GAMEOVER || gameState === GameState.PLAYING) {
          initAudioAndPlay();
        }
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [gameState, musicEnabled]);

  // Achievement tracker computed properties
  const achievements = [
    { id: 'coin_1', title: 'Coin Plunderer', desc: 'Collect 10 golden coins', icon: Sparkles, color: 'text-amber-400', achieved: coins >= 10 },
    { id: 'coin_2', title: 'Gold Magnate', desc: 'Collect 25 golden coins', icon: Trophy, color: 'text-yellow-500', achieved: coins >= 25 },
    { id: 'dist_1', title: 'Marathon Plumber', desc: 'Run over 150 meters', icon: Flame, color: 'text-orange-500', achieved: distance >= 150 },
    { id: 'score_1', title: 'Retro Champion', desc: 'Reach 1,500 total points', icon: Award, color: 'text-emerald-500', achieved: score >= 1500 },
    { id: 'score_2', title: 'Elite Challenger', desc: 'Reach 3,000 total points', icon: Sparkles, color: 'text-fuchsia-400', achieved: score >= 3000 },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white" id="main-arcade-screen">
      
      {/* Top Professional Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 py-4 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* Logo / Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-600 rounded-lg flex items-center justify-center border-b-4 border-rose-800 shadow-lg text-white">
              <Gamepad2 className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white retro-font flex items-center gap-2">
                SUPER RUNNER <span className="text-rose-500 text-xs px-2 py-0.5 rounded-full bg-rose-950 border border-rose-800/40 font-mono">ENDLESS 2D</span>
              </h1>
              <p className="text-xs text-slate-400 font-mono">HTML5 Canvas Physics-Based Platformer</p>
            </div>
          </div>

          {/* Quick controls bar */}
          <div className="flex items-center gap-3 flex-wrap justify-center">
            
            {/* Audio Sfx Toggle */}
            <button
              onClick={() => setSoundEnabled(prev => !prev)}
              className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center gap-2 text-xs font-mono font-medium ${
                soundEnabled 
                  ? 'bg-slate-800/80 border-slate-700 text-amber-400 shadow-md hover:bg-slate-700' 
                  : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
              id="toggle-sound-fx"
              title="Toggle retro SFX synthesizers"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden md:inline">SFX</span>
            </button>

            {/* Audio Music Toggle */}
            <button
              onClick={() => {
                retroAudio.init(); // Initialize context on user event
                setMusicEnabled(prev => !prev);
              }}
              className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center gap-2 text-xs font-mono font-medium ${
                musicEnabled 
                  ? 'bg-slate-800/80 border-slate-700 text-emerald-400 shadow-md hover:bg-slate-700' 
                  : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
              id="toggle-bg-music"
              title="Toggle 8-bit background chiptune melody"
            >
              <Music className={`w-4 h-4 ${musicEnabled ? 'animate-bounce' : ''}`} />
              <span className="hidden md:inline">CHIPTUNE BGM</span>
            </button>

            {/* Difficulty Selector */}
            <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5" id="difficulty-tabs">
              {(['EASY', 'MEDIUM', 'HARD'] as const).map(diff => (
                <button
                  key={diff}
                  onClick={() => setDifficulty(diff)}
                  disabled={gameState === GameState.PLAYING && !isPaused}
                  className={`px-3 py-1.5 text-[10px] font-mono rounded-md font-bold transition-all ${
                    difficulty === diff
                      ? diff === 'EASY' ? 'bg-emerald-600/90 text-white shadow-sm' : diff === 'MEDIUM' ? 'bg-amber-600/90 text-white shadow-sm' : 'bg-red-600/90 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-300 disabled:opacity-40 disabled:hover:text-slate-500 cursor-pointer'
                  }`}
                  id={`diff-${diff}`}
                >
                  {diff}
                </button>
              ))}
            </div>

          </div>
        </div>
      </header>

      {/* Main Grid Content - Bento Style */}
      <main className="max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 w-full">
        
        {/* Left Column: Game Area (Span 3 on desktop) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          
          {/* Live Game HUD / Metrics */}
          <div className="grid grid-cols-3 gap-3 bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 shadow-lg select-none">
            
            {/* Score */}
            <div className="flex flex-col items-center justify-center py-2 px-3 bg-slate-955/80 border border-slate-800/50 rounded-lg">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">SCORE</span>
              <span className="text-xl md:text-3xl font-extrabold mono-font text-white tracking-wider">
                {score.toString().padStart(6, '0')}
              </span>
            </div>

            {/* Coins */}
            <div className="flex flex-col items-center justify-center py-2 px-3 bg-slate-955/80 border border-slate-800/50 rounded-lg relative overflow-hidden group">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1">
                COINS
              </span>
              <span className="text-xl md:text-3xl font-extrabold mono-font text-amber-400 tracking-wider flex items-center gap-1.5">
                <span className="w-2.5 h-4 bg-amber-400 rounded-full inline-block animate-pulse"></span>
                {coins.toString().padStart(3, '0')}
              </span>
            </div>

            {/* Distance */}
            <div className="flex flex-col items-center justify-center py-2 px-3 bg-slate-955/80 border border-slate-800/50 rounded-lg">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">DISTANCE</span>
              <span className="text-xl md:text-3xl font-extrabold mono-font text-rose-400 tracking-wider">
                {distance} <span className="text-xs font-normal text-rose-500/80">m</span>
              </span>
            </div>

          </div>

          {/* Interactive Game Screen Box */}
          <div className="relative flex flex-col items-center justify-center bg-slate-950 rounded-xl overflow-hidden min-h-[400px]">
            
            {/* 1. START SCREEN */}
            {gameState === GameState.START && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-slate-900/95 border-4 border-slate-700/80 rounded-xl shadow-2xl">
                
                {/* Visual retro plumber avatar */}
                <div className="w-20 h-24 bg-rose-600/10 rounded-2xl border-2 border-rose-500/30 p-2 flex flex-col items-center justify-center mb-4 relative overflow-hidden group">
                  <div className="w-10 h-3 bg-rose-500 rounded-sm mb-1"></div>
                  <div className="w-12 h-6 bg-amber-200 rounded-md mb-1 relative flex items-center justify-center">
                    <div className="w-1.5 h-3 bg-black rounded-full absolute left-3"></div>
                    <div className="w-1.5 h-3 bg-black rounded-full absolute right-3"></div>
                  </div>
                  <div className="w-14 h-8 bg-blue-600 rounded-md"></div>
                  <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-shine" />
                </div>

                <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-1 retro-font">
                  SUPER RUNNER
                </h2>
                <div className="text-xs text-rose-500 font-mono font-bold uppercase tracking-widest mb-4 flex items-center gap-1.5 justify-center bg-rose-950/40 border border-rose-900/30 px-3 py-1 rounded-full">
                  <Sparkles className="w-3.5 h-3.5" />
                  Created by Cenio
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <p className="text-sm text-slate-400 max-w-md mb-6 font-mono leading-relaxed">
                  Endless Mario action. Double jump over bottomless pits, crouch slide under birds, stomp on goombas, and eat super mushrooms!
                </p>

                {/* Main Play CTA Button */}
                <button
                  onClick={initAudioAndPlay}
                  className="px-8 py-4 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-lg rounded-xl shadow-lg border-b-4 border-rose-800 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center gap-3 active:scale-95"
                  id="btn-play-start"
                >
                  <Play className="w-5 h-5 fill-white" />
                  START GAME
                </button>

                {/* Keyboard tip */}
                <span className="text-[10px] text-slate-500 mt-4 font-mono">
                  Press Spacebar or Click to jump. Double press for Double Jump!
                </span>

              </div>
            )}

            {/* 2. GAME OVER OVERLAY */}
            {gameState === GameState.GAMEOVER && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-slate-950/95 border-4 border-slate-800 rounded-xl shadow-2xl">
                
                <h2 className="text-4xl md:text-6xl font-black tracking-tight text-rose-500 mb-1 retro-font animate-bounce">
                  GAME OVER
                </h2>
                <p className="text-sm text-slate-400 mb-6 font-mono">Mamma Mia! You bumped into an obstacle.</p>

                {/* Final Score presentation board */}
                <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6 flex flex-col gap-3 shadow-inner">
                  <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
                    <span>FINAL POINTS</span>
                    <span className="text-white font-bold text-base font-mono">{score}</span>
                  </div>
                  <div className="h-px bg-slate-800 w-full" />
                  <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
                    <span>COINS ACCUMULATED</span>
                    <span className="text-amber-400 font-bold text-base font-mono">+{coins}</span>
                  </div>
                  <div className="h-px bg-slate-800 w-full" />
                  <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
                    <span>DISTANCE TRAVELED</span>
                    <span className="text-rose-400 font-bold text-base font-mono">{distance}m</span>
                  </div>
                </div>

                {/* Submit High Score Form */}
                {showNameInput ? (
                  <form onSubmit={submitHighScore} className="w-full max-w-sm flex flex-col gap-3 mb-6 bg-slate-900/50 border border-slate-800 p-4 rounded-lg">
                    <label className="text-xs text-amber-400 font-mono font-medium text-left block">
                      New High Score! Register name:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="Enter 3-10 characters"
                        maxLength={10}
                        required
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500 font-mono"
                        id="input-player-name"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg cursor-pointer transition-all active:scale-95"
                        id="btn-submit-score"
                      >
                        SUBMIT
                      </button>
                    </div>
                  </form>
                ) : submitted ? (
                  <p className="text-xs text-emerald-400 font-mono mb-4 flex items-center justify-center gap-1">
                    <UserCheck className="w-4 h-4" /> Score submitted successfully!
                  </p>
                ) : null}

                {/* Play again button */}
                <button
                  onClick={initAudioAndPlay}
                  className="px-6 py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-xl shadow-lg border-b-4 border-rose-800 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center gap-2 active:scale-95"
                  id="btn-play-again"
                >
                  <RotateCcw className="w-4 h-4" />
                  RESTART PLATFORMER
                </button>

                <span className="text-[10px] text-slate-500 mt-3 font-mono">
                  Press R on your keyboard to instantly restart
                </span>

              </div>
            )}

            {/* Canvas Component Container */}
            <div className="w-full h-full relative group">
              <GameCanvas
                gameState={gameState}
                difficulty={difficulty}
                soundEnabled={soundEnabled}
                onGameOver={handleGameOver}
                onScoreUpdate={handleScoreUpdate}
                isPaused={isPaused}
              />
              {/* Floating watermark inside game screen */}
              <div className="absolute bottom-3 right-3 z-10 pointer-events-none opacity-40 group-hover:opacity-80 transition-opacity select-none text-[10px] font-mono text-white/75 bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800 shadow-lg flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
                Created by Cenio
              </div>
            </div>

            {/* Play/Pause Float buttons on active game */}
            {gameState === GameState.PLAYING && (
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                <button
                  onClick={togglePause}
                  className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-700/60 shadow-lg cursor-pointer text-xs font-mono select-none"
                  id="btn-pause-toggle"
                >
                  {isPaused ? 'RESUME [P]' : 'PAUSE [P]'}
                </button>
              </div>
            )}

          </div>

          {/* Quick instructions manual footer */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex gap-3 items-start text-xs text-slate-400">
            <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1 leading-relaxed">
              <span className="font-mono font-bold text-slate-300">INTERACTIVE CHEAT SHEET:</span>
              <p>
                To score high points, bounce consecutively on enemies (<span className="text-amber-400 font-mono">Goombas</span> or <span className="text-amber-400 font-mono">Birds</span>). Bouncing refreshes your <span className="text-emerald-400 font-bold">Double Jump</span> charge. Collecting a <span className="text-red-400 font-bold">Super Mushroom</span> enlarges you so you can absorb 1 accident! Collecting a <span className="text-indigo-400 font-bold">Star</span> makes you invincible to run straight through anything.
              </p>
            </div>
          </div>

        </div>

        {/* Right Columns: Sidebar Stats / Leaderboard & Achievements (Span 1 on desktop) */}
        <div className="flex flex-col gap-6">
          
          {/* Bento box: High Scores Leaderboard */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-lg flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold tracking-tight text-white font-mono uppercase text-sm">
                LEADERBOARD
              </h3>
            </div>

            {/* High scores entries list */}
            <div className="flex flex-col gap-2" id="leaderboard-list">
              {highScores.map((entry, index) => (
                <div 
                  key={index} 
                  className={`flex justify-between items-center py-2 px-3 rounded-lg border text-xs font-mono ${
                    index === 0 
                      ? 'bg-amber-950/40 border-amber-800/40 text-amber-300' 
                      : index === 1
                      ? 'bg-slate-800/60 border-slate-700/40 text-slate-300'
                      : 'bg-slate-950/40 border-slate-900 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-500 w-4">{index + 1}.</span>
                    <span className="font-bold max-w-[100px] truncate">{entry.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{entry.score}</span>
                    <span className="text-[9px] text-slate-500 hidden sm:inline">{entry.date}</span>
                  </div>
                </div>
              ))}
              {highScores.length === 0 && (
                <div className="text-center py-4 text-xs text-slate-500 font-mono">
                  No high scores recorded yet.
                </div>
              )}
            </div>
          </div>

          {/* Bento box: Achievements unlocked */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-lg flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-rose-500" />
              <h3 className="font-bold tracking-tight text-white font-mono uppercase text-sm">
                CHALLENGES
              </h3>
            </div>

            {/* Achievement nodes */}
            <div className="flex flex-col gap-3" id="achievements-list">
              {achievements.map((ach) => (
                <div 
                  key={ach.id}
                  className={`flex gap-3 items-center p-2.5 rounded-lg border transition-all ${
                    ach.achieved 
                      ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300' 
                      : 'bg-slate-950/30 border-slate-900/60 text-slate-500'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    ach.achieved ? 'bg-emerald-500/20' : 'bg-slate-900'
                  }`}>
                    <ach.icon className={`w-4 h-4 ${ach.achieved ? ach.color : 'text-slate-600'}`} />
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-xs font-bold leading-none ${ach.achieved ? 'text-white' : 'text-slate-500'}`}>
                      {ach.title}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 leading-tight">
                      {ach.desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Control hints map */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 shadow-lg flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold tracking-tight text-white font-mono uppercase text-sm">
                ARCADE KEYS
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono" id="arcade-controls-table">
              <div className="bg-slate-950/60 p-2 rounded border border-slate-900 flex justify-between">
                <span className="text-slate-500">Jump</span>
                <span className="text-white font-bold bg-slate-800 px-1 py-0.5 rounded text-[10px]">Space</span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded border border-slate-900 flex justify-between">
                <span className="text-slate-500">Double J.</span>
                <span className="text-white font-bold bg-slate-800 px-1 py-0.5 rounded text-[10px]">Space x2</span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded border border-slate-900 flex justify-between">
                <span className="text-slate-500">Slide</span>
                <span className="text-white font-bold bg-slate-800 px-1 py-0.5 rounded text-[10px]">S / ↓</span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded border border-slate-900 flex justify-between">
                <span className="text-slate-500">Pause</span>
                <span className="text-white font-bold bg-slate-800 px-1 py-0.5 rounded text-[10px]">P</span>
              </div>
              <div className="bg-slate-950/60 p-2 rounded border border-slate-900 flex justify-between col-span-2">
                <span className="text-slate-500">Quick Reset</span>
                <span className="text-white font-bold bg-slate-800 px-1 py-0.5 rounded text-[10px]">R</span>
              </div>
            </div>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-850 bg-slate-950 text-center py-6 px-4 mt-auto flex flex-col items-center justify-center gap-2">
        <p className="text-xs text-slate-500 font-mono">
          Made with HTML5 Canvas, Web Audio API, & React.
        </p>
        <p className="text-[11px] text-slate-400 font-mono bg-slate-900 border border-slate-800 px-3 py-1 rounded-full shadow-inner">
          Created with 💖 by <span className="text-rose-500 font-bold tracking-wide">Cenio</span>
        </p>
      </footer>

    </div>
  );
}
