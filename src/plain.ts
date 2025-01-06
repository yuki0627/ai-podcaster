import "dotenv/config";
import fsPromise from "fs/promises";
import fs from "fs";
import path from "path";

type ScriptData = {
  speaker: string;
  text: string;
  duration: number; // generated
  filename: string; // generated
};

type PodcastScript = {
  title: string;
  description: string;
  reference: string;
  tts: string | undefined; // default: openAI
  voices: string[] | undefined;
  speakers: string[] | undefined;
  script: ScriptData[];
  filename: string; // generated
  voicemap: Map<string, string>; // generated
  ttsAgent: string; // generated
};

const main = async () => {
  const arg2 = process.argv[2];
  const scriptPath = path.resolve(arg2);
  // const parsedPath = path.parse(scriptPath);
  const scriptData = fs.readFileSync(scriptPath, "utf-8");
  const script = JSON.parse(scriptData) as PodcastScript;
  script.script.forEach((element: ScriptData) => {
    console.log(element.speaker + ":" + element.text);
  });
};

main();
