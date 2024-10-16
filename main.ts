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

const foo = async (input: { text:string, key:string }) => {
  const filePath = path.resolve("./scratchpad/" + input.key + ".txt");
  if (fs.existsSync(filePath)) {
    console.log("skpped", input.key);
  } else {
    console.log("generating", input.key);
    fs.writeFileSync(filePath, input.text);
  }
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
              text: ":row.text",
              key: ":row.key"
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
  const name = parsedPath.name;
  const data = fs.readFileSync(scriptPath, 'utf-8');
  const jsonData = JSON.parse(data);
  jsonData.script.forEach((element:any, index: number) => {
    element["key"] = name + index;
  });

  const graph = new GraphAI(graph_data, { ...agents });
  graph.injectValue("script", jsonData.script);
  const results = await graph.run();
  console.log(results);
}

main();