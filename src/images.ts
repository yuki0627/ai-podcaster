import dotenv from "dotenv";
import OpenAI from "openai";
import fs from "fs";
import path from "path";
import {
  GraphAI,
  GraphData,
} from "graphai";
import * as agents from "@graphai/agents";
// import { ttsNijivoiceAgent } from "@graphai/tts_nijivoice_agent";
import { ttsOpenaiAgent } from "@graphai/tts_openai_agent";
import ttsNijivoiceAgent from "./agents/tts_nijivoice_agent";
// import ttsOpenaiAgent from "./agents/tts_openai_agent";
import { pathUtilsAgent } from "@graphai/vanilla_node_agents";
import ffmpeg from "fluent-ffmpeg";

dotenv.config();
const openai = new OpenAI();

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
  imageInfo: any[]; // generated
};

const graph_data: GraphData = {
  version: 0.5,
  concurrency: 8,
  nodes: {
    script: {
      value: {},
    },
    map: {
      agent: "mapAgent",
      inputs: { rows: ":script.imageInfo", script: ":script" },
      graph: {
        nodes: {
          generate: {
            agent: async (namedInputs:{ row: { text:string, index: number}, suffix: string, script: ScriptData }) => {
              console.log(namedInputs.row);
              const response = await openai.images.generate({
                model: "dall-e-3",
                prompt: namedInputs.row.text,
                n: 1,
                size: "1024x1024",// "1792x1024",
              });
              
              console.log(response.data[0].url);
              const imageRes = await fetch(response.data[0].url!);
              const imagePath = path.resolve(`./images/${namedInputs.script.filename}/${namedInputs.row.index}${namedInputs.suffix}.png`);
              const writer = fs.createWriteStream(imagePath);
              if (imageRes.body) {
                const reader = imageRes.body.getReader();
                let done = false;

                while (!done) {
                  const { value, done: readerDone } = await reader.read();
                  if (value) {
                    writer.write(Buffer.from(value));
                  }
                  done = readerDone;
                }
          
                writer.end();
              } else {
                throw new Error("Response body is null or undefined");
              }
                    
              // Return a Promise that resolves when the writable stream is finished
              await new Promise<void>((resolve, reject) => {
                writer.on("finish", resolve);
                writer.on("error", reject);
              });
            },
            inputs: {
              "row": ":row",
              "script": ":script",
              "suffix": "p"
            },
          }
        }
      }
    },
  }
}

const main = async () => {
  const arg2 = process.argv[2];
  const scriptPath = path.resolve(arg2);
  const parsedPath = path.parse(scriptPath);

  const tmScriptPath = path.resolve("./output/" + parsedPath.name + ".json");
  const dataTm = fs.readFileSync(tmScriptPath, "utf-8");
  const jsonDataTm = JSON.parse(dataTm);

  const currentDir = process.cwd();
  const imagesFolderDir = path.join(currentDir, "images");
  if (!fs.existsSync(imagesFolderDir)) {
    fs.mkdirSync(imagesFolderDir);
  }
  const imagesDir = path.join(imagesFolderDir, jsonDataTm.filename);
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir);
  }
  const graph = new GraphAI(
    graph_data,
    {
      ...agents,
    },
  );

  // DEBUG
  jsonDataTm.imageInfo = [jsonDataTm.imageInfo[0]];

  graph.injectValue("script", jsonDataTm);
  const results = await graph.run();
}

main();
