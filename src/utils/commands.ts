import { advancedCommandDefinitions } from './commands/advancedCommands';
import { filesystemCommandDefinitions } from './commands/filesystemCommands';
import { generalCommandDefinitions } from './commands/generalCommands';
import { sessionCommandDefinitions } from './commands/sessionCommands';
import type { CommandDefinition, CommandHandler } from './commands/types';

type CommandMetadata = {
  description: string;
  usage?: string;
};

const commandDefinitions: CommandDefinition[] = [
  ...generalCommandDefinitions,
  ...sessionCommandDefinitions,
  ...filesystemCommandDefinitions,
  ...advancedCommandDefinitions
];

export const commandMetadata: Record<string, CommandMetadata> = Object.fromEntries(
  commandDefinitions.map((definition) => [
    definition.name,
    {
      description: definition.description,
      usage: definition.usage
    }
  ])
);

export const commands: Record<string, CommandHandler> = Object.fromEntries(
  commandDefinitions.map((definition) => [definition.name, definition.run])
);

const helpCommand: CommandHandler = (args: string[]) => {
  const specificCommand = args[0]?.toLowerCase();
  if (specificCommand) {
    const metadata = commandMetadata[specificCommand];
    if (!metadata) {
      return `help: no help topic for '${specificCommand}'`;
    }
    return [
      `${specificCommand}: ${metadata.description}`,
      metadata.usage ? `Usage: ${metadata.usage}` : ''
    ]
      .filter(Boolean)
      .join('\n');
  }

  const commandList = Object.keys(commands).sort();
  const formatted = commandList
    .map((name) => `${name.padEnd(12, ' ')} ${commandMetadata[name]?.description ?? ''}`)
    .join('\n');
  return `Available commands:\n\n${formatted}\n\nUse 'help <command>' for usage.`;
};

commands.help = helpCommand;
commandMetadata.help = {
  description: 'Show available commands or help for one command.',
  usage: 'help [command]'
};

