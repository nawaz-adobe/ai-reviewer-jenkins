const { validateInputs } = require('../../src/index');

describe('Input Validation', () => {
    describe('validateInputs', () => {
        test('should accept valid org, repo, and PR number', () => {
            expect(() => validateInputs('myorg', 'myrepo', '123')).not.toThrow();
            expect(() => validateInputs('adobe', 'test-repo', '1')).not.toThrow();
            expect(() => validateInputs('test_org', 'repo-name', '999')).not.toThrow();
        });

        test('should reject empty or missing parameters', () => {
            expect(() => validateInputs('', 'repo', '123')).toThrow('Organization, repository, and PR number are required');
            expect(() => validateInputs('org', '', '123')).toThrow('Organization, repository, and PR number are required');
            expect(() => validateInputs('org', 'repo', '')).toThrow('Organization, repository, and PR number are required');
            expect(() => validateInputs(null, 'repo', '123')).toThrow('Organization, repository, and PR number are required');
            expect(() => validateInputs('org', null, '123')).toThrow('Organization, repository, and PR number are required');
            expect(() => validateInputs('org', 'repo', null)).toThrow('Organization, repository, and PR number are required');
        });

        test('should reject invalid organization names', () => {
            expect(() => validateInputs('org with spaces', 'repo', '123')).toThrow('Invalid organization or repository name');
            expect(() => validateInputs('org@special', 'repo', '123')).toThrow('Invalid organization or repository name');
            expect(() => validateInputs('org.with.dots', 'repo', '123')).toThrow('Invalid organization or repository name');
            expect(() => validateInputs('org$pecial', 'repo', '123')).toThrow('Invalid organization or repository name');
        });

        test('should reject invalid repository names', () => {
            expect(() => validateInputs('org', 'repo with spaces', '123')).toThrow('Invalid organization or repository name');
            expect(() => validateInputs('org', 'repo@special', '123')).toThrow('Invalid organization or repository name');
            expect(() => validateInputs('org', 'repo.with.dots', '123')).toThrow('Invalid organization or repository name');
            expect(() => validateInputs('org', 'repo$pecial', '123')).toThrow('Invalid organization or repository name');
        });

        test('should reject invalid PR numbers', () => {
            expect(() => validateInputs('org', 'repo', 'abc')).toThrow('PR number must be numeric');
            expect(() => validateInputs('org', 'repo', '12.3')).toThrow('PR number must be numeric');
            expect(() => validateInputs('org', 'repo', '12a')).toThrow('PR number must be numeric');
            expect(() => validateInputs('org', 'repo', '-123')).toThrow('PR number must be numeric');
            expect(() => validateInputs('org', 'repo', '0')).not.toThrow(); // 0 is valid (though unusual)
        });

        test('should accept alphanumeric, hyphens, and underscores in names', () => {
            expect(() => validateInputs('test-org_123', 'my-repo_456', '789')).not.toThrow();
            expect(() => validateInputs('Adobe', 'Test-Repo', '1')).not.toThrow();
            expect(() => validateInputs('123org', '456repo', '999')).not.toThrow();
        });
    });
});
