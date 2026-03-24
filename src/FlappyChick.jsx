import { useState, useEffect, useRef, useCallback } from "react";

// ╔══════════════════════════════════════════════════════════════╗
// ║                  PERSONALISE HERE  ✏️                        ║
// ╠══════════════════════════════════════════════════════════════╣
// ║  Put your images in the /public folder, then set the path.  ║\
// ║  e.g.  "/vina.jpeg"  or  "/pipe.png"                        ║
// ║  Set to null to use the emoji / default gradient instead.   ║
// ╚══════════════════════════════════════════════════════════════╝

const BIRD_IMAGE_SRC = "./vina.jpg";   // ← character image  (null = use emoji below)
const BIRD_EMOJI     = "🐥";            // ← fallback emoji if no image

const PIPE_IMAGE_SRC = "./pil.jpeg";            // ← pillar image     (null = pastel gradient)
// Example: const PIPE_IMAGE_SRC = "/pipe.png";

const PRIZE_NAME = "Vinani";           // shown in the win popupgit init
const WIN_SCORE  = 5;                  // score needed to win

// ── Physics & Speed ─────────────────────────────────────────────
const GRAVITY       = 0.3;
const JUMP          = -10;
const PIPE_SPEED    = 3.2;
const PIPE_WIDTH    = 64;
const PIPE_GAP      = 160;
const PIPE_INTERVAL = 90;

// ── Internal constants ───────────────────────────────────────────
const BIRD_SIZE = 40;
const BIRD_X    = 90;

