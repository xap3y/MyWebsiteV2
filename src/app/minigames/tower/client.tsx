"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- Configuration ---
const ROWS = 8;
const COLS = 4;
const STORAGE_KEY = "tower_bankroll_v1";
const HISTORY_STORAGE_KEY = "tower_history_v1";
const DEFAULT_BANKROLL = 1000;
const MIN_BET = 10;
const MAX_HISTORY = 30;

type GameState = "idle" | "selecting" | "playing" | "won" | "lost";

type TowerHistoryEntry = {
    id: string;
    date: string;
    bet: number;
    multiplier: number;
    payout: number;
    trapCount: number;
    floorsClimbed: number;
};

// --- Helpers ---
function formatCurrency(n: number) {
    if (!n) return "$0";
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

function calculateMultiplier(trapCount: number, floorsClimbed: number): number {
    if (floorsClimbed === 0) return 1;
    const safePerRow = COLS - trapCount;
    let multiplier = Math.pow(COLS / safePerRow, floorsClimbed);
    return precise(multiplier * 0.97);
}

function generateRow(trapCount: number): boolean[] {
    const row = Array(COLS).fill(false);
    for (let i = 0; i < trapCount; i++) {
        row[i] = true;
    }
    return shuffleArray(row);
}

function generateTower(trapCount: number): boolean[][] {
    return Array.from({ length: ROWS }, () => generateRow(trapCount));
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
export default function TowerGame() {
    const [bankroll, setBankroll] = useState<number>(DEFAULT_BANKROLL);
    const [bet, setBet] = useState<number>(MIN_BET);
    const [trapCount, setTrapCount] = useState<number>(1);
    const [gameState, setGameState] = useState<GameState>("idle");
    const [tower, setTower] = useState<boolean[][]>([]);
    const [revealedRows, setRevealedRows] = useState<(number | null)[]>(Array(ROWS).fill(null));
    const [currentFloor, setCurrentFloor] = useState<number>(0);
    const [currentMultiplier, setCurrentMultiplier] = useState<number>(1);
    const [history, setHistory] = useState<TowerHistoryEntry[]>([]);
    const [lastResult, setLastResult] = useState<{ type: "win" | "loss"; amount: number; mult: number } | null>(null);
    const [currentBet, setCurrentBet] = useState<number>(0);

    // Autoplay state
    const [selectedColumns, setSelectedColumns] = useState<number[]>(Array(ROWS).fill(-1));
    const [autoRevealing, setAutoRevealing] = useState(false);
    const [autoLooping, setAutoLooping] = useState(false);
    const [autoSpeed, setAutoSpeed] = useState<number>(200);
    const [autoRoundsPlayed, setAutoRoundsPlayed] = useState(0);
    const [autoProfit, setAutoProfit] = useState(0);
    const autoTimerRef = useRef<NodeJS.Timeout | null>(null);
    const autoLoopingRef = useRef(false);
    const bankrollRef = useRef(bankroll);
    const betRef = useRef(bet);
    const trapCountRef = useRef(trapCount);
    const selectedColumnsRef = useRef<number[]>(Array(ROWS).fill(-1));
    const autoSpeedRef = useRef(autoSpeed);

    // Keep refs in sync
    useEffect(() => { autoLoopingRef.current = autoLooping; }, [autoLooping]);
    useEffect(() => { bankrollRef.current = bankroll; }, [bankroll]);
    useEffect(() => { betRef.current = bet; }, [bet]);
    useEffect(() => { trapCountRef.current = trapCount; }, [trapCount]);
    useEffect(() => { selectedColumnsRef.current = selectedColumns; }, [selectedColumns]);
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

    const addHistory = useCallback((betAmt: number, mult: number, payout: number, floors: number, traps: number) => {
        const entry: TowerHistoryEntry = {
            id: generateId(),
            date: new Date().toISOString(),
            bet: betAmt,
            multiplier: mult,
            payout,
            trapCount: traps,
            floorsClimbed: floors,
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

        const newTower = generateTower(trapCount);
        setTower(newTower);
        setRevealedRows(Array(ROWS).fill(null));
        setCurrentFloor(0);
        setCurrentMultiplier(1);
        setGameState("playing");
        setLastResult(null);
        setSelectedColumns(Array(ROWS).fill(-1));
        setAutoRevealing(false);
    };

    const enterSelectMode = () => {
        if (bet > bankroll || bet <= 0) return;
        setSelectedColumns(Array(ROWS).fill(-1));
        setGameState("selecting");
        setLastResult(null);
        setAutoRoundsPlayed(0);
        setAutoProfit(0);
    };

    const toggleColumnSelection = (row: number, col: number) => {
        if (gameState !== "selecting") return;
        const newSelected = [...selectedColumns];
        if (newSelected[row] === col) {
            newSelected[row] = -1;
        } else {
            newSelected[row] = col;
        }
        setSelectedColumns(newSelected);
    };

    const cancelSelection = () => {
        setGameState("idle");
        setSelectedColumns(Array(ROWS).fill(-1));
        setAutoLooping(false);
    };

    const stopAutoLoop = () => {
        if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
        setAutoLooping(false);
        setAutoRevealing(false);
        if (currentFloor === 0 && gameState === "playing") {
            setBankroll((prev) => precise(prev + currentBet));
            setGameState("idle");
        }
    };

    const selectedFloorCount = selectedColumns.filter((c) => c >= 0).length;

    const runAutoRound = useCallback((currentBankroll: number) => {
        if (!autoLoopingRef.current) return;

        const betAmount = betRef.current;
        const traps = trapCountRef.current;
        const selected = [...selectedColumnsRef.current];
        const speed = autoSpeedRef.current;

        const floorsToClimb = selected.filter((c) => c >= 0).length;
        if (floorsToClimb === 0) {
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

        const newTower = generateTower(traps);
        setTower(newTower);
        setRevealedRows(Array(ROWS).fill(null));
        setCurrentFloor(0);
        setCurrentMultiplier(1);
        setGameState("playing");
        setAutoRevealing(true);
        setLastResult(null);

        const revealSequence = (
            gameTower: boolean[][],
            floorIndex: number,
            currentRevealed: (number | null)[],
            bet: number,
            runningBankroll: number
        ) => {
            if (!autoLoopingRef.current) {
                setAutoRevealing(false);
                return;
            }

            if (floorIndex >= ROWS || selected[floorIndex] < 0) {
                const mult = calculateMultiplier(traps, floorIndex);
                const payout = precise(bet * mult);
                const profit = precise(payout - bet);
                const afterBankroll = precise(runningBankroll + payout);

                setBankroll(afterBankroll);
                setGameState("won");
                setAutoRevealing(false);
                setLastResult({ type: "win", amount: payout, mult });
                addHistory(bet, mult, payout, floorIndex, traps);
                setAutoRoundsPlayed((prev) => prev + 1);
                setAutoProfit((prev) => precise(prev + profit));

                autoTimerRef.current = setTimeout(() => {
                    if (autoLoopingRef.current) {
                        runAutoRound(afterBankroll);
                    }
                }, speed + 500);

                return;
            }

            const col = selected[floorIndex];
            const newRevealed = [...currentRevealed];
            newRevealed[floorIndex] = col;
            setRevealedRows(newRevealed);
            setCurrentFloor(floorIndex + 1);

            if (gameTower[floorIndex][col]) {
                // Hit a trap
                setAutoRevealing(false);
                setGameState("lost");
                setLastResult({ type: "loss", amount: bet, mult: 0 });

                // Reveal all traps
                const allRevealed = [...newRevealed];
                for (let r = floorIndex; r < ROWS; r++) {
                    gameTower[r].forEach((isTrap, c) => {
                        if (isTrap && allRevealed[r] === null) {
                            allRevealed[r] = allRevealed[r] ?? -1;
                        }
                    });
                }
                setRevealedRows(allRevealed);

                addHistory(bet, 0, 0, floorIndex, traps);
                setAutoRoundsPlayed((prev) => prev + 1);
                setAutoProfit((prev) => precise(prev - bet));

                autoTimerRef.current = setTimeout(() => {
                    if (autoLoopingRef.current) {
                        runAutoRound(runningBankroll);
                    }
                }, speed + 800);

                return;
            }

            const newMult = calculateMultiplier(traps, floorIndex + 1);
            setCurrentMultiplier(newMult);

            if (floorIndex + 1 >= ROWS) {
                const payout = precise(bet * newMult);
                const profit = precise(payout - bet);
                const afterBankroll = precise(runningBankroll + payout);

                setBankroll(afterBankroll);
                setGameState("won");
                setAutoRevealing(false);
                setLastResult({ type: "win", amount: payout, mult: newMult });
                addHistory(bet, newMult, payout, floorIndex + 1, traps);
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
                revealSequence(gameTower, floorIndex + 1, newRevealed, bet, runningBankroll);
            }, speed);
        };

        autoTimerRef.current = setTimeout(() => {
            revealSequence(newTower, 0, Array(ROWS).fill(null), betAmount, newBankroll);
        }, 300);
    }, [addHistory]);

    const startAutoLoop = () => {
        if (selectedFloorCount === 0) return;
        if (bet > bankroll || bet <= 0) return;

        setAutoLooping(true);
        setAutoRoundsPlayed(0);
        setAutoProfit(0);

        setTimeout(() => {
            runAutoRound(bankrollRef.current);
        }, 100);
    };

    const revealTile = (row: number, col: number) => {
        if (gameState !== "playing") return;
        if (row !== currentFloor) return;
        if (revealedRows[row] !== null) return;
        if (autoRevealing || autoLooping) return;

        const newRevealed = [...revealedRows];
        newRevealed[row] = col;
        setRevealedRows(newRevealed);

        if (tower[row][col]) {
            // Hit a trap
            setGameState("lost");
            setLastResult({ type: "loss", amount: currentBet, mult: 0 });
            addHistory(currentBet, 0, 0, currentFloor, trapCount);
        } else {
            const newFloor = currentFloor + 1;
            setCurrentFloor(newFloor);
            const newMult = calculateMultiplier(trapCount, newFloor);
            setCurrentMultiplier(newMult);

            if (newFloor >= ROWS) {
                const payout = precise(currentBet * newMult);
                setBankroll((prev) => precise(prev + payout));
                setGameState("won");
                setLastResult({ type: "win", amount: payout, mult: newMult });
                addHistory(currentBet, newMult, payout, newFloor, trapCount);
            }
        }
    };

    const cashout = () => {
        if (gameState !== "playing" || currentFloor === 0) return;
        if (autoRevealing || autoLooping) return;

        const payout = precise(currentBet * currentMultiplier);
        setBankroll((prev) => precise(prev + payout));
        setGameState("won");
        setLastResult({ type: "win", amount: payout, mult: currentMultiplier });
        addHistory(currentBet, currentMultiplier, payout, currentFloor, trapCount);
    };

    const resetGame = () => {
        if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
        setAutoRevealing(false);
        setAutoLooping(false);
        setGameState("idle");
        setTower([]);
        setRevealedRows(Array(ROWS).fill(null));
        setCurrentFloor(0);
        setCurrentMultiplier(1);
        setLastResult(null);
        setCurrentBet(0);
        setSelectedColumns(Array(ROWS).fill(-1));
        setAutoRoundsPlayed(0);
        setAutoProfit(0);
    };

    const nextMultiplier = gameState === "playing" ? calculateMultiplier(trapCount, currentFloor + 1) : null;
    const floorsLeft = ROWS - currentFloor;
    const previewMultiplier = gameState === "selecting" && selectedFloorCount > 0
        ? calculateMultiplier(trapCount, selectedFloorCount)
        : null;

    const isLocked = gameState === "playing" || gameState === "selecting" || autoLooping;

    // Render tower rows from top (row ROWS-1) to bottom (row 0)
    const rowIndices = Array.from({ length: ROWS }, (_, i) => ROWS - 1 - i);

    return (
        <div className="text-neutral-200 font-sans selection:bg-emerald-500/30 xl:pb-0 pb-24">
            <div className="mx-auto max-w-6xl px-3 sm:px-4">
                {/* Header */}
                <header className="mb-2 sm:mb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Tower</h1>
                        <p className="text-neutral-500 text-xs sm:text-sm mt-1">
                            {ROWS} Floors • {COLS} Tiles • {trapCount} Trap{trapCount > 1 ? "s" : ""} per Row
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

                                {/* Trap Count Slider */}
                                <motion.div layout="position">
                                    <label className="text-xs font-semibold text-neutral-500 uppercase mb-2 block">
                                        Traps per Row: <span className="text-white">{trapCount}</span>
                                        <span className="text-neutral-600 ml-2">
                                            ({COLS - trapCount} safe)
                                        </span>
                                    </label>
                                    <input
                                        type="range"
                                        min={1}
                                        max={3}
                                        value={trapCount}
                                        onChange={(e) => setTrapCount(Number(e.target.value))}
                                        disabled={isLocked}
                                        className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50"
                                    />
                                    <div className="flex justify-between text-[10px] text-neutral-600 mt-1 px-0.5">
                                        <span>1</span>
                                        <span>2</span>
                                        <span>3</span>
                                    </div>
                                </motion.div>

                                {/* Autoplay Speed */}
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

                                {/* Selection preview */}
                                <AnimatedSection show={gameState === "selecting"} delay={0.05}>
                                    <div className="bg-neutral-950/50 rounded-lg p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-neutral-500 uppercase font-semibold">
                                                Floors Selected
                                            </span>
                                            <span className="text-xs font-mono font-bold text-amber-400">
                                                {selectedFloorCount} / {ROWS}
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

                                {/* Auto loop stats */}
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

                                {/* Action Buttons */}
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
                                                    disabled={selectedFloorCount === 0}
                                                    className={`py-4 rounded-xl text-sm font-bold tracking-wide shadow-lg transition-all transform active:scale-[0.98] select-none ${
                                                        selectedFloorCount === 0
                                                            ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                                                            : "bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-amber-500/20"
                                                    }`}
                                                >
                                                    START ({selectedFloorCount})
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
                                                    disabled={currentFloor === 0 || autoRevealing}
                                                    className={`py-4 rounded-xl text-sm font-bold tracking-wide shadow-lg transition-all transform active:scale-[0.98] select-none ${
                                                        currentFloor === 0 || autoRevealing
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
                                            <span className="text-neutral-600">{h.trapCount}🪤 F{h.floorsClimbed}</span>
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
                                        Select one tile per floor to auto-reveal
                                    </span>
                                    <span className="text-[10px] text-amber-400/60 font-mono">
                                        ({selectedFloorCount} selected)
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
                                    className="w-full max-w-[420px] mb-4"
                                >
                                    <div className="grid grid-cols-4 gap-2">
                                        <div className="bg-neutral-950/50 rounded-lg p-2 sm:p-3 text-center">
                                            <div className="text-[9px] sm:text-[10px] uppercase text-neutral-500 font-semibold">
                                                Floor
                                            </div>
                                            <div className="text-sm sm:text-lg font-mono font-bold text-white">
                                                {currentFloor}/{ROWS}
                                            </div>
                                        </div>
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
                                                {nextMultiplier && floorsLeft > 0 ? `${nextMultiplier}×` : "—"}
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
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Tower Grid */}
                        <div className="flex flex-col gap-2 sm:gap-3 w-full max-w-[420px]">
                            {rowIndices.map((rowIdx) => {
                                const isCurrentRow = gameState === "playing" && rowIdx === currentFloor;
                                const isClimbed = rowIdx < currentFloor;
                                const isAbove = rowIdx > currentFloor;
                                const isRevealed = revealedRows[rowIdx] !== null;
                                const revealedCol = revealedRows[rowIdx];
                                const isSelecting = gameState === "selecting";
                                const selectedCol = selectedColumns[rowIdx];
                                const isGameOver = gameState === "won" || gameState === "lost";

                                const floorMult = calculateMultiplier(trapCount, rowIdx + 1);

                                return (
                                    <div key={rowIdx} className="flex items-center gap-2 sm:gap-3">
                                        {/* Floor label */}
                                        <div className={`w-8 sm:w-10 text-right text-[10px] sm:text-xs font-mono font-bold shrink-0 ${
                                            isCurrentRow ? "text-emerald-400" : isClimbed ? "text-neutral-500" : "text-neutral-700"
                                        }`}>
                                            {rowIdx + 1}F
                                        </div>

                                        {/* Tiles */}
                                        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 flex-1">
                                            {Array.from({ length: COLS }).map((_, colIdx) => {
                                                const isTrap = tower[rowIdx]?.[colIdx];
                                                const isThisRevealed = revealedCol === colIdx;
                                                const isThisSelected = selectedCol === colIdx;

                                                let tileContent: React.ReactNode = null;
                                                let tileClass = "";

                                                if (isRevealed && isThisRevealed && isTrap) {
                                                    tileContent = (
                                                        <motion.span
                                                            initial={{ scale: 0, rotate: -180 }}
                                                            animate={{ scale: 1, rotate: 0 }}
                                                            transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                                            className="text-lg sm:text-2xl"
                                                        >
                                                            💣
                                                        </motion.span>
                                                    );
                                                    tileClass = "bg-[#f43f5e]/20 border-[#f43f5e]/40";
                                                } else if (isRevealed && isThisRevealed && !isTrap) {
                                                    tileContent = (
                                                        <motion.span
                                                            initial={{ scale: 0, rotate: -180 }}
                                                            animate={{ scale: 1, rotate: 0 }}
                                                            transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                                            className="text-lg sm:text-2xl"
                                                        >
                                                            💎
                                                        </motion.span>
                                                    );
                                                    tileClass = "bg-emerald-500/15 border-emerald-500/30";
                                                } else if (isGameOver && isRevealed && !isThisRevealed && isTrap) {
                                                    // Show traps on the failed row after game over
                                                    tileContent = (
                                                        <motion.span
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            transition={{ delay: 0.2 }}
                                                            className="text-lg sm:text-2xl opacity-40"
                                                        >
                                                            💣
                                                        </motion.span>
                                                    );
                                                    tileClass = "bg-[#f43f5e]/10 border-neutral-800";
                                                } else if (isSelecting) {
                                                    if (isThisSelected) {
                                                        tileContent = (
                                                            <motion.div
                                                                initial={{ scale: 0 }}
                                                                animate={{ scale: 1 }}
                                                                className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-amber-400"
                                                            />
                                                        );
                                                        tileClass = "bg-amber-500/15 border-amber-500/50 cursor-pointer hover:bg-amber-500/25 active:scale-95";
                                                    } else {
                                                        tileClass = "bg-neutral-800 border-neutral-700 cursor-pointer hover:bg-neutral-700 hover:border-amber-500/30 active:scale-95";
                                                    }
                                                } else if (isCurrentRow && !autoRevealing && !autoLooping) {
                                                    tileClass = "bg-neutral-800 border-neutral-700 hover:bg-neutral-700 hover:border-emerald-500/40 cursor-pointer hover:scale-105 active:scale-95";
                                                } else if (isClimbed && !isRevealed) {
                                                    tileClass = "bg-neutral-800/40 border-neutral-800/50 cursor-default";
                                                } else {
                                                    tileClass = "bg-neutral-800/60 border-neutral-800 cursor-default";
                                                }

                                                const handleClick = () => {
                                                    if (isSelecting) {
                                                        toggleColumnSelection(rowIdx, colIdx);
                                                    } else if (!autoLooping && !autoRevealing) {
                                                        revealTile(rowIdx, colIdx);
                                                    }
                                                };

                                                return (
                                                    <motion.button
                                                        key={colIdx}
                                                        onClick={handleClick}
                                                        disabled={
                                                            (gameState === "playing" && (rowIdx !== currentFloor || autoRevealing || autoLooping)) ||
                                                            (gameState !== "playing" && gameState !== "selecting")
                                                        }
                                                        className={`aspect-[2/1] sm:aspect-[2/1] rounded-lg sm:rounded-xl border-2 flex items-center justify-center transition-all duration-150 select-none ${tileClass}`}
                                                        whileTap={
                                                            (isCurrentRow && !autoRevealing && !autoLooping) || isSelecting
                                                                ? { scale: 0.9 }
                                                                : {}
                                                        }
                                                    >
                                                        {tileContent}
                                                    </motion.button>
                                                );
                                            })}
                                        </div>

                                        {/* Multiplier label */}
                                        <div className={`w-12 sm:w-14 text-left text-[10px] sm:text-xs font-mono shrink-0 ${
                                            isClimbed ? getMultiplierColor(floorMult) : "text-neutral-700"
                                        }`}>
                                            {floorMult}×
                                        </div>
                                    </div>
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
                                        Place a bet to start climbing
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