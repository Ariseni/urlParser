import { test, expect } from "@playwright/test";
import { extractLastUrl } from "../src/url-parser";

const tests = [
  { input: "[www.google.com]", expected: "www.google.com" },
  { input: "[www.first.com www.second.com]", expected: "www.second.com" },
  { input: "[ [www.first.com] www.second.com]", expected: "www.second.com" },
  { input: "[www.first.com [www.third.com]]", expected: "www.first.com" },
  { input: "no brackets here", expected: null },
  { input: "[some text www.example.com]", expected: "www.example.com" },
  { input: "[\\[escaped.com]]", expected: null },
  { input: "text [some text \\[escaped.com] more text]", expected: null },
  {
    input: "[http://example.com https://example.org]",
    expected: "https://example.org",
  },
];

test.describe("URL Extraction Function Tests", () => {
  tests.forEach(({ input, expected }, idx) => {
    test(`Test case ${idx + 1}: Input = "${input}"`, async () => {
      const result = extractLastUrl(input);
      console.log(`Result for test case ${idx + 1}:`, result);

      if (expected === null) {
        expect(result).toBeNull();
      } else {
        expect(result).toBe(expected);
      }
    });
  });
});
