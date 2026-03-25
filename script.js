// Game Levels Definition
const levels = [
    {
        // Level 1: The example from the prompt
        // 10L bottle (starts full), 5L (empty), 2L (empty). Target: 1L in any bottle
        target: 1,
        bottles: [
            { capacity: 10, initial: 10 },
            { capacity: 5, initial: 0 },
            { capacity: 2, initial: 0 }
        ]
    },
    {
        // Level 2: Classic Die Hard 3 puzzle
        // 5L (empty), 3L (empty), but wait we need a source.
        // Let's modify: 8L source (full), 5L (empty), 3L (empty). Target: 4L
        target: 4,
        bottles: [
            { capacity: 8, initial: 8 },
            { capacity: 5, initial: 0 },
            { capacity: 3, initial: 0 }
        ]
    },
    {
        // Level 3: Harder
        target: 6,
        bottles: [
            { capacity: 12, initial: 12 },
            { capacity: 8, initial: 0 },
            { capacity: 5, initial: 0 }
        ]
    }
];

// Game State
let currentLevelIndex = 0;
let bottlesState = [];
let selectedBottleIndex = null;
let isLevelComplete = false;

// DOM Elements
const levelNumberEl = document.getElementById('level-number');
const targetAmountEl = document.getElementById('target-amount');
const bottlesContainer = document.getElementById('bottles-container');
const restartBtn = document.getElementById('restart-level-btn');
const nextBtn = document.getElementById('next-level-btn');
const messageArea = document.getElementById('message-area');

// Constants for Visual Scaling
// Let's say max capacity across all levels defines max height (e.g., 300px)
const MAX_BOTTLE_HEIGHT = 250;
const BASE_HEIGHT_PER_UNIT = 20;

// Initialize the game
function initGame() {
    loadLevel(currentLevelIndex);

    restartBtn.addEventListener('click', () => {
        loadLevel(currentLevelIndex);
        showMessage('');
    });

    nextBtn.addEventListener('click', () => {
        if (currentLevelIndex < levels.length - 1) {
            currentLevelIndex++;
            loadLevel(currentLevelIndex);
        } else {
            showMessage("Congratulations! You completed all levels!", "success-message");
            nextBtn.style.display = 'none';
        }
    });
}

// Load a specific level
function loadLevel(index) {
    const levelData = levels[index];
    levelNumberEl.textContent = index + 1;
    targetAmountEl.textContent = levelData.target;

    // Deep copy initial state
    bottlesState = levelData.bottles.map(b => ({ ...b, current: b.initial }));

    selectedBottleIndex = null;
    isLevelComplete = false;
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

        // Calculate height based on capacity
        const bottleHeight = bottle.capacity * BASE_HEIGHT_PER_UNIT;
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

    showMessage(''); // Clear messages
}

// Check if the current level's target has been reached
function checkWinCondition() {
    const target = levels[currentLevelIndex].target;

    // Check if any bottle contains exactly the target amount
    const won = bottlesState.some(bottle => bottle.current === target);

    if (won) {
        isLevelComplete = true;
        showMessage(`Level ${currentLevelIndex + 1} Cleared!`, "success-message");

        // Show next button if there are more levels
        if (currentLevelIndex < levels.length - 1) {
            nextBtn.style.display = 'inline-block';
        }
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