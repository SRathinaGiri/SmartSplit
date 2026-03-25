// Helper to calculate BFS for shortest path (minimum moves)
function solvePuzzle(capacities, startState, target) {
    const queue = [{ state: startState, path: [] }];
    const visited = new Set();
    visited.add(startState.join(','));

    while (queue.length > 0) {
        const { state, path } = queue.shift();

        // Check win condition
        if (state.includes(target)) {
            console.log("Found path:", path);
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

const minMoves = solvePuzzle([10, 5, 2], [10, 0, 0], 1);
console.log("Min moves for 10L, 5L, 2L to get 1L:", minMoves);
