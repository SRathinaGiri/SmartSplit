# Liquid Split Puzzle

![Gameplay Screenshot](/icon512.png)

An interactive, responsive HTML5 puzzle game where you split liquid between bottles to reach a specific target volume.

## Features

- **Infinite Procedural Levels**: The game generates levels infinitely using a Breadth-First Search (BFS) algorithm to guarantee a solvable path, scaling in difficulty (moves required).
- **Difficulty Curve**: Level 1 requires 3 minimum moves, Level 2 requires 4 moves, etc. A new bottle is added for every 10 levels you complete.
- **Dynamic Scoring**: Finishing a level within the minimum amount of moves awards a perfect +1000 points. Every extra move deducts 100 points.
- **Save State**: The game utilizes your browser's Local Storage to save your current level and score, allowing you to pick back up right where you left off.
- **Show Solution**: Get stuck? Click the "Show Solution" button. The game will automatically demonstrate the shortest path to solving your current state, while generating an easy-to-read table showing each step. **Warning**: Doing this will reset your score to 0 and push you back to Level 1 (or Level 10 if you were past it).
- **Progressive Web App (PWA)**: This game is a PWA. On supported browsers (Chrome, Edge, etc.), an "Install App" button will appear allowing you to install the game directly to your device and play it fully offline.

## How to Play

1. Look at the `Target` instruction in red at the top of the screen (e.g. "Target: Get 1L in any bottle").
2. Click a bottle containing liquid to select it.
3. Click a second bottle to pour the liquid from the first bottle into the second. The liquid will pour until the source is empty or the destination is full.
4. Try to reach the target amount in as few moves as possible!

## Running the game locally

Because the game is built entirely in vanilla HTML/CSS/JS, no build step is required!
You can simply start a static HTTP server in the directory.

```bash
python3 -m http.server 8000
```
Then navigate to `http://localhost:8000` in your web browser.