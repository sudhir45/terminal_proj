import { describe, it, expect, beforeEach, vi } from 'vitest';
import { startGame, guessLetter, getDisplay, __getWords, __getMaxAttempts, type HangmanState } from './hangman';

describe('Hangman Game Logic', () => {
  let initialWords: readonly string[];
  let maxAttempts: number;

  beforeEach(() => {
    initialWords = __getWords();
    maxAttempts = __getMaxAttempts();
    // Reset Math.random mock for each test if specific word selection is needed
    vi.spyOn(Math, 'random').mockRestore();
  });

  describe('startGame', () => {
    it('should initialize a new game state correctly', () => {
      const state = startGame();
      expect(initialWords).toContain(state.word);
      expect(state.guessedLetters.size).toBe(0);
      expect(state.remainingAttempts).toBe(maxAttempts);
      expect(state.maxAttempts).toBe(maxAttempts);
      expect(state.status).toBe('playing');
      expect(state.displayedWord).toBe('_'.repeat(state.word.length));
      expect(state.lastMessage).toBe('New game started!');
    });

    it('should select a random word from the list', () => {
      // This test is probabilistic, but we can check if words are generally different
      const word1 = startGame().word;
      const word2 = startGame().word;
      const word3 = startGame().word;
      // It's possible but unlikely they are all the same if random selection works
      expect(initialWords.length).toBeGreaterThan(1); // Prerequisite for this test logic
      // Basic check: are they from the list? More robust: mock Math.random
      expect(initialWords).toContain(word1);
      expect(initialWords).toContain(word2);
      expect(initialWords).toContain(word3);
    });

    it('should select a specific word if Math.random is mocked', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0); // Will pick the first word
      let state = startGame();
      expect(state.word).toBe(initialWords[0].toLowerCase());

      vi.spyOn(Math, 'random').mockReturnValue(0.5); // Example, pick a word around the middle
      const middleIndex = Math.floor(initialWords.length * 0.5);
      state = startGame();
      expect(state.word).toBe(initialWords[middleIndex].toLowerCase());

      vi.spyOn(Math, 'random').mockReturnValue(1 - 1e-9); // Should pick the last word
      state = startGame();
      expect(state.word).toBe(initialWords[initialWords.length-1].toLowerCase());
    });
  });

  describe('guessLetter', () => {
    let gameState: HangmanState;

    beforeEach(() => {
      // Start with a predictable word for guessLetter tests
      vi.spyOn(Math, 'random').mockReturnValue(0); // Selects words[0]
      gameState = startGame(); // words[0] is "svelte"
      expect(gameState.word).toBe("svelte");
    });

    it('should not change core game state if game is already won or lost, only message', () => {
      const originalWonState: HangmanState = { ...gameState, status: 'won' };
      let nextState = guessLetter('a', originalWonState);

      expect(nextState.word).toBe(originalWonState.word);
      expect(nextState.guessedLetters).toEqual(originalWonState.guessedLetters);
      expect(nextState.remainingAttempts).toBe(originalWonState.remainingAttempts);
      expect(nextState.displayedWord).toBe(originalWonState.displayedWord);
      expect(nextState.status).toBe('won');
      expect(nextState.lastMessage).toBe("Game over. Start a new game.");

      const originalLostState: HangmanState = { ...gameState, status: 'lost' };
      nextState = guessLetter('a', originalLostState);
      expect(nextState.word).toBe(originalLostState.word);
      expect(nextState.guessedLetters).toEqual(originalLostState.guessedLetters);
      expect(nextState.remainingAttempts).toBe(originalLostState.remainingAttempts);
      expect(nextState.displayedWord).toBe(originalLostState.displayedWord);
      expect(nextState.status).toBe('lost');
      expect(nextState.lastMessage).toBe("Game over. Start a new game.");
    });

    it('should return current state for invalid guess (non-letter, multiple chars)', () => {
      let state = guessLetter('1', gameState);
      expect(state.guessedLetters.size).toBe(0);
      expect(state.remainingAttempts).toBe(maxAttempts);
      expect(state.lastMessage).toContain("Invalid guess");

      state = guessLetter('ab', gameState);
      expect(state.guessedLetters.size).toBe(0);
      expect(state.remainingAttempts).toBe(maxAttempts);
      expect(state.lastMessage).toContain("Invalid guess");
    });

    it('should return current state if letter already guessed (case insensitive)', () => {
      gameState = guessLetter('s', gameState); // First guess
      const stateAfterFirstGuess = { ...gameState };
      gameState = guessLetter('S', gameState); // Second guess (same letter, different case)

      expect(gameState.guessedLetters).toEqual(stateAfterFirstGuess.guessedLetters);
      expect(gameState.remainingAttempts).toBe(stateAfterFirstGuess.remainingAttempts);
      expect(gameState.lastMessage).toContain("already guessed");
    });

    it('should handle correct guess', () => {
      gameState = guessLetter('s', gameState);
      expect(gameState.guessedLetters.has('s')).toBe(true);
      expect(gameState.displayedWord).toBe('s_____');
      expect(gameState.remainingAttempts).toBe(maxAttempts); // No attempts lost
      expect(gameState.status).toBe('playing');
      expect(gameState.lastMessage).toContain("Correct guess: 's'");
    });

    it('should handle incorrect guess', () => {
      gameState = guessLetter('a', gameState); // 'a' is not in "svelte"
      expect(gameState.guessedLetters.has('a')).toBe(true);
      expect(gameState.displayedWord).toBe('______'); // Unchanged
      expect(gameState.remainingAttempts).toBe(maxAttempts - 1);
      expect(gameState.status).toBe('playing');
      expect(gameState.lastMessage).toContain("Incorrect guess: 'a'");
    });

    it('should update status to "won" when word is fully guessed', () => {
      // "svelte"
      gameState = guessLetter('s', gameState);
      gameState = guessLetter('v', gameState);
      gameState = guessLetter('e', gameState);
      gameState = guessLetter('l', gameState);
      gameState = guessLetter('t', gameState); // Last letter

      expect(gameState.status).toBe('won');
      expect(gameState.displayedWord).toBe('svelte');
      expect(gameState.lastMessage).toContain(`You won! The word was: svelte`);
    });

    it('should update status to "lost" when remainingAttempts is 0', () => {
      const wrongLetters = ['a', 'b', 'c', 'd', 'f', 'g']; // 6 wrong guesses
      for (const letter of wrongLetters) {
        gameState = guessLetter(letter, gameState);
      }
      expect(gameState.status).toBe('lost');
      expect(gameState.remainingAttempts).toBe(0);
      expect(gameState.lastMessage).toContain(`You lost! The word was: svelte`);
    });
  });

  describe('getDisplay', () => {
    beforeEach(() => {
      // Ensure predictable word for getDisplay tests
      vi.spyOn(Math, 'random').mockReturnValue(0); // Selects words[0] ("svelte")
    });

    it('should format display for "playing" state', () => {
      let state = startGame(); // word "svelte"
      state = guessLetter('s', state); // s correct
      state = guessLetter('a', state); // a incorrect

      const display = getDisplay(state);
      expect(state.word).toBe("svelte"); // Confirm word for sanity
      expect(state.displayedWord).toBe("s_____"); // After 's' and 'a' (incorrect)
      expect(state.lastMessage).toBe("Incorrect guess: 'a'.");

      expect(display).toContain("Word: s _ _ _ _ _");
      expect(display).toContain("Guessed: a, s");
      expect(display).toContain(`Attempts left: ${maxAttempts - 1}/${maxAttempts}`);
      expect(display).toContain(state.lastMessage); // Should show message from last guess
      // Check for part of hangman art for 1 wrong guess
      expect(display).toContain("  O   |");
    });

    it('should format display for "won" state', () => {
      let state = startGame(); // "svelte"
      state = guessLetter('s', state);
      state = guessLetter('v', state);
      state = guessLetter('e', state);
      state = guessLetter('l', state);
      state = guessLetter('t', state); // Win

      const display = getDisplay(state);
      expect(display).toContain("Word: s v e l t e");
      expect(display).toContain(`Guessed: e, l, s, t, v`);
      expect(display).toContain(`Attempts left: ${maxAttempts}/${maxAttempts}`);
      expect(display).toContain("You won! The word was: svelte");
    });

    it('should format display for "lost" state', () => {
      let state = startGame(); // "svelte"
      const wrongLetters = ['a', 'b', 'c', 'd', 'f', 'g']; // 6 wrong guesses
      for (const letter of wrongLetters) {
        state = guessLetter(letter, state);
      }

      const display = getDisplay(state);
      expect(display).toContain("Word: _ _ _ _ _ _"); // Or whatever unguessed part was, if any
      expect(display).toContain(`Guessed: a, b, c, d, f, g`);
      expect(display).toContain(`Attempts left: 0/${maxAttempts}`);
      expect(display).toContain("You lost! The word was: svelte");
      // Check for full hangman art
      expect(display).toContain("/ \\  |");
    });
  });
});
