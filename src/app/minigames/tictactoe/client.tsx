"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- Configuration ---
const STORAGE_KEY = "tictactoe_bankroll_v1";
const HISTORY_STORAGE_KEY = "tictactoe_history_v1";
const DEFAULT_BANKROLL = 1000;
const MIN_BET = 10;
const MAX_HISTORY = 30;

const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6],             // diagonals
];

type Cell = "X" | "O" | null;
type GameState = "idle" | "playing" | "won" | "lost" | "draw";
type Difficulty = "easy" | "medium" | "hard";

type HistoryEntry = {
    id: string;
    date: string;
    bet: number;
    result: "win" | "loss" | "draw";
    payout: number;
    profit: number;
    difficulty: Difficulty;
    moves: number;
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

function checkWinner(board: Cell[]): { winner: "X" | "O" | null; line: number[] | null } {
    for (const line of WIN_LINES) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { winner: board[a], line };
        }
    }
    return { winner: null, line: null };
}

function isBoardFull(board: Cell[]): boolean {
    return board.every((cell) => cell !== null);
}

function getEmptyCells(board: Cell[]): number[] {
    return board.map((cell, i) => (cell === null ? i : -1)).filter((i) => i !== -1);
}

// --- AI ---
function minimax(
    board: Cell[],
    depth: number,
    isMaximizing: boolean,
    alpha: number,
    beta: number
): number {
    const { winner } = checkWinner(board);
    if (winner === "O") return 10 - depth;
    if (winner === "X") return depth - 10;
    if (isBoardFull(board)) return 0;

    if (isMaximizing) {
        let best = -Infinity;
        for (const i of getEmptyCells(board)) {
            board[i] = "O";
            best = Math.max(best, minimax(board, depth + 1, false, alpha, beta));
            board[i] = null;
            alpha = Math.max(alpha, best);
            if (beta <= alpha) break;
        }
        return best;
    } else {
        let best = Infinity;
        for (const i of getEmptyCells(board)) {
            board[i] = "X";
            best = Math.min(best, minimax(board, depth + 1, true, alpha, beta));
            board[i] = null;
            beta = Math.min(beta, best);
            if (beta <= alpha) break;
        }
        return best;
    }
}

function getBestMove(board: Cell[]): number {
    let bestScore = -Infinity;
    let bestMove = -1;
    for (const i of getEmptyCells(board)) {
        board[i] = "O";
        const score = minimax(board, 0, false, -Infinity, Infinity);
        board[i] = null;
        if (score > bestScore) {
            bestScore = score;
            bestMove = i;
        }
    }
    return bestMove;
}

function getAIMove(board: Cell[], difficulty: Difficulty): number {
    const empty = getEmptyCells(board);
    if (empty.length === 0) return -1;

    if (difficulty === "easy") {
        // 30% optimal, 70% random
        if (Math.random() < 0.3) return getBestMove([...board]);
        return empty[Math.floor(Math.random() * empty.length)];
    }

    if (difficulty === "medium") {
        // 70% optimal, 30% random
        if (Math.random() < 0.7) return getBestMove([...board]);
        return empty[Math.floor(Math.random() * empty.length)];
    }

    // Hard: always optimal
    return getBestMove([...board]);
}

function getMultiplier(difficulty: Difficulty): number {
    switch (difficulty) {
        case "easy": return 1.4;
        case "medium": return 1.8;
        case "hard": return 3;
    }
}

function getDifficultyColor(d: Difficulty): string {
    switch (d) {
        case "easy": return "text-emerald-400";
        case "medium": return "text-amber-400";
        case "hard": return "text-[#f43f5e]";
    }
}

function getDifficultyBorder(d: Difficulty, selected: boolean): string {
    if (!selected) return "border-neutral-700";
    switch (d) {
        case "easy": return "border-emerald-500";
        case "medium": return "border-amber-500";
        case "hard": return "border-[#f43f5e]";
    }
}

