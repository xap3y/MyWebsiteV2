"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- Configuration ---
const GRID_SIZE = 5;
const TOTAL_TILES = GRID_SIZE * GRID_SIZE;
const STORAGE_KEY = "mines_bankroll_v1";
const HISTORY_STORAGE_KEY = "mines_history_v1";
const DEFAULT_BANKROLL = 1000;
const MIN_BET = 10;
const MAX_HISTORY = 30;

type GameState = "idle" | "selecting" | "playing" | "won" | "lost";

type MinesHistoryEntry = {
    id: string;
    date: string;
    bet: number;
    multiplier: number;
    payout: number;
    mineCount: number;
    tilesRevealed: number;
};

// --- Helpers ---
function formatCurrency(n: number) {
    return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function precise(n: number) {
    return Math.floor(n * 100) / 100;
}

function generateId() {
    return `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function shuffleArray<T>(arr: T[]): T[] {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function calculateMultiplier(mineCount: number, tilesRevealed: number): number {
    if (tilesRevealed === 0) return 1;
    const safeTiles = TOTAL_TILES - mineCount;
    let multiplier = 1;
    for (let i = 0; i < tilesRevealed; i++) {
        multiplier *= TOTAL_TILES - i;
        multiplier /= safeTiles - i;
    }
    return precise(multiplier * 0.97);
}

function getMultiplierColor(mult: number) {
    if (mult >= 10) return "text-[#f43f5e]";
    if (mult >= 3) return "text-[#f59e0b]";
    if (mult >= 1.5) return "text-[#10b981]";
    return "text-neutral-400";
}

// --- Animated collapse wrapper ---
function AnimatedSection({
                             show,
                             children,
                             delay = 0,
                         }: {
    show: boolean;
    children: React.ReactNode;
    delay?: number;
}) {
    return (
        <AnimatePresence initial={false}>
            {show && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                        height: { duration: 0.35, ease: [0.4, 0, 0.2, 1], delay },
                        opacity: { duration: 0.25, ease: "easeInOut", delay: delay + 0.05 },
                    }}
                    className="overflow-hidden"
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// --- Component ---
export default function MinesGame() {
    const [bankroll, setBankroll] = useState<number>(DEFAULT_BANKROLL);
    const [bet, setBet] = useState<number>(MIN_BET);
    const [mineCount, setMineCount] = useState<number>(5);
    const [gameState, setGameState] = useState<GameState>("idle");
    const [tiles, setTiles] = useState<boolean[]>([]);
    const [revealed, setRevealed] = useState<boolean[]>(Array(TOTAL_TILES).fill(false));
    const [tilesRevealed, setTilesRevealed] = useState<number>(0);
    const [currentMultiplier, setCurrentMultiplier] = useState<number>(1);
    const [history, setHistory] = useState<MinesHistoryEntry[]>([]);
    const [lastResult, setLastResult] = useState<{ type: "win" | "loss"; amount: number; mult: number } | null>(null);
    const [currentBet, setCurrentBet] = useState<number>(0);

    // Autoplay state
    const [selectedTiles, setSelectedTiles] = useState<Set<number>>(new Set());
    const [autoRevealing, setAutoRevealing] = useState(false);
    const [autoLooping, setAutoLooping] = useState(false);
    const [autoSpeed, setAutoSpeed] = useState<number>(200);
    const [autoRoundsPlayed, setAutoRoundsPlayed] = useState(0);
    const [autoProfit, setAutoProfit] = useState(0);
    const autoTimerRef = useRef<NodeJS.Timeout | null>(null);
    const autoLoopingRef = useRef(false);
    const bankrollRef = useRef(bankroll);
    const betRef = useRef(bet);
    const mineCountRef = useRef(mineCount);
    const selectedTilesRef = useRef<Set<number>>(new Set());
    const autoSpeedRef = useRef(autoSpeed);

    // Keep refs in sync
    useEffect(() => { autoLoopingRef.current = autoLooping; }, [autoLooping]);
    useEffect(() => { bankrollRef.current = bankroll; }, [bankroll]);
    useEffect(() => { betRef.current = bet; }, [bet]);
    useEffect(() => { mineCountRef.current = mineCount; }, [mineCount]);
    useEffect(() => { selectedTilesRef.current = selectedTiles; }, [selectedTiles]);
    useEffect(() => { autoSpeedRef.current = autoSpeed; }, [autoSpeed]);

    // --- Load/Save ---
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setBankroll(Number(saved));
        try {
            const h = localStorage.getItem(HISTORY_STORAGE_KEY);
            if (h) setHistory(JSON.parse(h));
        } catch {}
    }, []);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, String(bankroll));
    }, [bankroll]);

    useEffect(() => {
        if (bankroll < MIN_BET && gameState === "idle" && !autoLooping) {
            const t = setTimeout(() => setBankroll(100), 2000);
            return () => clearTimeout(t);
        }
    }, [bankroll, gameState, autoLooping]);

    useEffect(() => {
        return () => {
            if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
        };
    }, []);

    // --- Game Logic ---
    const setBetSafe = (val: number) => {
        let v = precise(val);
        v = Math.max(MIN_BET, Math.min(v, bankroll));
        if (bankroll < MIN_BET && bankroll > 0) v = bankroll;
        setBet(v);
    };

    const addHistory = useCallback((betAmt: number, mult: number, payout: number, revealedCount: number, mines: number) => {
        const entry: MinesHistoryEntry = {
            id: generateId(),
            date: new Date().toISOString(),
            bet: betAmt,
            multiplier: mult,
            payout,
            mineCount: mines,
            tilesRevealed: revealedCount,
        };
        setHistory((prev) => {
            const newHistory = [entry, ...prev].slice(0, MAX_HISTORY);
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
            return newHistory;
        });
    }, []);

    const startGame = () => {
        if (bet > bankroll || bet <= 0) return;

        const betAmount = bet;
        setBankroll((prev) => precise(prev - betAmount));
        setCurrentBet(betAmount);

        const tileArray = Array(TOTAL_TILES).fill(false);
        for (let i = 0; i < mineCount; i++) {
            tileArray[i] = true;
        }
        const shuffled = shuffleArray(tileArray);

        setTiles(shuffled);
        setRevealed(Array(TOTAL_TILES).fill(false));
        setTilesRevealed(0);
        setCurrentMultiplier(1);
        setGameState("playing");
        setLastResult(null);
        setSelectedTiles(new Set());
        setAutoRevealing(false);
    };

    const enterSelectMode = () => {
        if (bet > bankroll || bet <= 0) return;
        setSelectedTiles(new Set());
        setGameState("selecting");
        setLastResult(null);
        setAutoRoundsPlayed(0);
        setAutoProfit(0);
    };

    const toggleTileSelection = (index: number) => {
        if (gameState !== "selecting") return;
        const newSelected = new Set(selectedTiles);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            if (newSelected.size >= TOTAL_TILES - mineCount) return;
            newSelected.add(index);
        }
        setSelectedTiles(newSelected);
    };

    const cancelSelection = () => {
        setGameState("idle");
        setSelectedTiles(new Set());
        setAutoLooping(false);
    };

    const stopAutoLoop = () => {
        if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
        setAutoLooping(false);
        setAutoRevealing(false);
        if (tilesRevealed === 0 && gameState === "playing") {
            setBankroll((prev) => precise(prev + currentBet));
            setGameState("idle");
        }
    };

    const runAutoRound = useCallback((currentBankroll: number) => {
        if (!autoLoopingRef.current) return;

        const betAmount = betRef.current;
        const mines = mineCountRef.current;
        const selected = Array.from(selectedTilesRef.current);
        const speed = autoSpeedRef.current;

        if (selected.length === 0) {
            setAutoLooping(false);
            setGameState("idle");
            return;
        }

        if (currentBankroll < betAmount || betAmount <= 0) {
            setAutoLooping(false);
            setGameState("idle");
            return;
        }

        const newBankroll = precise(currentBankroll - betAmount);
        setBankroll(newBankroll);
        setCurrentBet(betAmount);

        const tileArray = Array(TOTAL_TILES).fill(false);
        for (let i = 0; i < mines; i++) {
            tileArray[i] = true;
        }
        const shuffled = shuffleArray(tileArray);

        setTiles(shuffled);
        setRevealed(Array(TOTAL_TILES).fill(false));
        setTilesRevealed(0);
        setCurrentMultiplier(1);
        setGameState("playing");
        setAutoRevealing(true);
        setLastResult(null);

        const revealSequence = (
            gameTiles: boolean[],
            queue: number[],
            queueIndex: number,
            currentRevealed: boolean[],
            revealedCount: number,
            bet: number,
            runningBankroll: number
        ) => {
            if (!autoLoopingRef.current) {
                setAutoRevealing(false);
                return;
            }

            if (queueIndex >= queue.length) {
                const mult = calculateMultiplier(mines, revealedCount);
                const payout = precise(bet * mult);
                const profit = precise(payout - bet);
                const afterBankroll = precise(runningBankroll + payout);

                setBankroll(afterBankroll);
                setGameState("won");
                setAutoRevealing(false);
                setLastResult({ type: "win", amount: payout, mult });
                addHistory(bet, mult, payout, revealedCount, mines);
                setAutoRoundsPlayed((prev) => prev + 1);
                setAutoProfit((prev) => precise(prev + profit));

                autoTimerRef.current = setTimeout(() => {
                    if (autoLoopingRef.current) {
                        runAutoRound(afterBankroll);
                    }
                }, speed + 500);

                return;
            }

            const index = queue[queueIndex];
            const newRevealed = [...currentRevealed];
            newRevealed[index] = true;
            setRevealed(newRevealed);

            if (gameTiles[index]) {
                setAutoRevealing(false);
                setGameState("lost");
                setLastResult({ type: "loss", amount: bet, mult: 0 });

                const allRevealed = [...newRevealed];
                gameTiles.forEach((isMine, i) => {
                    if (isMine) allRevealed[i] = true;
                });
                setRevealed(allRevealed);

                addHistory(bet, 0, 0, revealedCount, mines);
                setAutoRoundsPlayed((prev) => prev + 1);
                setAutoProfit((prev) => precise(prev - bet));

                autoTimerRef.current = setTimeout(() => {
                    if (autoLoopingRef.current) {
                        runAutoRound(runningBankroll);
                    }
                }, speed + 800);

                return;
            }

            const newCount = revealedCount + 1;
            setTilesRevealed(newCount);
            const newMult = calculateMultiplier(mines, newCount);
            setCurrentMultiplier(newMult);

            const safeTiles = TOTAL_TILES - mines;
            if (newCount >= safeTiles) {
                const payout = precise(bet * newMult);
                const profit = precise(payout - bet);
                const afterBankroll = precise(runningBankroll + payout);

                setBankroll(afterBankroll);
                setGameState("won");
                setAutoRevealing(false);
                setLastResult({ type: "win", amount: payout, mult: newMult });
                addHistory(bet, newMult, payout, newCount, mines);
                setAutoRoundsPlayed((prev) => prev + 1);
                setAutoProfit((prev) => precise(prev + profit));

                autoTimerRef.current = setTimeout(() => {
                    if (autoLoopingRef.current) {
                        runAutoRound(afterBankroll);
                    }
                }, speed + 500);

                return;
            }

            autoTimerRef.current = setTimeout(() => {
                revealSequence(gameTiles, queue, queueIndex + 1, newRevealed, newCount, bet, runningBankroll);
            }, speed);
        };

        autoTimerRef.current = setTimeout(() => {
            revealSequence(shuffled, selected, 0, Array(TOTAL_TILES).fill(false), 0, betAmount, newBankroll);
        }, 300);
    }, [addHistory]);

    const startAutoLoop = () => {
        if (selectedTiles.size === 0) return;
        if (bet > bankroll || bet <= 0) return;

        setAutoLooping(true);
        setAutoRoundsPlayed(0);
        setAutoProfit(0);

        setTimeout(() => {
            runAutoRound(bankrollRef.current);
        }, 100);
    };

    const revealTile = (index: number) => {
        if (gameState !== "playing") return;
        if (revealed[index]) return;
        if (autoRevealing || autoLooping) return;

        const newRevealed = [...revealed];
        newRevealed[index] = true;
        setRevealed(newRevealed);

        if (tiles[index]) {
            setGameState("lost");
            setLastResult({ type: "loss", amount: currentBet, mult: 0 });

            const allRevealed = [...newRevealed];
            tiles.forEach((isMine, i) => {
                if (isMine) allRevealed[i] = true;
            });
            setRevealed(allRevealed);

            addHistory(currentBet, 0, 0, tilesRevealed, mineCount);
        } else {
            const newCount = tilesRevealed + 1;
            setTilesRevealed(newCount);
            const newMult = calculateMultiplier(mineCount, newCount);
            setCurrentMultiplier(newMult);

            const safeTiles = TOTAL_TILES - mineCount;
            if (newCount >= safeTiles) {
                const payout = precise(currentBet * newMult);
                setBankroll((prev) => precise(prev + payout));
                setGameState("won");
                setLastResult({ type: "win", amount: payout, mult: newMult });
                addHistory(currentBet, newMult, payout, newCount, mineCount);
            }
        }
    };

    const cashout = () => {
        if (gameState !== "playing" || tilesRevealed === 0) return;
        if (autoRevealing || autoLooping) return;

        const payout = precise(currentBet * currentMultiplier);
        setBankroll((prev) => precise(prev + payout));
        setGameState("won");
        setLastResult({ type: "win", amount: payout, mult: currentMultiplier });

        const allRevealed = [...revealed];
        tiles.forEach((isMine, i) => {
            if (isMine) allRevealed[i] = true;
        });
        setRevealed(allRevealed);

        addHistory(currentBet, currentMultiplier, payout, tilesRevealed, mineCount);
    };

    const resetGame = () => {
        if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
        setAutoRevealing(false);
        setAutoLooping(false);
        setGameState("idle");
        setTiles([]);
        setRevealed(Array(TOTAL_TILES).fill(false));
        setTilesRevealed(0);
        setCurrentMultiplier(1);
        setLastResult(null);
        setCurrentBet(0);
        setSelectedTiles(new Set());
        setAutoRoundsPlayed(0);
        setAutoProfit(0);
    };

    const nextMultiplier = gameState === "playing" ? calculateMultiplier(mineCount, tilesRevealed + 1) : null;
    const safeTilesLeft = TOTAL_TILES - mineCount - tilesRevealed;
    const previewMultiplier = gameState === "selecting" && selectedTiles.size > 0
        ? calculateMultiplier(mineCount, selectedTiles.size)
        : null;

    const isLocked = gameState === "playing" || gameState === "selecting" || autoLooping;

    return (
        <div className="text-neutral-200 font-sans selection:bg-emerald-500/30 xl:pb-0 pb-24">
            <div className="mx-auto max-w-6xl px-3 sm:px-4">
                {/* Header */}
                <header className="mb-2 sm:mb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Mines</h1>
                        <p className="text-neutral-500 text-xs sm:text-sm mt-1">
                            5×5 Grid • {mineCount} Mines • {TOTAL_TILES - mineCount} Safe
                        </p>
                    </div>
                    <div className="box-primary rounded-xl px-4 py-2 sm:px-5 sm:py-3 text-right shadow-sm self-start sm:self-auto w-full sm:w-auto flex justify-between sm:block items-center">
                        <div className="text-[10px] sm:text-xs uppercase tracking-wider text-neutral-500 font-semibold mb-0 sm:mb-1">
                            Balance
                        </div>
                        <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-400 tabular-nums">
                            {formatCurrency(bankroll)}
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 sm:gap-8">
                    {/* --- Controls --- */}
                    <div className="order-2 lg:order-1 space-y-4">
                        <motion.div
                            layout
                            transition={{ layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }}
                            className="box-primary rounded-2xl p-5 shadow-xl"
                        >
                            <motion.div layout="position" className="flex flex-col gap-4">
                                {/* Bet Amount */}
                                <motion.div layout="position">
                                    <label className="text-xs font-semibold text-neutral-500 uppercase mb-2 block">
                                        Bet Amount
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-neutral-500">
                                            $
                                        </div>
                                        <input
                                            type="number"
                                            value={bet}
                                            onChange={(e) => setBetSafe(Number(e.target.value))}
                                            disabled={isLocked}
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-3 pl-8 pr-3 font-mono font-bold text-white focus:outline-none focus:border-emerald-500/50 transition disabled:opacity-50"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        <button
                                            onClick={() => setBetSafe(bet / 2)}
                                            disabled={isLocked}
                                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold py-2 rounded-lg text-xs transition disabled:opacity-50"
                                        >
                                            1/2
                                        </button>
                                        <button
                                            onClick={() => setBetSafe(bet * 2)}
                                            disabled={isLocked}
                                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold py-2 rounded-lg text-xs transition disabled:opacity-50"
                                        >
                                            2×
                                        </button>
                                        <button
                                            onClick={() => setBetSafe(bankroll)}
                                            disabled={isLocked}
                                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold py-2 rounded-lg text-xs transition disabled:opacity-50"
                                        >
                                            MAX
                                        </button>
                                    </div>
                                </motion.div>

                                {/* Mine Count Slider */}
                                <motion.div layout="position">
                                    <label className="text-xs font-semibold text-neutral-500 uppercase mb-2 block">
                                        Mines: <span className="text-white">{mineCount}</span>
                                        <span className="text-neutral-600 ml-2">
                                            ({TOTAL_TILES - mineCount} safe)
                                        </span>
                                    </label>
                                    <input
                                        type="range"
                                        min={1}
                                        max={24}
                                        value={mineCount}
                                        onChange={(e) => setMineCount(Number(e.target.value))}
                                        disabled={isLocked}
                                        className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50"
                                    />
                                    <div className="flex justify-between text-[10px] text-neutral-600 mt-1 px-0.5">
                                        <span>1</span>
                                        <span>6</span>
                                        <span>12</span>
                                        <span>18</span>
                                        <span>24</span>
                                    </div>
                                </motion.div>

                                {/* Autoplay Speed — animated in/out */}
                                <AnimatedSection show={gameState === "selecting"}>
                                    <div className="pt-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] text-neutral-500 uppercase font-semibold">
                                                Reveal Speed
                                            </span>
                                            <span className="text-xs font-mono font-bold text-white">
                                                {autoSpeed <= 100 ? "Fast" : autoSpeed <= 250 ? "Normal" : "Slow"}
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min={50}
                                            max={500}
                                            step={50}
                                            value={500 - autoSpeed + 50}
                                            onChange={(e) => setAutoSpeed(500 - Number(e.target.value) + 50)}
                                            className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                        />
                                    </div>
                                </AnimatedSection>

                                {/* Selection preview — animated in/out */}
                                <AnimatedSection show={gameState === "selecting"} delay={0.05}>
                                    <div className="bg-neutral-950/50 rounded-lg p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-neutral-500 uppercase font-semibold">
                                                Selected Tiles
                                            </span>
                                            <span className="text-xs font-mono font-bold text-amber-400">
                                                {selectedTiles.size} / {TOTAL_TILES - mineCount}
                                            </span>
                                        </div>
                                        <AnimatedSection show={!!previewMultiplier}>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] text-neutral-500 uppercase font-semibold">
                                                        Multiplier
                                                    </span>
                                                    <span className={`text-xs font-mono font-bold ${previewMultiplier ? getMultiplierColor(previewMultiplier) : ""}`}>
                                                        {previewMultiplier}×
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] text-neutral-500 uppercase font-semibold">
                                                        Potential Win
                                                    </span>
                                                    <span className="text-xs font-mono font-bold text-emerald-400">
                                                        {formatCurrency(precise(bet * (previewMultiplier ?? 0)))}
                                                    </span>
                                                </div>
                                            </div>
                                        </AnimatedSection>
                                        <div className="bg-neutral-900/50 rounded p-2 text-[10px] text-neutral-600 text-center">
                                            Loops continuously until stopped
                                        </div>
                                    </div>
                                </AnimatedSection>

                                {/* Auto loop stats — animated in/out */}
                                <AnimatedSection show={autoLooping}>
                                    <div className="bg-neutral-950/50 rounded-lg p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-neutral-500 uppercase font-semibold">
                                                Rounds
                                            </span>
                                            <span className="text-xs font-mono font-bold text-white">
                                                {autoRoundsPlayed}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-neutral-500 uppercase font-semibold">
                                                Session Profit
                                            </span>
                                            <span className={`text-xs font-mono font-bold ${autoProfit >= 0 ? "text-emerald-400" : "text-[#f43f5e]"}`}>
                                                {autoProfit >= 0 ? "+" : ""}{formatCurrency(autoProfit)}
                                            </span>
                                        </div>
                                    </div>
                                </AnimatedSection>

                                {/* Action Buttons — animated transitions */}
                                <motion.div layout="position">
                                    <AnimatePresence mode="wait">
                                        {gameState === "idle" && !autoLooping ? (
                                            <motion.div
                                                key="idle-buttons"
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                                className="grid grid-cols-2 gap-2"
                                            >
                                                <button
                                                    onClick={startGame}
                                                    disabled={bet > bankroll || bet < 0.01}
                                                    className={`py-4 rounded-xl text-sm font-bold tracking-wide shadow-lg transition-all transform active:scale-[0.98] select-none ${
                                                        bet > bankroll || bet < 0.01
                                                            ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                                                            : "bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/20"
                                                    }`}
                                                >
                                                    BET
                                                </button>
                                                <button
                                                    onClick={enterSelectMode}
                                                    disabled={bet > bankroll || bet < 0.01}
                                                    className={`py-4 rounded-xl text-sm font-bold tracking-wide shadow-lg transition-all transform active:scale-[0.98] select-none ${
                                                        bet > bankroll || bet < 0.01
                                                            ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                                                            : "bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-amber-500/20"
                                                    }`}
                                                >
                                                    AUTO
                                                </button>
                                            </motion.div>
                                        ) : gameState === "selecting" ? (
                                            <motion.div
                                                key="selecting-buttons"
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                                className="grid grid-cols-2 gap-2"
                                            >
                                                <button
                                                    onClick={cancelSelection}
                                                    className="py-4 rounded-xl text-sm font-bold tracking-wide shadow-lg transition-all transform active:scale-[0.98] select-none bg-neutral-700 hover:bg-neutral-600 text-neutral-200"
                                                >
                                                    CANCEL
                                                </button>
                                                <button
                                                    onClick={startAutoLoop}
                                                    disabled={selectedTiles.size === 0}
                                                    className={`py-4 rounded-xl text-sm font-bold tracking-wide shadow-lg transition-all transform active:scale-[0.98] select-none ${
                                                        selectedTiles.size === 0
                                                            ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                                                            : "bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-amber-500/20"
                                                    }`}
                                                >
                                                    START ({selectedTiles.size})
                                                </button>
                                            </motion.div>
                                        ) : autoLooping ? (
                                            <motion.div
                                                key="autoloop-button"
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                            >
                                                <button
                                                    onClick={stopAutoLoop}
                                                    className="w-full py-4 rounded-xl text-lg font-bold tracking-wide shadow-lg transition-all transform active:scale-[0.98] select-none bg-[#f43f5e] hover:bg-[#e11d48] text-white shadow-red-500/20"
                                                >
                                                    STOP AUTO
                                                </button>
                                            </motion.div>
                                        ) : (gameState === "won" || gameState === "lost") && !autoLooping ? (
                                            <motion.div
                                                key="newgame-button"
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                            >
                                                <button
                                                    onClick={resetGame}
                                                    className="w-full py-4 rounded-xl text-lg font-bold tracking-wide shadow-lg transition-all transform active:scale-[0.98] select-none bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/20"
                                                >
                                                    NEW GAME
                                                </button>
                                            </motion.div>
                                        ) : gameState === "playing" && !autoLooping ? (
                                            <motion.div
                                                key="playing-buttons"
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                                className="grid grid-cols-2 gap-2"
                                            >
                                                <button
                                                    onClick={cashout}
                                                    disabled={tilesRevealed === 0 || autoRevealing}
                                                    className={`py-4 rounded-xl text-sm font-bold tracking-wide shadow-lg transition-all transform active:scale-[0.98] select-none ${
                                                        tilesRevealed === 0 || autoRevealing
                                                            ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                                                            : "bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/20"
                                                    }`}
                                                >
                                                    CASHOUT
                                                </button>
                                                <div className="bg-neutral-950/50 rounded-xl flex flex-col items-center justify-center p-2">
                                                    <span className="text-[9px] uppercase text-neutral-500 font-semibold">Payout</span>
                                                    <span className="text-sm font-mono font-bold text-emerald-400">
                                                        {formatCurrency(precise(currentBet * currentMultiplier))}
                                                    </span>
                                                </div>
                                            </motion.div>
                                        ) : null}
                                    </AnimatePresence>
                                </motion.div>
                            </motion.div>
                        </motion.div>

                        {/* History */}
                        <div className="box-primary rounded-2xl p-4 max-h-[250px] flex flex-col">
                            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
                                History
                            </h3>
                            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                                {history.length === 0 && (
                                    <div className="text-neutral-600 text-xs text-center py-4">No games yet</div>
                                )}
                                {history.map((h) => (
                                    <div
                                        key={h.id}
                                        className="flex items-center justify-between bg-neutral-950/30 p-2 rounded border border-neutral-800/30 text-xs"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-neutral-600">{h.mineCount}💣</span>
                                            <span
                                                className={`font-mono font-bold ${
                                                    h.multiplier > 0 ? getMultiplierColor(h.multiplier) : "text-[#f43f5e]"
                                                }`}
                                            >
                                                {h.multiplier > 0 ? `${h.multiplier}×` : "💥"}
                                            </span>
                                        </div>
                                        <div className={`font-mono ${h.payout > 0 ? "text-lime-400" : "text-red-600"}`}>
                                            {h.payout > 0 ? formatCurrency(h.payout) : `-${formatCurrency(h.bet)}`}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* --- Game Board --- */}
                    <div className="order-1 lg:order-2 box-primary rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[500px]">
                        {/* Result Banner */}
                        <div className="absolute top-4 left-0 right-0 flex justify-center z-30 pointer-events-none">
                            <AnimatePresence mode="wait">
                                {lastResult && (
                                    <motion.div
                                        key={`${lastResult.amount}-${lastResult.type}-${autoRoundsPlayed}`}
                                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        className={`backdrop-blur border px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 ${
                                            lastResult.type === "win"
                                                ? "bg-emerald-950/90 border-emerald-700"
                                                : "bg-red-950/90 border-red-700"
                                        }`}
                                    >
                                        {lastResult.type === "win" ? (
                                            <>
                                                <span className={`text-2xl font-black ${getMultiplierColor(lastResult.mult)}`}>
                                                    {lastResult.mult}×
                                                </span>
                                                <div className="h-6 w-px bg-neutral-700" />
                                                <span className="text-emerald-400 font-mono font-bold text-lg">
                                                    +{formatCurrency(lastResult.amount)}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-[#f43f5e] font-bold text-lg">
                                                💥 BOOM! -{formatCurrency(lastResult.amount)}
                                            </span>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Auto loop indicator */}
                        <AnimatePresence>
                            {autoLooping && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="absolute top-4 right-4 z-30 flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-3 py-1.5"
                                >
                                    <motion.div
                                        animate={{ scale: [1, 1.3, 1] }}
                                        transition={{ duration: 0.8, repeat: Infinity }}
                                        className="w-2 h-2 rounded-full bg-amber-400"
                                    />
                                    <span className="text-[10px] font-bold text-amber-400 uppercase">
                                        Auto #{autoRoundsPlayed + 1}
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Selecting mode banner */}
                        <AnimatePresence>
                            {gameState === "selecting" && (
                                <motion.div
                                    initial={{ opacity: 0, y: -15, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -15, scale: 0.95 }}
                                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                                    className="mb-4 flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-full px-4 py-2"
                                >
                                    <span className="text-xs font-bold text-amber-400">
                                        Select tiles to auto-reveal
                                    </span>
                                    <span className="text-[10px] text-amber-400/60 font-mono">
                                        ({selectedTiles.size} selected)
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Stats above grid */}
                        <AnimatePresence>
                            {gameState === "playing" && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, height: 0 }}
                                    animate={{ opacity: 1, y: 0, height: "auto" }}
                                    exit={{ opacity: 0, y: -10, height: 0 }}
                                    transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                                    className="w-full max-w-[400px] mb-4"
                                >
                                    <div className="grid grid-cols-4 gap-2">
                                        <div className="bg-neutral-950/50 rounded-lg p-2 sm:p-3 text-center">
                                            <div className="text-[9px] sm:text-[10px] uppercase text-neutral-500 font-semibold">
                                                Current
                                            </div>
                                            <div className={`text-sm sm:text-lg font-mono font-bold ${getMultiplierColor(currentMultiplier)}`}>
                                                {currentMultiplier}×
                                            </div>
                                        </div>
                                        <div className="bg-neutral-950/50 rounded-lg p-2 sm:p-3 text-center">
                                            <div className="text-[9px] sm:text-[10px] uppercase text-neutral-500 font-semibold">
                                                Next
                                            </div>
                                            <div className={`text-sm sm:text-lg font-mono font-bold ${nextMultiplier ? getMultiplierColor(nextMultiplier) : "text-neutral-600"}`}>
                                                {nextMultiplier ? `${nextMultiplier}×` : "—"}
                                            </div>
                                        </div>
                                        <div className="bg-neutral-950/50 rounded-lg p-2 sm:p-3 text-center">
                                            <div className="text-[9px] sm:text-[10px] uppercase text-neutral-500 font-semibold">
                                                Profit
                                            </div>
                                            <div className="text-sm sm:text-lg font-mono font-bold text-white">
                                                {formatCurrency(precise(currentBet * currentMultiplier - currentBet))}
                                            </div>
                                        </div>
                                        <div className="bg-neutral-950/50 rounded-lg p-2 sm:p-3 text-center">
                                            <div className="text-[9px] sm:text-[10px] uppercase text-neutral-500 font-semibold">
                                                Safe Left
                                            </div>
                                            <div className="text-sm sm:text-lg font-mono font-bold text-white">
                                                {safeTilesLeft}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Grid */}
                        <div className="grid grid-cols-5 gap-2 sm:gap-3 w-full max-w-[400px]">
                            {Array.from({ length: TOTAL_TILES }).map((_, index) => {
                                const isRevealed = revealed[index];
                                const isMine = tiles[index];
                                const isSelected = selectedTiles.has(index);
                                const isSelecting = gameState === "selecting";

                                let tileContent: React.ReactNode = null;
                                let tileClass = "";

                                if (isRevealed && isMine) {
                                    tileContent = (
                                        <motion.span
                                            initial={{ scale: 0, rotate: -180 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                            className="text-2xl sm:text-3xl"
                                        >
                                            💣
                                        </motion.span>
                                    );
                                    tileClass = "bg-[#f43f5e]/20 border-[#f43f5e]/40";
                                } else if (isRevealed && !isMine) {
                                    tileContent = (
                                        <motion.span
                                            initial={{ scale: 0, rotate: -180 }}
                                            animate={{ scale: 1, rotate: 0 }}
                                            transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                            className="text-2xl sm:text-3xl"
                                        >
                                            💎
                                        </motion.span>
                                    );
                                    tileClass = "bg-emerald-500/15 border-emerald-500/30";
                                } else if (isSelecting) {
                                    if (isSelected) {
                                        tileContent = (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="w-4 h-4 rounded-full bg-amber-400"
                                            />
                                        );
                                        tileClass = "bg-amber-500/15 border-amber-500/50 cursor-pointer hover:bg-amber-500/25 active:scale-95";
                                    } else {
                                        tileClass = "bg-neutral-800 border-neutral-700 cursor-pointer hover:bg-neutral-700 hover:border-amber-500/30 active:scale-95";
                                    }
                                } else {
                                    tileClass =
                                        gameState === "playing" && !autoRevealing && !autoLooping
                                            ? "bg-neutral-800 border-neutral-700 hover:bg-neutral-700 hover:border-neutral-600 cursor-pointer hover:scale-105 active:scale-95"
                                            : gameState === "playing"
                                                ? "bg-neutral-800 border-neutral-700 cursor-default"
                                                : "bg-neutral-800/60 border-neutral-800 cursor-default";
                                }

                                const handleClick = () => {
                                    if (isSelecting) {
                                        toggleTileSelection(index);
                                    } else if (!autoLooping && !autoRevealing) {
                                        revealTile(index);
                                    }
                                };

                                return (
                                    <motion.button
                                        key={index}
                                        onClick={handleClick}
                                        disabled={
                                            (gameState === "playing" && (isRevealed || autoRevealing || autoLooping)) ||
                                            (gameState !== "playing" && gameState !== "selecting")
                                        }
                                        className={`aspect-square rounded-xl border-2 flex items-center justify-center transition-all duration-150 select-none ${tileClass}`}
                                        whileTap={
                                            (gameState === "playing" && !isRevealed && !autoRevealing && !autoLooping) || isSelecting
                                                ? { scale: 0.9 }
                                                : {}
                                        }
                                    >
                                        {tileContent}
                                    </motion.button>
                                );
                            })}
                        </div>

                        {/* Idle state message */}
                        <AnimatePresence>
                            {gameState === "idle" && !autoLooping && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                                >
                                    <div className="text-neutral-600 text-sm font-semibold bg-neutral-900/80 backdrop-blur px-6 py-3 rounded-full">
                                        Place a bet to start
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}