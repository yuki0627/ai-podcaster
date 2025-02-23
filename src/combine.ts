import "dotenv/config";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const combineWithBGM = async (files: string[], outputFilename: string) => {
  // まず音声ファイルを結合
  const tempOutputFile = path.resolve("./output/temp_" + outputFilename + ".mp3");
  const outputFile = path.resolve("./output/" + outputFilename + "_bgm.mp3");
  
  console.log("Input files:", files.map(f => path.resolve(f)));
  console.log("Temporary output file:", tempOutputFile);
  console.log("Final output file:", outputFile);
  
  const silentPath = path.resolve("./music/silent300.mp3");
  const silentLastPath = path.resolve("./music/silent800.mp3");

  // 1. 音声ファイルの結合
  const combineCommand = ffmpeg();
  for (let i = 0; i < files.length; i++) {
    const filePath = path.resolve(files[i]);
    const isLast = i === files.length - 1;
    combineCommand.input(filePath);
    combineCommand.input(isLast ? silentLastPath : silentPath);
  }

  await new Promise((resolve, reject) => {
    combineCommand
      .on("end", resolve)
      .on("error", reject)
      .mergeToFile(tempOutputFile, path.dirname(tempOutputFile));
  });

  // 2. BGMの追加
  const musicFile = path.resolve(process.env.PATH_BGM ?? "./music/StarsBeyondEx.mp3");

  // BGMファイルの長さを取得
  const bgmDuration = await new Promise<{duration: number, sampleRate: number}>((resolve, reject) => {
    ffmpeg.ffprobe(musicFile, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      const sampleRate = metadata.streams[0].sample_rate ?? 44100;
      const duration = metadata.format.duration ?? 0;
      resolve({ duration, sampleRate });
    });
  });

  // 音声ファイルの長さを取得して BGM を追加
  ffmpeg.ffprobe(tempOutputFile, async (err, metadata) => {
    if (err) {
      throw err;
    }

    const speechDuration = metadata.format.duration;
    const totalDuration = 8 + Math.round(speechDuration ?? 0);
    const numLoops = Math.ceil(totalDuration / bgmDuration.duration);
    const loopSize = Math.floor(bgmDuration.duration * bgmDuration.sampleRate);

    const finalCommand = ffmpeg();
    finalCommand
      .input(musicFile)
      .input(tempOutputFile)
      .complexFilter([
        "[1:a]adelay=4000|4000, volume=4[a1]",
        `[0:a]volume=4,aloop=loop=${numLoops}:size=${loopSize}[a0]`,
        `[a0][a1]amix=inputs=2:dropout_transition=3[amixed]`,
        `[amixed]atrim=0:${totalDuration}[trimmed]`,
        `[trimmed]afade=t=out:st=${totalDuration - 4}:d=4`
      ])
      .save(outputFile);

    await new Promise((resolve, reject) => {
      finalCommand
        .on("end", resolve)
        .on("error", reject);
    });

    // 一時ファイルの削除
    fs.unlinkSync(tempOutputFile);
  });
};

const main = async () => {
  const files = process.argv.slice(2, -1);
  const outputFilename = process.argv[process.argv.length - 1];

  if (files.length < 2) {
    console.error("Usage: combine <file1> <file2> [...files] <output_filename>");
    console.error("Example: yarn combine ./output/file1.mp3 ./output/file2.mp3 combined_output");
    process.exit(1);
  }

  try {
    await combineWithBGM(files, outputFilename);
    console.log("Files combined successfully with BGM!");
    console.log("Output file:", path.resolve(`./output/${outputFilename}_bgm.mp3`));
  } catch (error) {
    console.error("Error combining files:", error);
    process.exit(1);
  }
};

main(); 