function getDifficultyBg(d: Difficulty, selected: boolean): string {
    if (!selected) return "bg-neutral-800";
    switch (d) {
        case "easy": return "bg-emerald-500/10";
        case "medium": return "bg-amber-500/10";
        case "hard": return "bg-[#f43f5e]/10";
    }
}

// --- X and O SVG Components ---
function XMark({ size = 60 }: { size?: number }) {
    const pad = size * 0.22;
    return (
        <motion.svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            initial="hidden"
            animate="visible"
        >
            <motion.line
                x1={pad} y1={pad} x2={size - pad} y2={size - pad}
                stroke="#3b82f6"
                strokeWidth={4}
                strokeLinecap="round"
                variants={{
                    hidden: { pathLength: 0, opacity: 0 },
                    visible: { pathLength: 1, opacity: 1 },
                }}
                transition={{ duration: 0.3, ease: "easeOut" }}
            />
            <motion.line
                x1={size - pad} y1={pad} x2={pad} y2={size - pad}
                stroke="#3b82f6"
                strokeWidth={4}
                strokeLinecap="round"
                variants={{
                    hidden: { pathLength: 0, opacity: 0 },
                    visible: { pathLength: 1, opacity: 1 },
                }}
                transition={{ duration: 0.3, delay: 0.15, ease: "easeOut" }}
            />
        </motion.svg>
    );
}

function OMark({ size = 60 }: { size?: number }) {
    const center = size / 2;
    const radius = size * 0.3;
    return (
        <motion.svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            initial="hidden"
            animate="visible"
        >
            <motion.circle
                cx={center}
                cy={center}
                r={radius}
                stroke="#f43f5e"
                strokeWidth={4}
                fill="none"
                strokeLinecap="round"
                variants={{
                    hidden: { pathLength: 0, opacity: 0 },
                    visible: { pathLength: 1, opacity: 1 },
                }}
                transition={{ duration: 0.4, ease: "easeOut" }}
            />
        </motion.svg>
    );
}

// --- Win Line Overlay ---
function WinLineOverlay({ line, gridSize }: { line: number[]; gridSize: number }) {
    const cellSize = gridSize / 3;
    const getCenter = (index: number) => ({
        x: (index % 3) * cellSize + cellSize / 2,
        y: Math.floor(index / 3) * cellSize + cellSize / 2,
    });

    const start = getCenter(line[0]);
    const end = getCenter(line[2]);

    return (
        <motion.svg
            className="absolute inset-0 pointer-events-none z-20"
            width={gridSize}
            height={gridSize}
            viewBox={`0 0 ${gridSize} ${gridSize}`}
        >
            <motion.line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke="#fbbf24"
                strokeWidth={5}
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.8 }}
                transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            />
        </motion.svg>
    );
}

