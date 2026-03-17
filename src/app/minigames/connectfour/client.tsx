"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// --- Configuration ---
const COLS = 7;
const ROWS = 6;
const STORAGE_KEY = "connectfour_bankroll_v1";
const HISTORY_STORAGE_KEY = "connectfour_history_v1";
const DEFAULT_BANKROLL = 1000;
const MIN_BET = 10;
const MAX_HISTORY = 30;

type Cell = "R" | "Y" | null; // R = player (Red), Y = AI (Yellow)
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
    if (!n) return "$0";
    return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function precise(n: number) {
    return Math.floor(n * 100) / 100;
}

function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createEmptyBoard(): Cell[][] {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function cloneBoard(board: Cell[][]): Cell[][] {
    return board.map((row) => [...row]);
}

function getLowestEmptyRow(board: Cell[][], col: number): number {
    for (let row = ROWS - 1; row >= 0; row--) {
        if (board[row][col] === null) return row;
    }
    return -1;
}

function getValidColumns(board: Cell[][]): number[] {
    const valid: number[] = [];
    for (let col = 0; col < COLS; col++) {
        if (board[0][col] === null) valid.push(col);
    }
    return valid;
}

function isBoardFull(board: Cell[][]): boolean {
    return getValidColumns(board).length === 0;
}

// Check for 4 in a row — returns winning cells or null
function checkWinner(board: Cell[][]): { winner: Cell; cells: [number, number][] } | null {
    const directions = [
        [0, 1],  // horizontal
        [1, 0],  // vertical
        [1, 1],  // diagonal down-right
        [1, -1], // diagonal down-left
    ];

    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            const cell = board[row][col];
            if (!cell) continue;

            for (const [dr, dc] of directions) {
                const cells: [number, number][] = [[row, col]];
                let valid = true;

                for (let i = 1; i < 4; i++) {
                    const r = row + dr * i;
                    const c = col + dc * i;
                    if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== cell) {
                        valid = false;
                        break;
                    }
                    cells.push([r, c]);
                }

                if (valid) return { winner: cell, cells };
            }
        }
    }
    return null;
}

// Quick winner check without cells (for AI)
function hasWinner(board: Cell[][], player: Cell): boolean {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (board[row][col] !== player) continue;
            for (const [dr, dc] of directions) {
                let count = 1;
                for (let i = 1; i < 4; i++) {
                    const r = row + dr * i;
                    const c = col + dc * i;
                    if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) count++;
                    else break;
                }
                if (count >= 4) return true;
            }
        }
    }
    return false;
}

// --- AI ---
function scorePosition(board: Cell[][], player: Cell): number {
    const opponent: Cell = player === "Y" ? "R" : "Y";
    let score = 0;

    // Center column preference
    const centerCol = Math.floor(COLS / 2);
    let centerCount = 0;
    for (let row = 0; row < ROWS; row++) {
        if (board[row][centerCol] === player) centerCount++;
    }
    score += centerCount * 3;

    // Evaluate windows of 4
    const evaluateWindow = (window: Cell[]) => {
        const playerCount = window.filter((c) => c === player).length;
        const opponentCount = window.filter((c) => c === opponent).length;
        const emptyCount = window.filter((c) => c === null).length;

        if (playerCount === 4) return 100;
        if (playerCount === 3 && emptyCount === 1) return 5;
        if (playerCount === 2 && emptyCount === 2) return 2;
        if (opponentCount === 3 && emptyCount === 1) return -4;
        return 0;
    };

    // Horizontal
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col <= COLS - 4; col++) {
            const window = [board[row][col], board[row][col + 1], board[row][col + 2], board[row][col + 3]];
            score += evaluateWindow(window);
        }
    }

    // Vertical
    for (let col = 0; col < COLS; col++) {
        for (let row = 0; row <= ROWS - 4; row++) {
            const window = [board[row][col], board[row + 1][col], board[row + 2][col], board[row + 3][col]];
            score += evaluateWindow(window);
        }
    }

    // Diagonal down-right
    for (let row = 0; row <= ROWS - 4; row++) {
        for (let col = 0; col <= COLS - 4; col++) {
            const window = [board[row][col], board[row + 1][col + 1], board[row + 2][col + 2], board[row + 3][col + 3]];
            score += evaluateWindow(window);
        }
    }

    // Diagonal down-left
    for (let row = 0; row <= ROWS - 4; row++) {
        for (let col = 3; col < COLS; col++) {
            const window = [board[row][col], board[row + 1][col - 1], board[row + 2][col - 2], board[row + 3][col - 3]];
            score += evaluateWindow(window);
        }
    }

    return score;
}

