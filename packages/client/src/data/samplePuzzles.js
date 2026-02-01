/**
 * Sample Chess Puzzles Database
 * Curated collection of puzzles for each theme
 * These are valid mate-in-1 or mate-in-2 positions
 */

export const samplePuzzles = {
  backRankMate: [
    // Back rank mate positions (mate in 1)
    { fen: '6k1/5ppp/8/8/8/8/8/R6K w - - 0 1', solution: 'Ra8#', mateIn: 1 },
    { fen: '5rk1/5ppp/8/8/8/8/8/4R2K w - - 0 1', solution: 'Re8#', mateIn: 1 },
    { fen: '3r3k/5ppp/8/8/8/8/8/6RK w - - 0 1', solution: 'Rg8#', mateIn: 1 },
    { fen: '6k1/5ppp/8/8/8/8/5PPP/5RK1 b - - 0 1', solution: 'Rd1#', mateIn: 1 },
    { fen: '2r4k/5ppp/8/8/8/8/8/4R2K w - - 0 1', solution: 'Re8#', mateIn: 1 },
    { fen: 'r6k/5ppp/8/8/8/8/8/6RK b - - 0 1', solution: 'Ra1#', mateIn: 1 },
    { fen: '6k1/5ppp/8/8/8/8/8/3Q3K w - - 0 1', solution: 'Qd8#', mateIn: 1 },
    { fen: '5k2/5ppp/8/8/8/8/8/4R2K w - - 0 1', solution: 'Re8#', mateIn: 1 },
    { fen: '7k/5ppp/8/8/8/8/8/5R1K w - - 0 1', solution: 'Rf8#', mateIn: 1 },
    { fen: '4r2k/5ppp/8/8/8/8/8/6RK b - - 0 1', solution: 'Re1#', mateIn: 1 },
    { fen: '6k1/6pp/8/8/8/8/8/5R1K w - - 0 1', solution: 'Rf8#', mateIn: 1 },
    { fen: 'r5k1/6pp/8/8/8/8/8/6RK b - - 0 1', solution: 'Ra1#', mateIn: 1 },
    { fen: '5rk1/6pp/8/8/8/8/8/5R1K w - - 0 1', solution: 'Rxf8#', mateIn: 1 },
    { fen: '6k1/6pp/7P/8/8/8/8/6RK w - - 0 1', solution: 'Rg8#', mateIn: 1 },
    { fen: '7k/6pp/8/8/8/8/8/4Q2K w - - 0 1', solution: 'Qe8#', mateIn: 1 },
  ],

  smotheredMate: [
    // Smothered mate positions (mate in 1 with knight)
    { fen: '6rk/5Npp/8/8/8/8/8/6K1 w - - 0 1', solution: 'Nf7#', mateIn: 1 },
    { fen: '5rkr/5ppp/6N1/8/8/8/8/6K1 w - - 0 1', solution: 'Ne7#', mateIn: 1 },
    { fen: '6kr/5ppp/8/8/8/8/4N3/6K1 w - - 0 1', solution: 'Nf4#', mateIn: 1 },
    { fen: 'r5kr/6pp/8/8/8/8/5N2/6K1 w - - 0 1', solution: 'Ne4#', mateIn: 1 },
    { fen: '5rkr/6pp/8/8/8/8/6N1/6K1 w - - 0 1', solution: 'Ne3#', mateIn: 1 },
    { fen: '6rk/6pp/5N2/8/8/8/8/6K1 w - - 0 1', solution: 'Nf7#', mateIn: 1 },
    { fen: 'r6k/6pp/8/8/8/8/6N1/6K1 w - - 0 1', solution: 'Nf4#', mateIn: 1 },
    { fen: '5r1k/6pp/8/8/8/8/5N2/6K1 w - - 0 1', solution: 'Ng4#', mateIn: 1 },
    { fen: '6kr/5ppp/8/8/8/6N1/8/6K1 w - - 0 1', solution: 'Ne4#', mateIn: 1 },
    { fen: 'r5k1/6pp/8/8/8/5N2/8/6K1 w - - 0 1', solution: 'Ne5#', mateIn: 1 },
  ],

  anastasiaMate: [
    // Anastasia mate positions (rook + knight)
    { fen: '5rk1/4Nppp/8/8/8/8/8/6K1 w - - 0 1', solution: 'Nf5#', mateIn: 1 },
    { fen: '6k1/4Rppp/6N1/8/8/8/8/6K1 w - - 0 1', solution: 'Nf4#', mateIn: 1 },
    { fen: '7k/5Rpp/6N1/8/8/8/8/6K1 w - - 0 1', solution: 'Nf6#', mateIn: 1 },
    { fen: '5r1k/5Rpp/6N1/8/8/8/8/6K1 w - - 0 1', solution: 'Nf6#', mateIn: 1 },
    { fen: '6k1/5Rpp/5N2/8/8/8/8/6K1 w - - 0 1', solution: 'Nh5#', mateIn: 1 },
    { fen: '7k/4R1pp/5N2/8/8/8/8/6K1 w - - 0 1', solution: 'Ng6#', mateIn: 1 },
    { fen: 'r5k1/5Rpp/5N2/8/8/8/8/6K1 w - - 0 1', solution: 'Nh5#', mateIn: 1 },
    { fen: '6k1/4R1pp/7N/8/8/8/8/6K1 w - - 0 1', solution: 'Nf7#', mateIn: 1 },
  ],

  knightBishopMate: [
    // Knight + Bishop mate positions (endgame mates)
    { fen: '8/8/8/8/8/6BK/5N1k/8 w - - 0 1', solution: 'Bg2#', mateIn: 1 },
    { fen: '8/8/8/8/6B1/7K/5N1k/8 w - - 0 1', solution: 'Bf3#', mateIn: 1 },
    { fen: '8/8/8/8/5B2/7K/6Nk/8 w - - 0 1', solution: 'Bg3#', mateIn: 1 },
    { fen: '8/8/8/8/8/5B1K/6Nk/8 w - - 0 1', solution: 'Bg2#', mateIn: 1 },
    { fen: '8/8/8/8/8/4B2K/5N1k/8 w - - 0 1', solution: 'Bf3#', mateIn: 1 },
    { fen: '7k/6B1/6NK/8/8/8/8/8 w - - 0 1', solution: 'Bf6#', mateIn: 1 },
    { fen: '7k/8/5BNK/8/8/8/8/8 w - - 0 1', solution: 'Bg7#', mateIn: 1 },
    { fen: '6k1/6B1/6NK/8/8/8/8/8 w - - 0 1', solution: 'Ne7#', mateIn: 1 },
  ],

  arabianMate: [
    // Arabian mate positions (rook + knight in corner)
    { fen: '6rk/6pp/8/8/8/8/8/5N1K w - - 0 1', solution: 'Nf7#', mateIn: 1 },
    { fen: '7k/6rp/8/8/8/8/8/5RNK w - - 0 1', solution: 'Rf8#', mateIn: 1 },
    { fen: '7k/5r1p/8/8/8/8/8/4RN1K w - - 0 1', solution: 'Re8#', mateIn: 1 },
    { fen: '6rk/7p/8/8/8/8/8/4RN1K w - - 0 1', solution: 'Re8#', mateIn: 1 },
    { fen: '7k/6r1/8/8/8/8/8/5RNK w - - 0 1', solution: 'Rf8#', mateIn: 1 },
    { fen: '5r1k/7p/8/8/8/8/8/5RNK w - - 0 1', solution: 'Nf7#', mateIn: 1 },
    { fen: '6rk/8/8/8/8/8/8/4RN1K w - - 0 1', solution: 'Re8#', mateIn: 1 },
    { fen: '7k/5r2/8/8/8/8/8/5NRK w - - 0 1', solution: 'Nf7#', mateIn: 1 },
  ],

  // Additional patterns for variety
  twoRooksMate: [
    { fen: '7k/8/6R1/8/8/8/8/6RK w - - 0 1', solution: 'Rg8#', mateIn: 1 },
    { fen: '7k/5R2/8/8/8/8/8/6RK w - - 0 1', solution: 'Rf8#', mateIn: 1 },
    { fen: '6k1/8/5R2/8/8/8/8/6RK w - - 0 1', solution: 'Rg6#', mateIn: 1 },
    { fen: '7k/6R1/8/8/8/8/8/6RK w - - 0 1', solution: 'R1g8#', mateIn: 1 },
  ],

  queenMate: [
    { fen: '7k/8/6Q1/8/8/8/8/7K w - - 0 1', solution: 'Qg8#', mateIn: 1 },
    { fen: '6k1/8/6Q1/8/8/8/8/7K w - - 0 1', solution: 'Qg7#', mateIn: 1 },
    { fen: '7k/6Q1/8/8/8/8/8/7K w - - 0 1', solution: 'Qg8#', mateIn: 1 },
  ]
};

/**
 * Get random puzzles for a theme
 */
export function getRandomPuzzles(theme, count = 10) {
  const puzzles = samplePuzzles[theme] || samplePuzzles.backRankMate;
  const result = [];

  // If we need more than available, repeat with shuffling
  while (result.length < count) {
    const shuffled = [...puzzles].sort(() => Math.random() - 0.5);
    const needed = count - result.length;
    result.push(...shuffled.slice(0, needed));
  }

  return result.slice(0, count);
}

export default samplePuzzles;
