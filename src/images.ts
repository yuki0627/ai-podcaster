import fs from "fs";
import path from "path";
import sharp from 'sharp';

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

/*
// Usage
renderJapaneseTextToPNG(
  "2018年4月にCeridian HCMがIPOを行った例を考えてみましょう。彼らは1株22ドルで2100万株を売りましたが、取引初日の終了時には価格が31.21ドルに上昇しました。これにより、1億9300万ドルがテーブルの上に残されました。興味深いことは、Ceridianがそれに不満を持っていなかったことです。実際、彼らは同じアンダーライターであるゴールドマン・サックスとJPモルガンを、その年の後半に行われた続編の提供にも引き続き雇用しました。テーブルの上に多くのお金を残したにもかかわらず、結果にはまだ満足していたようです。",
  960, // Image width in pixels
  './output/output.png' // Output file path
).catch((err) => {
  console.error('Error generating PNG:', err);
});
*/

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
};

main();

