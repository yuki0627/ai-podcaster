import fsPromise from "fs/promises";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import dotenv from "dotenv";
import { GraphAI, AgentFilterFunction } from "graphai";
import * as agents from "@graphai/agents";
import { ttsNijivoiceAgent } from "@graphai/tts_nijivoice_agent";
import { ttsOpenaiAgent } from "@graphai/tts_openai_agent";
import { fileWriteAgent, pathUtilsAgent } from "@graphai/vanilla_node_agents";
import ffmpeg from "fluent-ffmpeg";

dotenv.config();

type ScriptData = {
  "speaker": string;
  "text": string;
};

type JSONData = {
  "title": string;
  "description": string;
  "reference": string;
  "script": ScriptData[];
}


const rion_takanashi_voice = "b9277ce3-ba1c-4f6f-9a65-c05ca102ded0" // たかなし りおん
const ben_carter_voice = "bc06c63f-fef6-43b6-92f7-67f919bd5dae" // ベン・カーター

const combineFiles = async (inputs: { jsonData: JSONData; name: string }) => {
  const { name, jsonData } = inputs;
  const outputFile = path.resolve("./output/" + name + ".mp3");
  const silentPath = path.resolve("./music/silent300.mp3");
  const silentLastPath = path.resolve("./music/silent800.mp3");
  const command = ffmpeg();
  jsonData.script.forEach((element: ScriptData, index: number) => {
    const filePath = path.resolve("./scratchpad/" + element.key + ".mp3");
    const isLast = index === jsonData.script.length - 2;
    command.input(filePath);
    command.input(isLast ? silentLastPath : silentPath);
    // Measure and log the timestamp of each section
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error("Error while getting metadata:", err);
      } else {
        element["duration"] = metadata.format.duration! + (isLast ? 0.8 : 0.3);
      }
    });
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

const addMusic = async (inputs: { voiceFile: string; name: string }) => {
  const { voiceFile, name } = inputs;
  const outputFile = path.resolve("./output/" + name + "_bgm.mp3");
  const musicFile = path.resolve(
    process.env.PATH_BGM ?? "./music/StarsBeyondEx.mp3",
  );
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
  return outputFile;
};

const graph_data = {
  version: 0.5,
  concurrency: 1, // for nijovoice
  nodes: {
    name: {
      value: "",
    },
    jsonData: {
      value: {},
    },
    map: {
      agent: "mapAgent",
      inputs: { rows: ":jsonData.script", script: ":jsonData" },
      graph: {
        nodes: {
          path: {
            agent: "pathUtilsAgent",
            params: {
              method: "resolve",
            },
            inputs: {
              dirs: ["scratchpad", "${:row.key}.mp3"],
            },
          },
          isNiji: {
            agent: "compareAgent",
            inputs: {
              array: [":script.tts", "==", "nijivoice"],
            },
          },
          b: {
            unless: ":isNiji",
            agent: "ttsOpenaiAgent",
            inputs: {
              text: ":row.text",
              file: ":path.path",
            },
          },
          w: {
            agent: "fileWriteAgent",
            priority: 1,
            inputs: {
              file: ":path.path",
              buffer: ":b.buffer",
            },
          },
          v: {
            agent: "compareAgent",
            inputs: {
              array: [":row.speaker", "==", "Host"],
            },
            params: {
              value: {
                true: rion_takanashi_voice,
                false: ben_carter_voice,
              },
            },
          },
          b2: {
            if: ":isNiji",
            agent: "ttsNijivoiceAgent",
            inputs: {
              file: ":path.path",
              text: ":row.text",
              voiceId: ":v",
            },
          },
          w2: {
            agent: "fileWriteAgent",
            priority: 1,
            inputs: {
              file: ":path.path",
              buffer: ":b2.buffer",
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
        name: ":name",
      },
      isResult: true,
    },
    title: {
      agent: "copyAgent",
      params: {
        namedKey: "title",
      },
      console: {
        after: true,
      },
      inputs: {
        title:
          "\n${:jsonData.title}\n\n${:jsonData.description}\nReference: ${:jsonData.reference}\n",
        waitFor: ":addMusic",
      },
    },
    /*
    translate: {
      agent: "openAIAgent",
      inputs: {
        prompt: "Translate all the text in this JSON file into Japanese, leaving the JSON format as is. \n ${:jsonData.toJSON()}",
      }
    },
    wwriteTranslate: {
      agent: writeTranslatedJson,
      inputs: { jsonData: ":translate.text.jsonParse()", name: ":name" },
    }
    */
  },
};

const fileCacheAgentFilter: AgentFilterFunction = async (context, next) => {
  const { namedInputs } = context;
  const { file } = namedInputs;
  try {
    await fsPromise.access(file);
    console.log("cache hit: " + file);
    return true;
  } catch (e) {
    console.log("no cache: " + file);
    return next(context);
  }
};

const agentFilters = [
  {
    name: "fileCacheAgentFilter",
    agent: fileCacheAgentFilter,
    nodeIds: ["b", "w", "b2", "w2"],
  },
];

const main = async () => {
  const arg2 = process.argv[2];
  const scriptPath = path.resolve(arg2);
  const parsedPath = path.parse(scriptPath);
  const name = parsedPath.name;
  const data = fs.readFileSync(scriptPath, "utf-8");
  const jsonData = JSON.parse(data);
  jsonData.script.forEach((element: ScriptData, index: number) => {
    element["key"] = name + index;
  });

  const graph = new GraphAI(
    graph_data,
    {
      ...agents,
      fileWriteAgent,
      pathUtilsAgent,
      ttsOpenaiAgent,
      ttsNijivoiceAgent,
    },
    { agentFilters },
  );
  graph.injectValue("jsonData", jsonData);
  graph.injectValue("name", name);
  const results = await graph.run();
  console.log(results);

  // const voiceFile = await combineFiles(jsonData, name);
  // await addMusic(jsonData, voiceFile, name);
};

main();
