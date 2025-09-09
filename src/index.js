#!/usr/bin/env node

/**
 * Jenkins AI Code Reviewer
 * 
 * Uses ai-reviewer-core for the actual review logic
 */

require('dotenv').config();
const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { CodeReviewer } = require('ai-reviewer-core');
const { 
    validateGitUrl, 
    validateBranchName, 
    validateFilePath, 
    createSecureTempDir,
    validateEnvVar,
    escapeShellArg
} = require('./security');

class JenkinsAdapter {
    constructor() {
        this.reviewer = new CodeReviewer();
        this.params = {};
    }

    /**
     * Parse command line parameters
     */
    parseParameters() {
        const program = new Command();
        
        program
            .name('ai-reviewer')
            .description('AI-powered code review for Jenkins')
            .version(require('../package.json').version)
            .argument('[org]', 'Organization/owner name')
            .argument('[repo]', 'Repository name')
            .argument('[pr]', 'Pull request number')
            .argument('[git-url]', 'Git repository URL')
            .argument('[base-branch]', 'Base branch', 'main')
            .argument('[head-branch]', 'Head branch')
            .argument('[output-format]', 'Output format (json|markdown|text)', 'json')
            .argument('[output-file]', 'Output file path', 'review-results.json')
            .option('--api-key <key>', 'LLM API key')
            .option('--endpoint <url>', 'LLM API endpoint')
            .option('--diff-file <file>', 'Path to diff file')
            .option('--stdin', 'Read diff from stdin')
            .parse();

        const [org, repo, pr, gitUrl, baseBranch, headBranch, outputFormat, outputFile] = program.args;
        const options = program.opts();

        this.params = {
            orgName: org || process.env.ORG_NAME,
            repoName: repo || process.env.REPO_NAME,
            prNumber: pr || process.env.PR_NUMBER,
            gitUrl: gitUrl || process.env.GIT_URL,
            baseBranch: baseBranch || process.env.BASE_BRANCH || 'main',
            headBranch: headBranch || process.env.HEAD_BRANCH,
            outputFormat: outputFormat || process.env.OUTPUT_FORMAT || 'json',
            outputFile: outputFile || process.env.OUTPUT_FILE || 'review-results.json',
            llmApiKey: options.apiKey || process.env.LLM_API_KEY || process.env.OPENAI_API_KEY,
            llmEndpoint: options.endpoint || process.env.LLM_ENDPOINT || process.env.OPENAI_ENDPOINT,
            diffFile: options.diffFile || process.env.DIFF_FILE,
            useStdin: options.stdin || false
        };

        console.log('🔧 Parameters:', JSON.stringify(this.params, null, 2));
        return this.params;
    }

    /**
     * Validate required parameters and sanitize inputs
     */
    validateParameters() {
        const required = ['orgName', 'repoName', 'prNumber', 'llmApiKey', 'llmEndpoint'];
        const missing = required.filter(param => !this.params[param]);
        
        if (missing.length > 0) {
            throw new Error(`❌ Missing required parameters: ${missing.join(', ')}`);
        }

        const hasDiffSource = this.params.gitUrl || this.params.diffFile || this.params.useStdin;
        if (!hasDiffSource) {
            throw new Error('❌ Must provide either GIT_URL, --diff-file, or --stdin for diff data');
        }

        // Validate and sanitize git URL if provided
        if (this.params.gitUrl) {
            try {
                this.params.gitUrl = validateGitUrl(this.params.gitUrl);
            } catch (error) {
                throw new Error(`❌ Invalid git URL: ${error.message}`);
            }
        }

        // Validate and sanitize branch names if provided
        if (this.params.baseBranch) {
            try {
                this.params.baseBranch = validateBranchName(this.params.baseBranch);
            } catch (error) {
                throw new Error(`❌ Invalid base branch name: ${error.message}`);
            }
        }

        if (this.params.headBranch) {
            try {
                this.params.headBranch = validateBranchName(this.params.headBranch);
            } catch (error) {
                throw new Error(`❌ Invalid head branch name: ${error.message}`);
            }
        }

        // Validate diff file path if provided
        if (this.params.diffFile) {
            try {
                this.params.diffFile = validateFilePath(this.params.diffFile);
            } catch (error) {
                throw new Error(`❌ Invalid diff file path: ${error.message}`);
            }
        }

        // Validate output file path
        if (this.params.outputFile) {
            try {
                this.params.outputFile = validateFilePath(this.params.outputFile);
            } catch (error) {
                throw new Error(`❌ Invalid output file path: ${error.message}`);
            }
        }

        // Validate environment variables
        try {
            validateEnvVar('LLM_API_KEY', this.params.llmApiKey);
            validateEnvVar('LLM_ENDPOINT', this.params.llmEndpoint);
        } catch (error) {
            throw new Error(`❌ ${error.message}`);
        }
    }

