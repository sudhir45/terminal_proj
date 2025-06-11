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
  writable: true,
  configurable: true // Make it configurable
});

// Mock window object properties - with values expected by sysinfo tests
const baseWindowMock = {
  location: {
    hostname: 'testhost', // Used by sysinfo & global hostname const
  },
  screen: {
    width: 1440, // For sysinfo test
    height: 900,  // For sysinfo test
  },
  innerWidth: 1280, // For sysinfo test
  innerHeight: 800, // For sysinfo test
  document: {
    title: 'Test Terminal SYSINFO', // For sysinfo test
  },
};
// Ensure window is defined and extendable
if (typeof globalThis.window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: baseWindowMock,
    writable: true,
    configurable: true, // Allow redefinition if needed by other tests or setup
  });
} else { // If already defined (e.g. by jsdom via another test file's environment)
  // Augment existing window mock, being careful not to overwrite essential jsdom props
  Object.assign(globalThis.window, baseWindowMock);
  if (!globalThis.window.document) globalThis.window.document = baseWindowMock.document;
  if (!globalThis.window.screen) globalThis.window.screen = baseWindowMock.screen;
}


// Mock navigator object
const navigatorMock = {
  platform: 'TestPlatform SYSINFO', // For sysinfo test fallback
  userAgentData: {
    platform: 'TestUAPlatform SYSINFO', // For sysinfo test primary
  },
};
Object.defineProperty(globalThis, 'navigator', {
  value: navigatorMock,
  writable: true,
  configurable: true,
});


// Mock Date.now() globally BEFORE commands.ts (and its startTime) is imported
const initialMockedDateNow = 1700000000000; // This will be value for startTime in commands.ts
let globalDateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(initialMockedDateNow);


