import fs from "fs";
import path from "path";
import OpenAI from "openai";
import dotenv from "dotenv";
import { GraphAI } from 'graphai';
import * as agents from "@graphai/agents";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const sound = async (fileName: string, input: string) => {
  const response = await openai.audio.speech.create({
    model: "tts-1",
    voice: "shimmer",
    // response_format: "aac",
    input,
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  console.log(`sound generated: ${input}, ${buffer.length}`);
  const filePath = path.resolve("./scratchpad/" + fileName);
  await fs.promises.writeFile(filePath, buffer);


}

const foo = async (input: {text:string}) => {
  setTimeout(() => {
    console.log(input.text);
  }, 1000);
};

const graph_data = {
  version: 0.5,
  nodes: {
    script: {
      value: []
    },
    map: {
      agent: "mapAgent",
      inputs: { rows: ":script" },
      graph: {
        nodes: {
          b: {
            agent: foo,
            inputs: {
              text: ":row.text"
            }
          }
        }
      },
    }
  }
};

const main = async () => {
  const arg2 = process.argv[2];
  const scriptPath = path.resolve(arg2);
  const parsedPath = path.parse(scriptPath);
  const data = fs.readFileSync(scriptPath, 'utf-8');
  const jsonData = JSON.parse(data);
  console.log(parsedPath.name);
  console.log(jsonData.title);
  console.log(jsonData.script.length);
  /*
  jsonData.script.map((element, index) => {
    element["key"] = index;
  });
  */

  const graph = new GraphAI(graph_data, { ...agents });
  graph.injectValue("script", jsonData.script);
  const results = await graph.run();
  console.log(results);
}

main();