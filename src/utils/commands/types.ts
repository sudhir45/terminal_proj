export type CommandHandler = (args: string[]) => Promise<string> | string;

export interface CommandDefinition {
  name: string;
  description: string;
  usage?: string;
  run: CommandHandler;
}

