import fs from "fs";
import path from "path";
import { ScriptData, PodcastScript } from "./type";

interface Replacement {
  from: string;
  to: string;
}

function replacePairs(str: string, replacements: Replacement[]): string {
  replacements.forEach(({ from, to }) => {
    // Escape any special regex characters in the 'from' string.
    const escapedFrom = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedFrom, "g");
    str = str.replace(regex, to);
  });
  return str;
}

const replacements: Replacement[] = [
  { from: "Anthropic", to: "アンスロピック" },
];

const main = async () => {
  const arg2 = process.argv[2];
  const scriptPath = path.resolve(arg2);
  const scriptData = fs.readFileSync(scriptPath, "utf-8");
  const script = JSON.parse(scriptData) as PodcastScript;

  script.script = script.script.map((element) => {
    const voice_text = replacePairs(element.text, replacements);
    if (voice_text !== element.text) {
      element.voice_text = voice_text;
    }
    return element;
  });

  fs.writeFileSync(scriptPath, JSON.stringify(script, null, 2));
};

main();
