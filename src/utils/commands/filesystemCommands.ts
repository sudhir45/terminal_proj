import { currentDirectory, getAbsolutePath, getNodeByPath, changeDirectory } from '../filesystem';
import type { Directory, FileSystemNode } from '../filesystem';
import type { CommandDefinition } from './types';

const getRootDirectory = (): Directory => getNodeByPath('~') as Directory;

export const filesystemCommandDefinitions: CommandDefinition[] = [
  {
    name: 'ls',
    description: 'List directory contents.',
    usage: 'ls [path]',
    run: (args: string[]) => {
      const path = args[0];
      let targetNode: FileSystemNode | null = null;

      if (!path || path === '.') {
        targetNode = currentDirectory;
      } else if (path === '~') {
        targetNode = getRootDirectory();
      } else if (path.startsWith('~/')) {
        targetNode = getNodeByPath(path.substring(2), getRootDirectory());
      } else {
        targetNode = getNodeByPath(path, currentDirectory);
      }

      if (!targetNode) {
        return `ls: cannot access '${path || '.'}': No such file or directory`;
      }

      if (targetNode.type === 'file') {
        return targetNode.name;
      }

      return targetNode.children.map((child) => child.name).join('\n');
    }
  },
  {
    name: 'cd',
    description: 'Change working directory.',
    usage: 'cd [path]',
    run: (args: string[]) => {
      const path = args[0] || '~';
      return changeDirectory(path) ? '' : `cd: no such file or directory: ${path}`;
    }
  },
  {
    name: 'pwd',
    description: 'Print current working directory.',
    run: () => getAbsolutePath('.', currentDirectory)
  },
  {
    name: 'cat',
    description: 'Print file contents.',
    usage: 'cat <file> [file...]',
    run: (args: string[]) => {
      if (args.length === 0) {
        return 'cat: usage: cat file [...]';
      }

      const outputs: string[] = [];
      for (const path of args) {
        const node = getNodeByPath(path, currentDirectory);
        if (node === null) {
          outputs.push(`cat: ${path}: No such file or directory`);
        } else if (node.type === 'directory') {
          outputs.push(`cat: ${node.name}: Is a directory`);
        } else {
          outputs.push(node.content || '');
        }
      }

      return outputs.join('\n');
    }
  }
];

