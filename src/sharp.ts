import sharp from 'sharp';

// Function to render text into an image and save it as a PNG file
async function renderTextToImage(text: string, outputFilePath: string): Promise<void> {
  // Define the SVG markup for the text
  const svgText = `
    <svg width="800" height="400">
      <rect width="100%" height="100%" fill="white"/>
      <text x="50%" y="50%" font-size="48" text-anchor="middle" fill="black" dy=".3em" font-family="Arial">
        ${text}
      </text>
    </svg>
  `;

  // Use sharp to create an image from the SVG
  await sharp(Buffer.from(svgText))
    .png()
    .toFile(outputFilePath);

  console.log(`Image saved as: ${outputFilePath}`);
}

// Example usage
const text = 'Hello, World!';
const outputFilePath = './scratchpad/output.png';
renderTextToImage(text, outputFilePath);
