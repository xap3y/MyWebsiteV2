"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- Configuration ---
const STORAGE_KEY = "roulette_bankroll_v1";
const HISTORY_STORAGE_KEY = "roulette_history_v1";
const DEFAULT_BANKROLL = 1000;
const MIN_BET = 10;
const MAX_HISTORY = 30;

// Roulette wheel numbers in order (European single-zero)
const WHEEL_ORDER = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
    5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

// Table layout rows
const ROW_1 = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];
const ROW_2 = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
const ROW_3 = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];

type BetType =
    | { type: "number"; value: number }
    | { type: "red" }
    | { type: "black" }
    | { type: "odd" }
    | { type: "even" }
    | { type: "1-18" }
    | { type: "19-36" }
    | { type: "1st12" }
    | { type: "2nd12" }
    | { type: "3rd12" }
    | { type: "row"; row: number };

type PlacedBet = {
    id: string;
    bet: BetType;
    amount: number;
};

type HistoryEntry = {
    id: string;
    date: string;
    number: number;
    totalBet: number;
    totalPayout: number;
    profit: number;
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
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getNumberColor(n: number): "red" | "black" | "green" {
    if (n === 0) return "green";
    if (RED_NUMBERS.includes(n)) return "red";
    return "black";
}

function getColorClass(color: "red" | "black" | "green") {
    if (color === "red") return "bg-[#dc2626]";
    if (color === "black") return "bg-[#18181b]";
    return "bg-[#16a34a]";
}

function getColorBorder(color: "red" | "black" | "green") {
    if (color === "red") return "border-[#dc2626]";
    if (color === "black") return "border-neutral-600";
    return "border-[#16a34a]";
}

function doesBetWin(bet: BetType, result: number): boolean {
    switch (bet.type) {
        case "number": return bet.value === result;
        case "red": return RED_NUMBERS.includes(result);
        case "black": return BLACK_NUMBERS.includes(result);
        case "odd": return result !== 0 && result % 2 !== 0;
        case "even": return result !== 0 && result % 2 === 0;
        case "1-18": return result >= 1 && result <= 18;
        case "19-36": return result >= 19 && result <= 36;
        case "1st12": return result >= 1 && result <= 12;
        case "2nd12": return result >= 13 && result <= 24;
        case "3rd12": return result >= 25 && result <= 36;
        case "row":
            if (bet.row === 1) return ROW_1.includes(result);
            if (bet.row === 2) return ROW_2.includes(result);
            return ROW_3.includes(result);
        default: return false;
    }
}

function getBetPayout(bet: BetType): number {
    switch (bet.type) {
        case "number": return 36;
        case "red": case "black": case "odd": case "even":
        case "1-18": case "19-36": return 2;
        case "1st12": case "2nd12": case "3rd12": return 3;
        case "row": return 3;
        default: return 0;
    }
}

function getBetLabel(bet: BetType): string {
    switch (bet.type) {
        case "number": return `#${bet.value}`;
        case "red": return "Red";
        case "black": return "Black";
        case "odd": return "Odd";
        case "even": return "Even";
        case "1-18": return "1–18";
        case "19-36": return "19–36";
        case "1st12": return "1st 12";
        case "2nd12": return "2nd 12";
        case "3rd12": return "3rd 12";
        case "row": return `Row ${bet.row}`;
        default: return "";
    }
}

// --- Wheel Component ---
function RouletteWheel({ spinning, result, onSpinEnd }: { spinning: boolean; result: number | null; onSpinEnd?: () => void }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rotationRef = useRef(0);
    const animFrameRef = useRef<number>(0);
    const [, forceRender] = useState(0);

    const drawWheel = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const size = canvas.width;
        const center = size / 2;
        const outerRadius = center - 10;
        const innerRadius = outerRadius - 40;
        const segmentAngle = (2 * Math.PI) / WHEEL_ORDER.length;
        const rotation = rotationRef.current;

        ctx.clearRect(0, 0, size, size);

        // Outer ring
        ctx.beginPath();
        ctx.arc(center, center, outerRadius + 5, 0, 2 * Math.PI);
        ctx.strokeStyle = "#404040";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw segments
        WHEEL_ORDER.forEach((num, i) => {
            const startAngle = i * segmentAngle + rotation;
            const endAngle = startAngle + segmentAngle;

            ctx.beginPath();
            ctx.moveTo(center, center);
            ctx.arc(center, center, outerRadius, startAngle, endAngle);
            ctx.closePath();

            const color = getNumberColor(num);
            ctx.fillStyle = color === "red" ? "#dc2626" : color === "green" ? "#16a34a" : "#18181b";
            ctx.fill();

            ctx.strokeStyle = "#2a2a2a";
            ctx.lineWidth = 1;
            ctx.stroke();

            // Number text
            const textAngle = startAngle + segmentAngle / 2;
            const textRadius = (outerRadius + innerRadius) / 2 + 2;
            const tx = center + Math.cos(textAngle) * textRadius;
            const ty = center + Math.sin(textAngle) * textRadius;

            ctx.save();
            ctx.translate(tx, ty);
            ctx.rotate(textAngle + Math.PI / 2);
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 11px monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(String(num), 0, 0);
            ctx.restore();
        });

        // Inner circle
        ctx.beginPath();
        ctx.arc(center, center, innerRadius, 0, 2 * Math.PI);
        ctx.fillStyle = "#0a0a0a";
        ctx.fill();
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Center decoration
        ctx.beginPath();
        ctx.arc(center, center, innerRadius - 15, 0, 2 * Math.PI);
        ctx.fillStyle = "#111";
        ctx.fill();
        ctx.strokeStyle = "#222";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Ball — show when not spinning and we have a result
        if (result !== null && !spinning) {
            const resultIndex = WHEEL_ORDER.indexOf(result);
            const bAngle = resultIndex * segmentAngle + segmentAngle / 2 + rotation;
            const ballRadius = outerRadius - 14;
            const bx = center + Math.cos(bAngle) * ballRadius;
            const by = center + Math.sin(bAngle) * ballRadius;

            // Ball shadow
            ctx.beginPath();
            ctx.arc(bx + 1, by + 1, 7, 0, 2 * Math.PI);
            ctx.fillStyle = "rgba(0,0,0,0.3)";
            ctx.fill();

            // Ball
            ctx.beginPath();
            ctx.arc(bx, by, 6, 0, 2 * Math.PI);
            const gradient = ctx.createRadialGradient(bx - 2, by - 2, 1, bx, by, 6);
            gradient.addColorStop(0, "#ffffff");
            gradient.addColorStop(1, "#cccccc");
            ctx.fillStyle = gradient;
            ctx.fill();
        }

        // Top pointer (golden triangle)
        ctx.beginPath();
        ctx.moveTo(center, 2);
        ctx.lineTo(center - 9, 20);
        ctx.lineTo(center + 9, 20);
        ctx.closePath();
        ctx.fillStyle = "#fbbf24";
        ctx.fill();
        ctx.strokeStyle = "#b45309";
        ctx.lineWidth = 1.5;
        ctx.stroke();

    }, [spinning, result]);

    // Initial draw
    useEffect(() => {
        drawWheel();
    }, [drawWheel]);

    // Spin animation
    useEffect(() => {
        if (!spinning || result === null) return;

        const segmentAngle = (2 * Math.PI) / WHEEL_ORDER.length;
        const resultIndex = WHEEL_ORDER.indexOf(result);

        // The pointer is at the top (-PI/2 from the 0 angle which is the right side).
        // We need the center of the result segment to land at -PI/2.
        // Segment center angle (without rotation) = resultIndex * segmentAngle + segmentAngle / 2
        // We need: rotation + segmentCenter = -PI/2 + 2*PI*k (for some k)
        // So: targetRotation = -PI/2 - segmentCenter + 2*PI*k

        const segmentCenter = resultIndex * segmentAngle + segmentAngle / 2;
        const baseTarget = -Math.PI / 2 - segmentCenter;

        // Normalize current rotation to 0..2PI range for clean calculation
        const currentRotation = rotationRef.current;

        // Ensure we always spin forward at least 8 full rotations
        const minSpins = 8 + Math.random() * 4; // 8-12 full spins
        let targetRotation = baseTarget;

        // Move target ahead of current rotation by enough full turns
        while (targetRotation < currentRotation + minSpins * Math.PI * 2) {
            targetRotation += Math.PI * 2;
        }

        // Add slight random offset within the segment so the ball doesn't always land dead center
        // But keep it well within the segment bounds (±30% of segment width)
        const jitter = (Math.random() - 0.5) * segmentAngle * 0.3;
        targetRotation += jitter;

        const totalDelta = targetRotation - currentRotation;
        const duration = 5000;
        const startTime = performance.now();

        const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Cubic ease-out for smooth deceleration
            const eased = 1 - Math.pow(1 - progress, 4);

            rotationRef.current = currentRotation + totalDelta * eased;
            drawWheel();

            if (progress < 1) {
                animFrameRef.current = requestAnimationFrame(animate);
            } else {
                // Snap to exact target (without jitter) for clean ball placement
                rotationRef.current = targetRotation - jitter;
                drawWheel();
                onSpinEnd?.();
            }
        };

        animFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [spinning, result]);

    return (
        <canvas
            ref={canvasRef}
            width={320}
            height={320}
            className="w-full max-w-[320px] aspect-square"
        />
    );
}

