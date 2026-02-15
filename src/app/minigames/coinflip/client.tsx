"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- Configuration ---
const STORAGE_KEY = "coinflip_bankroll_v1";
const HISTORY_STORAGE_KEY = "coinflip_history_v1";
const DEFAULT_BANKROLL = 1000;
const MIN_BET = 10;
const MAX_HISTORY = 30;
const FLIP_DURATION = 1.8;

type Side = "heads" | "tails";

type HistoryEntry = {
    id: string;
    date: string;
    bet: number;
    choice: Side;
    result: Side;
    payout: number;
    profit: number;
};

// --- Helpers ---
function formatCurrency(n: number) {
    return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function precise(n: number) {
    return Math.floor(n * 100) / 100;
}

function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// --- Coin Component ---
function Coin({
                  flipping,
                  result,
                  choice,
              }: {
    flipping: boolean;
    result: Side | null;
    choice: Side;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animFrameRef = useRef<number>(0);
    const angleRef = useRef(0);

    const drawCoin = useCallback(
        (angle: number) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext("2d");
            if (!ctx) return;

            const size = canvas.width;
            const cx = size / 2;
            const cy = size / 2;
            const radius = size / 2 - 20;

            ctx.clearRect(0, 0, size, size);

            // Calculate which side is showing based on angle
            const cosAngle = Math.cos(angle);
            const absCos = Math.abs(cosAngle);
            const isShowingFront = cosAngle > 0;
            const displaySide: Side = isShowingFront ? "heads" : "tails";

            // Squeeze effect for 3D flip
            const scaleX = absCos;
            const thickness = 8;

            ctx.save();
            ctx.translate(cx, cy);

            // Shadow
            ctx.beginPath();
            ctx.ellipse(0, radius + 15, radius * 0.6 * Math.max(scaleX, 0.15), 10, 0, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(0,0,0,0.2)";
            ctx.fill();

            if (scaleX < 0.05) {
                // Edge view — draw thin edge
                ctx.beginPath();
                ctx.roundRect(-2, -radius, 4, radius * 2, 2);
                ctx.fillStyle = "#a3a3a3";
                ctx.fill();
                ctx.restore();
                return;
            }

            // Coin edge (3D thickness)
            if (scaleX < 0.95) {
                ctx.beginPath();
                ctx.ellipse(0, thickness / 2, radius * scaleX, radius, 0, 0, Math.PI);
                ctx.fillStyle = "#737373";
                ctx.fill();
            }

            // Main coin face
            const isHeads = displaySide === "heads";
            const faceGradient = ctx.createRadialGradient(
                -radius * 0.2 * scaleX,
                -radius * 0.2,
                0,
                0,
                0,
                radius
            );

            if (isHeads) {
                faceGradient.addColorStop(0, "#fde68a");
                faceGradient.addColorStop(0.5, "#f59e0b");
                faceGradient.addColorStop(1, "#b45309");
            } else {
                faceGradient.addColorStop(0, "#d4d4d8");
                faceGradient.addColorStop(0.5, "#a1a1aa");
                faceGradient.addColorStop(1, "#52525b");
            }

            ctx.beginPath();
            ctx.ellipse(0, 0, radius * scaleX, radius, 0, 0, Math.PI * 2);
            ctx.fillStyle = faceGradient;
            ctx.fill();

            // Inner ring
            ctx.beginPath();
            ctx.ellipse(0, 0, radius * 0.85 * scaleX, radius * 0.85, 0, 0, Math.PI * 2);
            ctx.strokeStyle = isHeads ? "rgba(180,83,9,0.3)" : "rgba(82,82,91,0.4)";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Text/Symbol
            if (scaleX > 0.3) {
                ctx.globalAlpha = Math.min((scaleX - 0.3) / 0.3, 1);

                if (isHeads) {
                    // Crown symbol
                    ctx.font = `bold ${Math.floor(radius * 0.5)}px serif`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillStyle = "rgba(180,83,9,0.6)";
                    ctx.scale(scaleX, 1);
                    ctx.fillText("♛", 0, -5);
                    ctx.scale(1 / scaleX, 1);

                    ctx.font = `bold ${Math.floor(radius * 0.16)}px sans-serif`;
                    ctx.fillStyle = "rgba(180,83,9,0.5)";
                    ctx.scale(scaleX, 1);
                    ctx.fillText("HEADS", 0, radius * 0.55);
                    ctx.scale(1 / scaleX, 1);
                } else {
                    // Shield symbol
                    ctx.font = `bold ${Math.floor(radius * 0.5)}px serif`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillStyle = "rgba(82,82,91,0.6)";
                    ctx.scale(scaleX, 1);
                    ctx.fillText("♜", 0, -5);
                    ctx.scale(1 / scaleX, 1);

                    ctx.font = `bold ${Math.floor(radius * 0.16)}px sans-serif`;
                    ctx.fillStyle = "rgba(82,82,91,0.5)";
                    ctx.scale(scaleX, 1);
                    ctx.fillText("TAILS", 0, radius * 0.55);
                    ctx.scale(1 / scaleX, 1);
                }

                ctx.globalAlpha = 1;
            }

            // Shine highlight
            ctx.beginPath();
            ctx.ellipse(
                -radius * 0.25 * scaleX,
                -radius * 0.25,
                radius * 0.4 * scaleX,
                radius * 0.3,
                -0.5,
                0,
                Math.PI * 2
            );
            ctx.fillStyle = "rgba(255,255,255,0.12)";
            ctx.fill();

            ctx.restore();
        },
        []
    );

    // Draw initial state
    useEffect(() => {
        // Show chosen side initially
        angleRef.current = choice === "heads" ? 0 : Math.PI;
        drawCoin(angleRef.current);
    }, [choice, drawCoin]);

    // Flip animation
    useEffect(() => {
        if (!flipping || result === null) return;

        const startAngle = angleRef.current;
        // Target: heads = even multiple of PI, tails = odd multiple
        const fullSpins = 6 + Math.floor(Math.random() * 4); // 6-9 full rotations
        let targetAngle = fullSpins * Math.PI * 2;
        // Land on correct side
        if (result === "tails") targetAngle += Math.PI;

        const duration = FLIP_DURATION * 1000;
        const startTime = performance.now();

        const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease: fast start, slow end
            const eased = 1 - Math.pow(1 - progress, 3);

            angleRef.current = startAngle + (targetAngle - startAngle) * eased;
            drawCoin(angleRef.current);

            if (progress < 1) {
                animFrameRef.current = requestAnimationFrame(animate);
            } else {
                angleRef.current = result === "heads" ? 0 : Math.PI;
                drawCoin(angleRef.current);
            }
        };

        animFrameRef.current = requestAnimationFrame(animate);
        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [flipping, result, drawCoin]);

    return (
        <canvas
            ref={canvasRef}
            width={280}
            height={280}
            className="w-full max-w-[280px] aspect-square"
        />
    );
}

// --- Streak Badge ---
function StreakBadge({ history }: { history: HistoryEntry[] }) {
    if (history.length < 2) return null;

    let streak = 1;
    const lastSide = history[0]?.result;
    for (let i = 1; i < history.length; i++) {
        if (history[i].result === lastSide) streak++;
        else break;
    }

    if (streak < 2) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5 bg-neutral-800/50 rounded-full px-3 py-1"
        >
            <span className="text-[10px] uppercase text-neutral-500 font-semibold">Streak</span>
            <span className={`text-sm font-bold font-mono ${lastSide === "heads" ? "text-amber-400" : "text-neutral-300"}`}>
                {streak}× {lastSide === "heads" ? "H" : "T"}
            </span>
        </motion.div>
    );
}

// --- Main Component ---
export default function CoinflipGame() {
    const [bankroll, setBankroll] = useState<number>(DEFAULT_BANKROLL);
    const [bet, setBet] = useState<number>(MIN_BET);
    const [choice, setChoice] = useState<Side>("heads");
    const [flipping, setFlipping] = useState(false);
    const [result, setResult] = useState<Side | null>(null);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [lastResult, setLastResult] = useState<{
        won: boolean;
        profit: number;
        result: Side;
    } | null>(null);

    // Stats
    const totalGames = history.length;
    const totalWins = history.filter((h) => h.payout > 0).length;
    const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
    const totalProfit = history.reduce((sum, h) => sum + h.profit, 0);

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
        if (bankroll < MIN_BET && !flipping) {
            const t = setTimeout(() => setBankroll(100), 2000);
            return () => clearTimeout(t);
        }
    }, [bankroll, flipping]);

    // --- Logic ---
    const setBetSafe = (val: number) => {
        let v = precise(val);
        v = Math.max(MIN_BET, Math.min(v, bankroll));
        if (bankroll < MIN_BET && bankroll > 0) v = bankroll;
        setBet(v);
    };

    const flip = () => {
        if (flipping || bet > bankroll || bet <= 0) return;

        const currentBet = bet;
        setBankroll((prev) => precise(prev - currentBet));
        setFlipping(true);
        setLastResult(null);

        const coinResult: Side = Math.random() < 0.5 ? "heads" : "tails";
        setResult(coinResult);

        const won = coinResult === choice;
        const payout = won ? precise(currentBet * 1.96) : 0; // 2% house edge
        const profit = precise(payout - currentBet);

        setTimeout(() => {
            if (won) {
                setBankroll((prev) => precise(prev + payout));
            }

            setLastResult({ won, profit, result: coinResult });

            const entry: HistoryEntry = {
                id: generateId(),
                date: new Date().toISOString(),
                bet: currentBet,
                choice,
                result: coinResult,
                payout,
                profit,
            };

            setHistory((prev) => {
                const newHistory = [entry, ...prev].slice(0, MAX_HISTORY);
                localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
                return newHistory;
            });

            setFlipping(false);
        }, FLIP_DURATION * 1000 + 200);
    };

    return (
        <div className="min-h-screen text-neutral-200 font-sans selection:bg-amber-500/30 xl:pb-0 pb-24">
            <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-12">
                {/* Header */}
                <header className="mb-6 sm:mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Coinflip</h1>
                        <p className="text-neutral-500 text-xs sm:text-sm mt-1">
                            Pick a side • 1.96× payout
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
                        <div className="box-primary rounded-2xl p-5 shadow-xl">
                            <div className="flex flex-col gap-4">
                                {/* Bet Amount */}
                                <div>
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
                                            disabled={flipping}
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-3 pl-8 pr-3 font-mono font-bold text-white focus:outline-none focus:border-amber-500/50 transition disabled:opacity-50"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        <button
                                            onClick={() => setBetSafe(bet / 2)}
                                            disabled={flipping}
                                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold py-2 rounded-lg text-xs transition disabled:opacity-50"
                                        >
                                            1/2
                                        </button>
                                        <button
                                            onClick={() => setBetSafe(bet * 2)}
                                            disabled={flipping}
                                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold py-2 rounded-lg text-xs transition disabled:opacity-50"
                                        >
                                            2×
                                        </button>
                                        <button
                                            onClick={() => setBetSafe(bankroll)}
                                            disabled={flipping}
                                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold py-2 rounded-lg text-xs transition disabled:opacity-50"
                                        >
                                            MAX
                                        </button>
                                    </div>
                                </div>

                                {/* Side Selection */}
                                <div>
                                    <label className="text-xs font-semibold text-neutral-500 uppercase mb-2 block">
                                        Pick Side
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => !flipping && setChoice("heads")}
                                            disabled={flipping}
                                            className={`py-4 rounded-xl font-bold text-sm transition-all transform active:scale-[0.97] select-none border-2 ${
                                                choice === "heads"
                                                    ? "bg-amber-500/15 border-amber-500 text-amber-400 shadow-lg shadow-amber-500/10"
                                                    : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600"
                                            } disabled:opacity-60`}
                                        >
                                            <div className="text-2xl mb-1">♛</div>
                                            HEADS
                                        </button>
                                        <button
                                            onClick={() => !flipping && setChoice("tails")}
                                            disabled={flipping}
                                            className={`py-4 rounded-xl font-bold text-sm transition-all transform active:scale-[0.97] select-none border-2 ${
                                                choice === "tails"
                                                    ? "bg-neutral-400/15 border-neutral-400 text-neutral-300 shadow-lg shadow-neutral-400/10"
                                                    : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600"
                                            } disabled:opacity-60`}
                                        >
                                            <div className="text-2xl mb-1">♜</div>
                                            TAILS
                                        </button>
                                    </div>
                                </div>

                                {/* Flip Button */}
                                <button
                                    onClick={flip}
                                    disabled={flipping || bet > bankroll || bet < 0.01}
                                    className={`w-full py-4 rounded-xl text-lg font-bold tracking-wide shadow-lg transition-all transform active:scale-[0.98] select-none ${
                                        flipping || bet > bankroll || bet < 0.01
                                            ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                                            : "bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/20"
                                    }`}
                                >
                                    {flipping ? "FLIPPING..." : "FLIP"}
                                </button>

                                {/* Potential Win */}
                                <div className="bg-neutral-950/50 rounded-lg p-3 flex items-center justify-between">
                                    <span className="text-xs text-neutral-500 uppercase font-semibold">
                                        Potential Win
                                    </span>
                                    <span className="font-mono font-bold text-amber-400">
                                        {formatCurrency(precise(bet * 1.96))}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="box-primary rounded-2xl p-4 shadow-xl">
                            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
                                Statistics
                            </h3>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="bg-neutral-950/50 rounded-lg p-3 text-center">
                                    <div className="text-[10px] uppercase text-neutral-500 font-semibold">
                                        Games
                                    </div>
                                    <div className="text-lg font-mono font-bold text-white">
                                        {totalGames}
                                    </div>
                                </div>
                                <div className="bg-neutral-950/50 rounded-lg p-3 text-center">
                                    <div className="text-[10px] uppercase text-neutral-500 font-semibold">
                                        Win Rate
                                    </div>
                                    <div className={`text-lg font-mono font-bold ${winRate >= 50 ? "text-emerald-400" : "text-neutral-400"}`}>
                                        {winRate}%
                                    </div>
                                </div>
                                <div className="bg-neutral-950/50 rounded-lg p-3 text-center">
                                    <div className="text-[10px] uppercase text-neutral-500 font-semibold">
                                        Profit
                                    </div>
                                    <div className={`text-lg font-mono font-bold ${totalProfit >= 0 ? "text-emerald-400" : "text-[#f43f5e]"}`}>
                                        {totalProfit >= 0 ? "+" : ""}{formatCurrency(precise(totalProfit))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* History */}
                        <div className="box-primary rounded-2xl p-4 h-[300px] flex flex-col">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                                    History
                                </h3>
                                <StreakBadge history={history} />
                            </div>
                            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                                {history.length === 0 && (
                                    <div className="text-neutral-600 text-xs text-center py-4">
                                        No flips yet
                                    </div>
                                )}
                                {history.map((h) => (
                                    <div
                                        key={h.id}
                                        className="flex items-center justify-between bg-neutral-950/30 p-2 rounded border border-neutral-800/30 text-xs"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${
                                                    h.result === "heads"
                                                        ? "bg-amber-500/20 text-amber-400"
                                                        : "bg-neutral-600/20 text-neutral-400"
                                                }`}
                                            >
                                                {h.result === "heads" ? "♛" : "♜"}
                                            </span>
                                            <div className="flex flex-col">
                                                <span className="text-neutral-300 capitalize font-semibold">
                                                    {h.result}
                                                </span>
                                                <span className="text-[10px] text-neutral-600">
                                                    Picked {h.choice}
                                                </span>
                                            </div>
                                        </div>
                                        <div
                                            className={`font-mono font-bold ${
                                                h.profit >= 0 ? "text-emerald-400" : "text-neutral-500"
                                            }`}
                                        >
                                            {h.profit >= 0 ? "+" : ""}
                                            {formatCurrency(h.profit)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Result Banner */}
                        <AnimatePresence mode="wait">
                            {lastResult && !flipping && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className={`box-primary rounded-2xl p-4 flex items-center justify-between gap-3 border ${
                                        lastResult.won
                                            ? "border-emerald-800/50"
                                            : "border-red-800/50"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                                                lastResult.result === "heads"
                                                    ? "bg-amber-500/20 text-amber-400"
                                                    : "bg-neutral-600/20 text-neutral-400"
                                            }`}
                                        >
                                            {lastResult.result === "heads" ? "♛" : "♜"}
                                        </span>
                                        <div>
                                            <div className="text-sm font-bold text-white capitalize">
                                                {lastResult.result}
                                            </div>
                                            <div className="text-[10px] text-neutral-500 uppercase">
                                                {lastResult.won ? "You won!" : "You lost"}
                                            </div>
                                        </div>
                                    </div>
                                    <span
                                        className={`font-mono font-bold text-lg ${
                                            lastResult.won ? "text-emerald-400" : "text-[#f43f5e]"
                                        }`}
                                    >
                                        {lastResult.profit >= 0 ? "+" : ""}
                                        {formatCurrency(lastResult.profit)}
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* --- Game Board --- */}
                    <div className="order-1 lg:order-2 box-primary rounded-2xl p-6 sm:p-10 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[500px]">
                        {/* Coin */}
                        <div className="flex flex-col items-center gap-8">
                            <Coin flipping={flipping} result={result} choice={choice} />

                            {/* Side indicator below coin */}
                            <AnimatePresence mode="wait">
                                {!flipping && result && (
                                    <motion.div
                                        key={result}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="flex flex-col items-center gap-1"
                                    >
                                        <span
                                            className={`text-3xl font-black uppercase tracking-tight ${
                                                result === "heads" ? "text-amber-400" : "text-neutral-300"
                                            }`}
                                        >
                                            {result}
                                        </span>
                                        <span
                                            className={`text-sm font-semibold ${
                                                lastResult?.won ? "text-emerald-400" : "text-[#f43f5e]"
                                            }`}
                                        >
                                            {lastResult?.won ? "Winner!" : "Better luck next time"}
                                        </span>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {!result && !flipping && (
                                <div className="text-neutral-600 text-sm font-semibold">
                                    Pick a side and flip
                                </div>
                            )}

                            {flipping && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-neutral-500 text-sm font-semibold"
                                >
                                    Flipping...
                                </motion.div>
                            )}
                        </div>

                        {/* Recent results strip */}
                        {history.length > 0 && (
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                                <div className="flex items-center gap-1 bg-neutral-950/50 backdrop-blur rounded-full px-3 py-1.5">
                                    <span className="text-[10px] text-neutral-600 uppercase font-semibold mr-1">
                                        Last:
                                    </span>
                                    {history.slice(0, 12).map((h) => (
                                        <span
                                            key={h.id}
                                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                                h.result === "heads"
                                                    ? "bg-amber-500/20 text-amber-400"
                                                    : "bg-neutral-700/50 text-neutral-400"
                                            }`}
                                        >
                                            {h.result === "heads" ? "H" : "T"}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}