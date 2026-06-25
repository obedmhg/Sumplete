"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertCircle,
  Lightbulb,
  RotateCcw,
  Eye,
  Share2,
  Volume2,
  VolumeX,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Timer,
} from "lucide-react"
import {
  generateGame,
  toggleDelete,
  applyHint,
  revealSolution,
  markMistakes,
  removeMistakes,
  type GameState,
} from "@/lib/sumplete-engine"
import { play, unlockAudio, isMuted, setMuted as setSoundMuted } from "@/lib/sound"
import type { GameSceneProps } from "@/components/board/GameScene"
import type { CharState } from "@/components/board/constants"
import { CHARACTERS, characterById, DEFAULT_CHARACTER_ID } from "@/components/board/characters"

// The three.js scene is client-only (it builds canvas textures from `document`).
const GameScene = dynamic<GameSceneProps>(() => import("@/components/board/GameScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
      Loading 3D board…
    </div>
  ),
})

const center = (size: number) => Math.floor((size - 1) / 2)

export function Sumplete3D() {
  const [gridSize, setGridSize] = useState(3)
  const [allowNegative, setAllowNegative] = useState(false)
  const [gameState, setGameState] = useState<GameState>(() => generateGame(3, false))
  const [showMistakes, setShowMistakes] = useState(false)
  const [muted, setMuted] = useState(false)
  const [winCount, setWinCount] = useState(0)
  const [jumpKey, setJumpKey] = useState(0)
  // "run" = walk the character + jump to cross out. "click" = classic: click a tile.
  const [mode, setMode] = useState<"run" | "click">("run")
  const [characterId, setCharacterId] = useState(DEFAULT_CHARACTER_ID)

  // Challenge: clear every size 3x3 → 9x9 against a clock. Each level resets the
  // clock to (size - 2) minutes: 3x3 = 1 min, 4x4 = 2 min, … 9x9 = 7 min.
  const CHALLENGE_MAX = 9
  const levelTime = (size: number) => (size - 2) * 60
  const [challenge, setChallenge] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [challengeResult, setChallengeResult] = useState<null | "won" | "lost">(null)
  const challengeRef = useRef(false)
  challengeRef.current = challenge

  const disabled = gameState.gameWon || gameState.gameRevealed || challengeResult !== null

  // Continuous character position + currently held movement keys live in refs,
  // so walking never triggers a React re-render. The board is centered on the
  // origin, so the character starts at (0,0) on the middle tile.
  const charRef = useRef<CharState>({ x: 0, z: 0, row: center(3), col: center(3), valid: true })
  const heldRef = useRef<Set<string>>(new Set())
  const gameStateRef = useRef(gameState)
  gameStateRef.current = gameState

  const firstSizeEffect = useRef(true)
  const skipReset = useRef(false)

  const recenterChar = useCallback((size: number) => {
    charRef.current = { x: 0, z: 0, row: center(size), col: center(size), valid: true }
    heldRef.current.clear()
  }, [])

  // New puzzle whenever the grid size changes (but not on mount/restore).
  useEffect(() => {
    if (firstSizeEffect.current) {
      firstSizeEffect.current = false
      return
    }
    if (skipReset.current) {
      skipReset.current = false
      return
    }
    setGameState(generateGame(gridSize, allowNegative))
    setShowMistakes(false)
    recenterChar(gridSize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridSize])

  // Persist.
  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem("sumplete-game", JSON.stringify(gameState))
    localStorage.setItem("sumplete-size", gridSize.toString())
    localStorage.setItem("sumplete-negative", allowNegative.toString())
    localStorage.setItem("sumplete-mode", mode)
    localStorage.setItem("sumplete-character", characterId)
  }, [gameState, gridSize, allowNegative, mode, characterId])

  // Restore on mount.
  useEffect(() => {
    if (typeof window === "undefined") return
    setMuted(isMuted())
    const savedSize = localStorage.getItem("sumplete-size")
    const savedNegative = localStorage.getItem("sumplete-negative")
    const savedGame = localStorage.getItem("sumplete-game")
    if (savedSize) {
      const parsed = Number.parseInt(savedSize)
      if (parsed !== gridSize) skipReset.current = true
      setGridSize(parsed)
      recenterChar(parsed)
    }
    if (savedNegative) setAllowNegative(savedNegative === "true")
    const savedMode = localStorage.getItem("sumplete-mode")
    if (savedMode === "run" || savedMode === "click") setMode(savedMode)
    const savedChar = localStorage.getItem("sumplete-character")
    if (savedChar) setCharacterId(characterById(savedChar).id)
    if (savedGame) {
      try {
        setGameState(JSON.parse(savedGame))
      } catch {
        setGameState(generateGame(gridSize, allowNegative))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function resetGame() {
    setGameState(generateGame(gridSize, allowNegative))
    setShowMistakes(false)
    recenterChar(gridSize)
  }

  // --- Challenge mode ---

  const startChallenge = useCallback(() => {
    unlockAudio()
    setChallenge(true)
    setChallengeResult(null)
    setShowMistakes(false)
    setTimeLeft(levelTime(3))
    setGridSize(3) // if size changes, the size-effect regenerates; else we do it here
    setGameState(generateGame(3, allowNegative))
    recenterChar(3)
    play("click")
  }, [allowNegative, recenterChar])

  const quitChallenge = useCallback(() => {
    setChallenge(false)
    setChallengeResult(null)
  }, [])

  // Clearing a level: bank +60s and move to the next size, or finish at 9x9.
  const advanceChallenge = useCallback(() => {
    const size = gameStateRef.current.grid.length
    if (size >= CHALLENGE_MAX) {
      setChallengeResult("won")
      return
    }
    setTimeLeft(levelTime(size + 1)) // fresh clock for the next, bigger level
    setGridSize(size + 1) // size-change effect generates the next puzzle + recenters
  }, [])

  // Countdown. Pauses once the challenge ends (win/lose) or is quit.
  useEffect(() => {
    if (!challenge || challengeResult) return
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id)
          setChallengeResult("lost")
          play("error")
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [challenge, challengeResult])

  // --- Character controls ---

  // Cross out / restore a cell, with the right sound + win bookkeeping. Shared by
  // the runner's jump and the click mode's tile taps.
  const toggleCell = useCallback((row: number, col: number) => {
    const prev = gameStateRef.current
    const { state, result } = toggleDelete(prev, row, col)
    if (result === "blocked") return
    if (result === "deleted") play("delete")

    if (state.gameWon && !prev.gameWon) {
      setWinCount((k) => k + 1)
      play("win")
      if (challengeRef.current) advanceChallenge()
    } else {
      const newlyCorrect =
        state.rowStatus.some((s, i) => s === "correct" && prev.rowStatus[i] !== "correct") ||
        state.colStatus.some((s, j) => s === "correct" && prev.colStatus[j] !== "correct")
      if (newlyCorrect) play("correct")
    }
    setGameState(state)
  }, [advanceChallenge])

  const jump = useCallback(() => {
    const c = charRef.current
    unlockAudio()
    setJumpKey((k) => k + 1)
    play("jump")
    if (!c.valid) return // standing off the board — just hop
    toggleCell(c.row, c.col)
  }, [toggleCell])

  const handleTileClick = useCallback(
    (row: number, col: number) => {
      if (gameStateRef.current.gameWon || gameStateRef.current.gameRevealed) return
      unlockAudio()
      toggleCell(row, col)
    },
    [toggleCell],
  )

  // Switching mode: clear held keys; recenter the character for run mode, or park
  // it off the board for click mode so no tile shows the amber "occupied" glow.
  const changeMode = useCallback(
    (next: "run" | "click") => {
      heldRef.current.clear()
      if (next === "run") recenterChar(gridSize)
      else charRef.current = { ...charRef.current, valid: false }
      setMode(next)
    },
    [gridSize, recenterChar],
  )

  const press = useCallback((key: string) => {
    unlockAudio()
    heldRef.current.add(key)
  }, [])
  const release = useCallback((key: string) => {
    heldRef.current.delete(key)
  }, [])

  useEffect(() => {
    if (mode !== "run") return
    const MOVE_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"])

    function onKeyDown(e: KeyboardEvent) {
      const ae = document.activeElement as HTMLElement | null
      const tag = ae?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return
      if (document.querySelector('[role="listbox"]')) return // a Select is open

      if (MOVE_KEYS.has(e.key)) {
        e.preventDefault()
        heldRef.current.add(e.key)
      } else if (e.key === " ") {
        // Always jump on Space. Blur any focused button first so the browser
        // doesn't also "click" it, and we don't get a double-trigger.
        if (tag === "BUTTON") ae?.blur()
        e.preventDefault()
        if (!e.repeat) jump()
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (MOVE_KEYS.has(e.key)) heldRef.current.delete(e.key)
    }
    function clearHeld() {
      heldRef.current.clear()
    }

    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    window.addEventListener("blur", clearHeld)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("blur", clearHeld)
    }
  }, [jump, mode])

  // --- Helper actions ---

  function handleHint() {
    unlockAudio()
    const { state, applied } = applyHint(gameState)
    if (applied) {
      play("click")
      setGameState(state)
    }
  }

  function handleReveal() {
    if (window.confirm("Are you sure you want to reveal the solution to this puzzle?")) {
      setGameState(revealSolution(gameState))
    }
  }

  function handleCheckMistakes() {
    unlockAudio()
    const { state, count } = markMistakes(gameState)
    play(count > 0 ? "error" : "correct")
    setGameState(state)
    setShowMistakes(true)
  }

  function handleRemoveMistakes() {
    setGameState(removeMistakes(gameState))
    setShowMistakes(false)
  }

  function toggleMute() {
    const next = !muted
    setMuted(next)
    setSoundMuted(next)
    if (!next) {
      unlockAudio()
      play("click")
    }
  }

  function shareGame() {
    const inviteMessage = "Have you tried this logic puzzle platformer? - Sumplete Runner"
    if (navigator.share) {
      navigator.share({ text: inviteMessage }).catch((err) => console.error("Share failed:", err))
    } else {
      navigator.clipboard
        .writeText(inviteMessage)
        .then(() => alert("Invite message copied to clipboard."))
        .catch((err) => console.error("Copy failed:", err))
    }
  }

  // Press-and-hold for the on-screen pad.
  const hold = (key: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault()
      press(key)
    },
    onPointerUp: () => release(key),
    onPointerLeave: () => release(key),
    onPointerCancel: () => release(key),
  })

  return (
    <Card className="w-full p-4 md:p-6 shadow-lg">
      <div className="flex flex-col items-center space-y-4 md:space-y-6">
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            {mode === "run" ? "Sumplete Runner" : "Sumplete"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "run" ? (
              <>
                Roam the hopper with the arrow keys (walk anywhere, even off the board) and press{" "}
                <span className="font-semibold">Space</span> to jump: jump on a number to cross it out, jump again to
                restore it. Clear each row/column down to its target sum.
              </>
            ) : (
              <>
                Click a number to cross it out, click again to restore it. Clear each row/column down to its target sum.
              </>
            )}
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-gray-700 p-1">
          <Button
            variant={mode === "run" ? "default" : "ghost"}
            size="sm"
            onClick={() => changeMode("run")}
          >
            Runner
          </Button>
          <Button
            variant={mode === "click" ? "default" : "ghost"}
            size="sm"
            onClick={() => changeMode("click")}
          >
            Classic click
          </Button>
        </div>

        {challenge && (
          <div className="flex w-full items-center justify-center gap-4">
            <div className="rounded-md bg-gray-800 px-3 py-1.5 text-sm font-medium text-white">
              Level {gridSize}×{gridSize}{" "}
              <span className="text-muted-foreground">
                ({gridSize - 2}/{CHALLENGE_MAX - 2})
              </span>
            </div>
            <div
              className={`rounded-md px-3 py-1.5 font-mono text-lg font-bold tabular-nums ${
                timeLeft <= 10 ? "bg-red-600 text-white animate-pulse" : "bg-gray-800 text-emerald-400"
              }`}
            >
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
            </div>
            <Button variant="outline" size="sm" onClick={quitChallenge}>
              Quit
            </Button>
          </div>
        )}

        <div className="relative w-full h-[60vh] min-h-[380px] overflow-hidden rounded-xl border border-gray-700 bg-[#0a0a12]">
          <GameScene
            key={gridSize}
            size={gridSize}
            grid={gameState.grid}
            rowSums={gameState.rowSums}
            colSums={gameState.colSums}
            rowStatus={gameState.rowStatus}
            colStatus={gameState.colStatus}
            charRef={charRef}
            heldRef={heldRef}
            disabled={disabled}
            jumpKey={jumpKey}
            winCount={winCount}
            mode={mode}
            onTileClick={handleTileClick}
            characterId={characterId}
          />

          {challengeResult && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="text-center p-4">
                <div className="text-2xl md:text-3xl font-bold mb-2">
                  {challengeResult === "won" ? "🏆 Challenge complete!" : "⏰ Time's up!"}
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                  {challengeResult === "won"
                    ? "You cleared every level, 3×3 through 9×9."
                    : `You reached the ${gridSize}×${gridSize} level.`}
                </div>
                <div className="flex justify-center gap-2">
                  <Button onClick={startChallenge} size="lg">
                    Try again
                  </Button>
                  <Button onClick={quitChallenge} variant="outline" size="lg">
                    Exit
                  </Button>
                </div>
              </div>
            </div>
          )}

          {disabled && !challenge && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-sm">
              <div className="text-center p-4">
                <div className="text-xl md:text-2xl font-bold mb-3">
                  {gameState.gameWon ? "Puzzle Solved! Well done!" : "Solution revealed"}
                </div>
                <Button onClick={resetGame} size="lg">
                  Play Again
                </Button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={toggleMute}
            className="absolute right-3 top-3 z-20 rounded-md bg-black/40 p-2 text-white/80 backdrop-blur hover:text-white"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </button>
        </div>

        {/* On-screen controls (touch / no keyboard). Hold to walk. Runner mode only. */}
        {mode === "run" && (
        <div className="flex touch-none select-none items-center justify-center gap-6">
          <div className="grid grid-cols-3 gap-1.5">
            <span />
            <Button variant="outline" size="icon" className="h-14 w-14 touch-none" aria-label="Up" {...hold("ArrowUp")}>
              <ArrowUp className="h-6 w-6" />
            </Button>
            <span />
            <Button variant="outline" size="icon" className="h-14 w-14 touch-none" aria-label="Left" {...hold("ArrowLeft")}>
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <Button variant="outline" size="icon" className="h-14 w-14 touch-none" aria-label="Down" {...hold("ArrowDown")}>
              <ArrowDown className="h-6 w-6" />
            </Button>
            <Button variant="outline" size="icon" className="h-14 w-14 touch-none" aria-label="Right" {...hold("ArrowRight")}>
              <ArrowRight className="h-6 w-6" />
            </Button>
          </div>
          <Button
            className="h-20 w-20 touch-none rounded-full text-base"
            onPointerDown={(e) => {
              e.preventDefault()
              jump()
            }}
            disabled={disabled}
          >
            Jump
          </Button>
        </div>
        )}

        {!disabled && (
          <div className="flex flex-col gap-4 w-full">
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCheckMistakes}
                className={showMistakes ? "bg-red-100 dark:bg-red-900/20" : ""}
              >
                <AlertCircle className="mr-1 h-4 w-4" />
                Errors
              </Button>
              <Button variant="outline" size="sm" onClick={handleHint}>
                <Lightbulb className="mr-1 h-4 w-4" />
                Hint
              </Button>
              <Button variant="outline" size="sm" onClick={resetGame}>
                <RotateCcw className="mr-1 h-4 w-4" />
                Restart
              </Button>
              {!challenge && (
                <Button variant="outline" size="sm" onClick={handleReveal}>
                  <Eye className="mr-1 h-4 w-4" />
                  Reveal
                </Button>
              )}
              {showMistakes && (
                <Button variant="outline" size="sm" onClick={handleRemoveMistakes}>
                  Remove mistakes
                </Button>
              )}
            </div>

            {!challenge && (
            <div className="mt-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-center font-medium mb-3">New Game Options</h3>
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <Select value={gridSize.toString()} onValueChange={(value) => setGridSize(Number.parseInt(value))}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3x3 (beginner)</SelectItem>
                    <SelectItem value="4">4x4 (easy)</SelectItem>
                    <SelectItem value="5">5x5 (intermediate)</SelectItem>
                    <SelectItem value="6">6x6 (challenging)</SelectItem>
                    <SelectItem value="7">7x7 (advanced)</SelectItem>
                    <SelectItem value="8">8x8 (expert)</SelectItem>
                    <SelectItem value="9">9x9 (master)</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="allow-negative"
                    checked={allowNegative}
                    onCheckedChange={(checked) => setAllowNegative(checked === true)}
                  />
                  <label htmlFor="allow-negative" className="text-sm font-medium leading-none">
                    Negative numbers?
                  </label>
                </div>
              </div>

              <div className="flex justify-center gap-2 mt-4">
                <Button onClick={resetGame}>New Puzzle</Button>
                <Button variant="outline" onClick={shareGame}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </div>

              {mode === "run" && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-center font-medium mb-3">Character</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 justify-items-center">
                    {CHARACTERS.map((c) => {
                      const selected = c.id === characterId
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            unlockAudio()
                            setCharacterId(c.id)
                            play("click")
                          }}
                          aria-pressed={selected}
                          title={c.name}
                          className={`flex w-full flex-col items-center gap-1 rounded-lg border p-2 transition ${
                            selected
                              ? "border-cyan-400 ring-2 ring-cyan-400/60 bg-cyan-400/10"
                              : "border-gray-300 dark:border-gray-700 hover:border-gray-400"
                          }`}
                        >
                          {/* Mini boxy avatar: hat / face+eyes / shirt. */}
                          <div className="h-9 w-9 overflow-hidden rounded-md border border-black/20">
                            <div className="h-[35%] w-full" style={{ backgroundColor: c.cap }} />
                            <div className="relative h-[35%] w-full" style={{ backgroundColor: c.muzzle ?? c.skin }}>
                              <span
                                className="absolute left-[28%] top-[35%] h-[3px] w-[3px] rounded-full"
                                style={{ backgroundColor: c.eye ?? "#1a1014" }}
                              />
                              <span
                                className="absolute right-[28%] top-[35%] h-[3px] w-[3px] rounded-full"
                                style={{ backgroundColor: c.eye ?? "#1a1014" }}
                              />
                            </div>
                            <div className="h-[30%] w-full" style={{ backgroundColor: c.shirt }} />
                          </div>
                          <span className="text-[10px] leading-tight text-center text-muted-foreground">
                            {c.name}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-col items-center gap-1">
                <Button variant="secondary" onClick={startChallenge}>
                  <Timer className="mr-2 h-4 w-4" />
                  Challenge mode
                </Button>
                <p className="text-xs text-muted-foreground">
                  Clear 3×3 → 9×9 against the clock. Each level resets the timer: 1 min for 3×3, up to 7 min for 9×9.
                </p>
              </div>
            </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}