// THEN import vitest utilities AND THEN vi.mock calls
import { describe, it, expect, beforeEach, vi, beforeAll, afterEach } from 'vitest';
import * as filesystemModuleOriginal from './filesystem'; // Keep original type, but we mock it
// Import 'get' for reading store value.
import { get } from 'svelte/store';
// actualThemeStore will be imported dynamically in sysinfo's beforeEach
import type { Theme } from '../interfaces/theme'; // For theme type

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
  // Reset modules to ensure mocks are freshly applied and globals are set for the fresh module load.
  vi.resetModules();

  // Ensure all global mocks are firmly in place before commands.ts (and its dependencies) are imported.
  // Ensure all global mocks are firmly in place with specific values for this test file's context
  // AFTER vi.resetModules() and BEFORE the application code (commands.ts) is imported.
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true
  });

  // Define the complete window structure expected by sysinfo, directly here.
  const freshWindowMock = {
    location: { hostname: 'testhost' },
    screen: { width: 1440, height: 900 },
    innerWidth: 1280,
    innerHeight: 800,
    document: { title: 'Test Terminal SYSINFO' },
  };
  Object.defineProperty(globalThis, 'window', {
    value: freshWindowMock,
    writable: true,
    configurable: true
  });

  const freshNavigatorMock = {
    platform: 'TestPlatform SYSINFO',
    userAgentData: { platform: 'TestUAPlatform SYSINFO' },
  };
  Object.defineProperty(globalThis, 'navigator', {
    value: freshNavigatorMock,
    writable: true,
    configurable: true
  });
  // Also explicitly define document on globalThis for environments that might need it
  Object.defineProperty(globalThis, 'document', {
    value: freshWindowMock.document, // from freshWindowMock
    writable: true,
    configurable: true
  });

  // globalDateNowSpy (for Date.now) is already set globally and should persist.

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

  describe('cat', () => {
    const catTestFile1Name = 'file1.txt';
    const catTestFile1Content = 'Content of file1';
    const catTestFile2Name = 'file2.txt';
    const catTestFile2Content = 'Content of file2\nwith multiple lines.';
    const catTestDirName = 'mydir';
    const catTestEmptyFileName = 'empty.txt';

    beforeEach(() => {
      // Setup a specific filesystem state for cat tests
      const catTestFs: filesystemModuleOriginal.Directory = {
        type: 'directory',
        name: '~',
        children: [
          { type: 'file', name: catTestFile1Name, content: catTestFile1Content },
          { type: 'file', name: catTestFile2Name, content: catTestFile2Content },
          { type: 'directory', name: catTestDirName, children: [] },
          { type: 'file', name: catTestEmptyFileName, content: ''},
          {
            type: 'directory',
            name: 'anotherdir',
            children: [
                { type: 'file', name: 'nestedfile.txt', content: 'Nested content' }
            ]
          }
        ],
      };
      filesystemModule.__resetMockFsState(catTestFs);
    });

    it('should return usage message for no arguments', async () => {
      const output = await commands.cat([]);
      expect(output).toBe('cat: usage: cat file [...]');
    });

    it('should cat a single valid file', async () => {
      const output = await commands.cat([catTestFile1Name]);
      expect(output).toBe(catTestFile1Content);
    });

    it('should cat an empty file', async () => {
      const output = await commands.cat([catTestEmptyFileName]);
      expect(output).toBe('');
    });

    it('should cat multiple valid files, concatenating with newlines', async () => {
      const output = await commands.cat([catTestFile1Name, catTestFile2Name]);
      expect(output).toBe(`${catTestFile1Content}\n${catTestFile2Content}`);
    });

    it('should return error for a directory', async () => {
      const output = await commands.cat([catTestDirName]);
      expect(output).toBe(`cat: ${catTestDirName}: Is a directory`);
    });

    it('should return error for a non-existent file', async () => {
      const nonExistentFile = 'nonexistent.txt';
      const output = await commands.cat([nonExistentFile]);
      expect(output).toBe(`cat: ${nonExistentFile}: No such file or directory`);
    });

    it('should handle a mix of valid files, directories, and non-existent files', async () => {
      const nonExistentFile = 'nonexistent.txt';
      const output = await commands.cat([
        catTestFile1Name,
        nonExistentFile,
        catTestDirName,
        catTestFile2Name,
      ]);
      const expected = [
        catTestFile1Content,
        `cat: ${nonExistentFile}: No such file or directory`,
        `cat: ${catTestDirName}: Is a directory`,
        catTestFile2Content,
      ].join('\n');
      expect(output).toBe(expected);
    });

    it('should correctly cat file content with newlines', async () => {
        const output = await commands.cat([catTestFile2Name]);
        expect(output).toBe(catTestFile2Content); // Content itself has newlines
    });

    it('should cat files using relative paths from currentDirectory', async () => {
        // cd into 'anotherdir' which contains 'nestedfile.txt'
        await commands.cd(['anotherdir']);
        expect(filesystemModule.currentDirectory.name).toBe('anotherdir');

        const output = await commands.cat(['nestedfile.txt']);
        expect(output).toBe('Nested content');

        // Test catting a file from parent using ..
        const output2 = await commands.cat(['../file1.txt']);
        expect(output2).toBe(catTestFile1Content);
    });
  });

  describe('history', () => {
    let enteredCommandHistoryStore: any; // Renamed to avoid conflict if tests import actual store

    beforeEach(async () => {
      localStorageMock.removeItem('enteredCommandHistory');
      const storesModule = await import('../stores/history'); // Dynamically import for fresh state
      enteredCommandHistoryStore = storesModule.enteredCommandHistory;
      enteredCommandHistoryStore.set([]);
    });

    it('should return "No history yet." if history is empty', () => {
      const output = commands.history([]);
      expect(output).toBe('No history yet.');
    });

    it('should display history with padded line numbers', () => {
      const cmds = ['ls -l', 'cd /documents', 'cat report.txt'];
      enteredCommandHistoryStore.set(cmds);
      const output = commands.history([]);
      const expected = [
        ' 1  ls -l',
        ' 2  cd /documents',
        ' 3  cat report.txt',
      ].join('\n');
      expect(output).toBe(expected);
    });

    it('should display history with correctly padded line numbers for > 9 items', () => {
      const manyCommands = Array.from({ length: 12 }, (_, i) => `command ${i + 1}`);
      enteredCommandHistoryStore.set(manyCommands);
      const output = commands.history([]);
      expect(output).toContain(' 1  command 1');
      expect(output).toContain(' 9  command 9');
      expect(output).toContain('10  command 10');
      expect(output).toContain('12  command 12');
    });

    it('should clear history with "-c" argument and return empty string', () => {
      enteredCommandHistoryStore.set(['cmd1', 'cmd2']);
      localStorageMock.setItem('enteredCommandHistory', JSON.stringify(['cmd1', 'cmd2']));

      const output = commands.history(['-c']);
      expect(output).toBe('');

      const currentHistory = get(enteredCommandHistoryStore);
      expect(currentHistory.length).toBe(0);

      const storedHistory = localStorageMock.getItem('enteredCommandHistory');
      expect(storedHistory === null || storedHistory === '[]').toBe(true);
    });

    it('should display "No history yet." after clearing', () => {
      enteredCommandHistoryStore.set(['cmd1']);
      commands.history(['-c']); // This uses the actual store instance from commands.ts
      // To test the effect, we need to ensure the 'history' command inside commands.ts
      // is using the same 'enteredCommandHistoryStore' instance we are manipulating here.
      // The dynamic import in beforeEach for 'enteredCommandHistoryStore' is for this test's direct use.
      // The 'history' command in commands.ts uses its own imported 'enteredCommandHistory'.
      // If `vi.resetModules()` is not run before *each test group that needs fresh stores*, this can desync.
      // The `beforeAll` in this file runs `vi.resetModules()` once.
      // For this test to be reliable, `commands.history` must see the cleared state.
      // The `enteredCommandHistory.set([])` in this suite's beforeEach should affect the instance used by commands.ts
      // because `commands.ts` imports it, and it's not separately mocked here.
      const output = commands.history([]);
      expect(output).toBe('No history yet.');
    });

    it('should display history if called with unknown arguments (not -c)', () => {
      enteredCommandHistoryStore.set(['ls', 'pwd']);
      const output = commands.history(['foo']);
      expect(output).toContain('1  ls');
      expect(output).toContain('2  pwd');
    });
  });

  describe('sysinfo', () => {
    // globalDateNowSpy is already set up. We will manipulate its mockReturnValue in tests.
    // initialMockedDateNow is the timestamp commands.ts's startTime will get.
    let actualThemeStore: any; // To hold dynamically imported theme store

    beforeEach(async () => { // Made async for dynamic import
      const themeModule = await import('../stores/theme');
      actualThemeStore = themeModule.theme;

      actualThemeStore.set({
        name: 'test-theme-sysinfo',
        foreground: '#fff',
        background: '#000',
        cursor: '#fff',
        scrollback: '#000'
      } as Theme);

      // Specific window/navigator values for sysinfo tests are set in the global mocks at the top.
      // If a test needs to deviate, it can modify globalThis.window/navigator properties here
      // and restore them in its own afterEach. For current tests, global setup is sufficient.

      // Reset Date.now spy to the initial value that commands.ts's startTime would have used.
      // Specific tests will then advance this mock to simulate uptime.
      globalDateNowSpy.mockReturnValue(initialMockedDateNow);
    });

    afterEach(() => {
      // Restore Date.now spy to its original implementation (or a default mock)
      // after the sysinfo tests are done to avoid affecting other test suites.
      globalDateNowSpy.mockRestore();
      // Re-establish a default mock if other tests in this file might need Date.now mocked generally.
      // Or, if this is the last suite using it, mockRestore() is enough.
      // For safety, let's re-establish it for any other potential tests in this file.
      globalDateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(initialMockedDateNow);
    });

    it('should return a string containing key system information', async () => {
      const output = await commands.sysinfo([]);
      expect(output).toBeTypeOf('string');

      // Check for ASCII art presence (e.g., first line)
      expect(output).toContain("TTTTT WW   WW");

      // Check for key information labels
      expect(output).toContain("OS:");
      expect(output).toContain("Host:");
      expect(output).toContain("Kernel:");
      expect(output).toContain("Version:");
      expect(output).toContain("Uptime:");
      expect(output).toContain("Shell:");
      expect(output).toContain("Theme:");
      expect(output).toContain("Resolution:");
      expect(output).toContain("Terminal:");

      // Check for some specific mocked values
      expect(output).toContain("TestUAPlatform SYSINFO"); // From userAgentData
      expect(output).toContain("testhost"); // From global window.location.hostname mock
      expect(output).toContain("test-theme-sysinfo");
      expect(output).toContain("1280x800 (Viewport)");
      expect(output).toContain("Test Terminal SYSINFO");

      // Initial sysinfo call for most checks
      const initialOutput = await commands.sysinfo([]); // Use a different name for the first call

      expect(initialOutput).toBeTypeOf('string');
      // Check for ASCII art presence (e.g., first line)
      expect(initialOutput).toContain("TTTTT WW   WW");

      // Check for key information labels
      expect(initialOutput).toContain("OS:");
      expect(initialOutput).toContain("Host:");
      expect(initialOutput).toContain("Kernel:");
      expect(initialOutput).toContain("Version:");
      // Uptime label will be checked, specific value later
      expect(initialOutput).toContain("Uptime:");
      expect(initialOutput).toContain("Shell:");
      expect(initialOutput).toContain("Theme:");
      expect(initialOutput).toContain("Resolution:");
      expect(initialOutput).toContain("Terminal:");

      // Check for some specific mocked values (OS, Host, Theme, Resolution, Terminal)
      expect(initialOutput).toContain("OS: TestUAPlatform SYSINFO");
      expect(initialOutput).toContain("Host: testhost");
      expect(initialOutput).toContain("Theme: test-theme-sysinfo");
      expect(initialOutput).toContain("Resolution: 1280x800 (Viewport)");
      expect(initialOutput).toContain("Terminal: Test Terminal SYSINFO");

      // Now specifically test precise uptime by re-calling sysinfo after setting Date.now
      globalDateNowSpy.mockReturnValue(initialMockedDateNow + 5 * 1000);
      const outputForUptime = await commands.sysinfo([]); // Use a new variable name
      expect(outputForUptime).toContain("Uptime: 5s");
    });

    it('should use navigator.platform if userAgentData.platform is not available', async () => {
        const originalNavigator = globalThis.navigator;
        Object.defineProperty(globalThis, 'navigator', {
            value: { platform: 'FallbackPlatformGlobal' }, // No userAgentData
            writable: true, configurable: true
        });

        const output = await commands.sysinfo([]);
        expect(output).toContain("OS: FallbackPlatformGlobal");

        Object.defineProperty(globalThis, 'navigator', { value: originalNavigator, writable: true, configurable: true }); // Restore
    });

    it('should handle different uptime formatting (e.g. > 1 minute, > 1 hour)', async () => {
        // Uptime: 70 seconds -> 1m 10s
        globalDateNowSpy.mockReturnValue(initialMockedDateNow + 70 * 1000);
        let output = await commands.sysinfo([]);
        expect(output).toContain("Uptime: 1m 10s");

        // Uptime: 3670 seconds -> 1h 1m 10s
        globalDateNowSpy.mockReturnValue(initialMockedDateNow + 3670 * 1000);
        output = await commands.sysinfo([]);
        expect(output).toContain("Uptime: 1h 1m 10s");
    });

  });
});
