# AI Code Reviewer - Jenkins Integration

> Jenkins job integration for AI-powered code reviews using [@ai-reviewer/core](https://www.npmjs.com/package/@ai-reviewer/core)

[![Core Version](https://img.shields.io/npm/v/@ai-reviewer/core.svg)](https://www.npmjs.com/package/@ai-reviewer/core)
[![CI](https://github.com/your-org/ai-reviewer-jenkins/workflows/CI/badge.svg)](https://github.com/your-org/ai-reviewer-jenkins/actions)

This package provides Jenkins integration for AI-powered code reviews. It's built on top of the platform-agnostic [@ai-reviewer/core](https://github.com/your-org/ai-reviewer-core) library.

## Features

- 🏗️ **Jenkins Pipeline Integration** - Seamless CI/CD integration
- 📥 **Multiple Input Methods** - Git clone, stdin, or diff files
- 📊 **Multiple Output Formats** - JSON, Markdown, or plain text
- 🎯 **CLI Interface** - Easy parameter configuration
- 📄 **Metadata Generation** - Jenkins-specific build metadata
- 🔄 **Auto-Updates** - Automatic core library updates

## Quick Start

### Installation

```bash
# From NPM (when published)
npm install -g ai-reviewer-jenkins

# Or download from releases
wget https://github.com/your-org/ai-reviewer-jenkins/releases/latest/download/jenkins-reviewer.js
chmod +x jenkins-reviewer.js
```

### Basic Usage

```bash
# Set environment variables
export LLM_API_KEY="your-openai-api-key"
export LLM_ENDPOINT="https://api.openai.com/v1/chat/completions"

# Git-based review
ai-reviewer myorg myrepo 123 https://github.com/myorg/myrepo.git main feature-branch

# Pipe diff from git
git diff main...feature | ai-reviewer myorg myrepo 123 --stdin

# Use existing diff file
ai-reviewer myorg myrepo 123 --diff-file changes.patch
```

## CLI Options

```bash
Usage: ai-reviewer [options] [org] [repo] [pr] [git-url] [base-branch] [head-branch] [output-format] [output-file]

Arguments:
  org                 Organization/owner name
  repo                Repository name
  pr                  Pull request number
  git-url             Git repository URL
  base-branch         Base branch (default: "main")
  head-branch         Head branch
  output-format       Output format (json|markdown|text) (default: "json")
  output-file         Output file path (default: "review-results.json")

Options:
  -V, --version       output the version number
  --api-key <key>     LLM API key
  --endpoint <url>    LLM API endpoint
  --diff-file <file>  Path to diff file
  --stdin             Read diff from stdin
  -h, --help          display help for command
```

## Jenkins Pipeline Integration

### Parameterized Job

```groovy
pipeline {
    agent any
    
    parameters {
        string(name: 'ORG_NAME', defaultValue: 'myorg', description: 'GitHub organization')
        string(name: 'REPO_NAME', defaultValue: 'myrepo', description: 'Repository name')
        string(name: 'PR_NUMBER', defaultValue: '', description: 'Pull request number')
        string(name: 'GIT_URL', defaultValue: '', description: 'Git repository URL')
        choice(name: 'BASE_BRANCH', choices: ['main', 'master', 'develop'], description: 'Base branch')
        string(name: 'HEAD_BRANCH', defaultValue: '', description: 'Head branch')
        choice(name: 'OUTPUT_FORMAT', choices: ['json', 'markdown', 'text'], description: 'Output format')
    }
    
    environment {
        LLM_API_KEY = credentials('llm-api-key')
        LLM_ENDPOINT = credentials('llm-endpoint')
    }
    
    stages {
        stage('AI Code Review') {
            steps {
                sh '''
                    ai-reviewer \
                        "${ORG_NAME}" "${REPO_NAME}" "${PR_NUMBER}" \
                        "${GIT_URL}" "${BASE_BRANCH}" "${HEAD_BRANCH}" \
                        "${OUTPUT_FORMAT}" "review-results.${OUTPUT_FORMAT}"
                '''
            }
        }
        
        stage('Process Results') {
            steps {
                script {
                    // Archive results
                    archiveArtifacts artifacts: 'review-results.*', allowEmptyArchive: true
                    
                    // Read metadata for build decisions
                    if (fileExists('review-results.metadata.json')) {
                        def metadata = readJSON file: 'review-results.metadata.json'
                        echo "Review Summary:"
                        echo "  - Total comments: ${metadata.summary.totalComments}"
                        echo "  - Total hunks: ${metadata.summary.totalHunks}"
                        echo "  - Has issues: ${metadata.summary.hasIssues}"
                        
                        // Set build status based on results
                        if (metadata.summary.hasIssues) {
                            currentBuild.result = 'UNSTABLE'
                            echo "⚠️  Code review found issues - marking build as unstable"
                        } else {
                            echo "✅ No issues found in code review"
                        }
                    }
                }
            }
        }
    }
    
    post {
        always {
            // Clean up temporary files
            sh 'rm -f *.patch'
        }
    }
}
```

### Scripted Pipeline

```groovy
node {
    stage('Checkout') {
        checkout scm
    }
    
    stage('AI Review') {
        withCredentials([
            string(credentialsId: 'llm-api-key', variable: 'LLM_API_KEY'),
            string(credentialsId: 'llm-endpoint', variable: 'LLM_ENDPOINT')
        ]) {
            sh '''
                git diff HEAD~1 > changes.patch
                ai-reviewer myorg myrepo ${BUILD_NUMBER} --diff-file changes.patch
            '''
        }
        
        // Archive and process results
        archiveArtifacts 'review-results.*'
        
        def metadata = readJSON file: 'review-results.metadata.json'
        if (metadata.summary.hasIssues) {
            currentBuild.result = 'UNSTABLE'
        }
    }
}
```

## Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `LLM_API_KEY` | LLM API key | ✅ | `sk-...` |
| `LLM_ENDPOINT` | LLM API endpoint | ✅ | `https://api.openai.com/v1/chat/completions` |
| `ORG_NAME` | Organization name | ✅ | `myorg` |
| `REPO_NAME` | Repository name | ✅ | `myrepo` |
| `PR_NUMBER` | Pull request number | ✅ | `123` |
| `GIT_URL` | Repository URL | ➕ | `https://github.com/myorg/myrepo.git` |
| `BASE_BRANCH` | Base branch | ➕ | `main` |
| `HEAD_BRANCH` | Head branch | ➕ | `feature-branch` |
| `OUTPUT_FORMAT` | Output format | ➕ | `json` |
| `OUTPUT_FILE` | Output file path | ➕ | `review-results.json` |
| `DIFF_FILE` | Path to diff file | ➕ | `changes.patch` |

## Output Files

The tool generates several files for Jenkins integration:

### Main Results (`review-results.json`)
```json
{
  "summary": "Added new feature with proper error handling",
  "comments": [
    {
      "filename": "src/feature.js",
      "line": 42,
      "body": "Consider adding input validation here"
    }
  ],
  "metadata": {
    "reviewedAt": "2024-09-09T13:00:00Z",
    "totalHunks": 5,
    "totalComments": 3
  }
}
```

### Metadata (`review-results.metadata.json`)
```json
{
  "timestamp": "2024-09-09T13:00:00Z",
  "parameters": {
    "orgName": "myorg",
    "repoName": "myrepo",
    "prNumber": "123"
  },
  "summary": {
    "totalComments": 3,
    "totalHunks": 5,
    "hasIssues": true
  }
}
```

## Integration Examples

### Quality Gate
```groovy
def metadata = readJSON file: 'review-results.metadata.json'
if (metadata.summary.totalComments > 10) {
    error("Too many review comments (${metadata.summary.totalComments}). Fix issues before proceeding.")
}
```

### Slack Notification
```groovy
def metadata = readJSON file: 'review-results.metadata.json'
slackSend(
    color: metadata.summary.hasIssues ? 'warning' : 'good',
    message: "AI Review: ${metadata.summary.totalComments} comments found in PR #${PR_NUMBER}"
)
```

### Email Report
```groovy
if (fileExists('review-results.markdown')) {
    def reviewContent = readFile('review-results.markdown')
    emailext(
        subject: "AI Code Review - PR #${PR_NUMBER}",
        body: reviewContent,
        to: "${env.CHANGE_AUTHOR_EMAIL}"
    )
}
```

## Development

### Local Testing

```bash
# Clone repository
git clone https://github.com/your-org/ai-reviewer-jenkins.git
cd ai-reviewer-jenkins

# Install dependencies
npm install

# Build executable
npm run build

# Test with sample diff
echo 'diff --git a/test.js b/test.js
+console.log("test");' > test.patch

export LLM_API_KEY="your-key"
export LLM_ENDPOINT="https://api.openai.com/v1/chat/completions"
./dist/jenkins-reviewer.js testorg testrepo 123 --diff-file test.patch
```

### Building

```bash
npm run build  # Creates dist/jenkins-reviewer.js executable
```

## Troubleshooting

### Common Issues

**"No diff data source available"**
- Provide either `GIT_URL + HEAD_BRANCH`, `--diff-file`, or `--stdin`

**"Missing required parameters"**
- Ensure `LLM_API_KEY`, `LLM_ENDPOINT`, and repository info are provided

**Git clone failures**
- Check repository URL and Jenkins SSH/token access
- Verify branch names exist

**LLM API errors**
- Validate API key and endpoint
- Check rate limits and quotas

## Related Projects

- **[@ai-reviewer/core](https://github.com/your-org/ai-reviewer-core)** - Core review logic
- **[ai-reviewer-action](https://github.com/your-org/ai-reviewer-action)** - GitHub Actions integration

## License

Apache-2.0
