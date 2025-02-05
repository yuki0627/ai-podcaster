import fs from "fs";
import path from "path";
import { ScriptData, PodcastScript } from "./type";

function splitIntoSentences(paragraph: string, minimum: number): string[] {
  let sentences = paragraph
      .split("。") // Split by the Japanese full stop
      .map(sentence => sentence.trim()) // Trim whitespace
      .filter(sentence => sentence.length > 0) // Remove empty sentences
      .map(sentence => sentence + "。"); // Add back the full stop to each sentence
  
  return sentences.reduce<string[]>((acc, sentence, index) => {
      if (acc.length > 0 && acc[acc.length - 1].length < minimum) {
          acc[acc.length - 1] += sentence;
      } else {
          acc.push(sentence);
      }
      return acc;
  }, []);
}

const main = async () => {
  const arg2 = process.argv[2];
  const scriptPath = path.resolve(arg2);
  const scriptData = fs.readFileSync(scriptPath, "utf-8");
  const script = JSON.parse(scriptData) as PodcastScript;
  const str = script.script[2].text;
  const array = splitIntoSentences(str, 10);
  console.log(array);
};

main();
