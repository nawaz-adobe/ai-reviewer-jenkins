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

### Prerequisites
Before starting, ensure you have:
- **Node.js 18+** installed (`node --version`)
- **npm** or **yarn** package manager
- **Git** for repository operations

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

## 🔧 Jenkins Node Setup

### 1. Install Node.js (Required)
Each Jenkins node needs Node.js 18+ installed:

#### Ubuntu/Debian:
```bash
# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version    # Should show v18.x.x or higher
npm --version
```

#### RHEL/CentOS/Amazon Linux:
```bash
# Install Node.js 18 LTS  
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Verify installation
node --version    # Should show v18.x.x or higher
npm --version
```

#### Docker Jenkins:
```dockerfile
# Add to your Jenkins Dockerfile
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs
```

### 2. Install AI Reviewer Dependencies
```bash
# Install required npm packages globally
npm install -g ai-reviewer-core commander dotenv

# OR install in Jenkins workspace
mkdir -p /var/jenkins_home/tools/ai-reviewer
cd /var/jenkins_home/tools/ai-reviewer
npm install ai-reviewer-core commander dotenv
```

### 3. Verify Setup
```bash
node --version    # Should be v18+
git --version     # Git is required for repository operations
npm list -g ai-reviewer-core    # Should show installed version
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