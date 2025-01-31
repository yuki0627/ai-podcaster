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
  imageInfo: any[]; // generated
};

const rion_takanashi_voice = "b9277ce3-ba1c-4f6f-9a65-c05ca102ded0"; // たかなし りおん
const ben_carter_voice = "bc06c63f-fef6-43b6-92f7-67f919bd5dae"; // ベン・カーター

const combineFiles = async (inputs: { script: PodcastScript }) => {
  const { script } = inputs;
  const outputFile = path.resolve("./output/" + script.filename + ".mp3");
  const silentPath = path.resolve("./music/silent300.mp3");
  const silentLastPath = path.resolve("./music/silent800.mp3");
  const command = ffmpeg();
  script.script.forEach((element: ScriptData, index: number) => {
    const filePath = path.resolve("./scratchpad/" + element.filename + ".mp3");
    const isLast = index === script.script.length - 2;
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

  const outputScript = path.resolve("./output/" + script.filename + ".json");
  fs.writeFileSync(outputScript, JSON.stringify(script, null, 2));

  return outputFile;
};

const addBGM = async (inputs: { voiceFile: string; filename: string }) => {
  const { voiceFile, filename } = inputs;
  const outputFile = path.resolve("./output/" + filename + "_bgm.mp3");
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

const graph_tts: GraphData = {
  nodes: {
    path: {
      agent: "pathUtilsAgent",
      params: {
        method: "resolve",
      },
      inputs: {
        dirs: ["scratchpad", "${:row.filename}.mp3"],
      },
    },
    voice: {
      agent: (namedInputs: any) => {
        const { speaker, voicemap, voice0 } = namedInputs;
        return voicemap[speaker] ?? voice0;
      },
      inputs: {
        speaker: ":row.speaker",
        voicemap: ":script.voicemap",
        voice0: ":script.voices.$0",
      },
    },
    tts: {
      agent: ":script.ttsAgent",
      inputs: {
        text: ":row.text",
        file: ":path.path",
      },
      params: {
        throwError: true,
        voice: ":voice",
        speed: ":script.speed",
      },
    },
  },
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
      inputs: { rows: ":script.script", script: ":script" },
      graph: graph_tts,
    },
    combineFiles: {
      agent: combineFiles,
      inputs: { map: ":map", script: ":script" },
      isResult: true,
    },
    addBGM: {
      agent: addBGM,
      inputs: {
        voiceFile: ":combineFiles",
        filename: ":script.filename",
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
          "\n${:script.title}\n\n${:script.description}\nReference: ${:script.reference}\n",
        waitFor: ":addBGM",
      },
    },
  },
};

const fileCacheAgentFilter: AgentFilterFunction = async (context, next) => {
  const { namedInputs } = context;
  const { file } = namedInputs;
  try {
    await fsPromise.access(file);
    console.log("cache hit: " + file, namedInputs.text.slice(0, 10));
    return true;
  } catch (e) {
    const output = (await next(context)) as Record<string, any>;
    const buffer = output ? output["buffer"] : undefined;
    if (buffer) {
      console.log("writing: " + file);
      await fsPromise.writeFile(file, buffer);
      return true;
    }
    console.log("no cache, no buffer: " + file);
    return false;
  }
};

const agentFilters = [
  {
    name: "fileCacheAgentFilter",
    agent: fileCacheAgentFilter,
    nodeIds: ["tts"],
  },
];

const main = async () => {
  const arg2 = process.argv[2];
  const scriptPath = path.resolve(arg2);
  const parsedPath = path.parse(scriptPath);
  const scriptData = fs.readFileSync(scriptPath, "utf-8");
  const script = JSON.parse(scriptData) as PodcastScript;
  script.filename = parsedPath.name;
  script.script.forEach((element: ScriptData, index: number) => {
    element.filename = script.filename + index;
  });

  // Check if any script changes
  const outputScript = path.resolve("./output/" + script.filename + ".json");
  if (fs.existsSync(outputScript)) {
    const prevData = fs.readFileSync(outputScript, "utf-8");
    const prevScript = JSON.parse(prevData) as PodcastScript;
    console.log("found output script", prevScript.filename);
    script.script.forEach((element: ScriptData, index: number) => {
      const prevText = prevScript.script[index]?.text ?? "";
      if (element.text !== prevText) {
        const filePath = path.resolve(
          "./scratchpad/" + element.filename + ".mp3",
        );
        if (fs.existsSync(filePath)) {
          console.log("deleting", element.filename);
          fs.unlinkSync(filePath);
        }
      }
    });
  }

  if (script.tts === "nijivoice") {
    graph_data.concurrency = 1;
    script.voices = script.voices ?? [rion_takanashi_voice, ben_carter_voice];
    script.ttsAgent = "ttsNijivoiceAgent";
  } else {
    graph_data.concurrency = 8;
    script.voices = script.voices ?? ["shimmer", "echo"];
    script.ttsAgent = "ttsOpenaiAgent";
  }
  const speakers = script.speakers ?? ["Host", "Guest"];
  script.voicemap = speakers.reduce(
    (map: any, speaker: string, index: number) => {
      map[speaker] = script.voices![index];
      return map;
    },
    {},
  );
  script.imageInfo = script.script.map((_: ScriptData, index: number) => {
    return {
      index: index,
    };
  });

  const graph = new GraphAI(
    graph_data,
    {
      ...agents,
      pathUtilsAgent,
      ttsOpenaiAgent,
      ttsNijivoiceAgent,
    },
    { agentFilters },
  );
  graph.injectValue("script", script);
  const results = await graph.run();
  console.log(results);
};

main();
