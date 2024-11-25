#!/usr/bin/env node

import axios, { AxiosResponse } from "axios";
import * as crypto from "crypto";
import * as path from "path";
import * as fs from "fs";

const IM_SECRET: string = process.env.IM_SECRET || "default_secret";
const TIMEOUT_BETWEEN_REQUESTS: number = 1000; // 1 second
const RETRY_DELAY: number = 60000; // 1 minute

const emailRegex: RegExp = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;

const visitedUrls: Set<string> = new Set();

export function extractLastUrl(text: string): string | null {
  if (typeof text !== "string" || text.trim() === "") {
    console.error("No input provided.");
    return null;
  }

  // Remove escaped brackets (\[ , \] , \\[ , \\])
  text = text.replace(/\\[\[\]]|\\/g, "");

  let outerContent = "";
  let stackDepth = 0;
  let currentCandidate = "";

  for (const char of text) {
    if (char === "[") {
      if (stackDepth === 0) {
        currentCandidate = "";
      }
      stackDepth++;
    } else if (char === "]") {
      stackDepth--;
      if (stackDepth === 0) {
        outerContent += currentCandidate + " ";
        currentCandidate = "";
      }
    } else if (stackDepth === 1) {
      // Only accumulate characters when we're inside outermost brackets
      currentCandidate += char;
    }
  }
  if (stackDepth !== 0) {
    console.error("No valid URLs found in input.");
    return null;
  }

  const urls = outerContent.match(/\bhttps?:\/\/[^\s]+|www\.[^\s]+/g);

  if (!urls || !urls.length || !isValidUrl(urls[urls.length - 1])) {
    console.error("No valid URLs found in input.");
    return null;
  }

  return urls[urls.length - 1];
}

function isValidUrl(url: string): boolean {
  const urlPattern: RegExp = new RegExp(
    "^(https?:\\/\\/)?" + // validate protocol
      "((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|" + // validate domain name
      "((\\d{1,3}\\.){3}\\d{1,3}))" + // validate OR ip (v4) address
      "(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*" + // validate port and path
      "(\\?[;&a-z\\d%_.~+=-]*)?" + // validate query string
      "(\\#[-a-z\\d_]*)?$",
    "i"
  );
  return !!urlPattern.test(url);
}

function parseResponse(body: string): {
  title: string | null;
  email: string | null;
} {
  const titleMatch = body.match(/<title>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1] : null;

  const emailMatch = body.match(emailRegex);
  const email = emailMatch ? emailMatch[0] : null;

  return { title, email };
}

function hashEmail(email: string): string {
  const hash = crypto.createHmac("sha256", IM_SECRET);
  hash.update(email);
  return hash.digest("hex");
}

async function processUrl(url: string): Promise<void> {
  if (visitedUrls.has(url)) return;
  visitedUrls.add(url);

  try {
    await fetchAndProcess(url);
  } catch (error: any) {
    await retryRequest(url, error.message);
  }
}

async function retryRequest(
  url: string,
  errorMessage: string | null = null
): Promise<void> {
  console.log(`Error: ${errorMessage || "Unknown error"}`);
  setTimeout(async () => {
    try {
      await fetchAndProcess(url);
    } catch (error: any) {
      logError(url, `Retry failed with error: ${error.message}`);
    }
  }, RETRY_DELAY);
}

// Abstracted function to handle URL fetching and processing
async function fetchAndProcess(url: string): Promise<void> {
  const response: AxiosResponse = await axios.get(url);

  if (response.status === 200) {
    const { title, email } = parseResponse(response.data);

    const result: { url: string; title?: string; email?: string } = { url };
    if (title) result.title = title;
    if (email) result.email = hashEmail(email);

    console.log(JSON.stringify(result));
  } else {
    throw new Error(`Request failed with status code ${response.status}`);
  }
}

function logError(url: string, message: string): void {
  console.error(`Error for URL ${url}: ${message}`);
}

export async function runScript(filePath: string) {
  if (!filePath) {
    console.error("No file path provided.");
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(filePath, "utf-8");

  const url = extractLastUrl(fileContent);
  if (url) {
    await new Promise((resolve) =>
      setTimeout(resolve, TIMEOUT_BETWEEN_REQUESTS)
    );
    await processUrl(url.startsWith("http") ? url : `http://${url}`);
  }
}

const inputFilePath = process.argv[2]; // The file path is passed as the first argument
//don't run on unit test
if (!process.argv.some((arg) => arg.includes("playwright"))) {
  const resolvedPath = path.resolve(process.cwd(), inputFilePath);
  runScript(resolvedPath).catch((error) => {
    console.error("Error in script execution:", error);
    process.exit(1);
  });
}
