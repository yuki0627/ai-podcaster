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

const sound = async (filePath: string, input: string, key: string) => {
  const response = await openai.audio.speech.create({
    model: "tts-1",
    voice: "shimmer",
    // response_format: "aac",
    input,
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  console.log(`sound generated: ${key}, ${buffer.length}`);
  await fs.promises.writeFile(filePath, buffer);
};

const text2speech = async (input: { text: string; key: string }) => {
  const filePath = path.resolve("./scratchpad/" + input.key + ".mp3");
  if (fs.existsSync(filePath)) {
    console.log("skpped", input.key);
  } else {
    console.log("generating", input.key);
    await sound(filePath, input.text, input.key);
  }
  return true;
};

const combineFiles = async (inputs: { jsonData: any; name: string }) => {
  const { name, jsonData } = inputs;
  const outputFile = path.resolve("./output/" + name + ".mp3");
  const command = ffmpeg();
  jsonData.script.forEach((element: any) => {
    const filePath = path.resolve("./scratchpad/" + element.key + ".mp3");
    command.input(filePath);
    // Measure and log the timestamp of each section
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error("Error while getting metadata:", err);
      } else {
        element["duration"] = metadata.format.duration;
      }
    });

    // command.input('anullsrc=r=44100:cl=stereo').inputOptions(['-t 0.2']);
  });

  const promise = new Promise((resolve, reject) => {
    command
      .on("end", () => {
        console.log("MP3 files have been successfully combined.");
        resolve(0);
      })
      .on("error", (err: any) => {
        console.error("Error while combining MP3 files:", err);
        reject(err);
      })
      .mergeToFile(outputFile, path.dirname(outputFile));
  });

  await promise;

  const outputScript = path.resolve("./output/" + name + ".json");
  fs.writeFileSync(outputScript, JSON.stringify(jsonData, null, 2));

  return outputFile;
};

const addMusic = async (inputs: {
  jsonData: any;
  voiceFile: string;
  name: string;
}) => {
  const { jsonData, voiceFile, name } = inputs;
  const outputFile = path.resolve("./output/" + name + "_bgm.mp3");
  const musicFile = path.resolve("./music/Theme1ex.mp3");
  ffmpeg.ffprobe(voiceFile, (err, metadata) => {
    if (err) {
      console.error("Error getting metadata: " + err.message);
      return;
    }

    const speechDuration = metadata.format.duration;
    const totalDuration = 8 + Math.round(speechDuration ?? 0);
    console.log("totalDucation:", speechDuration, totalDuration);

    const command = ffmpeg();
    command
      .input(musicFile)
      .input(voiceFile)
      .complexFilter([
        // Add a 2-second delay to the speech
        "[1:a]adelay=4000|4000, volume=4[a1]", // 4000ms delay for both left and right channels
        // Set the background music volume to 0.2
        `[0:a]volume=0.2[a0]`,
        // Mix the delayed speech and the background music
        `[a0][a1]amix=inputs=2:duration=longest:dropout_transition=3[amixed]`,
        // Trim the output to the length of speech + 8 seconds
        `[amixed]atrim=start=0:end=${totalDuration}[trimmed]`,
        // Add fade out effect for the last 4 seconds
        `[trimmed]afade=t=out:st=${totalDuration - 4}:d=4`,
      ])
      .on("error", (err) => {
        console.error("Error: " + err.message);
      })
      .on("end", () => {
        console.log("File has been created successfully");
      })
      .save(outputFile);
  });
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
    map: {
      agent: "mapAgent",
      inputs: { rows: ":jsonData.script" },
      graph: {
        nodes: {
          b: {
            agent: text2speech,
            inputs: {
              text: ":row.text",
              key: ":row.key",
            },
          },
        },
      },
    },
    combineFiles: {
      agent: combineFiles,
      inputs: { map: ":map", jsonData: ":jsonData", name: ":name" },
      isResult: true,
    },
    addMusic: {
      agent: addMusic,
      inputs: {
        voiceFile: ":combineFiles",
        jsonData: ":jsonData",
        name: ":name",
      },
      isResult: true,
    },
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
