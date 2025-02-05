import fs from "fs";
import path from "path";
import { ScriptData, PodcastScript } from "./type";

function splitIntoSentences(paragraph: string, minimum: number): string[] {
  let sentences = paragraph
    .split("。") // Split by the Japanese full stop
    .map((sentence) => sentence.trim()) // Trim whitespace
    .filter((sentence) => sentence.length > 0); // Remove empty sentences

  return sentences
    .reduce<string[]>((acc, sentence, index, array) => {
      if (acc.length > 0 && acc[acc.length - 1].length < minimum) {
        acc[acc.length - 1] += "。" + sentence;
      } else {
        acc.push(sentence);
      }
      return acc;
    }, [])
    .map((sentence, index, array) =>
      index < array.length - 1 || paragraph.endsWith("。")
        ? sentence + "。"
        : sentence,
    );
}

const main = async () => {
  const arg2 = process.argv[2];
  const scriptPath = path.resolve(arg2);
  const scriptData = fs.readFileSync(scriptPath, "utf-8");
  const script = JSON.parse(scriptData) as PodcastScript;

  script.script = script.script.reduce<ScriptData[]>((prev, element) => {
    const sentences = splitIntoSentences(element.text, 10);
    sentences.forEach((sentence) => {
      prev.push({ ...element, text: sentence, caption: sentence });
    });
    return prev;
  }, []);

  fs.writeFileSync(scriptPath, JSON.stringify(script, null, 2));
};

main();
