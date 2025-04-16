import fs from "fs";
import path from "path";
// ffmpegは他の関数で使用されている可能性があるため残し、コメントとして役割を明記
// eslint-disable-next-line
import ffmpeg from "fluent-ffmpeg"; // renderJapaneseTextToPNG等で使用
import { createCanvas } from "canvas";
import { ScriptData, PodcastScript, ImageInfo } from "./type";
import { exec } from 'child_process';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

type CanvasInfo = {
  width: number;
  height: number;
};

const separateText = (text: string, fontSize: number, actualWidth: number) => {
  let currentLine = "";
  let currentWidth = 0;

  const lines: string[] = [];
  // Iterate over each character and determine line breaks based on character width estimate
  text.split("").forEach((char) => {
    const code = char.charCodeAt(0);
    const isAnsi = code < 255;
    const isCapital = code >= 0x40 && code < 0x60;
    const charWidth = (isAnsi ? (isCapital ? 0.8 : 0.5) : 1) * fontSize;
    const isTrailing = ["。", "、", "？", "！"].includes(char);

    if (char === "\n") {
      lines.push(currentLine);
      currentLine = "";
      currentWidth = 0;
    } else if (currentWidth + charWidth > actualWidth && !isTrailing) {
      lines.push(currentLine);
      currentLine = char;
      currentWidth = charWidth;
    } else {
      currentLine += char;
      currentWidth += charWidth;
    }
  });

  // Push the last line if there's any remaining text
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
};

async function renderJapaneseTextToPNG(
  text: string,
  outputFilePath: string,
  canvasInfo: CanvasInfo,
) {
  const fontSize = 48;
  const paddingX = fontSize * 2;
  const paddingY = 12;
  const lineHeight = fontSize + 8;

  const actualWidth = canvasInfo.width - paddingX * 2;
  const lines = separateText(text, fontSize, actualWidth);

  const textHeight = lines.length * lineHeight + paddingY * 2;
  const textTop = canvasInfo.height - textHeight;

  // Create a canvas and a drawing context
  const canvas = createCanvas(canvasInfo.width, canvasInfo.height);
  const context = canvas.getContext("2d");

  // Set background color
  context.fillStyle = "rgba(0, 0, 0, 0.5)";
  context.fillRect(0, textTop, canvasInfo.width, textHeight);

  // Set text styles
  context.font = `bold ${fontSize}px Arial`;
  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  context.textBaseline = "top";

  // Set shadow properties
  context.shadowColor = "rgba(0, 0, 0, 0.8)";
  context.shadowOffsetX = 5;
  context.shadowOffsetY = 5;
  context.shadowBlur = 10;

  lines.forEach((line: string, index: number) => {
    context.fillText(
      line,
      canvasInfo.width / 2,
      textTop + lineHeight * index + paddingY,
    );
  });

  // Save the image
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(outputFilePath, buffer);

  console.log(`Image saved to ${outputFilePath}`);
}

interface CaptionInfo {
  pathCaption: string;
  imageIndex: number;
  duration: number; // Duration in seconds for each image
}

