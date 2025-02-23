# ai-podcaster

## Initialization

```
yarn install
```
create .env file with your OpenAI key
```
OPENAI_API_KEY={your OpenAI key}
```

## Create a podcast episode

1. Feed some source text (ideas, news, press releases) to your favarite LLM.
2. Ask the LLM to write a podcast script in JSON (use the contents of "./prompt.md").
3. Create a json file with that generated JSON (such as ./scripts/elon.json)
4. Run ```yarn run gen {path to the script file}```.
5. The output will be generated in the ./output folder.

## Combine multiple audio files

There are two ways to combine multiple audio files:

### Simple MP3 Join

To join all MP3 files in a directory:

```bash
yarn mp3join /path/to/directory
```

This will combine all MP3 files in the specified directory in alphabetical order and create `combined_output.mp3` in the same directory.

### Combine with BGM

To combine specific MP3 files and add background music:

```bash
yarn combine ./output/file1.mp3 ./output/file2.mp3 output_name
```

This will create `./output/output_name_bgm.mp3`

### Complete Workflow Example

1. Generate individual podcast segments:

```bash
yarn gen draft/001_intro.json
yarn gen draft/002_main.json
yarn gen draft/003_outro.json
```

2. Either combine them using one of these methods:
   - Using mp3join (combines all MP3s in the output directory):

   ```bash
   yarn mp3join ./output
   ```
   
   - Using combine (with BGM, specify files explicitly):

   ```bash
   yarn combine ./output/001_intro.mp3 ./output/002_main.mp3 ./output/003_outro.mp3 full_episode
   ```

# Script format

```Javascript
{
  "title": "title of the podcast",
  "description": "The description of the podcast.",
  "reference": "URL to the source data", // optional
  "tts": "openAI", // or "nijivoice", default is "openAI"
  "voices": ["nova", "onyx"], // TTS-specific voice identifiers (host and others), optional.
  "script": [
    {
      "speaker": "Host",
      "text": "words from the host."
    },
    {
      "speaker": "Guest",
      "text": "words from the guest."
    },
    ...
  ]
}
```

## Translate the script into Japanese

Run ```yarn run ja {path to the script file}```

## Create a movie file with the Japanese script

Run ```yarn run mov {path to the script file}```
