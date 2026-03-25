// Game State
let currentLevelIndex = 0;
let bottlesState = [];
let selectedBottleIndex = null;
let isLevelComplete = false;
let currentLevelData = null;
let totalScore = 0;
let currentMoves = 0;

// Helper to calculate BFS for shortest path (minimum moves)
function solvePuzzle(capacities, startState, target) {
    const queue = [{ state: startState, path: [] }];
    const visited = new Set();
    visited.add(startState.join(','));

    while (queue.length > 0) {
        const { state, path } = queue.shift();

        // Check win condition
        if (state.includes(target)) {
            return path.length;
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
    return -1; // No solution
}

// Generate a random solvable level
function generateLevel(levelIndex) {
    if (levelIndex === 0) {
        // Level 1: Fixed specific example requested by user
        return {
            target: 1,
            bottles: [
                { capacity: 10, initial: 10 },
                { capacity: 5, initial: 0 },
                { capacity: 2, initial: 0 }
            ],
            minMoves: solvePuzzle([10, 5, 2], [10, 0, 0], 1)
        };
    }

    // Number of bottles: 3 base + 1 for every 10 levels
    const numBottles = 3 + Math.floor(levelIndex / 10);

    // We loop until we find a puzzle that is solvable and requires some minimum number of moves
    let attempts = 0;
    while (attempts < 1000) {
        attempts++;
        const capacities = [];

        // Randomly generate capacities
        // Make the first bottle the largest and full
        const maxCap = 10 + Math.floor(Math.random() * 20) + (levelIndex * 2);
        capacities.push(maxCap);

        for (let i = 1; i < numBottles; i++) {
            // Smaller random capacities
            let cap;
            do {
                cap = 2 + Math.floor(Math.random() * (maxCap - 3));
            } while (capacities.includes(cap)); // Ensure distinct capacities for variety
            capacities.push(cap);
        }

        // Initial state: first bottle full, rest empty
        const startState = capacities.map((cap, i) => i === 0 ? cap : 0);

        // Pick a random target between 1 and maxCap - 1
        const target = 1 + Math.floor(Math.random() * (maxCap - 2));

        const minMoves = solvePuzzle(capacities, startState, target);

        // Ensure the puzzle is solvable and requires at least 2 moves
        if (minMoves >= 2) {
            return {
                target: target,
                bottles: capacities.map((cap, i) => ({
                    capacity: cap,
                    initial: startState[i]
                })),
                minMoves: minMoves
            };
        }
    }

    // Fallback if we fail to generate a puzzle (extremely unlikely)
    console.error("Failed to generate a level, falling back to basic puzzle");
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
const nextBtn = document.getElementById('next-level-btn');
const messageArea = document.getElementById('message-area');
const totalScoreEl = document.getElementById('total-score');
const currentMovesEl = document.getElementById('current-moves');
const minMovesEl = document.getElementById('min-moves');

// Constants for Visual Scaling
// Let's say max capacity across all levels defines max height (e.g., 300px)
const MAX_BOTTLE_HEIGHT = 250;
const BASE_HEIGHT_PER_UNIT = 20;

// Initialize the game
function initGame() {
    loadLevel(currentLevelIndex);

    restartBtn.addEventListener('click', () => {
        // Only allow restart if level is not complete to prevent score farming
        if(isLevelComplete) return;
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
    showMessage('');

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
    if (isLevelComplete) return;

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