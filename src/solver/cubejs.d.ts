declare module 'cubejs' {
  class Cube {
    constructor(state?: Cube)
    static fromString(s: string): Cube
    static initSolver(): void
    solve(): string
    move(moves: string): void
  }
  export default Cube
}
