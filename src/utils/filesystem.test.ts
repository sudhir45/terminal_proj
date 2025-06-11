import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Directory, FileSystemNode, File } from './filesystem'; // Ensure File is imported

// Helper to create a deep copy of the filesystem structure for testing
const createInitialFileSystem = (): Directory => {
  // Define the initial structure
  const newRoot: Directory = {
    type: 'directory',
    name: '~',
    children: [
      {
        type: 'directory',
        name: 'documents',
        children: [
          { type: 'file', name: 'report.txt', content: 'A report' },
          { type: 'directory', name: 'empty_folder', children: [] },
        ],
      },
      {
        type: 'directory',
        name: 'projects',
        children: [
          { type: 'file', name: 'README.md', content: 'Project README' },
          { type: 'directory', name: 'src', children: [{ type: 'file', name: 'index.js' }] },
        ],
      },
      { type: 'file', name: '.bashrc', content: 'alias ll="ls -la"' },
    ],
  };

  // Add parent references ( mimicking the logic in filesystem.ts )
  // This test setup also adds parent ref to Files for more robust getAbsolutePath testing
  function addParents(node: Directory, parent?: Directory): void {
    node.parent = parent;
    node.children.forEach(child => {
      if (child.type === 'directory') {
        addParents(child, node);
      } else {
        (child as File & { parent?: Directory }).parent = node; // Assign parent to File type
      }
    });
  }
  addParents(newRoot);
  return newRoot;
};


