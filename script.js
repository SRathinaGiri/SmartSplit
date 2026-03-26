// Game State
let currentLevelIndex = 0;
let bottlesState = [];
let selectedBottleIndex = null;
let isLevelComplete = false;
let currentLevelData = null;
let totalScore = parseInt(localStorage.getItem('liquidSplitScore')) || 0;
let currentMoves = 0;
let isAnimatingSolution = false;
let deferredPrompt;

// Helper to calculate BFS for shortest path and return the exact path
function solvePuzzlePath(capacities, startState, target) {
    const queue = [{ state: startState, path: [] }];
    const visited = new Set();
    visited.add(startState.join(','));

    while (queue.length > 0) {
        const { state, path } = queue.shift();

        // Check win condition
        if (state.includes(target)) {
            return path;
        }

        // Generate next states
        for (let i = 0; i < state.length; i++) {
            for (let j = 0; j < state.length; j++) {
                if (i !== j && state[i] > 0 && state[j] < capacities[j]) {
                    const amount = Math.min(state[i], capacities[j] - state[j]);
                    const nextState = [...state];
                    nextState[i] -= amount;
                    nextState[j] += amount;

                    const stateStr = nextState.join(',');
                    if (!visited.has(stateStr)) {
                        visited.add(stateStr);
                        queue.push({ state: nextState, path: [...path, { from: i, to: j }] });
                    }
                }
            }
        }
    }
    return null; // No solution
}

// Generate a random solvable level with an exact minimum number of moves
function generateLevel(levelIndex) {
    // Required minimum moves scales linearly with level: Level 1 -> 3 moves, Level 2 -> 4 moves, etc.
    const desiredMoves = levelIndex + 3;

    // Number of bottles: 3 base + 1 for every 10 levels
    const numBottles = 3 + Math.floor(levelIndex / 10);

    // Loop until we find a puzzle that exactly matches the desired moves
    let attempts = 0;
    while (attempts < 2000) {
        attempts++;
        const capacities = [];

        // Make the first bottle the largest and full
        const maxCap = 10 + Math.floor(Math.random() * 20) + (levelIndex * 2);
        capacities.push(maxCap);

        for (let i = 1; i < numBottles; i++) {
            // Smaller random capacities
            let cap;
            let innerAttempts = 0;
            do {
                cap = 2 + Math.floor(Math.random() * (maxCap - 3));
                innerAttempts++;
            } while (capacities.includes(cap) && innerAttempts < 100);
            // Ensure distinct capacities for variety
            capacities.push(cap);
        }

        // Initial state: first bottle full, rest empty
        const startState = capacities.map((cap, i) => i === 0 ? cap : 0);

        // Do a full BFS from start state to find all possible reachable states and their shortest path lengths
        const queue = [{ state: startState, depth: 0 }];
        const visited = new Map(); // Map stateStr -> depth
        visited.set(startState.join(','), 0);

        let foundTargets = [];

        while (queue.length > 0) {
            const { state, depth } = queue.shift();

            // Collect any valid targets reached exactly at the desired depth
            if (depth === desiredMoves) {
                // Any non-zero amount in any bottle could be a target
                for(let amount of state) {
                    if (amount > 0 && amount < maxCap && !foundTargets.includes(amount)) {
                         foundTargets.push(amount);
                    }
                }
                continue; // No need to explore deeper from this node if we only care about exact depth
            }

            // We shouldn't explore past desired depth
            if (depth > desiredMoves) continue;

            // Generate next states
            for (let i = 0; i < state.length; i++) {
                for (let j = 0; j < state.length; j++) {
                    if (i !== j && state[i] > 0 && state[j] < capacities[j]) {
                        const amount = Math.min(state[i], capacities[j] - state[j]);
                        const nextState = [...state];
                        nextState[i] -= amount;
                        nextState[j] += amount;

                        const stateStr = nextState.join(',');
                        // Only add if we haven't seen it, OR we found a shorter/equal path
                        // Because BFS guarantees shortest path to first seen, we just check if it's completely unvisited
                        if (!visited.has(stateStr)) {
                            visited.set(stateStr, depth + 1);
                            queue.push({ state: nextState, depth: depth + 1 });
                        }
                    }
                }
            }
        }

        // If we found states exactly at `desiredMoves` distance
        if (foundTargets.length > 0) {
            // Pick a random target from the valid ones
            const target = foundTargets[Math.floor(Math.random() * foundTargets.length)];

            // Double check it truly requires `desiredMoves` and there wasn't a shorter path to that SPECIFIC target amount
            // Because our BFS above tracks exact exact state arrays, a target integer might appear in a DIFFERENT state at a shorter depth!
            const verifyPath = solvePuzzlePath(capacities, startState, target);
            if (verifyPath && verifyPath.length === desiredMoves) {
                return {
                    target: target,
                    bottles: capacities.map((cap, i) => ({
                        capacity: cap,
                        initial: startState[i]
                    })),
                    minMoves: desiredMoves
                };
            }
        }
    }

    // Fallback if we fail to generate a puzzle matching exactly desiredMoves
    console.error("Failed to generate a level exactly matching requested moves, increasing difficulty slowly");

    // At least ensure it's not totally broken
    return {
        target: 4,
        bottles: [
            { capacity: 8, initial: 8 },
            { capacity: 5, initial: 0 },
            { capacity: 3, initial: 0 }
        ],
        minMoves: 7
    };
}

