"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- Types & Constants ---

type DiceHistoryEntry = {
    id: string;
    date: string;
    bet: number;
    chance: number;
    multiplier: number;
    roll: number;
    win: boolean;
    payout: number;
    net: number;
};

const STORAGE_KEY = "dice_bankroll_v1";
const HISTORY_STORAGE_KEY = "dice_history_v1";
const DEFAULT_BANKROLL = 1000;
const MIN_BET = 10;
const MAX_HISTORY_ENTRIES = 50;
const HOUSE_EDGE = 0.01; // 1%

// --- Helpers ---

function formatCurrency(n: number) {
    return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

// Helper to prevent 0.0000004 floating point errors
function precise(n: number) {
    return Math.floor(n * 100) / 100;
}

function generateId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        // @ts-ignore
        return crypto.randomUUID();
    }
    return `dice-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function randomInt(maxExclusive: number) {
    if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
        const arr = new Uint32Array(1);
        crypto.getRandomValues(arr);
        return arr[0] % maxExclusive;
    }
    return Math.floor(Math.random() * maxExclusive);
}

// --- Components ---

export default function DiceGame() {
    // --- State ---
    const [bankroll, setBankroll] = useState<number>(DEFAULT_BANKROLL);
    const [bet, setBet] = useState<number>(MIN_BET);
    const [chance, setChance] = useState<number>(50);
    const [rolling, setRolling] = useState(false);

    // Result State
    const [resultRoll, setResultRoll] = useState<number>(50);
    const [lastWin, setLastWin] = useState<boolean | null>(null);
    const [lastPayout, setLastPayout] = useState<number>(0);
    // New state to freeze the bet amount for the result display
    const [resultBet, setResultBet] = useState<number>(0);

    const [history, setHistory] = useState<DiceHistoryEntry[]>([]);

    // --- Effects ---

    // Load data
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setBankroll(Number(saved));

        try {
            const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
            if (raw) setHistory(JSON.parse(raw));
        } catch (e) { console.error(e); }
    }, []);

    // Save Bankroll
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, String(bankroll));
    }, [bankroll]);

    // Clamping Bet to Bankroll (Fix: Don't run this while rolling)
    useEffect(() => {
        if (rolling) return; // Do not adjust bet while rolling is in progress

        if (bet > bankroll) {
            setBet(precise(bankroll));
        }
    }, [bet, bankroll, rolling]);

    // Refill Logic (Fix: Give $100 if broke)
    useEffect(() => {
        if (!rolling && bankroll < 0.01) {
            // Give the user a moment to see they lost, then refill
            const timer = setTimeout(() => {
                setBankroll(100);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [bankroll, rolling]);

    // --- Logic ---

    const multiplier = useMemo(() => {
        const raw = (99 / Math.max(0.1, chance)) * (1 - HOUSE_EDGE);
        return Math.max(1.01, Number(raw.toFixed(4)));
    }, [chance]);

    const setBetSafe = (value: number) => {
        if (rolling) return;
        let cleanValue = precise(value);
        // Ensure within bounds
        cleanValue = Math.max(MIN_BET, Math.min(cleanValue, bankroll));
        // If bankroll is less than MIN_BET (e.g. 0), we allow 0 or handled by refill logic
        if (bankroll < MIN_BET) cleanValue = bankroll;

        setBet(cleanValue);
    };

    const pushHistory = useCallback((entry: DiceHistoryEntry) => {
        setHistory(prev => {
            const next = [entry, ...prev].slice(0, MAX_HISTORY_ENTRIES);
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    const performRoll = async () => {
        if (rolling) return;
        if (bet > bankroll) return;

        setRolling(true);
        setLastWin(null);

        // Snapshot the bet for the result screen (Fixes "You Lost 0.00")
        const currentBet = bet;
        setResultBet(currentBet);

        // Deduct bet immediately
        setBankroll(prev => precise(prev - currentBet));

        // Network simulation
        await new Promise(r => setTimeout(r, 400));

        // Result
        const rollRaw = randomInt(10000) / 100;
        const isWin = rollRaw < chance;
        const payout = isWin ? precise(currentBet * multiplier) : 0;

        setResultRoll(rollRaw);
        setLastWin(isWin);
        setLastPayout(payout);

        if (isWin) {
            setBankroll(prev => precise(prev + payout));
        }

        const entry: DiceHistoryEntry = {
            id: generateId(),
            date: new Date().toISOString(),
            bet: currentBet,
            chance,
            multiplier,
            roll: rollRaw,
            win: isWin,
            payout,
            net: payout - currentBet
        };
        pushHistory(entry);

        setTimeout(() => {
            setRolling(false);
        }, 500);
    };

    return (
        <div className="min-h-screen text-neutral-200 font-sans selection:bg-emerald-500/30 xl:pb-0 pb-24">
            <div className="mx-auto max-w-5xl px-3 sm:px-4 py-6 sm:py-12">

                {/* Header */}
                <header className="mb-6 sm:mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Dice</h1>
                        <p className="text-neutral-500 text-xs sm:text-sm mt-1">Drag the slider to adjust your win chance.</p>
                    </div>
                    <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl px-4 py-2 sm:px-5 sm:py-3 text-right shadow-sm self-start sm:self-auto w-full sm:w-auto flex justify-between sm:block items-center">
                        <div className="text-[10px] sm:text-xs uppercase tracking-wider text-neutral-500 font-semibold mb-0 sm:mb-1">Balance</div>
                        <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-400 tabular-nums">
                            {formatCurrency(bankroll)}
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 sm:gap-8">

                    {/* --- Main Game Area --- */}
                    <div className="space-y-4 sm:space-y-6 h-full">

                        {/* THE VISUAL SLIDER */}
                        <div className="box-primary rounded-2xl p-4 sm:p-8 shadow-2xl relative overflow-hidden">

                            {/* Stats Display above Slider */}
                            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8 sm:mb-12">
                                <div className="bg-neutral-950/50 rounded-lg sm:rounded-xl p-2 sm:p-3 border border-neutral-800/50 flex flex-col justify-center">
                                    <div className="text-[10px] sm:text-xs text-neutral-500 font-semibold uppercase truncate">Multiplier</div>
                                    <div className="text-sm sm:text-xl font-bold text-white">{multiplier.toFixed(2)}x</div>
                                </div>
                                <div className="bg-neutral-950/50 rounded-lg sm:rounded-xl p-2 sm:p-3 border border-neutral-800/50 flex flex-col justify-center">
                                    <div className="text-[10px] sm:text-xs text-neutral-500 font-semibold uppercase truncate">Chance</div>
                                    <div className="text-sm sm:text-xl font-bold text-white">{chance.toFixed(2)}%</div>
                                </div>
                                <div className="bg-neutral-950/50 rounded-lg sm:rounded-xl p-2 sm:p-3 border border-neutral-800/50 flex flex-col justify-center">
                                    <div className="text-[10px] sm:text-xs text-neutral-500 font-semibold uppercase truncate">Payout</div>
                                    <div className="text-sm sm:text-xl font-bold text-emerald-400 truncate">
                                        {(bet * multiplier).toFixed(2)}
                                    </div>
                                </div>
                            </div>

                            {/* The Slider Container */}
                            <div className="relative h-12 sm:h-14 w-full select-none group touch-none">

                                {/* Background Track */}
                                <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-4 bg-rose-950/30 rounded-full overflow-hidden border border-neutral-800">
                                    {/* Win Zone (Green) */}
                                    <motion.div
                                        className="absolute top-0 bottom-0 left-0 bg-emerald-500/20 border-r border-emerald-500/50"
                                        initial={false}
                                        animate={{ width: `${chance}%` }}
                                        transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                                    />
                                </div>

                                {/* Numbers on Track */}
                                <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between px-1 text-[10px] font-bold text-neutral-700 pointer-events-none">
                                    <span>0</span>
                                    <span>25</span>
                                    <span>50</span>
                                    <span>75</span>
                                    <span>100</span>
                                </div>

                                {/* Drag Handle */}
                                <input
                                    type="range"
                                    min="2"
                                    max="98"
                                    step="0.01"
                                    value={chance}
                                    onChange={(e) => setChance(parseFloat(e.target.value))}
                                    disabled={rolling}
                                    className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-grab active:cursor-grabbing disabled:cursor-not-allowed"
                                />

                                {/* Visual Handle Indicator */}
                                <motion.div
                                    className="absolute top-1/2 -translate-y-1/2 h-6 sm:h-8 w-1.5 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)] z-10 pointer-events-none"
                                    animate={{ left: `${chance}%` }}
                                    transition={{ type: "spring", bounce: 0, duration: 0.1 }}
                                >
                                    <div className="absolute -top-7 sm:-top-8 left-1/2 -translate-x-1/2 bg-white text-neutral-950 text-[10px] sm:text-xs font-bold px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md">
                                        {Math.floor(chance)}
                                    </div>
                                </motion.div>

                                {/* RESULT CURSOR */}
                                <motion.div
                                    className="absolute top-1/2 -translate-y-1/2 z-30 pointer-events-none"
                                    initial={{ left: "50%" }}
                                    animate={{ left: `${resultRoll}%` }}
                                    transition={{
                                        type: "spring",
                                        stiffness: rolling ? 100 : 60,
                                        damping: rolling ? 10 : 15
                                    }}
                                >
                                    <div className={`relative -translate-x-1/2 transition-transform duration-300 ${rolling ? 'scale-110' : 'scale-100'}`}>
                                        <div className={`w-6 h-6 sm:w-8 sm:h-8 rotate-45 border-4 shadow-xl transition-colors duration-200 
                                            flex items-center justify-center
                                            ${lastWin === null
                                            ? "bg-neutral-200 border-neutral-100 shadow-neutral-500/20"
                                            : lastWin
                                                ? "bg-emerald-500 border-emerald-300 shadow-emerald-500/50"
                                                : "bg-rose-500 border-rose-300 shadow-rose-500/50"
                                        }`}
                                        >
                                            <div className={`-rotate-45 font-bold text-[8px] sm:text-[10px] ${lastWin === null ? "text-neutral-900" : "text-white"}`}>
                                                {resultRoll.toFixed(0)}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Win/Loss Message Overlay */}
                            <div className="h-6 sm:h-8 flex justify-center items-center mt-4 sm:mt-6">
                                <AnimatePresence mode="wait">
                                    {lastWin !== null && !rolling && (
                                        <motion.div
                                            key={lastWin ? "win" : "loss"}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            className={`flex items-center gap-2 font-bold text-sm sm:text-lg ${lastWin ? "text-emerald-400" : "text-rose-400"}`}
                                        >
                                            {/* Uses resultBet instead of bet to show correct amount even if input reset */}
                                            {lastWin ? `YOU WIN ${formatCurrency(lastPayout)}` : `YOU LOST ${formatCurrency(resultBet)}`}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="box-primary rounded-2xl p-4 sm:p-6">
                            <div className="flex flex-col gap-3 mb-4 sm:mb-6">
                                <label className="text-xs font-semibold text-neutral-500 uppercase block">Bet Amount</label>

                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="relative w-full">
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-neutral-500">$</div>
                                        <input
                                            type="number"
                                            value={bet}
                                            disabled={rolling}
                                            onChange={(e) => setBetSafe(Number(e.target.value))}
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-3 pl-8 pr-3 font-mono font-bold text-white focus:outline-none focus:border-emerald-500/50 transition text-sm sm:text-base disabled:opacity-50"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 sm:flex sm:w-auto">
                                        <button disabled={rolling} onClick={() => setBetSafe(bet / 2)} className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold px-2 sm:px-4 py-3 rounded-lg text-xs sm:text-sm transition disabled:opacity-50">1/2</button>
                                        <button disabled={rolling} onClick={() => setBetSafe(bet * 2)} className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold px-2 sm:px-4 py-3 rounded-lg text-xs sm:text-sm transition disabled:opacity-50">2×</button>
                                        <button disabled={rolling} onClick={() => setBetSafe(bankroll)} className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold px-2 sm:px-4 py-3 rounded-lg text-xs sm:text-sm transition disabled:opacity-50">MAX</button>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={performRoll}
                                disabled={rolling || bet > bankroll || bet < 0.01}
                                className={`w-full py-3 sm:py-4 rounded-xl text-base sm:text-lg font-bold tracking-wide shadow-lg transition-all transform active:scale-[0.98]
                                    ${rolling
                                    ? "bg-emerald-900/50 text-emerald-500/50 cursor-wait"
                                    : "bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                }`}
                            >
                                {rolling ? "ROLLING..." : "ROLL DICE"}
                            </button>
                        </div>
                    </div>

                    {/* --- Sidebar (History) --- */}
                    <div className="space-y-4">
                        <div className="box-primary rounded-2xl p-4 sm:p-5 h-full max-h-[350px] lg:max-h-[545px] flex flex-col">
                            <h3 className="text-xs sm:text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4">Live Stats</h3>

                            <div className="flex-1 overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                                {history.length === 0 && (
                                    <div className="text-center text-neutral-600 text-xs sm:text-sm py-10">No bets yet</div>
                                )}
                                {history.map((entry) => (
                                    <div key={entry.id} className="flex items-center justify-between bg-neutral-950/50 p-2 sm:p-3 rounded-lg border border-neutral-800/50 text-xs sm:text-sm">
                                        <div className="flex flex-col">
                                            <span className={`font-bold ${entry.win ? "text-emerald-400" : "text-neutral-500"}`}>
                                                {entry.win ? "+" : "-"}{formatCurrency(entry.win ? entry.payout : entry.bet)}
                                            </span>
                                            <span className="text-[10px] text-neutral-600">{new Date(entry.date).toLocaleTimeString()}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className={`font-mono font-bold ${entry.win ? "text-emerald-500" : "text-rose-500"}`}>
                                                {entry.roll.toFixed(2)}
                                            </div>
                                            <div className="text-[10px] text-neutral-600">
                                                &lt;{entry.chance}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}