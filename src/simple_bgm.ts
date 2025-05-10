import "dotenv/config";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const addBgmToTalk = async (talkFile: string, bgmFile: string, outputFilename: string) => {
  // トークファイルのディレクトリを取得して出力パスを設定
  const talkDir = path.dirname(talkFile);
  const outputFile = path.join(talkDir, outputFilename + ".wav");
  
  console.log("Talk file:", path.resolve(talkFile));
  console.log("BGM file:", path.resolve(bgmFile));
  console.log("Output file:", outputFile);
  
  // トークファイルの長さを取得
  const talkDuration = await new Promise<number>((resolve, reject) => {
    ffmpeg.ffprobe(talkFile, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      const duration = metadata.format.duration ?? 0;
      resolve(duration);
    });
  });

  // BGMファイルの長さを取得
  const bgmData = await new Promise<{duration: number, sampleRate: number}>((resolve, reject) => {
    ffmpeg.ffprobe(bgmFile, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      const sampleRate = metadata.streams[0].sample_rate ?? 44100;
      const duration = metadata.format.duration ?? 0;
      resolve({ duration, sampleRate });
    });
  });

  // BGMがトークより短い場合はループさせる
  const numLoops = Math.ceil(talkDuration / bgmData.duration);
  const loopSize = Math.floor(bgmData.duration * bgmData.sampleRate);

  // ffmpegコマンドの設定
  const command = ffmpeg();
  command
    .input(bgmFile)
    .input(talkFile)
    .complexFilter([
      // BGMの音量を下げ、必要に応じてループ
      `[0:a]volume=0.3,aloop=loop=${numLoops}:size=${loopSize}[bgm]`,
      // トークの音量を調整
      "[1:a]volume=1.0[talk]",
      // BGMとトークを合成
      "[bgm][talk]amix=inputs=2:duration=longest:dropout_transition=2[out]"
    ])
    .outputOptions(['-map [out]'])
    .save(outputFile);

  return new Promise((resolve, reject) => {
    command
      .on("end", () => {
        console.log("BGM added to talk successfully!");
        resolve(outputFile);
      })
      .on("error", (err) => {
        console.error("Error adding BGM to talk:", err);
        reject(err);
      });
  });
};

const main = async () => {
  if (process.argv.length < 4 || process.argv.length > 5) {
    console.error("Usage: simple-bgm <talk_file> <bgm_file> [output_filename]");
    console.error("Example: yarn simple-bgm ./input/talk.wav ./music/bgm.wav");
    console.error("If output_filename is omitted, the input filename with '_bgm' will be used");
    process.exit(1);
  }

  const talkFile = process.argv[2];
  const bgmFile = process.argv[3];
  
  // 出力ファイル名が指定されていない場合は、トークファイル名に_bgmを付ける
  let outputFilename = process.argv[4];
  if (!outputFilename) {
    const talkFileName = path.basename(talkFile, path.extname(talkFile));
    outputFilename = talkFileName + "_bgm";
  }

  try {
    await addBgmToTalk(talkFile, bgmFile, outputFilename);
    // トークファイルと同じディレクトリに保存されるので、そのパスを表示
    const talkDir = path.dirname(talkFile);
    const outputFile = path.join(talkDir, outputFilename + ".wav");
    console.log("Output file:", outputFile);
  } catch (error) {
    console.error("Error processing files:", error);
    process.exit(1);
  }
};

main(); 