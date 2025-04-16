import { AgentFunction, AgentFunctionInfo } from "graphai";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import path from "path";
import { PodcastScript } from "../type";

// FFmpegとFFprobeのパスを設定
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const combineFilesAgent: AgentFunction<
  null,
  { fileName: string; script: PodcastScript },
  { script: PodcastScript; combinedFileName: string }
> = async ({ namedInputs }) => {
  const { script, combinedFileName } = namedInputs;
  const outputFile = path.resolve(combinedFileName);
  const silentPath = path.resolve("./music/silent300.mp3");
  const silentLastPath = path.resolve("./music/silent800.mp3");

  console.log("Starting file combination process...");
  console.log("Output file:", outputFile);

  const command = ffmpeg();
  
  // FFmpegの設定を最適化
  command
    .outputOptions([
      '-threads 4',
      '-max_muxing_queue_size 1024'
    ]);

  // 入力ファイルの追加
  script.script.forEach((element: any, index: number) => {
    const filePath = path.resolve("./scratchpad/" + element.filename + ".mp3");
    const isLast = index === script.script.length - 2;
    console.log(`Adding input file: ${filePath}`);
    command.input(filePath);
    command.input(isLast ? silentLastPath : silentPath);
  });

  // 音声ファイルの長さを取得
  const getDuration = (filePath: string): Promise<number> => {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          console.error(`Error getting duration for ${filePath}:`, err);
          reject(err);
          return;
        }
        resolve(metadata.format.duration ?? 0);
      });
    });
  };

  try {
    // 各ファイルの長さを取得してスクリプトに追加
    for (const element of script.script) {
      const filePath = path.resolve("./scratchpad/" + element.filename + ".mp3");
      const duration = await getDuration(filePath);
      element.duration = duration + 0.3; // 無音部分の長さを追加
    }

    // ファイルの結合を実行
    await new Promise((resolve, reject) => {
      command
        .on("start", (cmdLine) => {
          console.log("Started FFmpeg with command:", cmdLine);
        })
        .on("progress", (progress) => {
          console.log("Processing: ", progress.percent?.toFixed(2), "% done");
        })
        .on("end", () => {
          console.log("MP3 files have been successfully combined.");
          resolve(undefined);
        })
        .on("error", (err) => {
          console.error("Error while combining MP3 files:", err);
          reject(err);
        })
        .mergeToFile(outputFile, path.dirname(outputFile));
    });

    return {
      fileName: outputFile,
      script,
    };
  } catch (error) {
    console.error("Failed to combine files:", error);
    throw error;
  }
};

const combineFilesAgentInfo: AgentFunctionInfo = {
  name: "combineFilesAgent",
  agent: combineFilesAgent,
  mock: combineFilesAgent,
  samples: [],
  description: "combineFilesAgent",
  category: ["ffmpeg"],
  author: "satoshi nakajima",
  repository: "https://github.com/snakajima/ai-podcaster",
  license: "MIT",
};

export default combineFilesAgentInfo;
