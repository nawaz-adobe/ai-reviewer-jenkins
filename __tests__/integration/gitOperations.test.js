const JenkinsAdapter = require('../../src/index');
const { execSync } = require('child_process');
const fs = require('fs');

// Mock external dependencies but allow real git operations for integration testing
jest.mock('@ai-reviewer/core', () => ({
    CodeReviewer: jest.fn().mockImplementation(() => ({
        reviewChanges: jest.fn().mockResolvedValue({
            summary: 'Test summary',
            comments: [],
            metadata: { totalHunks: 1 }
        }),
        formatResults: jest.fn().mockReturnValue('{"summary": "test"}')
    }))
}));

describe('Git Operations Integration Tests', () => {
    let adapter;

    beforeEach(() => {
        adapter = new JenkinsAdapter();
        adapter.params = {
            orgName: 'testorg',
            repoName: 'testrepo',
            prNumber: '123',
            llmApiKey: 'test-key',
            llmEndpoint: 'https://api.openai.com/v1/chat/completions'
        };
    });

    describe('getDiffFromGit', () => {
        it('should handle valid git repository URLs', () => {
            adapter.params.gitUrl = 'https://github.com/microsoft/vscode.git';
            adapter.params.baseBranch = 'main';
            adapter.params.headBranch = 'main';

            // This test will actually try to clone - mock execSync for safety
            const mockExecSync = jest.spyOn(require('child_process'), 'execSync');
            mockExecSync.mockImplementation((command) => {
                if (command.includes('git clone')) {
                    return '';
                } else if (command.includes('git diff')) {
                    return 'diff --git a/test.js b/test.js\n+console.log("test");';
                } else if (command.includes('git fetch')) {
                    return '';
                } else if (command.includes('rm -rf')) {
                    return '';
                }
                return '';
            });

            const result = adapter.getDiffFromGit();
            
            expect(result).toContain('diff --git');
            mockExecSync.mockRestore();
        });

        it('should throw error for invalid git operations', () => {
            adapter.params.gitUrl = 'https://github.com/nonexistent/repo.git';
            adapter.params.baseBranch = 'main';
            adapter.params.headBranch = 'feature';

            const mockExecSync = jest.spyOn(require('child_process'), 'execSync');
            mockExecSync.mockImplementation(() => {
                throw new Error('Git command failed');
            });

            expect(() => adapter.getDiffFromGit()).toThrow('Git diff failed: Git command failed');
            mockExecSync.mockRestore();
        });

        it('should clean up temporary directory on error', () => {
            adapter.params.gitUrl = 'https://github.com/test/repo.git';
            adapter.params.baseBranch = 'main';

            const mockExecSync = jest.spyOn(require('child_process'), 'execSync');
            let cleanupCalled = false;
            
            mockExecSync.mockImplementation((command) => {
                if (command.includes('rm -rf')) {
                    cleanupCalled = true;
                    return '';
                } else {
                    throw new Error('Git operation failed');
                }
            });

            expect(() => adapter.getDiffFromGit()).toThrow();
            expect(cleanupCalled).toBe(true);
            
            mockExecSync.mockRestore();
        });

        it('should handle different branch combinations', () => {
            const mockExecSync = jest.spyOn(require('child_process'), 'execSync');
            mockExecSync.mockImplementation((command) => {
                if (command.includes('git diff main...feature')) {
                    return 'diff content for main...feature';
                }
                return '';
            });

            adapter.params.gitUrl = 'https://github.com/test/repo.git';
            adapter.params.baseBranch = 'main';
            adapter.params.headBranch = 'feature';

            const result = adapter.getDiffFromGit();
            
            expect(result).toBe('diff content for main...feature');
            expect(mockExecSync).toHaveBeenCalledWith(
                expect.stringContaining('git diff main...feature'),
                expect.any(Object)
            );
            
            mockExecSync.mockRestore();
        });

        it('should handle HEAD when no head branch specified', () => {
            const mockExecSync = jest.spyOn(require('child_process'), 'execSync');
            mockExecSync.mockImplementation((command) => {
                if (command.includes('git diff main...HEAD')) {
                    return 'diff content for main...HEAD';
                }
                return '';
            });

            adapter.params.gitUrl = 'https://github.com/test/repo.git';
            adapter.params.baseBranch = 'main';
            adapter.params.headBranch = null;

            const result = adapter.getDiffFromGit();
            
            expect(result).toBe('diff content for main...HEAD');
            
            mockExecSync.mockRestore();
        });
    });

    describe('getDiffFromStdin', () => {
        it('should read diff from stdin with timeout', async () => {
            const mockStdin = {
                setEncoding: jest.fn(),
                on: jest.fn((event, callback) => {
                    if (event === 'data') {
                        // Simulate data chunks
                        setTimeout(() => callback('diff --git a/test.js'), 10);
                        setTimeout(() => callback('\n+console.log("test");'), 20);
                    } else if (event === 'end') {
                        setTimeout(callback, 30);
                    }
                })
            };

            const originalStdin = process.stdin;
            process.stdin = mockStdin;

            const result = await adapter.getDiffFromStdin();
            
            expect(result).toBe('diff --git a/test.js\n+console.log("test");');
            
            process.stdin = originalStdin;
        });

        it('should timeout when stdin takes too long', async () => {
            const mockStdin = {
                setEncoding: jest.fn(),
                on: jest.fn((event, callback) => {
                    // Never call the callbacks to simulate hanging
                })
            };

            const originalStdin = process.stdin;
            process.stdin = mockStdin;

            // Mock setTimeout to immediately trigger timeout
            const originalSetTimeout = global.setTimeout;
            global.setTimeout = (callback, delay) => {
                if (delay === 30000) {
                    callback();
                }
                return originalSetTimeout(callback, 0);
            };

            await expect(adapter.getDiffFromStdin()).rejects.toThrow('Timeout reading from stdin');
            
            process.stdin = originalStdin;
            global.setTimeout = originalSetTimeout;
        });

        it('should handle stdin errors', async () => {
            const mockStdin = {
                setEncoding: jest.fn(),
                on: jest.fn((event, callback) => {
                    if (event === 'error') {
                        setTimeout(() => callback(new Error('Stdin error')), 10);
                    }
                })
            };

            const originalStdin = process.stdin;
            process.stdin = mockStdin;

            await expect(adapter.getDiffFromStdin()).rejects.toThrow('Stdin error');
            
            process.stdin = originalStdin;
        });
    });
});
