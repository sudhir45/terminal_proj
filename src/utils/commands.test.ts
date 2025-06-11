// Define localStorage mock at the VERY TOP.
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    }
  };
})();
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// Mock window object for hostname
const windowMock = {
  location: {
    hostname: 'testhost'
  }
};
Object.defineProperty(globalThis, 'window', {
  value: windowMock,
  writable: true
});


// THEN import vitest utilities AND THEN vi.mock calls
import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import * as filesystemModuleOriginal from './filesystem'; // Keep original type, but we mock it

// Mock the entire filesystem module
vi.mock('./filesystem', async (importOriginal) => {
  // We need to ensure this factory is using the same mockRoot/mockCurrentDirectory instances
  // that our tests will also be able to manipulate.
  // This can be done by having shared mutable state or by re-evaluating them.
  // For simplicity, the mock will create its own internal state,
  // and the tests will interact with it via the commands that use these mocked FS functions.
  // Or, more complex, the tests can reach into this mock's scope if the mock exports setters for its state.

  // For this mock, we'll define the mock FS state within the factory.
  // Tests for commands.ts will verify interactions with *this* mocked filesystem.
  // The actual filesystem.ts functions are tested in filesystem.test.ts.

  const actualFS = await importOriginal<typeof filesystemModuleOriginal>();

  let mockFsRoot: filesystemModuleOriginal.Directory = {
    type: 'directory',
    name: '~',
    children: [
      { type: 'directory', name: 'documents', children: [{ type: 'file', name: 'doc1.txt' }] },
      { type: 'directory', name: 'projects', children: [{ type: 'file', name: 'proj1.js' }] },
      { type: 'file', name: '.profile' },
    ],
  };
  let mockFsCurrentDirectory: filesystemModuleOriginal.Directory = mockFsRoot;

  // This function will be called by tests to reset the mock filesystem's state
  const __resetMockFsState = (newRoot?: filesystemModuleOriginal.Directory) => {
    mockFsRoot = newRoot || {
        type: 'directory', name: '~', children: [
            { type: 'directory', name: 'documents', children: [{ type: 'file', name: 'report.pdf' }] },
            { type: 'directory', name: 'photos', children: [] },
            { type: 'file', name: 'config.txt' },
        ]
    };
    mockFsCurrentDirectory = mockFsRoot;
  };

  // Initial reset
  __resetMockFsState();


  return {
    // Provide the actual __setTestState from original module if needed by other systems,
    // but for command tests, they interact with *this* mock's state.
    // It's usually better to mock specific functions if their behavior needs to be controlled.
    __setTestState: actualFS.__setTestState, // Expose original for other potential module interactions
    __resetMockFsState: __resetMockFsState, // Allow tests to reset this mock's specific state

    get root() { return mockFsRoot; },
    get currentDirectory() { return mockFsCurrentDirectory; },

    getNodeByPath: (path: string, startNode: filesystemModuleOriginal.Directory = mockFsCurrentDirectory): filesystemModuleOriginal.FileSystemNode | null => {
        // Simplified getNodeByPath operating on mockFsRoot / mockFsCurrentDirectory
        if (path === '~') return mockFsRoot;
        if (path === '' || path === '.') return startNode;

        const parts = path.startsWith('~/') ? path.substring(2).split('/') : path.split('/');
        let currentNode: filesystemModuleOriginal.FileSystemNode | null = path.startsWith('~/') ? mockFsRoot : startNode;

        for (const part of parts.filter(p => p !== '')) {
            if (!currentNode || currentNode.type === 'file') return null;
            if (part === '..') {
                if (currentNode === mockFsRoot) continue;
                let foundParent: filesystemModuleOriginal.Directory | null = null;
                const findParent = (dir: filesystemModuleOriginal.Directory, target: filesystemModuleOriginal.FileSystemNode): filesystemModuleOriginal.Directory | null => {
                    for (const child of dir.children) {
                        if (child === target) return dir;
                        if (child.type === 'directory') {
                            const parent = findParent(child as filesystemModuleOriginal.Directory, target);
                            if (parent) return parent;
                        }
                    }
                    return null;
                };
                foundParent = findParent(mockFsRoot, currentNode);
                currentNode = foundParent;
                continue;
            }
            currentNode = (currentNode as filesystemModuleOriginal.Directory).children.find(c => c.name === part) || null;
        }
        return currentNode;
    },
    // changeDirectory should use the getNodeByPath defined in this same mock factory
    changeDirectory: function(path: string): boolean { // Use 'function' to bind 'this' if needed, or ensure access to other mock parts
        // `this.getNodeByPath` or directly calling the variable `getNodeByPathMock` if it's in scope
        // For simplicity, let's assume getNodeByPathMock is accessible in this scope.
        // Or, we can just redefine the getNodeByPath var name inside the factory to avoid 'this'.
        // Let's assume getNodeByPathMock is the var name for the mocked getNodeByPath in the factory.
        // Actually, the `getNodeByPath` defined above in the return object is what we want.
        // So, this mock needs to be structured to call itself.
        // A common way is to define helpers, then use them in the returned object.
        // The functions in the returned object can call each other.
        // So, `this.getNodeByPath` won't work as it's not a class.
        // Let's make it simpler: the `targetNode` should be found by the same logic as this mock's `getNodeByPath`.

        // Re-evaluating: The mock returns an object. The functions on this object are what's used.
        // The `getNodeByPath` available to `changeDirectory` *is* the one from `actualFS` if we spread `...actualFS`.
        // We are trying to mock `changeDirectory` to operate on `mockFsCurrentDirectory`.
        // The `getNodeByPath` it uses should also operate on the mocked state.
        // The `getNodeByPath` defined a few lines above is the one we want.
        // It's not on `vi.mocked(filesystemModuleOriginal)`.
        // The best way is to define all mocked functions first, then return them.

        // Let's assume the `getNodeByPath` defined in this factory is available.
        // This is tricky because the returned object defines what the mock is.
        // The simplest here is to replicate logic or ensure it calls the correct one.
        // The `original.getNodeByPath` in my previous thought was for `filesystem.test.ts`, not here.
        // Here, `actualFS.getNodeByPath` is the original one. We want the mocked one.

        // Corrected approach for the mock `changeDirectory`:
        // It should use the same logic for finding nodes as its companion `getNodeByPath` mock.
        // For this, we'll define the node resolution logic once.
        const resolveNode = (resolvePath: string, startDir: filesystemModuleOriginal.Directory) => {
            if (resolvePath === '~') return mockFsRoot;
            if (resolvePath === '' || resolvePath === '.') return startDir;
            const p = resolvePath.startsWith('~/') ? resolvePath.substring(2).split('/') : resolvePath.split('/');
            let cNode: filesystemModuleOriginal.FileSystemNode | null = resolvePath.startsWith('~/') ? mockFsRoot : startDir;
            for (const part of p.filter(Boolean)) {
                if (!cNode || cNode.type === 'file') return null;
                if (part === '..') { /* basic .. logic for mock */
                    if (cNode === mockFsRoot) continue;
                    // Simplified parent finding for mock
                    let parent: filesystemModuleOriginal.Directory | null = null;
                    const findP = (d: filesystemModuleOriginal.Directory, t: filesystemModuleOriginal.FileSystemNode): filesystemModuleOriginal.Directory | null => {
                        for(const child of d.children) { if(child === t) return d; if(child.type === 'directory') { const pFound = findP(child,t); if(pFound) return pFound;}} return null;
                    };
                    parent = findP(mockFsRoot, cNode);
                    cNode = parent; continue;
                }
                cNode = (cNode as filesystemModuleOriginal.Directory).children.find(ch => ch.name === part) || null;
            }
            return cNode;
        };

        const targetNode = resolveNode(path, mockFsCurrentDirectory);
        if (targetNode && targetNode.type === 'directory') {
            mockFsCurrentDirectory = targetNode;
            return true;
        }
        return false;
    },
  };
});