function minimax(
    board: Cell[][],
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean
): [number, number] {
    const validCols = getValidColumns(board);

    if (hasWinner(board, "Y")) return [-1, 100000 + depth];
    if (hasWinner(board, "R")) return [-1, -100000 - depth];
    if (validCols.length === 0 || depth === 0) return [-1, scorePosition(board, "Y")];

    if (isMaximizing) {
        let bestScore = -Infinity;
        let bestCol = validCols[Math.floor(Math.random() * validCols.length)];

        for (const col of validCols) {
            const newBoard = cloneBoard(board);
            const row = getLowestEmptyRow(newBoard, col);
            newBoard[row][col] = "Y";
            const [, score] = minimax(newBoard, depth - 1, alpha, beta, false);
            if (score > bestScore) {
                bestScore = score;
                bestCol = col;
            }
            alpha = Math.max(alpha, score);
            if (alpha >= beta) break;
        }
        return [bestCol, bestScore];
    } else {
        let bestScore = Infinity;
        let bestCol = validCols[Math.floor(Math.random() * validCols.length)];

        for (const col of validCols) {
            const newBoard = cloneBoard(board);
            const row = getLowestEmptyRow(newBoard, col);
            newBoard[row][col] = "R";
            const [, score] = minimax(newBoard, depth - 1, alpha, beta, true);
            if (score < bestScore) {
                bestScore = score;
                bestCol = col;
            }
            beta = Math.min(beta, score);
            if (alpha >= beta) break;
        }
        return [bestCol, bestScore];
    }
}

function getAIMove(board: Cell[][], difficulty: Difficulty): number {
    const validCols = getValidColumns(board);
    if (validCols.length === 0) return -1;

    // Check for immediate win
    for (const col of validCols) {
        const newBoard = cloneBoard(board);
        const row = getLowestEmptyRow(newBoard, col);
        newBoard[row][col] = "Y";
        if (hasWinner(newBoard, "Y")) return col;
    }

    // Check for immediate block
    for (const col of validCols) {
        const newBoard = cloneBoard(board);
        const row = getLowestEmptyRow(newBoard, col);
        newBoard[row][col] = "R";
        if (hasWinner(newBoard, "R")) return col;
    }

    if (difficulty === "easy") {
        // 20% minimax depth 2, 80% random
        if (Math.random() < 0.2) {
            const [col] = minimax(cloneBoard(board), 2, -Infinity, Infinity, true);
            return col;
        }
        return validCols[Math.floor(Math.random() * validCols.length)];
    }

    if (difficulty === "medium") {
        // Minimax depth 4
        const [col] = minimax(cloneBoard(board), 4, -Infinity, Infinity, true);
        return col;
    }

    // Hard: minimax depth 6
    const [col] = minimax(cloneBoard(board), 6, -Infinity, Infinity, true);
    return col;
}

