import fs from "fs";
import path from "path";
import { ScriptData, PodcastScript } from "./type";


const main = async () => {
  const arg2 = process.argv[2];
  const scriptPath = path.resolve(arg2);
  const scriptData = fs.readFileSync(scriptPath, "utf-8");
  const script = JSON.parse(scriptData) as PodcastScript;

  const prompt = fs.readFileSync("./prompts/image_prompt.md", "utf-8");
  console.log(prompt);

  // fs.writeFileSync(scriptPath, JSON.stringify(script, null, 2));
};

main();