// ── Helpers ──────────────────────────────────────────────────────
function randomGapY(height) {
  const min = 80;
  const max = height - PIPE_GAP - 80;
  return Math.floor(Math.random() * (max - min) + min);
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh, pad = 6) {
  return (
    ax + pad < bx + bw &&
    ax + aw - pad > bx &&
    ay + pad < by + bh &&
    ay + ah - pad > by
  );
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

// ════════════════════════════════════════════════════════════════
export default function FlappyChick() {
  const canvasH = 520;
  const canvasW = 380;

  const [phase, setPhase]           = useState("idle");
  const [score, setScore]           = useState(0);
  const [best,  setBest]            = useState(0);
  const [imagesReady, setImagesReady] = useState(false);

  const birdY      = useRef(canvasH / 2);
  const velY       = useRef(0);
  const pipes      = useRef([]);
  const frameCount = useRef(0);
  const animId     = useRef(null);
  const phaseRef   = useRef("idle");
  const scoreRef   = useRef(0);
  const canvasRef  = useRef(null);

  // Pre-loaded image objects — created ONCE, drawn every frame
  const birdImgRef = useRef(null);
  const pipeImgRef = useRef(null);

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Pre-load images on mount ──────────────────────────────────
  useEffect(() => {
    const loads = [];
    if (BIRD_IMAGE_SRC) {
      loads.push(
        loadImage(BIRD_IMAGE_SRC)
          .then(img => { birdImgRef.current = img; })
          .catch(err => console.warn(err.message))
      );
    }
    if (PIPE_IMAGE_SRC) {
      loads.push(
        loadImage(PIPE_IMAGE_SRC)
          .then(img => { pipeImgRef.current = img; })
          .catch(err => console.warn(err.message))
      );
    }
    Promise.all(loads).finally(() => setImagesReady(true));
  }, []);

  // ── Jump ──────────────────────────────────────────────────────
  const jump = useCallback(() => {
    if (phaseRef.current === "idle") {
      phaseRef.current = "playing";
      setPhase("playing");
      velY.current = JUMP;
      return;
    }
    if (phaseRef.current === "playing") velY.current = JUMP;
  }, []);

  // ── Restart ───────────────────────────────────────────────────
  const restart = useCallback(() => {
    birdY.current      = canvasH / 2;
    velY.current       = 0;
    pipes.current      = [];
    frameCount.current = 0;
    scoreRef.current   = 0;
    setScore(0);
    phaseRef.current   = "idle";
    setPhase("idle");
  }, [canvasH]);

  // ── Keyboard ──────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (phaseRef.current === "dead" || phaseRef.current === "won") restart();
        else jump();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jump, restart]);

  const handleClick = useCallback(() => {
    if (phaseRef.current === "dead" || phaseRef.current === "won") restart();
    else jump();
  }, [jump, restart]);

  // ── Game loop ─────────────────────────────────────────────────
  useEffect(() => {
    if (!imagesReady) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Draw a single pipe segment (top or bottom)
    const drawPipeSegment = (x, y, w, h, isTop) => {
      if (pipeImgRef.current) {
        // Use custom pipe image — flip vertically for top pipe
        ctx.save();
        if (isTop) {
          ctx.translate(x + w / 2, y + h / 2);
          ctx.scale(1, -1);
          ctx.drawImage(pipeImgRef.current, -w / 2, -h / 2, w, h);
        } else {
          ctx.drawImage(pipeImgRef.current, x, y, w, h);
        }
        ctx.restore();
      } else {
        // Default pastel gradient pipe
        const grad = ctx.createLinearGradient(x, 0, x + w, 0);
        grad.addColorStop(0,   "#ce93d8");
        grad.addColorStop(0.4, "#e1bee7");
        grad.addColorStop(1,   "#ab47bc");
        ctx.fillStyle = grad;

        if (isTop) {
          // body (no top rounded corners — goes off screen)
          ctx.beginPath();
          ctx.roundRect(x + 4, 0, w - 8, h - 14, [0, 0, 4, 4]);
          ctx.fill();
          // cap at bottom of top pipe
          ctx.fillStyle = "#ba68c8";
          ctx.beginPath();
          ctx.roundRect(x, h - 18, w, 18, [6, 6, 0, 0]);
          ctx.fill();
          // highlight on cap
          ctx.fillStyle = "rgba(255,255,255,0.25)";
          ctx.beginPath();
          ctx.roundRect(x + 6, h - 16, 10, 14, 3);
          ctx.fill();
        } else {
          // cap at top of bottom pipe
          ctx.fillStyle = "#ba68c8";
          ctx.beginPath();
          ctx.roundRect(x, y, w, 18, [0, 0, 6, 6]);
          ctx.fill();
          // highlight
          ctx.fillStyle = "rgba(255,255,255,0.25)";
          ctx.beginPath();
          ctx.roundRect(x + 6, y + 2, 10, 14, 3);
          ctx.fill();
          // body
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x + 4, y + 14, w - 8, h - 14, [4, 4, 0, 0]);
          ctx.fill();
        }
      }
    };

    const tick = () => {
      const ph = phaseRef.current;

      if (ph === "playing") {
        velY.current += GRAVITY;
        birdY.current += velY.current;
        frameCount.current++;

        if (frameCount.current % PIPE_INTERVAL === 0) {
          pipes.current.push({ x: canvasW, gapY: randomGapY(canvasH), scored: false });
        }

        pipes.current = pipes.current.filter((p) => {
          p.x -= PIPE_SPEED;

          if (!p.scored && p.x + PIPE_WIDTH < BIRD_X) {
            p.scored = true;
            scoreRef.current++;
            setScore(scoreRef.current);
            if (scoreRef.current >= WIN_SCORE) {
              phaseRef.current = "won";
              setPhase("won");
              setBest((b) => Math.max(b, scoreRef.current));
            }
          }

          const topH = p.gapY;
          const botY = p.gapY + PIPE_GAP;
          const botH = canvasH - botY;

          const hit =
            rectsOverlap(BIRD_X - BIRD_SIZE/2, birdY.current - BIRD_SIZE/2, BIRD_SIZE, BIRD_SIZE, p.x, 0,    PIPE_WIDTH, topH) ||
            rectsOverlap(BIRD_X - BIRD_SIZE/2, birdY.current - BIRD_SIZE/2, BIRD_SIZE, BIRD_SIZE, p.x, botY, PIPE_WIDTH, botH);

          if (hit) {
            phaseRef.current = "dead";
            setPhase("dead");
            setBest((b) => Math.max(b, scoreRef.current));
          }
          return p.x + PIPE_WIDTH > 0;
        });

        if (birdY.current + BIRD_SIZE/2 > canvasH || birdY.current - BIRD_SIZE/2 < 0) {
          phaseRef.current = "dead";
          setPhase("dead");
          setBest((b) => Math.max(b, scoreRef.current));
        }
      }

      // ── DRAW ────────────────────────────────────────────────

      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, 0, canvasH);
      bg.addColorStop(0, "#fce4ec");
      bg.addColorStop(1, "#f8bbd0");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Clouds
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      [[60,80,50,28],[180,55,70,22],[290,100,55,18],[330,60,40,14]].forEach(([cx,cy,rx,ry]) => {
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // Ground
      ctx.fillStyle = "#f48fb1"; ctx.fillRect(0, canvasH - 24, canvasW, 24);
      ctx.fillStyle = "#f06292"; ctx.fillRect(0, canvasH - 24, canvasW, 5);

      // Pipes
      pipes.current.forEach((p) => {
        const topH = p.gapY;
        const botY = p.gapY + PIPE_GAP;
        const botH = canvasH - botY - 24;
        drawPipeSegment(p.x, 0,    PIPE_WIDTH, topH, true);  // top pipe
        drawPipeSegment(p.x, botY, PIPE_WIDTH, botH, false); // bottom pipe
      });

      // Bird — circular clip for image, emoji text otherwise
      const tilt = ph === "playing" ? Math.min(Math.max(velY.current * 3, -30), 70) : 0;
      ctx.save();
      ctx.translate(BIRD_X, birdY.current);
      ctx.rotate((tilt * Math.PI) / 180);

      if (birdImgRef.current) {
        const r = BIRD_SIZE / 2;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(birdImgRef.current, -r, -r, BIRD_SIZE, BIRD_SIZE);
      } else {
        ctx.font = `${BIRD_SIZE}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(BIRD_EMOJI, 0, 0);
      }

      ctx.restore();

      animId.current = requestAnimationFrame(tick);
    };

    animId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId.current);
  }, [imagesReady]);

  // ── UI ───────────────────────────────────────────────────────
  return (
    <div
      style={{ fontFamily: "'Segoe UI', sans-serif", userSelect: "none" }}
      className="flex flex-col items-center justify-center min-h-screen bg-pink-50"
    >
      <div className="mb-3 text-center">
        <h1 className="text-3xl font-bold text-pink-500 tracking-wide drop-shadow">
          🌸 Flappy Vina 🌸
        </h1>
        <p className="text-sm text-pink-400 mt-0.5">Score {WIN_SCORE} to win a special prize!</p>
      </div>

      <div className="flex gap-8 mb-2 text-pink-600 font-semibold text-sm">
        <span>Score: <span className="text-pink-700 font-bold text-lg">{score}</span></span>
        <span>Best:  <span className="text-pink-700 font-bold text-lg">{best}</span></span>
      </div>

      <div
        className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-pink-300 cursor-pointer"
        style={{ width: 380, height: 520 }}
        onClick={handleClick}
      >
        <canvas ref={canvasRef} width={380} height={520} />

        {/* Loading */}
        {!imagesReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-pink-100/80">
            <p className="text-pink-400 font-semibold animate-pulse">Loading... 🌸</p>
          </div>
        )}

        {/* IDLE */}
        {imagesReady && phase === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-pink-100/70 backdrop-blur-sm">
            <div className="text-7xl mb-4 animate-bounce">🌸</div>
            <div className="bg-white/90 rounded-2xl px-8 py-5 shadow-lg text-center border border-pink-200">
              <p className="text-2xl font-bold text-pink-500 mb-1">Tap to Start!</p>
              <p className="text-pink-400 text-sm">Space / Click / Tap to flap</p>
              <p className="text-pink-300 text-xs mt-2">
                Reach <strong>{WIN_SCORE} points</strong> to win 🏆
              </p>
            </div>
          </div>
        )}

        {/* DEAD */}
        {phase === "dead" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-100/80 backdrop-blur-sm">
            <div className="bg-white/95 rounded-2xl px-8 py-6 shadow-xl text-center border border-rose-200">
              <div className="text-5xl mb-2">💔</div>
              <p className="text-2xl font-bold text-rose-500 mb-1">Oops!</p>
              <p className="text-rose-400 text-sm mb-1">Score: <strong>{score}</strong></p>
              <p className="text-rose-300 text-xs mb-4">So close! Try again 💪</p>
              <button
                className="bg-pink-400 hover:bg-pink-500 text-white font-bold py-2 px-6 rounded-full shadow transition-all active:scale-95"
                onClick={(e) => { e.stopPropagation(); restart(); }}
              >
                Try Again 🌸
              </button>
            </div>
          </div>
        )}

        {/* WIN */}
        {phase === "won" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-yellow-50/80 backdrop-blur-sm">
            <div
              className="bg-white rounded-3xl px-8 py-7 shadow-2xl text-center border-2 border-yellow-300 mx-4"
              style={{ animation: "pop 0.4s cubic-bezier(0.36,0.07,0.19,0.97)" }}
            >
              <div className="text-6xl mb-2">🏆</div>
              <p className="text-3xl font-extrabold text-yellow-500 mb-1">YOU WON!</p>
              <div className="w-16 h-1 bg-pink-300 rounded mx-auto mb-3" />
              <p className="text-pink-600 font-semibold text-base leading-snug mb-1">
                Claim your special prize
              </p>
              <p className="text-pink-500 font-bold text-lg mb-4">
                from {PRIZE_NAME} now! 🎁
              </p>
              <div className="flex gap-2 justify-center flex-wrap">
                {["🎉","✨","💖","🌸","🎊"].map((e, i) => (
                  <span key={i} className="text-2xl">{e}</span>
                ))}
              </div>
              <button
                className="mt-4 bg-gradient-to-r from-pink-400 to-purple-400 hover:from-pink-500 hover:to-purple-500 text-white font-bold py-2 px-7 rounded-full shadow-lg transition-all active:scale-95"
                onClick={(e) => { e.stopPropagation(); restart(); }}
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 text-pink-300 text-xs">Space · Click · Tap — all work ✨</p>

      <style>{`
        @keyframes pop {
          0%   { transform: scale(0.5); opacity: 0; }
          70%  { transform: scale(1.08); }
          100% { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}
