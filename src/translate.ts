import fs from "fs";
import path from "path";
import OpenAI from "openai";
import dotenv from "dotenv";
import { GraphAI } from "graphai";
import * as agents from "@graphai/agents";
import ffmpeg from "fluent-ffmpeg";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const writeTranslatedJson = async (inputs: { jsonData: any; name: string }) => {
  const { name, jsonData } = inputs;
  const outputScript = path.resolve("./output/" + name + "_ja.json");
  const textData:string = JSON.stringify(jsonData, null, 2); 
  fs.writeFileSync(outputScript, textData);
  return outputScript;
};

const graph_data = {
  version: 0.5,
  nodes: {
    name: {
      value: "",
    },
    jsonData: {
      value: {},
    },
    translate: {
      agent: "openAIAgent",
      inputs: {
        prompt: "Translate all the text in this JSON file into Japanese, leaving the JSON format as is. Do not tranlate the podcast title, 'Life is Artificial' \n ${:jsonData.toJSON()}",
      }
    },
    writeTranslate: {
      agent: writeTranslatedJson,
      isResult: true,
      inputs: { jsonData: ":translate.text.jsonParse()", name: ":name" },
    }
  },
};

const main = async () => {
  const arg2 = process.argv[2];
  const scriptPath = path.resolve(arg2);
  const parsedPath = path.parse(scriptPath);
  const name = parsedPath.name;
  const data = fs.readFileSync(scriptPath, "utf-8");
  const jsonData = JSON.parse(data);
  jsonData.script.forEach((element: any, index: number) => {
    element["key"] = name + index;
  });

  const graph = new GraphAI(graph_data, { ...agents });
  graph.injectValue("jsonData", jsonData);
  graph.injectValue("name", name);
  const results = await graph.run();
  console.log(results);

  // const voiceFile = await combineFiles(jsonData, name);
  // await addMusic(jsonData, voiceFile, name);
};

main();