// --- Main Component ---
export default function TicTacToeGame() {
    const [bankroll, setBankroll] = useState<number>(DEFAULT_BANKROLL);
    const [bet, setBet] = useState<number>(MIN_BET);
    const [difficulty, setDifficulty] = useState<Difficulty>("medium");
    const [gameState, setGameState] = useState<GameState>("idle");
    const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
    const [winLine, setWinLine] = useState<number[] | null>(null);
    const [isPlayerTurn, setIsPlayerTurn] = useState(true);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [lastResult, setLastResult] = useState<{
        result: "win" | "loss" | "draw";
        profit: number;
    } | null>(null);
    const [currentBet, setCurrentBet] = useState(0);
    const [moveCount, setMoveCount] = useState(0);

    // Stats
    const totalGames = history.length;
    const wins = history.filter((h) => h.result === "win").length;
    const losses = history.filter((h) => h.result === "loss").length;
    const draws = history.filter((h) => h.result === "draw").length;
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
        if (bankroll < MIN_BET && gameState === "idle") {
            const t = setTimeout(() => setBankroll(100), 2000);
            return () => clearTimeout(t);
        }
    }, [bankroll, gameState]);

    // --- Game Logic ---
    const setBetSafe = (val: number) => {
        let v = precise(val);
        v = Math.max(MIN_BET, Math.min(v, bankroll));
        if (bankroll < MIN_BET && bankroll > 0) v = bankroll;
        setBet(v);
    };

    const startGame = () => {
        if (bet > bankroll || bet <= 0) return;

        const betAmount = bet;
        setBankroll((prev) => precise(prev - betAmount));
        setCurrentBet(betAmount);
        setBoard(Array(9).fill(null));
        setWinLine(null);
        setIsPlayerTurn(true);
        setGameState("playing");
        setLastResult(null);
        setMoveCount(0);
    };

    const endGame = useCallback(
        (result: "win" | "loss" | "draw", betAmt: number, moves: number) => {
            const multiplier = getMultiplier(difficulty);
            let payout = 0;
            if (result === "win") payout = precise(betAmt * multiplier);
            if (result === "draw") payout = betAmt; // refund on draw

            const profit = precise(payout - betAmt);

            if (payout > 0) setBankroll((prev) => precise(prev + payout));

            if (result === "win") setGameState("won");
            else if (result === "loss") setGameState("lost");
            else setGameState("draw");

            setLastResult({ result, profit });

            const entry: HistoryEntry = {
                id: generateId(),
                date: new Date().toISOString(),
                bet: betAmt,
                result,
                payout,
                profit,
                difficulty,
                moves,
            };
            setHistory((prev) => {
                const newHistory = [entry, ...prev].slice(0, MAX_HISTORY);
                localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
                return newHistory;
            });
        },
        [difficulty]
    );

    // AI Move
    useEffect(() => {
        if (gameState !== "playing" || isPlayerTurn) return;

        const timer = setTimeout(() => {
            const newBoard = [...board];
            const aiMove = getAIMove(newBoard, difficulty);
            if (aiMove === -1) return;

            newBoard[aiMove] = "O";
            setBoard(newBoard);
            setMoveCount((prev) => prev + 1);

            const { winner, line } = checkWinner(newBoard);
            if (winner === "O") {
                setWinLine(line);
                endGame("loss", currentBet, moveCount + 1);
                return;
            }
            if (isBoardFull(newBoard)) {
                endGame("draw", currentBet, moveCount + 1);
                return;
            }

            setIsPlayerTurn(true);
        }, 500 + Math.random() * 400);

        return () => clearTimeout(timer);
    }, [isPlayerTurn, gameState, board, difficulty, currentBet, moveCount, endGame]);

    const handleCellClick = (index: number) => {
        if (gameState !== "playing" || !isPlayerTurn || board[index] !== null) return;

        const newBoard = [...board];
        newBoard[index] = "X";
        setBoard(newBoard);
        setMoveCount((prev) => prev + 1);

        const { winner, line } = checkWinner(newBoard);
        if (winner === "X") {
            setWinLine(line);
            endGame("win", currentBet, moveCount + 1);
            return;
        }
        if (isBoardFull(newBoard)) {
            endGame("draw", currentBet, moveCount + 1);
            return;
        }

        setIsPlayerTurn(false);
    };

    const resetGame = () => {
        setGameState("idle");
        setBoard(Array(9).fill(null));
        setWinLine(null);
        setIsPlayerTurn(true);
        setLastResult(null);
        setCurrentBet(0);
        setMoveCount(0);
    };

    const gridSize = 330;

    return (
        <div className="min-h-screen text-neutral-200 font-sans selection:bg-blue-500/30 xl:pb-0 pb-24">
            <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-12">
                {/* Header */}
                <header className="mb-6 sm:mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Tic-Tac-Toe</h1>
                        <p className="text-neutral-500 text-xs sm:text-sm mt-1">
                            You are X • Beat the AI to win
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
                                            disabled={gameState === "playing"}
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-3 pl-8 pr-3 font-mono font-bold text-white focus:outline-none focus:border-blue-500/50 transition disabled:opacity-50"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        <button
                                            onClick={() => setBetSafe(bet / 2)}
                                            disabled={gameState === "playing"}
                                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold py-2 rounded-lg text-xs transition disabled:opacity-50"
                                        >
                                            1/2
                                        </button>
                                        <button
                                            onClick={() => setBetSafe(bet * 2)}
                                            disabled={gameState === "playing"}
                                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold py-2 rounded-lg text-xs transition disabled:opacity-50"
                                        >
                                            2×
                                        </button>
                                        <button
                                            onClick={() => setBetSafe(bankroll)}
                                            disabled={gameState === "playing"}
                                            className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold py-2 rounded-lg text-xs transition disabled:opacity-50"
                                        >
                                            MAX
                                        </button>
                                    </div>
                                </div>

                                {/* Difficulty */}
                                <div>
                                    <label className="text-xs font-semibold text-neutral-500 uppercase mb-2 block">
                                        Difficulty
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
                                            <button
                                                key={d}
                                                onClick={() => gameState !== "playing" && setDifficulty(d)}
                                                disabled={gameState === "playing"}
                                                className={`py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-2 disabled:opacity-50 ${getDifficultyBg(
                                                    d,
                                                    difficulty === d
                                                )} ${getDifficultyBorder(d, difficulty === d)} ${getDifficultyColor(d)}`}
                                            >
                                                {d}
                                                <div className="text-[10px] font-normal text-neutral-500 mt-0.5">
                                                    {getMultiplier(d)}×
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Action Button */}
                                {gameState === "idle" ? (
                                    <button
                                        onClick={startGame}
                                        disabled={bet > bankroll || bet < 0.01}
                                        className={`w-full py-4 rounded-xl text-lg font-bold tracking-wide shadow-lg transition-all transform active:scale-[0.98] select-none ${
                                            bet > bankroll || bet < 0.01
                                                ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                                                : "bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/20"
                                        }`}
                                    >
                                        PLAY
                                    </button>
                                ) : gameState === "playing" ? (
                                    <div className="bg-neutral-950/50 rounded-xl p-4 text-center">
                                        <div className="text-xs text-neutral-500 uppercase font-semibold mb-1">
                                            {isPlayerTurn ? "Your turn" : "AI thinking..."}
                                        </div>
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="text-2xl">{isPlayerTurn ? "🎯" : "🤖"}</span>
                                            {!isPlayerTurn && (
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                    className="w-4 h-4 border-2 border-neutral-600 border-t-neutral-300 rounded-full"
                                                />
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={resetGame}
                                        className="w-full py-4 rounded-xl text-lg font-bold tracking-wide shadow-lg transition-all transform active:scale-[0.98] select-none bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-emerald-500/20"
                                    >
                                        NEW GAME
                                    </button>
                                )}

                                {/* Payout Info */}
                                <div className="bg-neutral-950/50 rounded-lg p-3 flex items-center justify-between">
                                    <span className="text-xs text-neutral-500 uppercase font-semibold">
                                        Win Payout
                                    </span>
                                    <span className={`font-mono font-bold ${getDifficultyColor(difficulty)}`}>
                                        {getMultiplier(difficulty)}× ({formatCurrency(precise(bet * getMultiplier(difficulty)))})
                                    </span>
                                </div>
                                <div className="bg-neutral-950/50 rounded-lg p-3 flex items-center justify-between">
                                    <span className="text-xs text-neutral-500 uppercase font-semibold">
                                        Draw
                                    </span>
                                    <span className="font-mono font-bold text-neutral-400">
                                        Refund
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="box-primary rounded-2xl p-4 shadow-xl">
                            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
                                Statistics
                            </h3>
                            <div className="grid grid-cols-4 gap-2">
                                <div className="bg-neutral-950/50 rounded-lg p-2.5 text-center">
                                    <div className="text-[9px] uppercase text-neutral-500 font-semibold">Games</div>
                                    <div className="text-base font-mono font-bold text-white">{totalGames}</div>
                                </div>
                                <div className="bg-neutral-950/50 rounded-lg p-2.5 text-center">
                                    <div className="text-[9px] uppercase text-neutral-500 font-semibold">Wins</div>
                                    <div className="text-base font-mono font-bold text-emerald-400">{wins}</div>
                                </div>
                                <div className="bg-neutral-950/50 rounded-lg p-2.5 text-center">
                                    <div className="text-[9px] uppercase text-neutral-500 font-semibold">Losses</div>
                                    <div className="text-base font-mono font-bold text-[#f43f5e]">{losses}</div>
                                </div>
                                <div className="bg-neutral-950/50 rounded-lg p-2.5 text-center">
                                    <div className="text-[9px] uppercase text-neutral-500 font-semibold">Draws</div>
                                    <div className="text-base font-mono font-bold text-neutral-400">{draws}</div>
                                </div>
                            </div>
                            <div className="mt-2 bg-neutral-950/50 rounded-lg p-2.5 flex items-center justify-between">
                                <span className="text-[9px] uppercase text-neutral-500 font-semibold">Total Profit</span>
                                <span className={`font-mono font-bold text-sm ${totalProfit >= 0 ? "text-emerald-400" : "text-[#f43f5e]"}`}>
                                    {totalProfit >= 0 ? "+" : ""}{formatCurrency(precise(totalProfit))}
                                </span>
                            </div>
                        </div>

                        {/* History */}
                        <div className="box-primary rounded-2xl p-4 h-[250px] flex flex-col">
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
                                            <span
                                                className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${
                                                    h.result === "win"
                                                        ? "bg-emerald-500/20 text-emerald-400"
                                                        : h.result === "loss"
                                                            ? "bg-[#f43f5e]/20 text-[#f43f5e]"
                                                            : "bg-neutral-700/30 text-neutral-400"
                                                }`}
                                            >
                                                {h.result === "win" ? "W" : h.result === "loss" ? "L" : "D"}
                                            </span>
                                            <div className="flex flex-col">
                                                <span className="text-neutral-300 capitalize font-semibold">
                                                    {h.result}
                                                </span>
                                                <span className={`text-[10px] ${getDifficultyColor(h.difficulty)}`}>
                                                    {h.difficulty}
                                                </span>
                                            </div>
                                        </div>
                                        <div
                                            className={`font-mono font-bold ${
                                                h.profit > 0
                                                    ? "text-emerald-400"
                                                    : h.profit < 0
                                                        ? "text-neutral-500"
                                                        : "text-neutral-400"
                                            }`}
                                        >
                                            {h.profit > 0 ? "+" : ""}
                                            {formatCurrency(h.profit)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Result Banner */}
                        <AnimatePresence mode="wait">
                            {lastResult && gameState !== "playing" && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className={`box-primary rounded-2xl p-4 flex items-center justify-between gap-3 border ${
                                        lastResult.result === "win"
                                            ? "border-emerald-800/50"
                                            : lastResult.result === "loss"
                                                ? "border-red-800/50"
                                                : "border-neutral-700/50"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold ${
                                                lastResult.result === "win"
                                                    ? "bg-emerald-500/20 text-emerald-400"
                                                    : lastResult.result === "loss"
                                                        ? "bg-[#f43f5e]/20 text-[#f43f5e]"
                                                        : "bg-neutral-700/30 text-neutral-400"
                                            }`}
                                        >
                                            {lastResult.result === "win" ? "🎉" : lastResult.result === "loss" ? "💀" : "🤝"}
                                        </span>
                                        <div>
                                            <div className="text-sm font-bold text-white capitalize">
                                                {lastResult.result === "win"
                                                    ? "You won!"
                                                    : lastResult.result === "loss"
                                                        ? "AI wins"
                                                        : "Draw"}
                                            </div>
                                            <div className="text-[10px] text-neutral-500 uppercase">
                                                {lastResult.result === "draw" ? "Bet refunded" : `${difficulty} mode`}
                                            </div>
                                        </div>
                                    </div>
                                    <span
                                        className={`font-mono font-bold text-lg ${
                                            lastResult.profit > 0
                                                ? "text-emerald-400"
                                                : lastResult.profit < 0
                                                    ? "text-[#f43f5e]"
                                                    : "text-neutral-400"
                                        }`}
                                    >
                                        {lastResult.profit > 0 ? "+" : ""}
                                        {formatCurrency(lastResult.profit)}
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* --- Game Board --- */}
                    <div className="order-1 lg:order-2 box-primary rounded-2xl p-6 sm:p-10 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[500px]">
                        {/* Turn indicator */}
                        {gameState === "playing" && (
                            <div className="mb-6 flex items-center gap-3">
                                <div
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                                        isPlayerTurn
                                            ? "border-blue-500/50 bg-blue-500/10"
                                            : "border-neutral-700 bg-neutral-800/50"
                                    }`}
                                >
                                    <span className="text-blue-400 font-bold text-sm">X</span>
                                    <span className="text-xs text-neutral-400">You</span>
                                </div>
                                <span className="text-neutral-600 text-xs">vs</span>
                                <div
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                                        !isPlayerTurn
                                            ? "border-[#f43f5e]/50 bg-[#f43f5e]/10"
                                            : "border-neutral-700 bg-neutral-800/50"
                                    }`}
                                >
                                    <span className="text-[#f43f5e] font-bold text-sm">O</span>
                                    <span className="text-xs text-neutral-400">AI</span>
                                </div>
                            </div>
                        )}

                        {/* Grid */}
                        <div className="relative" style={{ width: gridSize, height: gridSize }}>
                            {/* Grid lines */}
                            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                                {Array.from({ length: 9 }).map((_, i) => {
                                    const col = i % 3;
                                    const row = Math.floor(i / 3);
                                    return (
                                        <div
                                            key={i}
                                            className={`
                                                ${col < 2 ? "border-r-2" : ""} 
                                                ${row < 2 ? "border-b-2" : ""} 
                                                border-neutral-700/50
                                            `}
                                        />
                                    );
                                })}
                            </div>

                            {/* Cells */}
                            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                                {board.map((cell, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleCellClick(i)}
                                        disabled={
                                            cell !== null ||
                                            gameState !== "playing" ||
                                            !isPlayerTurn
                                        }
                                        className={`flex items-center justify-center transition-all ${
                                            cell === null && gameState === "playing" && isPlayerTurn
                                                ? "hover:bg-neutral-800/50 cursor-pointer active:scale-95"
                                                : ""
                                        }`}
                                    >
                                        <AnimatePresence>
                                            {cell === "X" && <XMark size={gridSize / 3 - 20} />}
                                            {cell === "O" && <OMark size={gridSize / 3 - 20} />}
                                        </AnimatePresence>
                                    </button>
                                ))}
                            </div>

                            {/* Win line */}
                            {winLine && <WinLineOverlay line={winLine} gridSize={gridSize} />}
                        </div>

                        {/* Idle message */}
                        {gameState === "idle" && (
                            <div className="mt-8 text-neutral-600 text-sm font-semibold">
                                Place a bet to start
                            </div>
                        )}

                        {/* Game over message */}
                        {(gameState === "won" || gameState === "lost" || gameState === "draw") && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-6 text-center"
                            >
                                <div
                                    className={`text-2xl font-black ${
                                        gameState === "won"
                                            ? "text-emerald-400"
                                            : gameState === "lost"
                                                ? "text-[#f43f5e]"
                                                : "text-neutral-400"
                                    }`}
                                >
                                    {gameState === "won"
                                        ? "You Win!"
                                        : gameState === "lost"
                                            ? "AI Wins!"
                                            : "Draw!"}
                                </div>
                                <div className="text-neutral-500 text-xs mt-1">
                                    {gameState === "draw" ? "Bet refunded" : `${difficulty} difficulty`}
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}