// DOM Elements
const levelNumberEl = document.getElementById('level-number');
const targetAmountEl = document.getElementById('target-amount');
const bottlesContainer = document.getElementById('bottles-container');
const restartBtn = document.getElementById('restart-level-btn');
const showSolutionBtn = document.getElementById('show-solution-btn');
const nextBtn = document.getElementById('next-level-btn');
const messageArea = document.getElementById('message-area');
const totalScoreEl = document.getElementById('total-score');
const currentMovesEl = document.getElementById('current-moves');
const minMovesEl = document.getElementById('min-moves');
const installBtn = document.getElementById('install-btn');
const solutionContainer = document.getElementById('solution-container');
const solutionTbody = document.getElementById('solution-tbody');
const continueBtn = document.getElementById('continue-btn');

// Constants for Visual Scaling
// Let's say max capacity across all levels defines max height (e.g., 300px)
const MAX_BOTTLE_HEIGHT = 250;
const BASE_HEIGHT_PER_UNIT = 20;

// Initialize the game
function initGame() {
    // Load from local storage
    const savedLevel = localStorage.getItem('liquidSplitLevel');
    if (savedLevel !== null) {
        currentLevelIndex = parseInt(savedLevel);
    }

    loadLevel(currentLevelIndex);

    // PWA Install Prompt Logic
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent the mini-infobar from appearing on mobile
        e.preventDefault();
        deferredPrompt = e;
        installBtn.style.display = 'block';
    });

    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                installBtn.style.display = 'none';
            }
            deferredPrompt = null;
        }
    });

    restartBtn.addEventListener('click', () => {
        // Only allow restart if level is not complete to prevent score farming, and not animating
        if(isLevelComplete || isAnimatingSolution) return;
        // Reset the current level back to its initial state without regenerating a new puzzle
        bottlesState = currentLevelData.bottles.map(b => ({ ...b, current: b.initial }));
        selectedBottleIndex = null;
        isLevelComplete = false;
        currentMoves = 0;

        currentMovesEl.textContent = currentMoves;
        nextBtn.style.display = 'none';
        showMessage('');
        renderBottles();
    });

    nextBtn.addEventListener('click', () => {
        currentLevelIndex++;
        loadLevel(currentLevelIndex);
    });

    showSolutionBtn.addEventListener('click', () => {
        if (isLevelComplete || isAnimatingSolution) return;

        const confirmShow = confirm("Showing the solution will reset your progress and return you to Level 1 (or Level 10 if you are past it). Are you sure?");
        if (!confirmShow) return;

        showSolution();
    });

    continueBtn.addEventListener('click', () => {
        solutionContainer.style.display = 'none';
        isAnimatingSolution = false;

        // Fallback logic
        if (currentLevelIndex >= 9) { // 0-indexed, so 9 is Level 10
            currentLevelIndex = 9;
        } else {
            currentLevelIndex = 0;
        }
        totalScore = 0; // Reset score
        localStorage.setItem('liquidSplitScore', totalScore);
        loadLevel(currentLevelIndex);
    });
}

