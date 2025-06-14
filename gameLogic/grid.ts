// Represents the game grid
export class Grid {
  private cells: Cell[][];
  private size: number;

  constructor(size: number) {
    this.size = size;
    this.cells = [];
    for (let i = 0; i < size; i++) {
      this.cells[i] = [];
      for (let j = 0; j < size; j++) {
        this.cells[i][j] = new Cell(i, j);
      }
    }
  }

  // Get a cell at a specific coordinate
  getCell(x: number, y: number): Cell | undefined {
    if (x >= 0 && x < this.size && y >= 0 && y < this.size) {
      return this.cells[x][y];
    }
    return undefined;
  }

  // Get all cells in the grid
  getAllCells(): Cell[] {
    const allCells: Cell[] = [];
    for (let i = 0; i < this.size; i++) {
      for (let j = 0; j < this.size; j++) {
        allCells.push(this.cells[i][j]);
      }
    }
    return allCells;
  }

  // Adds a random tile to an empty cell
  addRandomTile(): void {
    const emptyCells = this.getAllCells().filter(cell => cell.value === 0);
    if (emptyCells.length > 0) {
      const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      randomCell.value = Math.random() < 0.9 ? 2 : 4; // 90% chance of 2, 10% chance of 4
    }
  }
}

// Represents a single cell in the grid
export class Cell {
  public x: number;
  public y: number;
  public value: number; // 0 for empty, or the number if it holds a tile

  constructor(x: number, y: number, value: number = 0) {
    this.x = x;
    this.y = y;
    this.value = value;
  }
}
