import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';

// ffmpegのパスを設定
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

interface JoinOptions {
  gapDuration?: number; // 曲間のギャップ（秒）
}

const joinMp3Files = async (directoryPath: string, options: JoinOptions = {}) => {
  const gapDuration = options.gapDuration ?? 2; // デフォルトは2秒

  // 指定されたディレクトリからmp3ファイルを取得
  const files = fs.readdirSync(directoryPath)
    .filter(file => file.toLowerCase().endsWith('.mp3'))
    .sort();

  if (files.length === 0) {
    console.error('MP3ファイルが見つかりません。');
    return;
  }

  const outputPath = path.join(directoryPath, 'combined_output.mp3');
  const command = ffmpeg();

  // 各ファイルを入力として追加し、その間にギャップを挿入
  files.forEach((file, index) => {
    const filePath = path.join(directoryPath, file);
    console.log(`Adding file: ${file}`);
    command.input(filePath);
  });

  // フィルターを作成（ギャップを追加）
  const filterComplex = files.map((_, index) => {
    return `[${index}:a]apad=pad_dur=${gapDuration}[a${index}]`;
  }).join(';');

  const concatParts = files.map((_, index) => `[a${index}]`).join('');
  const filterConcat = `${filterComplex};${concatParts}concat=n=${files.length}:v=0:a=1[out]`;

  // Promise化して実行
  await new Promise((resolve, reject) => {
    command
      .complexFilter(filterConcat, 'out')
      .on('end', () => {
        console.log('MP3ファイルの結合が完了しました。');
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

// メイン実行部分
const main = async () => {
  const directoryPath = process.argv[2];
  const gapDuration = process.argv[3] ? parseFloat(process.argv[3]) : undefined;

  if (!directoryPath) {
    console.error('ディレクトリパスを指定してください。');
    process.exit(1);
  }

  try {
    await joinMp3Files(directoryPath, { gapDuration });
  } catch (error) {
    console.error('実行中にエラーが発生しました:', error);
    process.exit(1);
  }
};

main(); 