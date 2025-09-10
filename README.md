# AI Code Reviewer - Jenkins Integration

> **Automate intelligent code reviews in your Jenkins CI/CD pipeline using OpenAI**

Add AI-powered code analysis to any Jenkins pipeline. Get detailed feedback on pull requests, security issues, and code quality automatically.

## ✨ Features

- 🤖 **AI-Powered Reviews** - OpenAI analyzes your code changes
- 🔒 **Security Focused** - Input validation and injection prevention  
- 📊 **Multiple Formats** - JSON, Markdown, or plain text output
- ⚡ **Fast & Lightweight** - ~19KB package, minimal dependencies
- 🔧 **Easy Integration** - Works with any Jenkins setup
- 📝 **Detailed Reports** - Code quality, security, and improvement suggestions

## 🎯 Use Cases

- **Pull Request Reviews** - Automated feedback before merging
- **Security Scanning** - Identify potential vulnerabilities  
- **Code Quality Gates** - Enforce standards in CI/CD
- **Developer Education** - Learn from AI suggestions
- **Legacy Code Analysis** - Understand and improve existing code

## 🚀 Quick Start

### 1. Build Job Package
```bash
npm install
npm run build                    # Generates dist/ai-review-job/
```

### 2. Deploy Package
```bash
# Deploy this package to your Jenkins nodes:
dist/ai-review-job/             # ← Simple job execution package
```

### 3. Usage

#### Direct Usage:
```bash
./ai-review myorg myrepo 123 https://github.com/myorg/myrepo.git main feature-branch
```

#### Jenkins Pipeline
```groovy
pipeline {
    agent any
    environment {
        LLM_API_KEY = credentials('llm-api-key')
        LLM_ENDPOINT = credentials('llm-endpoint')
    }
    stages {
        stage('AI Code Review') {
            steps {
                sh '''
                    /path/to/ai-review-job/ai-review \
                        "${ORG_NAME}" "${REPO_NAME}" "${PR_NUMBER}" \
                        "${GIT_URL}" "${BASE_BRANCH}" "${HEAD_BRANCH}" \
                        "json" "review-results.json"
                '''
            }
        }
    }
}
```

## 📦 What Gets Built

| Package | Location | Size | Purpose |
|---------|----------|------|---------|
| **Job Package** | `dist/ai-review-job/` | ~19KB | Main executable + helper |

**Ultra-simple:** Main executable + minimal helper, works with any Jenkins setup!

### Package Contents:
- `ai-review` - Main executable script
- `ai-security.js` - Security utilities helper

## 🔧 Prerequisites

### Jenkins Node Requirements
Before using the AI review job, ensure each Jenkins node has:

1. **Node.js 18 or higher**
   ```bash
   node --version    # Should be v18+
   ```

2. **Required npm packages** installed globally or in a shared location:
   ```bash
   npm install -g ai-reviewer-core commander dotenv
   # OR install in a shared directory like /var/jenkins_home/node_modules/
   ```

3. **Git** (for repository operations)
   ```bash
   git --version
   ```

### Jenkins Configuration

#### Credentials (Jenkins → Manage → Credentials)
- **`llm-api-key`** (Secret text): Your OpenAI API key
- **`llm-endpoint`** (Secret text): `https://api.openai.com/v1/chat/completions`

### Job Parameters
- **`ORG_NAME`**: GitHub organization 
- **`REPO_NAME`**: Repository name
- **`PR_NUMBER`**: Pull request number
- **`GIT_URL`**: Repository URL
- **`BASE_BRANCH`**: Base branch (main/master/develop)
- **`HEAD_BRANCH`**: Feature branch

## 🔒 Security Features

✅ Input validation & sanitization  
✅ Command injection prevention  
✅ Secure git operations  
✅ Path traversal protection  

## 🏗️ Development

```bash
npm install                     # Setup
npm test                        # Run tests
npm run build                   # Build Jenkins job package
```

## 📄 License

Apache-2.0