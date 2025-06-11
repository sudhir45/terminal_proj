export interface Command {
  command: string;
  outputs: string[];
  isSuggestion?: boolean; // Used to mark history entries that are for displaying suggestions
}
