import { test, expect } from "@playwright/test";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

async function runScript(
  args: string[]
): Promise<{ output: string; error: string; code: number | null }> {
  return new Promise((resolve) => {
    const process = spawn("parseurl", args, { shell: true });
    let output = "";
    let error = "";

    process.stdout.on("data", (data) => {
      output += data.toString();
    });

    process.stderr.on("data", (data) => {
      error += data.toString();
    });

    process.on("close", (code) => {
      resolve({ output, error, code });
    });
  });
}

// Get the base directory for the tests
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseTestDirectory = path.resolve(__dirname, "./integrationTests");

// Test cases
const tests = [
  {
    description: "Extract single URL with title",
    input: [path.resolve(baseTestDirectory, "singleUrl.txt")],
    expected: { url: "http://www.google.com", title: "Google" },
  },
  {
    description: "Extract last URL from multiple URLs in brackets with title",
    input: [path.resolve(baseTestDirectory, "multipleUrls.txt")],
    expected: { url: "http://www.google.com", title: "Google" },
  },
  {
    description: "Handle nested brackets with title",
    input: [path.resolve(baseTestDirectory, "nested.txt")],
    expected: { url: "http://www.google.com", title: "Google" },
  },
  {
    description: "No URL in input",
    input: [path.resolve(baseTestDirectory, "noUrl.txt")],
    expectedError: "No valid URLs found in input.",
  },
  {
    description: "Handle empty input",
    input: [path.resolve(baseTestDirectory, "emptyInput.txt")],
    expectedError: "No input provided.",
  },
  {
    description: "Handle input with escaped brackets with title",
    input: [path.resolve(baseTestDirectory, "escapedBrackets.txt")],
    expected: { url: "http://www.google.com", title: "Google" },
  },
  {
    description: "Handle invalid URL format",
    input: [path.resolve(baseTestDirectory, "invalidUrl.txt")],
    expectedError: "No valid URLs found in input.",
  },
];

// Playwright test suite
tests.forEach(({ description, input, expected, expectedError }) => {
  test(description, async () => {
    const result = await runScript(input);

    if (expected) {
      expect(result.error.trim()).toBe("");
      expect(result.code).toBe(0);

      const output = JSON.parse(result.output.trim());
      expect(output).toEqual(expected);
    } else if (expectedError) {
      expect(result.error.trim()).toBe(expectedError);
      expect(result.output.trim()).toBe("");
    }
  });
});