// --- Number Button ---
function NumberButton({
                          num,
                          isSelected,
                          onClick,
                          chipCount,
                      }: {
    num: number;
    isSelected: boolean;
    onClick: () => void;
    chipCount: number;
}) {
    const color = getNumberColor(num);
    return (
        <button
            onClick={onClick}
            className={`relative w-full aspect-[1/1.2] rounded-md flex items-center justify-center font-mono font-bold text-sm transition-all duration-150 border
                ${getColorClass(color)} 
                ${isSelected ? `ring-2 ring-amber-400 ${getColorBorder(color)}` : `border-neutral-700 hover:brightness-125`}
                hover:scale-105 active:scale-95
            `}
        >
            {num}
            {chipCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-black text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow">
                    {chipCount}
                </span>
            )}
        </button>
    );
}

// --- Main Component ---
export default function RouletteGame() {
    const [bankroll, setBankroll] = useState<number>(DEFAULT_BANKROLL);
    const [chipValue, setChipValue] = useState<number>(MIN_BET);
    const [bets, setBets] = useState<PlacedBet[]>([]);
    const [spinning, setSpinning] = useState(false);
    const [result, setResult] = useState<number | null>(null);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [lastResult, setLastResult] = useState<{ number: number; profit: number } | null>(null);
    const [showPayouts, setShowPayouts] = useState(false);

    const totalBet = bets.reduce((sum, b) => sum + b.amount, 0);

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
        if (bankroll < MIN_BET && !spinning && bets.length === 0) {
            const t = setTimeout(() => setBankroll(100), 2000);
            return () => clearTimeout(t);
        }
    }, [bankroll, spinning, bets.length]);

    // --- Betting ---
    const placeBet = (betType: BetType) => {
        if (spinning) return;
        if (chipValue > bankroll - totalBet) return;

        setBets((prev) => [
            ...prev,
            { id: generateId(), bet: betType, amount: chipValue },
        ]);
    };

    const clearBets = () => {
        if (spinning) return;
        setBets([]);
    };

    const getChipCountForBet = (betType: BetType): number => {
        return bets.filter((b) => JSON.stringify(b.bet) === JSON.stringify(betType)).length;
    };

    const getTotalForBet = (betType: BetType): number => {
        return bets
            .filter((b) => JSON.stringify(b.bet) === JSON.stringify(betType))
            .reduce((sum, b) => sum + b.amount, 0);
    };

    // --- Spin ---
    const handleSpinEnd = useCallback(() => {
        if (result === null) return;

        const winningNumber = result;

        // Calculate payouts
        let totalPayout = 0;
        betsRef.current.forEach((b) => {
            if (doesBetWin(b.bet, winningNumber)) {
                totalPayout += b.amount * getBetPayout(b.bet);
            }
        });
        totalPayout = precise(totalPayout);

        const betTotal = betsRef.current.reduce((sum, b) => sum + b.amount, 0);
        setBankroll((prev) => precise(prev + totalPayout));
        const profit = precise(totalPayout - betTotal);
        setLastResult({ number: winningNumber, profit });

        const entry: HistoryEntry = {
            id: generateId(),
            date: new Date().toISOString(),
            number: winningNumber,
            totalBet: betTotal,
            totalPayout,
            profit,
        };
        setHistory((prev) => {
            const newHistory = [entry, ...prev].slice(0, MAX_HISTORY);
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
            return newHistory;
        });

        setSpinning(false);
        setBets([]);
    }, [result]);