    /**
     * Run the Jenkins job workflow
     */
    async run() {
        try {
            console.log('🚀 Starting Jenkins AI Code Review Job');
            
            this.parseParameters();
            this.validateParameters();
            this.setupLLMEnvironment();

            const diffData = await this.getDiffData();
            
            if (!diffData || diffData.trim().length === 0) {
                console.log('ℹ️  No changes found to review');
                this.writeResults({ 
                    summary: 'No changes found', 
                    comments: [], 
                    metadata: { reviewedAt: new Date().toISOString() } 
                });
                return;
            }

            console.log(`📄 Analyzing diff data (${diffData.length} characters)`);

            // Use the core reviewer
            const results = await this.reviewer.reviewChanges(diffData, {
                generateSummary: true,
                context: this.params
            });

            console.log(`✅ Review completed: ${results.comments.length} comments generated`);

            this.writeResults(results);
            this.printSummary(results);

        } catch (error) {
            console.error('❌ Jenkins job failed:', error.message);
            this.writeError(error);
            process.exit(1);
        }
    }

    /**
     * Set up LLM environment variables
     */
    setupLLMEnvironment() {
        if (this.params.llmApiKey) {
            process.env.LLM_API_KEY = this.params.llmApiKey;
        }
        if (this.params.llmEndpoint) {
            process.env.LLM_ENDPOINT = this.params.llmEndpoint;
        }
    }

    /**
     * Get diff data from various sources
     */
    async getDiffData() {
        console.log('📥 Fetching diff data...');

        if (this.params.useStdin) {
            return this.getDiffFromStdin();
        }

        if (this.params.diffFile) {
            return this.getDiffFromFile();
        }

        if (this.params.gitUrl) {
            return this.getDiffFromGit();
        }

        throw new Error('No valid diff data source');
    }

    /**
     * Get diff from file
     */
    getDiffFromFile() {
        if (!fs.existsSync(this.params.diffFile)) {
            throw new Error(`Diff file not found: ${this.params.diffFile}`);
        }
        console.log(`📂 Reading diff from: ${this.params.diffFile}`);
        return fs.readFileSync(this.params.diffFile, 'utf8');
    }

