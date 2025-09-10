// Mock implementation of @octokit/rest for unit tests

const mockOctokit = {
    rest: {
        pulls: {
            get: jest.fn().mockResolvedValue({
                data: 'diff --git a/test.js b/test.js\nindex 123..456 100644\n--- a/test.js\n+++ b/test.js\n@@ -1,3 +1,4 @@\n function test() {\n+  console.log("test");\n   return true;\n }'
            })
        },
        issues: {
            createComment: jest.fn().mockResolvedValue({
                status: 201,
                data: { id: 12345 }
            }),
            deleteComment: jest.fn().mockResolvedValue({
                status: 204
            })
        },
        repos: {
            get: jest.fn().mockResolvedValue({
                status: 200,
                data: { name: 'test-repo', full_name: 'test-org/test-repo' }
            })
        }
    }
};

const Octokit = jest.fn().mockImplementation(() => mockOctokit);

module.exports = { Octokit };
