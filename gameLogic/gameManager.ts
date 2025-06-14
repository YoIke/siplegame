import { Grid } from './grid';
import { saveGameState, loadGameState, clearGameState } from './localStorage';

export class GameManager {
  private grid: Grid;
  private score: number;
  private isGameOver: boolean;

  constructor(size: number) {
    const loadedState = loadGameState();
    if (loadedState) {
      this.grid = new Grid(size); // Assuming grid needs to be reconstructed
      // More sophisticated state loading might be needed here,
      // for example, restoring cell values from loadedState.grid.cells
      this.score = loadedState.score;
      this.isGameOver = loadedState.isGameOver;
      // This is a simplified example; you might need to deserialize the grid properly
      // For now, let's assume a new grid is created and random tiles are added
      if (!this.isGameOver) {
        this.initializeGrid();
      }
    } else {
      this.grid = new Grid(size);
      this.score = 0;
      this.isGameOver = false;
      this.initializeGrid();
    }
  }

  private initializeGrid(): void {
    this.grid.addRandomTile();
    this.grid.addRandomTile();
  }

  // Resets the game to its initial state
  resetGame(): void {
    this.score = 0;
    this.isGameOver = false;
    this.grid = new Grid(this.grid.getAllCells().length**0.5); // Recreate grid
    this.initializeGrid();
    clearGameState(); // Clear previous state from local storage
  }

  // Makes a move in a given direction (0: up, 1: right, 2: down, 3: left)
  move(direction: number): void {
    if (this.isGameOver) return;

    let moved = false;
    // Implement move logic here based on the direction
    // This is a complex part of 2048 and will require careful implementation
    // For now, let's simulate a move and add a new tile

    // Example: Simple move simulation (actual logic is more complex)
    // After tiles are moved and merged:
    // moved = true; // if any tile actually moved or merged

    if (moved) {
      this.grid.addRandomTile();
      this.updateScore(0); // Update score based on merges
      if (this.checkGameOver()) {
        this.isGameOver = true;
      }
      this.saveCurrentGameState();
    }
  }

  private updateScore(mergedValue: number): void {
    this.score += mergedValue;
  }

  private checkGameOver(): boolean {
    // Game over if no empty cells and no possible merges
    const emptyCells = this.grid.getAllCells().filter(cell => cell.value === 0);
    if (emptyCells.length > 0) {
      return false; // Not game over if there are empty cells
    }

    // Check for possible merges (horizontally and vertically)
    // This also requires careful implementation
    // For now, let's assume game over if no empty cells
    return true;
  }

  private saveCurrentGameState(): void {
    const gameState = {
      // For simplicity, saving the entire grid object.
      // You might want to serialize it more carefully.
      grid: this.grid,
      score: this.score,
      isGameOver: this.isGameOver,
    };
    saveGameState(gameState);
  }

  // Getters
  getGrid(): Grid {
    return this.grid;
  }

  getScore(): number {
    return this.score;
  }

  getIsGameOver(): boolean {
    return this.isGameOver;
  }
}