function getMultiplier(difficulty: Difficulty): number {
    switch (difficulty) {
        case "easy": return 1.3;
        case "medium": return 1.8;
        case "hard": return 3.5;
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

// --- Main Component ---
export default function ConnectFourGame() {
    const [bankroll, setBankroll] = useState<number>(DEFAULT_BANKROLL);
    const [bet, setBet] = useState<number>(MIN_BET);
    const [difficulty, setDifficulty] = useState<Difficulty>("medium");
    const [gameState, setGameState] = useState<GameState>("idle");
    const [board, setBoard] = useState<Cell[][]>(createEmptyBoard());
    const [winCells, setWinCells] = useState<[number, number][]>([]);
    const [isPlayerTurn, setIsPlayerTurn] = useState(true);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [lastResult, setLastResult] = useState<{
        result: "win" | "loss" | "draw";
        profit: number;
    } | null>(null);
    const [currentBet, setCurrentBet] = useState(0);
    const [moveCount, setMoveCount] = useState(0);
    const [hoverCol, setHoverCol] = useState<number | null>(null);
    const [lastDropRow, setLastDropRow] = useState<number | null>(null);
    const [lastDropCol, setLastDropCol] = useState<number | null>(null);

    // Stats
    const totalGames = history.length;
    const wins = history.filter((h) => h.result === "win").length;
    const losses = history.filter((h) => h.result === "loss").length;
    const draws = history.filter((h) => h.result === "draw").length;
    const totalProfit = history.reduce((sum, h) => sum + h.profit, 0);

    const [cellSize, setCellSize] = useState(70);

    useEffect(() => {
        const updateSize = () => {
            setCellSize(window.innerWidth < 700 ? 40 : 70);
        };
        updateSize();
        window.addEventListener("resize", updateSize);
        return () => window.removeEventListener("resize", updateSize);
    }, []);

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
        setBoard(createEmptyBoard());
        setWinCells([]);
        setIsPlayerTurn(true);
        setGameState("playing");
        setLastResult(null);
        setMoveCount(0);
        setHoverCol(null);
        setLastDropRow(null);
        setLastDropCol(null);
    };

    const endGame = useCallback(
        (result: "win" | "loss" | "draw", betAmt: number, moves: number) => {
            const multiplier = getMultiplier(difficulty);
            let payout = 0;
            if (result === "win") payout = precise(betAmt * multiplier);
            if (result === "draw") payout = betAmt;

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
            const aiCol = getAIMove(board, difficulty);
            if (aiCol === -1) return;

            const newBoard = cloneBoard(board);
            const row = getLowestEmptyRow(newBoard, aiCol);
            if (row === -1) return;

            newBoard[row][aiCol] = "Y";
            setBoard(newBoard);
            setLastDropRow(row);
            setLastDropCol(aiCol);
            setMoveCount((prev) => prev + 1);

            const result = checkWinner(newBoard);
            if (result && result.winner === "Y") {
                setWinCells(result.cells);
                endGame("loss", currentBet, moveCount + 1);
                return;
            }
            if (isBoardFull(newBoard)) {
                endGame("draw", currentBet, moveCount + 1);
                return;
            }

            setIsPlayerTurn(true);
        }, 600 + Math.random() * 400);

        return () => clearTimeout(timer);
    }, [isPlayerTurn, gameState, board, difficulty, currentBet, moveCount, endGame]);

    const dropPiece = (col: number) => {
        if (gameState !== "playing" || !isPlayerTurn) return;

        const row = getLowestEmptyRow(board, col);
        if (row === -1) return;

        const newBoard = cloneBoard(board);
        newBoard[row][col] = "R";
        setBoard(newBoard);
        setLastDropRow(row);
        setLastDropCol(col);
        setMoveCount((prev) => prev + 1);

        const result = checkWinner(newBoard);
        if (result && result.winner === "R") {
            setWinCells(result.cells);
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
        setBoard(createEmptyBoard());
        setWinCells([]);
        setIsPlayerTurn(true);
        setLastResult(null);
        setCurrentBet(0);
        setMoveCount(0);
        setHoverCol(null);
        setLastDropRow(null);
        setLastDropCol(null);
    };

    const isWinCell = (row: number, col: number) => {
        return winCells.some(([r, c]) => r === row && c === col);
    };

    const CELL_SIZE = cellSize;
    const GAP = 6;
    const BOARD_PAD = 12;
    const boardWidth = COLS * CELL_SIZE + (COLS - 1) * GAP + BOARD_PAD * 2;
    const boardHeight = ROWS * CELL_SIZE + (ROWS - 1) * GAP + BOARD_PAD * 2;

    return (
        <div className="min-h-screen text-neutral-200 font-sans selection:bg-blue-500/30 xl:pb-0 pb-24">
            <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-12">
                {/* Header */}
                <header className="mb-6 sm:mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Connect Four</h1>
                        <p className="text-neutral-500 text-xs sm:text-sm mt-1">
                            You are <span className="text-red-400 font-semibold">Red</span> • Get 4 in a row
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
                                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-neutral-500">$</div>
                                        <input
                                            type="number"
                                            value={bet}
                                            onChange={(e) => setBetSafe(Number(e.target.value))}
                                            disabled={gameState === "playing"}
                                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg py-3 pl-8 pr-3 font-mono font-bold text-white focus:outline-none focus:border-blue-500/50 transition disabled:opacity-50"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        <button onClick={() => setBetSafe(bet / 2)} disabled={gameState === "playing"} className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold py-2 rounded-lg text-xs transition disabled:opacity-50">1/2</button>
                                        <button onClick={() => setBetSafe(bet * 2)} disabled={gameState === "playing"} className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold py-2 rounded-lg text-xs transition disabled:opacity-50">2×</button>
                                        <button onClick={() => setBetSafe(bankroll)} disabled={gameState === "playing"} className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold py-2 rounded-lg text-xs transition disabled:opacity-50">MAX</button>
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
                                                className={`py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-2 disabled:opacity-50 ${getDifficultyBg(d, difficulty === d)} ${getDifficultyBorder(d, difficulty === d)} ${getDifficultyColor(d)}`}
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
                                    <span className="text-xs text-neutral-500 uppercase font-semibold">Win Payout</span>
                                    <span className={`font-mono font-bold ${getDifficultyColor(difficulty)}`}>
                                        {getMultiplier(difficulty)}× ({formatCurrency(precise(bet * getMultiplier(difficulty)))})
                                    </span>
                                </div>
                                <div className="bg-neutral-950/50 rounded-lg p-3 flex items-center justify-between">
                                    <span className="text-xs text-neutral-500 uppercase font-semibold">Draw</span>
                                    <span className="font-mono font-bold text-neutral-400">Refund</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="box-primary rounded-2xl p-4 shadow-xl">
                            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Statistics</h3>
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
                            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">History</h3>
                            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                                {history.length === 0 && (
                                    <div className="text-neutral-600 text-xs text-center py-4">No games yet</div>
                                )}
                                {history.map((h) => (
                                    <div key={h.id} className="flex items-center justify-between bg-neutral-950/30 p-2 rounded border border-neutral-800/30 text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${
                                                h.result === "win" ? "bg-emerald-500/20 text-emerald-400"
                                                    : h.result === "loss" ? "bg-[#f43f5e]/20 text-[#f43f5e]"
                                                        : "bg-neutral-700/30 text-neutral-400"
                                            }`}>
                                                {h.result === "win" ? "W" : h.result === "loss" ? "L" : "D"}
                                            </span>
                                            <div className="flex flex-col">
                                                <span className="text-neutral-300 capitalize font-semibold">{h.result}</span>
                                                <span className={`text-[10px] ${getDifficultyColor(h.difficulty)}`}>{h.difficulty} • {h.moves} moves</span>
                                            </div>
                                        </div>
                                        <div className={`font-mono font-bold ${h.profit > 0 ? "text-emerald-400" : h.profit < 0 ? "text-neutral-500" : "text-neutral-400"}`}>
                                            {h.profit > 0 ? "+" : ""}{formatCurrency(h.profit)}
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
                                        lastResult.result === "win" ? "border-emerald-800/50"
                                            : lastResult.result === "loss" ? "border-red-800/50"
                                                : "border-neutral-700/50"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl font-bold ${
                                            lastResult.result === "win" ? "bg-emerald-500/20 text-emerald-400"
                                                : lastResult.result === "loss" ? "bg-[#f43f5e]/20 text-[#f43f5e]"
                                                    : "bg-neutral-700/30 text-neutral-400"
                                        }`}>
                                            {lastResult.result === "win" ? "🎉" : lastResult.result === "loss" ? "💀" : "🤝"}
                                        </span>
                                        <div>
                                            <div className="text-sm font-bold text-white capitalize">
                                                {lastResult.result === "win" ? "You won!" : lastResult.result === "loss" ? "AI wins" : "Draw"}
                                            </div>
                                            <div className="text-[10px] text-neutral-500 uppercase">
                                                {lastResult.result === "draw" ? "Bet refunded" : `${difficulty} mode`}
                                            </div>
                                        </div>
                                    </div>
                                    <span className={`font-mono font-bold text-lg ${
                                        lastResult.profit > 0 ? "text-emerald-400" : lastResult.profit < 0 ? "text-[#f43f5e]" : "text-neutral-400"
                                    }`}>
                                        {lastResult.profit > 0 ? "+" : ""}{formatCurrency(lastResult.profit)}
                                    </span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* --- Game Board --- */}
                    <div className="order-1 lg:order-2 box-primary rounded-2xl p-4 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[500px]">
                        {/* Turn indicator */}
                        {gameState === "playing" && (
                            <div className="mb-5 flex items-center gap-3">
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                                    isPlayerTurn ? "border-red-500/50 bg-red-500/10" : "border-neutral-700 bg-neutral-800/50"
                                }`}>
                                    <div className="w-4 h-4 rounded-full bg-red-500" />
                                    <span className="text-xs text-neutral-400">You</span>
                                </div>
                                <span className="text-neutral-600 text-xs">vs</span>
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
                                    !isPlayerTurn ? "border-yellow-500/50 bg-yellow-500/10" : "border-neutral-700 bg-neutral-800/50"
                                }`}>
                                    <div className="w-4 h-4 rounded-full bg-yellow-400" />
                                    <span className="text-xs text-neutral-400">AI</span>
                                </div>
                            </div>
                        )}

                        {/* Column hover indicators */}
                        <div className="flex gap-[6px] mb-2" style={{ paddingLeft: BOARD_PAD, paddingRight: BOARD_PAD }}>
                            {Array.from({ length: COLS }).map((_, col) => {
                                const canDrop = gameState === "playing" && isPlayerTurn && board[0][col] === null;
                                return (
                                    <div
                                        key={col}
                                        className="flex justify-center"
                                        style={{ width: CELL_SIZE }}
                                    >
                                        <motion.div
                                            className={`w-8 h-8 rounded-full transition-all ${
                                                canDrop && hoverCol === col
                                                    ? "bg-red-500 shadow-lg shadow-red-500/30"
                                                    : "bg-transparent"
                                            }`}
                                            animate={{
                                                y: canDrop && hoverCol === col ? [0, 4, 0] : 0,
                                            }}
                                            transition={{
                                                repeat: canDrop && hoverCol === col ? Infinity : 0,
                                                duration: 1,
                                                ease: "easeInOut",
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        {/* Board */}
                        <div
                            className="rounded-2xl bg-blue-800 shadow-2xl relative"
                            style={{
                                width: boardWidth,
                                height: boardHeight,
                                padding: BOARD_PAD,
                            }}
                        >
                            {/* Board gradient overlay */}
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-blue-700/30 to-transparent pointer-events-none" />

                            <div
                                className="grid relative z-10"
                                style={{
                                    gridTemplateColumns: `repeat(${COLS}, ${CELL_SIZE}px)`,
                                    gridTemplateRows: `repeat(${ROWS}, ${CELL_SIZE}px)`,
                                    gap: GAP,
                                }}
                            >
                                {board.map((row, rowIndex) =>
                                    row.map((cell, colIndex) => {
                                        const isWin = isWinCell(rowIndex, colIndex);
                                        const isLastDrop = lastDropRow === rowIndex && lastDropCol === colIndex;

                                        return (
                                            <button
                                                key={`${rowIndex}-${colIndex}`}
                                                onClick={() => dropPiece(colIndex)}
                                                onMouseEnter={() => setHoverCol(colIndex)}
                                                onMouseLeave={() => setHoverCol(null)}
                                                disabled={gameState !== "playing" || !isPlayerTurn || board[0][colIndex] !== null}
                                                className={`relative rounded-full transition-all duration-150 ${
                                                    gameState === "playing" && isPlayerTurn && board[0][colIndex] === null
                                                        ? "cursor-pointer hover:brightness-110"
                                                        : "cursor-default"
                                                }`}
                                                style={{ width: CELL_SIZE, height: CELL_SIZE }}
                                            >
                                                {/* Hole */}
                                                <div
                                                    className={`absolute inset-1 rounded-full transition-all duration-300 ${
                                                        cell === null
                                                            ? "bg-neutral-900/90 shadow-inner"
                                                            : ""
                                                    }`}
                                                >
                                                    {/* Piece */}
                                                    <AnimatePresence>
                                                        {cell && (
                                                            <motion.div
                                                                initial={isLastDrop ? { y: -(rowIndex + 1) * (CELL_SIZE + GAP), scale: 1 } : { scale: 1 }}
                                                                animate={{ y: 0, scale: 1 }}
                                                                transition={{
                                                                    type: "spring",
                                                                    stiffness: 400,
                                                                    damping: 35,
                                                                    mass: 0.8,
                                                                }}
                                                                className={`absolute inset-0 rounded-full shadow-lg ${
                                                                    cell === "R"
                                                                        ? "bg-gradient-to-br from-red-400 to-red-600"
                                                                        : "bg-gradient-to-br from-yellow-300 to-yellow-500"
                                                                } ${isWin ? "ring-[3px] ring-white ring-offset-1 ring-offset-blue-800" : ""}`}
                                                            >
                                                                {/* Shine */}
                                                                <div className="absolute top-1.5 left-2 w-3 h-3 rounded-full bg-white/20" />

                                                                {/* Win pulse */}
                                                                {isWin && (
                                                                    <motion.div
                                                                        className="absolute inset-0 rounded-full border-2 border-white"
                                                                        animate={{
                                                                            scale: [1, 1.15, 1],
                                                                            opacity: [0.8, 0, 0.8],
                                                                        }}
                                                                        transition={{
                                                                            duration: 1.5,
                                                                            repeat: Infinity,
                                                                            ease: "easeInOut",
                                                                        }}
                                                                    />
                                                                )}
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Idle message */}
                        {gameState === "idle" && (
                            <div className="mt-6 text-neutral-600 text-sm font-semibold">
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
                                <div className={`text-2xl font-black ${
                                    gameState === "won" ? "text-emerald-400"
                                        : gameState === "lost" ? "text-[#f43f5e]"
                                            : "text-neutral-400"
                                }`}>
                                    {gameState === "won" ? "You Win!" : gameState === "lost" ? "AI Wins!" : "Draw!"}
                                </div>
                                <div className="text-neutral-500 text-xs mt-1">
                                    {gameState === "draw" ? "Bet refunded" : `${difficulty} difficulty • ${moveCount} moves`}
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}