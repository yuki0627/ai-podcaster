#!/usr/bin/env node
import path from 'path';

const main = () => {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Error: Please provide a file path as an argument.");
    process.exit(1);
  }

  const GITHUB_BASE_URL = "https://github.com/yuki0627/ai-podcaster/blob/fix/local-environment/";

  // URL1: draft/xxxx/yyyy.json -> output/xxxx/yyyy_bgm.mp3
  const parsedPath = path.parse(filePath);
  const datePart = path.basename(parsedPath.dir); // xxxx (e.g., 2025-05-26)
  const baseNameWithoutExt = parsedPath.name; // yyyy (e.g., koto_roudoku)
  
  const url1Path = `output/${baseNameWithoutExt}_bgm.mp3`;
  const url1 = `${GITHUB_BASE_URL}${url1Path}`;

  // URL2: draft/xxxx/yyyy.json -> draft/xxxx/yyyy.json
  const url2 = `${GITHUB_BASE_URL}${filePath}`;

  console.log(url1);
  console.log(url2);
};

main(); 