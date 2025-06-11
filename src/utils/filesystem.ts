export interface File {
  type: 'file';
  name: string;
  content?: string;
}

export interface Directory {
  type: 'directory';
  name: string;
  children: FileSystemNode[];
  parent?: Directory; // Optional parent reference
}

export type FileSystemNode = File | Directory;

// Helper function to add parent references to the filesystem tree
function addParentReferences(node: Directory, parent?: Directory): void {
  node.parent = parent;
  node.children.forEach(child => {
    if (child.type === 'directory') {
      addParentReferences(child, node);
    } else {
      // Add parent reference to files as well
      (child as File & { parent?: Directory }).parent = node;
    }
  });
}

// Changed 'const' to 'let' for 'root' to allow modification in test setup
export let root: Directory = {
  type: 'directory',
  name: '~',
  children: [
    { type: 'directory', name: 'documents', children: [] },
    {
      type: 'directory',
      name: 'projects',
      children: [
        { type: 'file', name: 'README.md', content: 'This is a project README.' },
      ],
    },
    { type: 'file', name: '.bashrc', content: 'alias ll="ls -la"' },
  ],
  // parent is undefined for root
};

// Initialize parent references
addParentReferences(root);

export let currentDirectory: Directory = root;

// Helper function to navigate to a path
export function getNodeByPath(path: string, startNode: Directory = currentDirectory): FileSystemNode | null {
  if (path === '~') {
    return root;
  }
  if (path === '.' || path === '') {
    return startNode;
  }

  let effectiveParts: string[];
  let currentNode: FileSystemNode | Directory; // currentNode can be Directory type for parent access

  if (path.startsWith('~/')) {
    currentNode = root;
    effectiveParts = path.substring(2).split('/').filter(part => part !== '');
  } else {
    currentNode = startNode;
    effectiveParts = path.split('/').filter(part => part !== '');
  }

  for (const part of effectiveParts) {
    if (part === '..') {
      if (currentNode === root) continue; // Cannot go above root
      // Use parent reference if current node is a directory and has a parent
      if (currentNode.type === 'directory' && currentNode.parent) {
        currentNode = currentNode.parent;
      } else {
        // This case should ideally not be reached if all directories have parents (except root)
        // Or if currentNode is a file (though we check for that next)
        // Fallback or error if parent reference is missing where expected
        return null;
      }
      continue;
    }

    if (currentNode.type === 'file') {
      return null; // Cannot navigate into a file
    }

    // currentNode must be a Directory here to have children
    const nextNode = currentNode.children.find(child => child.name === part);
    if (!nextNode) {
      return null; // Path does not exist
    }
    currentNode = nextNode;
  }

  return currentNode;
}

// Function to change directory - will be used by cd command
export function changeDirectory(path: string): boolean {
  if (path === '~' || path === '') {
    currentDirectory = root;
    return true;
  }

  let targetNode: FileSystemNode | null;
  if (path.startsWith('~/')) {
    targetNode = getNodeByPath(path.substring(2), root);
  } else if (path === '..') {
    // Navigate to parent
    // This is a simplified version. A robust solution needs parent references or path reconstruction.
    if (currentDirectory === root) return true; // Already at root

    // Use parent reference
    if (currentDirectory.parent) {
      currentDirectory = currentDirectory.parent;
      return true;
    }
    // If at root and try '..', currentDirectory.parent would be undefined.
    // changeDirectory already handles currentDirectory === root for '..' path.
    // This path should ideally not be taken if currentDirectory is not root and parent is missing.
    return false;

  } else {
    targetNode = getNodeByPath(path, currentDirectory); // getNodeByPath itself now uses parent refs
  }

  if (targetNode && targetNode.type === 'directory') {
    currentDirectory = targetNode;
    return true;
  }

  return false; // Path does not exist or is not a directory
}

// Function for testing purposes to reset internal state
export function __setTestState(newRoot: Directory, newCurrentDirectory: Directory) {
  root = newRoot;
  currentDirectory = newCurrentDirectory;
}

export function getAbsolutePath(targetPath: string, baseDirectory: Directory = currentDirectory): string {
  const targetNode = getNodeByPath(targetPath, baseDirectory);

  if (!targetNode) {
    // Or throw an error, or return a string indicating error
    return `/error/path/not/found/${targetPath.replace(/\//g, '_')}`;
  }

  if (targetNode === root) {
    return '~';
  }

  // Path construction using parent references
  let pathParts: string[] = [];
  let nodeForPathBuilding: FileSystemNode | null = targetNode;
  let safetyCounter = 0;
  const MAX_DEPTH = 20;

  while (nodeForPathBuilding && nodeForPathBuilding !== root && safetyCounter < MAX_DEPTH) {
    pathParts.unshift(nodeForPathBuilding.name);
    // Explicitly cast to access parent, assuming parent is set for both File and Directory by addParentReferences
    const parentDir = (nodeForPathBuilding as (File | Directory) & { parent?: Directory }).parent;
    nodeForPathBuilding = parentDir || null; // Move to parent, or null if no parent (should only be for root)
    safetyCounter++;
  }

  if (safetyCounter >= MAX_DEPTH || (nodeForPathBuilding !== root && nodeForPathBuilding !== null) ) {
      // If loop exited due to depth, or if nodeForPathBuilding is not root (and not null, meaning it's some other node)
      // This path indicates an issue tracing back to root.
      return `/error/path/could/not/be/traced/to/root`;
  }

  return `~/${pathParts.join('/')}`;
}
