# 🐥 Flappy Chick

A personalised Flappy Bird-style gift game.

---

## ▶️ How to Run (first time)

Make sure you have **Node.js** installed (https://nodejs.org — get the LTS version).

Then open a terminal in this folder and run:

```bash
npm install
npm run dev
```

Your browser will open automatically at **http://localhost:5173** 🎉

---

## 🔁 Every time after that

Just run:

```bash
npm run dev
```

---

## ✏️ Personalise the game

Open `src/FlappyChick.jsx` and edit the top 3 lines:

```js
const CHARACTER  = "🐥";           // change emoji, or path to an image
const PRIZE_NAME = "[Your Name]";  // your name shown in the win popup
const WIN_SCORE  = 10;             // score needed to trigger the win screen
```

---

## 📦 Build for production (optional)

```bash
npm run build
```

This creates a `dist/` folder you can host anywhere (GitHub Pages, Netlify, etc.)

---

## Controls

| Action | Control |
|--------|---------|
| Flap   | Space / Mouse Click / Tap |
| Restart| Space / Click after dying |
# Weird_flappy_something
