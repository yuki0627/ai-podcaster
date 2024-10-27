import fs from "fs";
import path from "path";
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';

async function renderJapaneseTextToPNG(
  text: string,
  imageWidth: number,
  outputFilePath: string
) {
  const columns = Math.sqrt(text.length / 2) * 2;
  const fontSize = imageWidth / columns;
  const lineHeight = fontSize * 1.2;

  const lines: string[] = [];
  let currentLine = '';
  let currentWidth = 0;

  // Iterate over each character and determine line breaks based on character width estimate
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);
    const isAnsi = code < 255;
    const isCapital = code >= 0x40 && code < 0x60; 
    const charWidth = isAnsi ? (isCapital ? fontSize * 0.8 : fontSize * 0.5) : fontSize;

    if (currentWidth + charWidth > imageWidth) {
      lines.push(currentLine);
      currentLine = char;
      currentWidth = charWidth;
    } else {
      currentLine += char;
      currentWidth += charWidth;
    }
  }

  // Push the last line if there's any remaining text
  if (currentLine) {
    lines.push(currentLine);
  }

  const imageHeight = lines.length * lineHeight;

  // Create SVG content for Japanese text rendering
  const svgContent = `
    <svg width="${imageWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="white" />
      <text x="0" y="${fontSize}" font-size="${fontSize}" font-family="Arial" fill="black">
        ${lines.map((line, index) => `<tspan x="0" y="${fontSize + index * lineHeight}">${line}</tspan>`).join('')}
      </text>
    </svg>
  `;

  // Use sharp to convert the SVG to PNG
  await sharp(Buffer.from(svgContent))
    .png()
    .toFile(outputFilePath);

  console.log(`Image saved to ${outputFilePath}`);
}

interface ImageDetails {
  path: string;
  duration: number; // Duration in seconds for each image
}

const createVideo = (audioPath: string, images: ImageDetails[], outputVideoPath: string) => {
  let command = ffmpeg();

  // Add each image input and set the duration for each one
  images.forEach((image, index) => {
    command = command.input(image.path)
      .inputOptions(`-t ${image.duration}`); // Set the duration for each image
  });

  // Add the audio input
  command = command.input(audioPath);

  // Output video settings
  command
    .on('start', (cmdLine) => {
      console.log('Started FFmpeg with command:', cmdLine);
    })
    .on('error', (err, stdout, stderr) => {
      console.error('Error occurred:', err);
      console.error('FFmpeg stdout:', stdout);
      console.error('FFmpeg stderr:', stderr);
    })
    .on('end', () => {
      console.log('Video created successfully!');
    })
    .outputOptions([
      '-c:v libx264',  // Set the video codec to H.264
      '-r 30',         // Set the frame rate (e.g., 30 fps)
      '-pix_fmt yuv420p' // Set pixel format for better compatibility
    ])
    .output(outputVideoPath)
    .run();
};

const main = async () => {
  const arg2 = process.argv[2];
  const scriptPath = path.resolve(arg2);
  const parsedPath = path.parse(scriptPath);
  const name = parsedPath.name;
  const jaScriptPath = path.resolve("./output/" + name + "_ja.json");
  const data = fs.readFileSync(jaScriptPath, "utf-8");
  const jsonData = JSON.parse(data);
  jsonData.script.forEach((element: any, index: number) => {
    console.log();
    renderJapaneseTextToPNG(
      element["text"],
      960, // Image width in pixels
      `./output/${name}_${index}.png` // Output file path
    ).catch((err) => {
      console.error('Error generating PNG:', err);
    });    
  });

  const audioPath = path.resolve("./output/" + name + "_bgm.mp3");
  const images: ImageDetails[] = [
    { path: path.resolve(`./output/${name}_0.png`), duration: 1 },  // Display image1.jpg for 5 seconds
    { path: path.resolve(`./output/${name}_1.png`), duration: 3 },  // Display image1.jpg for 5 seconds
    { path: path.resolve(`./output/${name}_2.png`), duration: 5 },  // Display image1.jpg for 5 seconds
  ];
  const outputVideoPath = path.join(__dirname, 'output.mp4');
  
  createVideo(audioPath, images, outputVideoPath);
};

main();