// We need a ref for bets because the callback fires after animation
    const betsRef = useRef<PlacedBet[]>([]);

    const spin = () => {
        if (spinning || bets.length === 0) return;

        const betTotal = totalBet;
        setBankroll((prev) => precise(prev - betTotal));
        betsRef.current = [...bets]; // Snapshot bets before clearing
        setSpinning(true);
        setLastResult(null);

        // Pick random result
        const winningNumber = WHEEL_ORDER[Math.floor(Math.random() * WHEEL_ORDER.length)];
        setResult(winningNumber);
    };

    // Outside bets config
    const outsideBets: { label: string; bet: BetType; className?: string }[] = [
        { label: "1–18", bet: { type: "1-18" } },
        { label: "Even", bet: { type: "even" } },
        { label: "Red", bet: { type: "red" }, className: "bg-[#dc2626] hover:bg-[#b91c1c]" },
        { label: "Black", bet: { type: "black" }, className: "bg-[#18181b] hover:bg-[#27272a]" },
        { label: "Odd", bet: { type: "odd" } },
        { label: "19–36", bet: { type: "19-36" } },
    ];

    return (
        <div className="min-h-screen text-neutral-200 font-sans selection:bg-amber-500/30 xl:pb-0 pb-24">
            <div className="mx-auto max-w-7xl px-3 sm:px-4 py-6 sm:py-12">
                {/* Header */}
                <header className="mb-6 sm:mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Roulette</h1>
                        <p className="text-neutral-500 text-xs sm:text-sm mt-1">European • Single Zero</p>
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

                <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6 sm:gap-8">
                    {/* --- Left Panel --- */}
                    <div className="order-2 xl:order-1 space-y-4">
                        {/* Chip Selector & Actions */}
                        <div className="box-primary rounded-2xl p-5 shadow-xl">
                            <div className="flex flex-col gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-neutral-500 uppercase mb-2 block">
                                        Chip Value
                                    </label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[10, 25, 50, 100].map((val) => (
                                            <button
                                                key={val}
                                                onClick={() => setChipValue(val)}
                                                disabled={spinning}
                                                className={`py-2.5 rounded-lg text-sm font-bold transition-all ${
                                                    chipValue === val
                                                        ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                                                        : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                                                } disabled:opacity-50`}
                                            >
                                                ${val}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Total Bet Display */}
                                {bets.length > 0 && (
                                    <div className="bg-neutral-950/50 rounded-lg p-3 flex items-center justify-between">
                                        <span className="text-xs text-neutral-500 uppercase font-semibold">Total Bet</span>
                                        <span className="font-mono font-bold text-amber-400">
                                            {formatCurrency(totalBet)}
                                        </span>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={clearBets}
                                        disabled={spinning || bets.length === 0}
                                        className="py-3 rounded-xl text-sm font-bold bg-neutral-800 text-neutral-400 hover:bg-neutral-700 transition disabled:opacity-30"
                                    >
                                        CLEAR
                                    </button>
                                    <button
                                        onClick={spin}
                                        disabled={spinning || bets.length === 0}
                                        className={`py-3 rounded-xl text-sm font-bold shadow-lg transition-all transform active:scale-[0.98] select-none ${
                                            spinning || bets.length === 0
                                                ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                                                : "bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/20"
                                        }`}
                                    >
                                        {spinning ? "SPINNING..." : "SPIN"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Active Bets */}
                        {bets.length > 0 && !spinning && (
                            <div className="box-primary rounded-2xl p-4 max-h-[200px] flex flex-col">
                                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
                                    Active Bets
                                </h3>
                                <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-neutral-700">
                                    {/* Group bets */}
                                    {Array.from(
                                        bets.reduce((map, b) => {
                                            const key = JSON.stringify(b.bet);
                                            const existing = map.get(key) || { bet: b.bet, total: 0, count: 0 };
                                            existing.total += b.amount;
                                            existing.count += 1;
                                            map.set(key, existing);
                                            return map;
                                        }, new Map<string, { bet: BetType; total: number; count: number }>())
                                    ).map(([key, { bet, total, count }]) => (
                                        <div key={key} className="flex items-center justify-between text-xs bg-neutral-950/30 p-2 rounded">
                                            <span className="text-neutral-300">{getBetLabel(bet)} ×{count}</span>
                                            <span className="font-mono text-amber-400">{formatCurrency(total)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* History */}
                        <div className="box-primary rounded-2xl p-4 h-[300px] flex flex-col">
                            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
                                History
                            </h3>
                            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                                {history.length === 0 && (
                                    <div className="text-neutral-600 text-xs text-center py-4">No spins yet</div>
                                )}
                                {history.map((h) => {
                                    const color = getNumberColor(h.number);
                                    return (
                                        <div
                                            key={h.id}
                                            className="flex items-center justify-between bg-neutral-950/30 p-2 rounded border border-neutral-800/30 text-xs"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`w-7 h-7 rounded flex items-center justify-center font-mono font-bold text-white text-[11px] ${getColorClass(color)}`}
                                                >
                                                    {h.number}
                                                </span>
                                            </div>
                                            <div className={`font-mono font-bold ${h.profit >= 0 ? "text-emerald-400" : "text-neutral-500"}`}>
                                                {h.profit >= 0 ? "+" : ""}{formatCurrency(h.profit)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <AnimatePresence mode="wait">
                            {lastResult && !spinning && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className={`box-primary rounded-2xl p-4 flex items-center justify-between gap-3 border ${
                                        lastResult.profit >= 0
                                            ? "border-emerald-800/50"
                                            : "border-red-800/50"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                <span
                    className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-white ${getColorClass(
                        getNumberColor(lastResult.number)
                    )}`}
                >
                    {lastResult.number}
                </span>
                                        <span className="text-xs text-neutral-500 uppercase font-semibold">Result</span>
                                    </div>
                                    <span
                                        className={`font-mono font-bold text-lg ${
                                            lastResult.profit >= 0 ? "text-emerald-400" : "text-[#f43f5e]"
                                        }`}
                                    >
                {lastResult.profit >= 0 ? "+" : ""}{formatCurrency(lastResult.profit)}
            </span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* --- Right Panel: Wheel + Table --- */}
                    <div className="order-1 xl:order-2 space-y-6">

                        {/* Wheel */}
                        <div className="box-primary rounded-2xl p-6 shadow-2xl flex justify-center">
                            <RouletteWheel spinning={spinning} result={result} onSpinEnd={handleSpinEnd} />
                        </div>

                        {/* Betting Table */}
                        <div className="box-primary rounded-2xl p-4 sm:p-5 shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                                    Betting Table
                                </h3>
                                <button
                                    onClick={() => setShowPayouts(!showPayouts)}
                                    className="text-[10px] text-neutral-500 hover:text-neutral-300 transition uppercase tracking-wider"
                                >
                                    {showPayouts ? "Hide" : "Show"} Payouts
                                </button>
                            </div>

                            {/* Payouts Info */}
                            <AnimatePresence>
                                {showPayouts && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mb-4 overflow-hidden"
                                    >
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                                            {[
                                                ["Straight (number)", "36×"],
                                                ["Red / Black", "2×"],
                                                ["Odd / Even", "2×"],
                                                ["1-18 / 19-36", "2×"],
                                                ["Dozens", "3×"],
                                                ["Rows", "3×"],
                                            ].map(([label, payout]) => (
                                                <div key={label} className="bg-neutral-950/50 rounded-lg p-2 flex justify-between">
                                                    <span className="text-neutral-500">{label}</span>
                                                    <span className="text-amber-400 font-mono font-bold">{payout}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Number Grid */}
                            <div className="overflow-x-auto p-2">
                                <div className="min-w-[500px]">
                                    {/* Zero */}
                                    <div className="grid grid-cols-[1fr_12fr] gap-1 mb-1">
                                        <div className="row-span-3">
                                            <button
                                                onClick={() => placeBet({ type: "number", value: 0 })}
                                                disabled={spinning}
                                                className={`w-full h-full rounded-md bg-[#16a34a] font-mono font-bold text-lg transition hover:brightness-125 active:scale-95 disabled:opacity-50 relative
                                                    ${getChipCountForBet({ type: "number", value: 0 }) > 0 ? "ring-2 ring-amber-400" : "border border-neutral-700"}`}
                                            >
                                                0
                                                {getChipCountForBet({ type: "number", value: 0 }) > 0 && (
                                                    <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-black text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                                        {getChipCountForBet({ type: "number", value: 0 })}
                                                    </span>
                                                )}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-12 gap-1">
                                            {/* Row 1: 3,6,9,...,36 */}
                                            {ROW_1.map((num) => (
                                                <NumberButton
                                                    key={num}
                                                    num={num}
                                                    isSelected={getChipCountForBet({ type: "number", value: num }) > 0}
                                                    chipCount={getChipCountForBet({ type: "number", value: num })}
                                                    onClick={() => placeBet({ type: "number", value: num })}
                                                />
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-12 gap-1">
                                            {ROW_2.map((num) => (
                                                <NumberButton
                                                    key={num}
                                                    num={num}
                                                    isSelected={getChipCountForBet({ type: "number", value: num }) > 0}
                                                    chipCount={getChipCountForBet({ type: "number", value: num })}
                                                    onClick={() => placeBet({ type: "number", value: num })}
                                                />
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-12 gap-1">
                                            {ROW_3.map((num) => (
                                                <NumberButton
                                                    key={num}
                                                    num={num}
                                                    isSelected={getChipCountForBet({ type: "number", value: num }) > 0}
                                                    chipCount={getChipCountForBet({ type: "number", value: num })}
                                                    onClick={() => placeBet({ type: "number", value: num })}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Row bets */}
                                    <div className="grid grid-cols-[1fr_12fr] gap-1 mb-2">
                                        <div />
                                        <div className="grid grid-cols-12 gap-1">
                                            {/* Columns spanning 4 each = dozens */}
                                            {/* But row bets are per row, let's put them at the right side */}
                                        </div>
                                    </div>

                                    {/* Dozens */}
                                    <div className="grid grid-cols-3 gap-1 mb-2">
                                        {(
                                            [
                                                { label: "1st 12", bet: { type: "1st12" } as BetType },
                                                { label: "2nd 12", bet: { type: "2nd12" } as BetType },
                                                { label: "3rd 12", bet: { type: "3rd12" } as BetType },
                                            ] as const
                                        ).map(({ label, bet }) => (
                                            <button
                                                key={label}
                                                onClick={() => placeBet(bet)}
                                                disabled={spinning}
                                                className={`relative py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all hover:brightness-125 active:scale-[0.98] disabled:opacity-50
                                                    ${getChipCountForBet(bet) > 0
                                                    ? "bg-neutral-700 ring-2 ring-amber-400 text-white"
                                                    : "bg-neutral-800 text-neutral-400 border border-neutral-700 hover:text-white"
                                                }`}
                                            >
                                                {label}
                                                {getChipCountForBet(bet) > 0 && (
                                                    <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-black text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                                        {getChipCountForBet(bet)}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Outside bets */}
                                    <div className="grid grid-cols-6 gap-1">
                                        {outsideBets.map(({ label, bet, className }) => (
                                            <button
                                                key={label}
                                                onClick={() => placeBet(bet)}
                                                disabled={spinning}
                                                className={`relative py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all hover:brightness-125 active:scale-[0.98] disabled:opacity-50 border border-neutral-700
                                                    ${getChipCountForBet(bet) > 0 ? "ring-2 ring-amber-400" : ""}
                                                    ${className ?? "bg-neutral-800 text-neutral-400 hover:text-white"}
                                                `}
                                            >
                                                {label}
                                                {getChipCountForBet(bet) > 0 && (
                                                    <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-black text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                                        {getChipCountForBet(bet)}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}