function showSolution() {
    isAnimatingSolution = true;

    // Calculate solution path from CURRENT state
    const capacities = currentLevelData.bottles.map(b => b.capacity);
    const startState = bottlesState.map(b => b.current);
    const target = currentLevelData.target;

    const path = solvePuzzlePath(capacities, startState, target);

    if (!path) {
        showMessage("No solution found from current state!", "error-message");
        isAnimatingSolution = false;
        return;
    }

    let delay = 0;

    // Clear selections
    selectedBottleIndex = null;
    renderBottles();

    solutionTbody.innerHTML = '';
    solutionContainer.style.display = 'block';

    // Replay path
    path.forEach((move, index) => {
        setTimeout(() => {
            // Log action to table BEFORE pour
            const actionText = `Pour Bottle ${move.from + 1} (${capacities[move.from]}L) -> Bottle ${move.to + 1} (${capacities[move.to]}L)`;

            // Select source
            selectedBottleIndex = move.from;
            renderBottles();

            setTimeout(() => {
                // Execute pour to dest
                pourLiquid(move.from, move.to);
                selectedBottleIndex = null;
                renderBottles();

                // Add row to table
                const tr = document.createElement('tr');
                const stateStr = bottlesState.map(b => `${b.current}L`).join(', ');
                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${actionText}</td>
                    <td>[${stateStr}]</td>
                `;
                solutionTbody.appendChild(tr);

                // If it's the last move
                if (index === path.length - 1) {
                    showMessage("Solution Complete. Click Continue to reset.", "success-message");
                    // Wait for user to click continueBtn
                }
            }, 1000); // Wait 1s before second click (slowed down)

        }, delay);

        delay += 2500; // 2500ms per full move animation (slowed down)
    });
}

// Load a specific level
function loadLevel(index) {
    currentLevelData = generateLevel(index);
    levelNumberEl.textContent = index + 1;
    targetAmountEl.textContent = currentLevelData.target;

    // Deep copy initial state
    bottlesState = currentLevelData.bottles.map(b => ({ ...b, current: b.initial }));

    selectedBottleIndex = null;
    isLevelComplete = false;
    currentMoves = 0;

    // Update UI
    currentMovesEl.textContent = currentMoves;
    minMovesEl.textContent = currentLevelData.minMoves;
    totalScoreEl.textContent = totalScore;
    nextBtn.style.display = 'none';
    solutionContainer.style.display = 'none';
    showMessage('');

    // Save to local storage
    localStorage.setItem('liquidSplitLevel', index);
    localStorage.setItem('liquidSplitScore', totalScore);

    renderBottles();
}

// Render the bottles UI based on state
function renderBottles() {
    bottlesContainer.innerHTML = ''; // Clear existing

    // Find max capacity in current level for relative sizing if desired,
    // but using a fixed multiplier is easier for consistency

    bottlesState.forEach((bottle, index) => {
        const wrapperEl = document.createElement('div');
        wrapperEl.classList.add('bottle-wrapper');
        if (selectedBottleIndex === index) {
            wrapperEl.classList.add('selected');
        }

        const bottleEl = document.createElement('div');
        bottleEl.classList.add('bottle');

        // Calculate height based on capacity, but cap it so it doesn't grow indefinitely on high levels
        const bottleHeight = Math.min(bottle.capacity * BASE_HEIGHT_PER_UNIT, MAX_BOTTLE_HEIGHT);
        bottleEl.style.height = `${bottleHeight}px`;
        // Width can also scale slightly if we want, but fixed base width is fine for now
        // let's scale width slightly based on capacity
        const bottleWidth = 60 + (bottle.capacity * 2);
        bottleEl.style.width = `${bottleWidth}px`;


        // Liquid element
        const liquidEl = document.createElement('div');
        liquidEl.classList.add('liquid');

        // Calculate fill percentage
        const fillPercentage = (bottle.current / bottle.capacity) * 100;
        liquidEl.style.height = `${fillPercentage}%`;

        // Scale marks
        const scaleContainer = document.createElement('div');
        scaleContainer.classList.add('scale-marks');

        // Create a mark for each unit of capacity
        for (let i = 0; i < bottle.capacity; i++) {
            const mark = document.createElement('div');
            mark.classList.add('scale-mark');
            // Distribute evenly
            mark.style.height = `${100 / bottle.capacity}%`;
            // Add a border bottom to act as the line, except for the last one
            if(i !== bottle.capacity - 1) {
               mark.style.borderTop = "1px solid rgba(255,255,255,0.4)";
            }
            scaleContainer.appendChild(mark);
        }

        // Label
        const labelEl = document.createElement('div');
        labelEl.classList.add('bottle-label');
        labelEl.textContent = `${bottle.current}L / ${bottle.capacity}L`;

        // Assemble
        bottleEl.appendChild(scaleContainer);
        bottleEl.appendChild(liquidEl);

        wrapperEl.appendChild(bottleEl);
        wrapperEl.appendChild(labelEl);

        // Click interaction
        wrapperEl.addEventListener('click', () => handleBottleClick(index));

        bottlesContainer.appendChild(wrapperEl);
    });
}

// Handle clicking on a bottle
function handleBottleClick(index) {
    if (isLevelComplete || isAnimatingSolution) return;

    if (selectedBottleIndex === null) {
        // First click: Select source bottle
        // Only select if it has liquid
        if (bottlesState[index].current > 0) {
            selectedBottleIndex = index;
            renderBottles(); // Update UI to show selection
        } else {
            showMessage("Cannot pour from an empty bottle.", "error-message");
            setTimeout(() => showMessage(''), 1500);
        }
    } else {
        // Second click: Select destination bottle
        if (selectedBottleIndex === index) {
            // Deselect if clicking the same bottle
            selectedBottleIndex = null;
            renderBottles();
        } else {
            // Attempt pour
            pourLiquid(selectedBottleIndex, index);
            selectedBottleIndex = null; // Reset selection
            renderBottles();
            checkWinCondition();
        }
    }
}

// Logic to pour liquid between two bottles
function pourLiquid(sourceIdx, destIdx) {
    const source = bottlesState[sourceIdx];
    const dest = bottlesState[destIdx];

    // Amount available to pour
    const amountAvailable = source.current;

    // Space available in destination
    const spaceAvailable = dest.capacity - dest.current;

    if (amountAvailable === 0) return; // shouldn't happen due to previous check
    if (spaceAvailable === 0) {
        showMessage("Destination bottle is full.", "error-message");
        setTimeout(() => showMessage(''), 1500);
        return;
    }

    // The amount transferred is the minimum of what we have and what fits
    const amountToTransfer = Math.min(amountAvailable, spaceAvailable);

    source.current -= amountToTransfer;
    dest.current += amountToTransfer;

    // Increment moves
    currentMoves++;
    currentMovesEl.textContent = currentMoves;

    showMessage(''); // Clear messages
}

// Check if the current level's target has been reached
function checkWinCondition() {
    const target = currentLevelData.target;

    // Check if any bottle contains exactly the target amount
    const won = bottlesState.some(bottle => bottle.current === target);

    if (won) {
        isLevelComplete = true;

        // Calculate bonus
        const extraMoves = Math.max(0, currentMoves - currentLevelData.minMoves);
        let bonus = 1000 - (extraMoves * 100);
        if (bonus < 0) bonus = 0;

        totalScore += bonus;
        totalScoreEl.textContent = totalScore;
        localStorage.setItem('liquidSplitScore', totalScore);

        showMessage(`Level ${currentLevelIndex + 1} Cleared! Bonus: ${bonus}`, "success-message");
        nextBtn.style.display = 'inline-block';
    }
}

// Helper to show messages to user
function showMessage(text, className = '') {
    messageArea.textContent = text;
    messageArea.className = ''; // Reset classes
    if (className) {
        messageArea.classList.add(className);
    }
}

// Start the game when script loads
document.addEventListener('DOMContentLoaded', initGame);