// Manages saving and loading game state from local storage

const GAME_STATE_KEY = '2048GameState';

// Saves the game state to local storage
export function saveGameState(gameState: any): void {
  try {
    const serializedState = JSON.stringify(gameState);
    localStorage.setItem(GAME_STATE_KEY, serializedState);
  } catch (error) {
    console.error('Error saving game state:', error);
    // Potentially handle specific errors, like quota exceeded
  }
}

// Loads the game state from local storage
export function loadGameState(): any | null {
  try {
    const serializedState = localStorage.getItem(GAME_STATE_KEY);
    if (serializedState === null) {
      return null; // No saved state found
    }
    return JSON.parse(serializedState);
  } catch (error) {
    console.error('Error loading game state:', error);
    // Potentially handle corrupted data
    return null;
  }
}

// Clears the game state from local storage
export function clearGameState(): void {
  try {
    localStorage.removeItem(GAME_STATE_KEY);
  } catch (error) {
    console.error('Error clearing game state:', error);
  }
}
