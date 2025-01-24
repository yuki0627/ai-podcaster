import "dotenv/config";
import fsPromise from "fs/promises";
import fs from "fs";
import path from "path";
import {
  GraphAI,
  AgentFilterFunction,
  GraphData,
  ComputedNodeData,
  StaticNodeData,
} from "graphai";
import * as agents from "@graphai/agents";
// import { ttsNijivoiceAgent } from "@graphai/tts_nijivoice_agent";
import { ttsOpenaiAgent } from "@graphai/tts_openai_agent";
import ttsNijivoiceAgent from "./agents/tts_nijivoice_agent";
// import ttsOpenaiAgent from "./agents/tts_openai_agent";
import { pathUtilsAgent } from "@graphai/vanilla_node_agents";
import ffmpeg from "fluent-ffmpeg";

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
  const parsedPath = path.parse(scriptPath);
  const scriptData = fs.readFileSync(scriptPath, "utf-8");
  const script = JSON.parse(scriptData) as PodcastScript;
  script.filename = parsedPath.name;

  console.log(script.filename);
  const currentDir = process.cwd();
  const imagesFolderDir = path.join(currentDir, "images");
  if (!fs.existsSync(imagesFolderDir)) {
    fs.mkdirSync(imagesFolderDir);
  }
  const imagesDir = path.join(imagesFolderDir, script.filename);
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir);
  }
  const filtered = script.script.filter((element: ScriptData) => {
    return element.speaker !== "Announcer";
  });
  const sentances = filtered.map((element: ScriptData, index: number) => {
    if (index === 0) {
      return element.text;
    }
    return `${filtered[index-1].text}\n${element.text}`;
  });
  console.log(sentances);
}

main();