    /**
     * Get diff by cloning repository and comparing branches
     * Uses secure command execution to prevent injection attacks
     */
    getDiffFromGit() {
        // Create secure temporary directory
        const tmpDir = createSecureTempDir();
        const originalCwd = process.cwd();
        
        try {
            console.log(`📦 Cloning repository to ${tmpDir}`);
            
            // Use escaped arguments to prevent command injection
            const gitCloneCmd = `git clone ${escapeShellArg(this.params.gitUrl)} ${escapeShellArg(tmpDir)}`;
            execSync(gitCloneCmd, { stdio: 'inherit' });
            
            process.chdir(tmpDir);
            
            if (this.params.headBranch && this.params.headBranch !== this.params.baseBranch) {
                const fetchCmd = `git fetch origin ${escapeShellArg(this.params.headBranch)}:${escapeShellArg(this.params.headBranch)}`;
                execSync(fetchCmd, { stdio: 'inherit' });
            }
            
            // Build diff command with escaped arguments
            const baseBranch = escapeShellArg(this.params.baseBranch);
            const headBranch = this.params.headBranch ? escapeShellArg(this.params.headBranch) : 'HEAD';
            const diffCommand = `git diff ${baseBranch}...${headBranch}`;
            
            console.log(`🔍 Running: git diff ${this.params.baseBranch}...${this.params.headBranch || 'HEAD'}`);
            
            const diffData = execSync(diffCommand, { encoding: 'utf8' });
            
            // Cleanup - return to original directory first
            process.chdir(originalCwd);
            execSync(`rm -rf ${escapeShellArg(tmpDir)}`);
            
            return diffData;
            
        } catch (error) {
            try {
                // Ensure we return to original directory
                process.chdir(originalCwd);
                // Clean up temporary directory
                execSync(`rm -rf ${escapeShellArg(tmpDir)}`);
            } catch (cleanupError) {
                console.warn(`⚠️  Failed to cleanup temporary directory: ${cleanupError.message}`);
            }
            throw new Error(`Git diff failed: ${error.message}`);
        }
    }

    /**
     * Read diff from stdin
     */
    getDiffFromStdin() {
        console.log('📥 Reading diff from stdin...');
        return new Promise((resolve, reject) => {
            let data = '';
            
            process.stdin.setEncoding('utf8');
            process.stdin.on('data', chunk => data += chunk);
            process.stdin.on('end', () => resolve(data));
            process.stdin.on('error', reject);
            
            setTimeout(() => reject(new Error('Timeout reading from stdin')), 30000);
        });
    }

    /**
     * Write results to output file
     */
    writeResults(results) {
        const outputPath = path.resolve(this.params.outputFile);
        const formattedResults = this.reviewer.formatResults(results, this.params.outputFormat);
        
        fs.writeFileSync(outputPath, formattedResults, 'utf8');
        console.log(`📄 Results written to: ${outputPath}`);
        
        // Also write metadata for Jenkins
        const metadataPath = outputPath.replace(/\.[^.]+$/, '.metadata.json');
        fs.writeFileSync(metadataPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            parameters: this.params,
            summary: {
                totalComments: results.comments?.length || 0,
                totalHunks: results.metadata?.totalHunks || 0,
                hasIssues: (results.comments?.length || 0) > 0
            }
        }, null, 2));
    }

    /**
     * Write error information
     */
    writeError(error) {
        const errorFile = this.params.outputFile.replace(/\.[^.]+$/, '.error.json');
        fs.writeFileSync(errorFile, JSON.stringify({
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            parameters: this.params
        }, null, 2));
    }

    /**
     * Print summary to console
     */
    printSummary(results) {
        console.log('\n' + '='.repeat(60));
        console.log('📊 AI CODE REVIEW SUMMARY');
        console.log('='.repeat(60));
        
        if (results.summary) {
            console.log('\n📝 SUMMARY:');
            console.log(results.summary);
        }
        
        console.log(`\n🔍 ANALYSIS:`);
        console.log(`  • Total hunks reviewed: ${results.metadata?.totalHunks || 0}`);
        console.log(`  • Comments generated: ${results.comments?.length || 0}`);
        console.log(`  • Files analyzed: ${new Set(results.comments?.map(c => c.filename)).size || 0}`);
        
        if (results.comments && results.comments.length > 0) {
            console.log('\n💬 COMMENTS:');
            results.comments.forEach((comment, index) => {
                console.log(`  ${index + 1}. ${comment.filename}:${comment.line}`);
                console.log(`     ${comment.body.substring(0, 100)}${comment.body.length > 100 ? '...' : ''}`);
            });
        } else {
            console.log('\n✅ No issues found!');
        }
        
        console.log('\n' + '='.repeat(60));
    }
}

// Main execution
if (require.main === module) {
    const adapter = new JenkinsAdapter();
    adapter.run();
}

module.exports = JenkinsAdapter;
