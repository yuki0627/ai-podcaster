import fs from "fs";
import path from "path";
import OpenAI from "openai";
import dotenv from "dotenv";
import { GraphAI } from 'graphai';
import * as agents from "@graphai/agents";
import ffmpeg from 'fluent-ffmpeg';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const sound = async (filePath: string, input: string) => {
  const response = await openai.audio.speech.create({
    model: "tts-1",
    voice: "shimmer",
    // response_format: "aac",
    input,
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  console.log(`sound generated: ${input}, ${buffer.length}`);
  await fs.promises.writeFile(filePath, buffer);
}

const text2speech = async (input: { text:string, key:string }) => {
  const filePath = path.resolve("./scratchpad/" + input.key + ".mp3");
  if (fs.existsSync(filePath)) {
    console.log("skpped", input.key);
  } else {
    console.log("generating", input.key);
    await sound(filePath, input.text);
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
            agent: text2speech,
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

  // Combine the MP3 files using ffmpeg
  const outputFile = path.resolve("./output/" + name + ".mp3");
  const command = ffmpeg();
  jsonData.script.forEach((element: any) => {
    const filePath = path.resolve("./scratchpad/" + element.key + ".mp3");
    command.input(filePath);
      // Measure and log the timestamp of each section
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('Error while getting metadata:', err);
      } else {
        element["duration"] = metadata.format.duration;
      }
    });

    // command.input('anullsrc=r=44100:cl=stereo').inputOptions(['-t 0.2']);
  });

  const promise = new Promise((resolve, reject) => {
    command
    .on('end', () => {
      console.log('MP3 files have been successfully combined.');
      resolve(0);
    })
    .on('error', (err: any) => {
      console.error('Error while combining MP3 files:', err);
      reject(err);
    })
    .mergeToFile(outputFile, path.dirname(outputFile));
  });

  await promise;

  const outputScript = path.resolve("./output/" + name + ".json");
  fs.writeFileSync(outputScript, JSON.stringify(jsonData, null, 2));
}

main();