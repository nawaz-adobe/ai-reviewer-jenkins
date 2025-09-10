# AI Reviewer Jenkins - Test Suite

This directory contains comprehensive tests for the AI code reviewer Jenkins integration.

## Test Structure

```
__tests__/
├── unit/                    # Unit tests (fast, no external dependencies)
│   └── input-validation.test.js
├── integration/             # Integration tests (real APIs, require credentials)
│   └── github-api.test.js
├── mocks/                   # Mock implementations for testing
│   ├── @octokit/
│   └── ai-reviewer-core.js
└── setup.js                 # Global test configuration
```

## Running Tests

### Quick Tests (No Credentials Required)
```bash
# Run all tests (skips integration tests without credentials)
npm test

# Run only unit tests (always work)
npm run test:unit

# Run with coverage
npm run test:coverage
```

### Full Integration Tests

To run integration tests with real GitHub API calls, set up environment variables:

```bash
# Required for integration tests
export GITHUB_TOKEN="ghp_your_github_token_here"
export LLM_API_KEY="sk-your_openai_key_here"  
export LLM_ENDPOINT="https://api.openai.com/v1/chat/completions"

# Optional: Test against specific repo (defaults to nawaz-adobe/ai-reviewer-mock)
export TEST_GITHUB_ORG="your-org"
export TEST_GITHUB_REPO="your-test-repo"
export TEST_GITHUB_PR="1"

# Optional: Test enterprise GitHub
export GITHUB_BASE_URL="https://git.corp.adobe.com/api/v3"

# Optional: Enable actual comment posting (BE CAREFUL!)
export TEST_ENABLE_COMMENT_POSTING="true"  # Will post/delete test comments

# Run integration tests
npm run test:integration
```

### Verbose Output
```bash
# See detailed test environment and results
npm run test:verbose
```

## Test Types

### Unit Tests ✅
- **Input validation**: Test parameter validation logic
- **Mocked dependencies**: No external API calls
- **Fast execution**: Complete in <1 second
- **Always run**: No credentials required

### Integration Tests 🔗

#### GitHub API Tests
- **PR diff retrieval**: Real GitHub API calls to fetch PR diffs
- **Comment posting**: Post and cleanup test comments (if enabled)
- **Error handling**: Test 404, 401, 403 API responses
- **Enterprise support**: Test with GitHub Enterprise URLs

#### End-to-End Tests  
- **Full workflow**: Complete review process (with mocked AI)
- **File output**: Verify JSON results structure
- **Environment validation**: Test all required variables

#### Conditional Execution
- Tests automatically skip if credentials are missing
- Safe defaults prevent accidental spam/charges
- Clear logging shows which tests run vs skip

## Test Safety

### GitHub API Rate Limits
- Integration tests use real GitHub API (consumes rate limit)
- Comment posting is opt-in only (`TEST_ENABLE_COMMENT_POSTING=true`)
- Tests clean up after themselves (delete posted comments)

### AI API Costs
- Integration tests use real OpenAI API (costs money)
- Tests use minimal test data to reduce costs
- Consider using a test API key with usage limits

### Repository Setup

For best results, create a dedicated test repository:

```bash
# Example test repo setup
1. Use existing repo: nawaz-adobe/ai-reviewer-mock (default)
2. Create your own test repo with sample code and PRs
3. Set TEST_GITHUB_ORG=your-org TEST_GITHUB_REPO=your-test-repo TEST_GITHUB_PR=1
```

## Debugging Tests

```bash
# Run specific test file
npx jest __tests__/unit/input-validation.test.js

# Run with verbose output and console logs
JEST_VERBOSE=true npx jest --verbose __tests__/integration/github-api.test.js

# Run single test by name
npx jest -t "should validate PR number format"

# Debug integration test with credentials
GITHUB_TOKEN=ghp_xxx LLM_API_KEY=sk_xxx LLM_ENDPOINT=https://api.openai.com/v1/chat/completions \
npx jest --verbose __tests__/integration/github-api.test.js
```

## CI/CD Integration

For GitHub Actions or Jenkins CI:

```yaml
# .github/workflows/test.yml
- name: Run Unit Tests
  run: npm run test:unit

# Only run integration tests if secrets are available
- name: Run Integration Tests  
  if: ${{ secrets.GITHUB_TOKEN && secrets.LLM_API_KEY }}
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    LLM_API_KEY: ${{ secrets.LLM_API_KEY }}
    LLM_ENDPOINT: ${{ secrets.LLM_ENDPOINT }}
  run: npm run test:integration
```

## Mock Documentation

### @octokit/rest Mock
- Provides realistic GitHub API responses
- Supports pulls.get, issues.createComment, repos.get
- Returns sample diff data for testing

### ai-reviewer-core Mock  
- Simulates AI review responses
- Returns structured comments and summary
- No actual LLM API calls or costs