describe('Virtual File System Tests', () => {
  let fsModule: typeof import('./filesystem');
  let testRoot: Directory;

  beforeEach(async () => {
    vi.resetModules(); // Reset modules before each test to isolate state
    fsModule = await import('./filesystem'); // Dynamically import the module

    testRoot = createInitialFileSystem();
    // Use __setTestState to set the root and currentDirectory for the imported module
    // Also, re-run addParentReferences on the *actual* module's root if it's different
    // from the one just created by createInitialFileSystem for testRoot.
    // The module's root is already processed by addParentReferences in filesystem.ts itself.
    // So, for __setTestState, we must pass a root that also has parent refs.
    fsModule.__setTestState(testRoot, testRoot);
  });

  describe('addParentReferences (tested via initial setup)', () => {
    it('should correctly set parent references on directories and files', () => {
      const documents = fsModule.getNodeByPath('~/documents') as Directory; // Use module's getNodeByPath
      const report = fsModule.getNodeByPath('~/documents/report.txt') as (File & { parent?: Directory });
      const projects = fsModule.getNodeByPath('~/projects') as Directory;
      const src = fsModule.getNodeByPath('~/projects/src') as Directory;
      const indexJs = fsModule.getNodeByPath('~/projects/src/index.js') as (File & { parent?: Directory });

      expect(documents?.parent).toBe(fsModule.root); // Compare with the module's root
      expect(report?.parent).toBe(documents);
      expect(projects?.parent).toBe(fsModule.root);
      expect(src?.parent).toBe(projects);
      expect(indexJs?.parent).toBe(src);
      expect(fsModule.root.parent).toBeUndefined();
    });
  });

  describe('getNodeByPath', () => {
    it('should find root with "~"', () => {
      expect(fsModule.getNodeByPath('~')).toBe(fsModule.root);
    });

    it('should return current directory for "."', () => {
      expect(fsModule.getNodeByPath('.')).toBe(fsModule.currentDirectory); // Initially root
      const documentsDir = fsModule.getNodeByPath('documents') as Directory;
      fsModule.__setTestState(testRoot, documentsDir);
      expect(fsModule.getNodeByPath('.')).toBe(documentsDir);
    });

    it('should return current directory for "" (empty path)', () => {
      expect(fsModule.getNodeByPath('')).toBe(fsModule.currentDirectory); // Initially root
       const documentsDir = fsModule.getNodeByPath('documents') as Directory;
      fsModule.__setTestState(testRoot, documentsDir);
      expect(fsModule.getNodeByPath('')).toBe(documentsDir);
    });

    it('should find directories and files with absolute paths (starting with ~/) ', () => {
      expect(fsModule.getNodeByPath('~/documents')?.name).toBe('documents');
      expect(fsModule.getNodeByPath('~/projects/README.md')?.name).toBe('README.md');
      expect(fsModule.getNodeByPath('~/projects/src/index.js')?.name).toBe('index.js');
    });

    it('should find directories and files with relative paths', () => {
      expect(fsModule.getNodeByPath('documents/report.txt')?.name).toBe('report.txt');
      const documentsDir = fsModule.getNodeByPath('documents') as Directory;
      fsModule.__setTestState(testRoot, documentsDir);
      expect(fsModule.getNodeByPath('report.txt')?.name).toBe('report.txt');
      expect(fsModule.getNodeByPath('../projects/README.md')?.name).toBe('README.md');
    });

    it('should handle ".." navigation correctly', () => {
      const documentsDir = fsModule.getNodeByPath('documents') as Directory;
      fsModule.__setTestState(testRoot, documentsDir);
      expect(fsModule.getNodeByPath('..')).toBe(fsModule.root);

      const srcDir = fsModule.getNodeByPath('~/projects/src') as Directory;
      fsModule.__setTestState(testRoot, srcDir);
      expect(fsModule.getNodeByPath('..')?.name).toBe('projects');
      expect(fsModule.getNodeByPath('../..')).toBe(fsModule.root);
      expect(fsModule.getNodeByPath('../../documents/report.txt')?.name).toBe('report.txt');
    });

    it('should return null for non-existent paths', () => {
      expect(fsModule.getNodeByPath('nonexistent')).toBeNull();
      expect(fsModule.getNodeByPath('documents/nonexistent.txt')).toBeNull();
      expect(fsModule.getNodeByPath('~/nonexistent')).toBeNull();
    });

    it('should return null when trying to navigate into a file', () => {
      expect(fsModule.getNodeByPath('.bashrc/anything')).toBeNull();
      expect(fsModule.getNodeByPath('documents/report.txt/other')).toBeNull();
    });

    it('should stay at root when using ".." from root', () => {
      fsModule.__setTestState(testRoot, testRoot); // current is root
      expect(fsModule.getNodeByPath('..')).toBe(fsModule.root);
      expect(fsModule.getNodeByPath('../..')).toBe(fsModule.root);
    });
  });

  describe('changeDirectory', () => {
    it('should change currentDirectory for valid paths and return true', () => {
      expect(fsModule.changeDirectory('documents')).toBe(true);
      expect(fsModule.currentDirectory.name).toBe('documents');
      expect(fsModule.changeDirectory('../projects/src')).toBe(true);
      expect(fsModule.currentDirectory.name).toBe('src');
    });

    it('should change to root with "~" and ""', () => {
      fsModule.changeDirectory('documents');
      expect(fsModule.changeDirectory('~')).toBe(true);
      expect(fsModule.currentDirectory).toBe(fsModule.root);

      fsModule.changeDirectory('projects/src');
      expect(fsModule.changeDirectory('')).toBe(true);
      expect(fsModule.currentDirectory).toBe(fsModule.root);
    });

    it('should not change currentDirectory for invalid paths and return false', () => {
      const initialDir = fsModule.currentDirectory;
      expect(fsModule.changeDirectory('nonexistent')).toBe(false);
      expect(fsModule.currentDirectory).toBe(initialDir);
      expect(fsModule.changeDirectory('documents/report.txt')).toBe(false);
      expect(fsModule.currentDirectory).toBe(initialDir);
    });

    it('should handle ".." correctly, updating currentDirectory', () => {
        fsModule.changeDirectory('projects/src');
        expect(fsModule.currentDirectory.name).toBe('src');
        expect(fsModule.changeDirectory('..')).toBe(true);
        expect(fsModule.currentDirectory.name).toBe('projects');
        expect(fsModule.changeDirectory('..')).toBe(true);
        expect(fsModule.currentDirectory).toBe(fsModule.root);
        expect(fsModule.changeDirectory('..')).toBe(true);
        expect(fsModule.currentDirectory).toBe(fsModule.root);
    });
  });

  describe('getAbsolutePath', () => {
    beforeEach(() => {
        // If getAbsolutePath has issues with files, we might need to adjust filesystem.ts or test expectations.
        // The createInitialFileSystem in these tests DOES add parent refs to files.
        // The source getAbsolutePath has a known issue string for files if not handled.
        // For these tests to pass for files, getAbsolutePath in filesystem.ts must be fixed.
        // Let's assume it IS fixed to handle files properly using their parent link.
        // If it's not, the file-related tests here will fail, pointing to that specific part of getAbsolutePath.
    });

    it('should return "~" for the root directory itself', () => {
      expect(fsModule.getAbsolutePath('.', fsModule.root)).toBe('~');
      expect(fsModule.getAbsolutePath('~', fsModule.root)).toBe('~');
    });

    it('should return correct absolute paths for directories', () => {
      const documentsDir = fsModule.getNodeByPath('documents', fsModule.root) as Directory;
      expect(fsModule.getAbsolutePath('documents', fsModule.root)).toBe('~/documents');
      expect(fsModule.getAbsolutePath('projects/src', fsModule.root)).toBe('~/projects/src');
      expect(fsModule.getAbsolutePath('.', documentsDir)).toBe('~/documents');
    });

    it('should return correct absolute paths for files if getAbsolutePath is fixed for files', () => {
      // This test relies on getAbsolutePath being able to handle File types.
      // The test setup (createInitialFileSystem) adds parent refs to files.
      // The original getAbsolutePath source code had a placeholder error for files.
      // If that error is still there, these will fail.
      expect(fsModule.getAbsolutePath('documents/report.txt', fsModule.root)).toBe('~/documents/report.txt');
      expect(fsModule.getAbsolutePath('.bashrc', fsModule.root)).toBe('~/.bashrc');

      const projectsDir = fsModule.getNodeByPath('projects', fsModule.root) as Directory;
      fsModule.__setTestState(testRoot, projectsDir); // Set current dir for relative path
      expect(fsModule.getAbsolutePath('README.md', projectsDir)).toBe('~/projects/README.md');
    });

    it('should handle ".." in targetPath for getAbsolutePath', () => {
      const srcDir = fsModule.getNodeByPath('projects/src', fsModule.root) as Directory;
      expect(fsModule.getAbsolutePath('..', srcDir)).toBe('~/projects');
      expect(fsModule.getAbsolutePath('../..', srcDir)).toBe('~');
      expect(fsModule.getAbsolutePath('../../documents', srcDir)).toBe('~/documents');
    });

    it('should return error string for non-existent target paths', () => {
        expect(fsModule.getAbsolutePath('nonexistent', fsModule.root)).toMatch("/error/path/not/found/");
        expect(fsModule.getAbsolutePath('documents/nonexistent.txt', fsModule.root)).toMatch("/error/path/not/found/");
    });

    it('getAbsolutePath for file in sub-subdir (if fixed in source)', () => {
        const srcDir = fsModule.getNodeByPath('projects/src', fsModule.root) as Directory;
        // Again, relies on getAbsolutePath in filesystem.ts being fixed for files.
        expect(fsModule.getAbsolutePath('index.js', srcDir)).toBe('~/projects/src/index.js');
    });
  });
});
