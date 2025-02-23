import "dotenv/config";
import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

// ffmpegの設定
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const createSimpleVideo = async (audioPath: string, imagePath: string, outputPath: string) => {
  const width = 1920;
  const height = 1080;

  // 音声ファイルの長さを取得
  const audioDuration = await new Promise<number>((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(metadata.format.duration || 0);
    });
  });

  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(imagePath)
      .loop(audioDuration)     // 音声の長さだけ画像をループ
      .input(audioPath)
      .outputOptions([
        `-vf scale=${width}:${height}`,
        '-c:v libx264',
        '-pix_fmt yuv420p',
        '-r 30',
        '-shortest'
      ])
      .duration(audioDuration) // 音声の長さを明示的に指定
      .on('start', () => {
        console.log('動画の作成を開始しました...');
        console.log(`音声の長さ: ${audioDuration}秒`);
      })
      .on('end', () => {
        console.log('動画の作成が完了しました！');
        console.log(`出力ファイル: ${outputPath}`);
        resolve(null);
      })
      .on('error', (err) => {
        console.error('エラーが発生しました:', err);
        reject(err);
      })
      .save(outputPath);
  });
};

const main = async () => {
  // コマンドライン引数の取得
  const audioPath = process.argv[2];
  const imagePath = process.argv[3];
  const outputName = process.argv[4] || 'output';

  if (!audioPath || !imagePath) {
    console.error('使用方法: yarn tsx src/simple_movie.ts <音声ファイル> <画像ファイル> [出力ファイル名]');
    console.error('例: yarn tsx src/simple_movie.ts ./audio.mp3 ./image.png my_video');
    process.exit(1);
  }

  // 出力ディレクトリの確認と作成
  const outputDir = './output';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const outputPath = path.resolve(outputDir, `${outputName}.mp4`);

  try {
    await createSimpleVideo(
      path.resolve(audioPath),
      path.resolve(imagePath),
      outputPath
    );
  } catch (error) {
    console.error('実行中にエラーが発生しました:', error);
    process.exit(1);
  }
};

main(); 