const createVideo = (
  audioPath: string,
  captions: CaptionInfo[],
  images: ImageInfo[],
  outputVideoPath: string,
  canvasInfo: CanvasInfo,
  __omitCaptions: boolean,
) => {
  // 代替アプローチ - 外部プロセスとしてffmpegを実行
  console.log("Creating simplified video using child process to avoid memory issues...");
  
  // ffmpegのパスを取得
  const ffmpegPath = ffmpegInstaller.path;
  
  // シンプルなffmpegコマンド
  const command = `"${ffmpegPath}" -loop 1 -i "${images[0].image}" -i "${audioPath}" -c:v libx264 -tune stillimage -pix_fmt yuv420p -shortest -vf scale=${canvasInfo.width}:${canvasInfo.height} -b:v 250K -preset ultrafast -profile:v baseline -level 3.0 -c:a aac -b:a 128k -movflags +faststart -t ${captions.reduce((sum, cap) => sum + cap.duration, 0)} "${outputVideoPath}"`;
  
  console.log("Executing command:", command);
  
  // 実行してPromiseを返す
  return new Promise<void>((resolve) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing ffmpeg: ${error.message}`);
        return;
      }
      if (stderr) {
        console.log(`FFmpeg stderr: ${stderr}`);
      }
      console.log(`FFmpeg stdout: ${stdout}`);
      console.log("Simple video created successfully!");
      resolve();
    });
  });
};

const main = async () => {
  const arg2 = process.argv[2];
  const scriptPath = path.resolve(arg2);
  const parsedPath = path.parse(scriptPath);
  const name = parsedPath.name;
  const data = fs.readFileSync(scriptPath, "utf-8");
  const jsonData: PodcastScript = JSON.parse(data);

  // 開発/テスト用に処理を軽くするためのオプション
  const isLightMode = process.env.FFMPEG_LIGHT_MODE === "true";
  
  const tmScriptPath = path.resolve("./output/" + name + ".json");
  const dataTm = fs.readFileSync(tmScriptPath, "utf-8");
  const jsonDataTm: PodcastScript = JSON.parse(dataTm);

  const canvasInfo = {
    width: isLightMode ? 640 : 1280, // 軽量モードではさらに小さく
    height: isLightMode ? 360 : 720, 
  };
  if (jsonData.aspectRatio === "9:16") {
    canvasInfo.width = isLightMode ? 360 : 720;
    canvasInfo.height = isLightMode ? 640 : 1280;
  }

  //
  await renderJapaneseTextToPNG(
    `${jsonData.title}\n\n${jsonData.description}`,
    `./scratchpad/${name}_00.png`, // Output file path
    canvasInfo,
  ).catch((err) => {
    console.error("Error generating PNG:", err);
  });

  const promises = jsonData.script.map((element: ScriptData, index: number) => {
    const imagePath = `./scratchpad/${name}_${index}.png`; // Output file path
    return renderJapaneseTextToPNG(
      element.caption ?? element.text,
      imagePath,
      canvasInfo,
    )
      .then(() => {
        const item = jsonDataTm.script[index];
        const caption: CaptionInfo = {
          pathCaption: path.resolve(imagePath),
          imageIndex: element.imageIndex,
          duration: item.duration,
        };
        return caption;
      })
      .catch((err) => {
        console.error("Error generating PNG:", err);
        throw err;
      });
  });
  const captions: CaptionInfo[] = await Promise.all(promises);

  const audioPath = path.resolve("./output/" + name + "_bgm.mp3");
  const outputVideoPath = path.resolve("./output/" + name + "_ja.mp4");
  const titleInfo: CaptionInfo = {
    pathCaption: path.resolve(`./scratchpad/${name}_00.png`), // HACK
    imageIndex: 0, // HACK
    duration: (jsonData.padding ?? 4000) / 1000,
  };
  
  // 軽量モードでは、限られたキャプションのみを使用
  let useCaptions = [titleInfo].concat(captions);
  
  if (isLightMode && captions.length > 4) {
    // 軽量モードでは最初の数枚のみを使用
    useCaptions = [titleInfo, captions[0], captions[1], captions[2], captions[3]];
    console.log("Light mode enabled: Using only the first 4 captions to save memory");
  }
  
  const images: ImageInfo[] = [];
  if (jsonData.imagePath) {
    images.push({
      index: 0,
      imagePrompt: undefined,
      image: jsonData.imagePath + "001.png",
    });
    images.push({
      index: 0,
      imagePrompt: undefined,
      image: jsonData.imagePath + "002.png",
    });
    images.push({
      index: 0,
      imagePrompt: undefined,
      image: jsonData.imagePath + "003.png",
    });
    images.push({
      index: 0,
      imagePrompt: undefined,
      image: jsonData.imagePath + "004.png",
    });
  }

  createVideo(
    audioPath,
    useCaptions,
    images.length > 0 ? images : jsonDataTm.images,
    outputVideoPath,
    canvasInfo,
    !!jsonData.omitCaptions
  );
};

main();
