const words = ["svelte", "typescript", "terminal", "javascript", "hangman", "developer", "interface", "component"];
const MAX_ATTEMPTS = 6;

export interface HangmanState {
  word: string;
  guessedLetters: Set<string>;
  remainingAttempts: number;
  maxAttempts: number;
  status: 'playing' | 'won' | 'lost';
  displayedWord: string;
  lastMessage?: string; // Optional message for feedback like "Already guessed"
}

function generateDisplayedWord(word: string, guessedLetters: Set<string>): string {
  return word.split('').map(char => (guessedLetters.has(char.toLowerCase()) ? char : '_')).join('');
}

export function startGame(): HangmanState {
  const randomIndex = Math.floor(Math.random() * words.length);
  const chosenWord = words[randomIndex].toLowerCase(); // Ensure word is lowercase for consistent guessing

  return {
    word: chosenWord,
    guessedLetters: new Set<string>(),
    remainingAttempts: MAX_ATTEMPTS,
    maxAttempts: MAX_ATTEMPTS,
    status: 'playing',
    displayedWord: generateDisplayedWord(chosenWord, new Set<string>()),
    lastMessage: 'New game started!'
  };
}

export function guessLetter(letter: string, currentState: HangmanState): HangmanState {
  if (currentState.status !== 'playing') {
    return { ...currentState, lastMessage: "Game over. Start a new game." };
  }

  const normalizedLetter = letter.toLowerCase();
  if (normalizedLetter.length !== 1 || !/^[a-z]$/.test(normalizedLetter)) {
    return { ...currentState, lastMessage: "Invalid guess. Please enter a single letter." };
  }

  if (currentState.guessedLetters.has(normalizedLetter)) {
    return { ...currentState, lastMessage: `Letter '${normalizedLetter}' already guessed.` };
  }

  const newGuessedLetters = new Set(currentState.guessedLetters).add(normalizedLetter);
  let newRemainingAttempts = currentState.remainingAttempts;
  let message = "";

  if (!currentState.word.includes(normalizedLetter)) {
    newRemainingAttempts--;
    message = `Incorrect guess: '${normalizedLetter}'.`;
  } else {
    message = `Correct guess: '${normalizedLetter}'.`;
  }

  const newDisplayedWord = generateDisplayedWord(currentState.word, newGuessedLetters);
  let newStatus: HangmanState['status'] = currentState.status;

  if (newDisplayedWord === currentState.word) {
    newStatus = 'won';
    message = `You won! The word was: ${currentState.word}`;
  } else if (newRemainingAttempts === 0) {
    newStatus = 'lost';
    message = `You lost! The word was: ${currentState.word}`;
  }

  return {
    ...currentState,
    guessedLetters: newGuessedLetters,
    remainingAttempts: newRemainingAttempts,
    displayedWord: newDisplayedWord,
    status: newStatus,
    lastMessage: message
  };
}

export function getDisplay(state: HangmanState): string {
  // The art should represent incorrect guesses made. So, index is maxAttempts - remainingAttempts.
  // However, the art stages are usually 0 to 6 (7 stages).
  // If maxAttempts is 6, then 6 incorrect guesses means 0 remaining attempts.
  // Stage 0: initial state (no incorrect guesses)
  // Stage 1: 1 incorrect guess (5 remaining)
  // ...
  // Stage 6: 6 incorrect guesses (0 remaining) -> full hangman

  // Let's adjust the art array to match remainingAttempts more intuitively.
  // The art represents the state *after* N incorrect guesses.
  // remaining = 6 (0 incorrect) -> art[6] (empty gallows or some initial state)
  // remaining = 0 (6 incorrect) -> art[0] (full hangman)
  // So, the index for art should be state.remainingAttempts.
  // Let's redefine art so index = (maxAttempts - remainingAttempts)
  const HANGMAN_STAGES = [
    "  +---+\n  |   |\n      |\n      |\n      |\n      |\n=========", // 0 incorrect guesses
    "  +---+\n  |   |\n  O   |\n      |\n      |\n      |\n=========", // 1 incorrect
    "  +---+\n  |   |\n  O   |\n  |   |\n      |\n      |\n=========", // 2 incorrect
    "  +---+\n  |   |\n  O   |\n /|   |\n      |\n      |\n=========", // 3 incorrect
    "  +---+\n  |   |\n  O   |\n /|\\  |\n      |\n      |\n=========", // 4 incorrect
    "  +---+\n  |   |\n  O   |\n /|\\  |\n /    |\n      |\n=========", // 5 incorrect
    "  +---+\n  |   |\n  O   |\n /|\\  |\n / \\  |\n      |\n========="  // 6 incorrect (lost)
  ];

  const artIndex = Math.min(state.maxAttempts - state.remainingAttempts, HANGMAN_STAGES.length - 1);
  const currentArt = HANGMAN_STAGES[artIndex];

  const displayLines: string[] = [];
  displayLines.push(currentArt);
  displayLines.push(`\nWord: ${state.displayedWord.split('').join(' ')}`);
  displayLines.push(`Guessed: ${Array.from(state.guessedLetters).sort().join(', ')}`);
  displayLines.push(`Attempts left: ${state.remainingAttempts}/${state.maxAttempts}`);

  if (state.lastMessage) {
    displayLines.push(`\n${state.lastMessage}`);
  }

  // Status message is now part of lastMessage if game ends.
  // If still playing and no specific lastMessage, could say "Playing..."
  if (state.status === 'playing' && !state.lastMessage) {
    displayLines.push("Status: Playing...");
  }

  return displayLines.join('\n');
}

// Function for testing purposes to reset internal state (if any non-HangmanState state existed)
// For now, Hangman is purely functional based on HangmanState, so no global module state to reset here.
// If we were to store words list globally and modify it, then we'd need a reset.
// Math.random is a global dependency that tests might want to mock.
export function __getWords(): readonly string[] { // For testing word selection
    return words;
}
export function __getMaxAttempts(): number { // For testing setup
    return MAX_ATTEMPTS;
}