// Dynamically import commands AFTER mocks are set up
let commands: any;
let filesystemModule: typeof filesystemModuleOriginal & { __resetMockFsState: (newRoot?: filesystemModuleOriginal.Directory) => void };

beforeAll(async () => {
  // Reset modules to ensure mocks are freshly applied and localStorage is set.
  vi.resetModules();
  // Re-assign mock for localStorage for this specific module loading context if needed, though top-level should be fine.
  Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

  const commandsModule = await import('./commands');
  commands = commandsModule.commands;
  filesystemModule = await import('./filesystem') as any; // Get the mocked module with our helper
});


describe('Utility Commands (ls, cd, pwd)', () => {
  beforeEach(() => {
    // Reset the state of our mocked filesystem before each test
    filesystemModule.__resetMockFsState();
  });

  describe('ls', () => {
    it('should list contents of current directory (root) by default', async () => {
      const output = await commands.ls([]);
      expect(output).toContain('documents');
      expect(output).toContain('photos');
      expect(output).toContain('config.txt');
    });

    it('should list contents of a specified directory (documents)', async () => {
      const output = await commands.ls(['documents']);
      expect(output).toContain('report.pdf');
      expect(output).not.toContain('photos');
    });

    it('should list contents of an empty directory (photos)', async () => {
      const output = await commands.ls(['photos']);
      expect(output).toBe(''); // Or some message like "empty directory" depending on actual ls impl. Assuming empty string.
    });

    it('should handle listing a file path (shows file name)', async () => {
        // Change to 'documents' directory first using the cd command
        await commands.cd(['documents']);
        // Now current directory in mock FS is 'documents'
        const output = await commands.ls(['report.pdf']); // list report.pdf from current mock dir
        expect(output).toBe('report.pdf');
    });

    it('should return error for non-existent path', async () => {
      const output = await commands.ls(['nonexistent']);
      expect(output).toContain('ls: cannot access \'nonexistent\': No such file or directory');
    });

    it('should list contents relative to current directory', async () => {
        await commands.cd(['documents']); // Change to documents
        const output = await commands.ls([]); // ls current (documents)
        expect(output).toContain('report.pdf');
    });

    it('should list contents of parent directory using "ls .."', async () => {
        await commands.cd(['documents']); // current is ~/documents
        const output = await commands.ls(['..']);
        expect(output).toContain('documents'); // Parent is root, which contains 'documents', 'photos', 'config.txt'
        expect(output).toContain('photos');
        expect(output).toContain('config.txt');
    });
  });

  describe('cd', () => {
    it('should change to a valid directory (documents)', async () => {
      await commands.cd(['documents']);
      expect(filesystemModule.currentDirectory.name).toBe('documents');
    });

    it('should change to root with "~"', async () => {
      await commands.cd(['documents']); // Go somewhere else
      await commands.cd(['~']);
      expect(filesystemModule.currentDirectory.name).toBe('~');
    });

    it('should return error for non-existent path', async () => {
      const output = await commands.cd(['nonexistent']);
      expect(output).toContain('cd: no such file or directory: nonexistent');
      expect(filesystemModule.currentDirectory.name).toBe('~'); // Should not change
    });

    it('should return error when trying to cd into a file', async () => {
      const output = await commands.cd(['config.txt']);
      expect(output).toContain('cd: no such file or directory: config.txt'); // Or specific "not a directory"
      expect(filesystemModule.currentDirectory.name).toBe('~');
    });

    it('should navigate to parent with ".."', async () => {
        await commands.cd(['documents']);
        expect(filesystemModule.currentDirectory.name).toBe('documents');
        await commands.cd(['..']);
        expect(filesystemModule.currentDirectory.name).toBe('~');
    });
  });

  describe('pwd', () => {
    it('should return "~" when at root', async () => {
      const output = await commands.pwd([]);
      expect(output).toBe('~');
    });

    it('should return correct path after cd', async () => {
      await commands.cd(['documents']);
      const output = await commands.pwd([]);
      expect(output).toBe('~/documents');
    });

    it('should return correct path after multiple cds and ".."', async () => {
        // Setup a deeper structure for this test
        const newRootStructure: filesystemModuleOriginal.Directory = { // Use the original type for structure
            type: 'directory', name: '~', children: [
              { type: 'directory', name: 'd1', children: [
                  { type: 'directory', name: 'd2', children: [
                      { type: 'file', name: 'f1.txt'}
                  ]}
              ]}
            ]
        };
        // Reset the mock filesystem to this new structure
        filesystemModule.__resetMockFsState(newRootStructure);

        await commands.cd(['d1']);
        expect(await commands.pwd([])).toBe('~/d1');
        await commands.cd(['d2']);
        expect(await commands.pwd([])).toBe('~/d1/d2');
        await commands.cd(['..']);
        expect(await commands.pwd([])).toBe('~/d1');
        await commands.cd(['..']);
        expect(await commands.pwd([])).toBe('~');
    });
  });
});
