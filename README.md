# ai-podcaster

## Initialization

```sh
yarn install
```

create .env file with your OpenAI key

```sh
OPENAI_API_KEY={your OpenAI key}
```

## Create a podcast episode

1. Generate individual podcast segments:

   ```bash
   yarn gen draft/001_intro.json
   yarn gen draft/002_main.json
   yarn gen draft/003_outro.json
   ```

2. Ask the LLM to write a podcast script in JSON (use the contents of "./prompt.md").
3. Create a json file with that generated JSON (such as ./scripts/elon.json)
4. Run ```yarn run gen {path to the script file}```.
5. The output will be generated in the ./output folder.

## Combine multiple audio files

There are two ways to combine multiple audio files:

### Simple MP3 Join

To join all MP3 files in a directory:

```bash
yarn mp3join /path/to/directory [gap_duration]
```

This will combine all MP3 files in the specified directory in alphabetical order and create `combined_output.mp3` in the same directory. By default, it adds a 2-second gap between songs. You can optionally specify a custom gap duration in seconds.

Examples:
```bash
# デフォルトの2秒ギャップで結合
yarn mp3join ./output

# 3.5秒のギャップで結合
yarn mp3join ./output 3.5
```

This is a simple concatenation without any additional effects or background music.

### Combine with BGM

To combine specific MP3 files and add background music:
BGM無しの2つのファイル(オープニングと1つ目の話題)をつなげてBGMを付けます

```bash
yarn combine ./output/file1.mp3 ./output/file2.mp3 output_name
```

サンプル

```bash
yarn combine '/Users/yuki/projects/ai-podcaster/output/bk/000_opeining.mp3' '/Users/yuki/Desktop/radio-combined/2025-03-02/個別/music_cafe.mp3' hoge.mp3
```

This command performs a more complex audio processing:

1. Combines the specified MP3 files with silent gaps between them
2. Adds a 4-second delay at the beginning
3. Mixes in background music that loops throughout the entire audio
4. Applies fade effects at the end
5. Creates `./output/output_name_bgm.mp3`

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

## Script format

```javascript
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

## Simple Movie Creation

音声ファイルと静止画を組み合わせて簡単な動画を作成します：

```bash
yarn simple-movie <音声ファイル> <画像ファイル> [出力ファイル名(オプショナル)]
```

例：

```bash
yarn simple-movie ./output/podcast.mp3 ./images/thumbnail.png my_video
```

これにより、音声の長さに合わせて画像を表示する動画が作成され、`./output/my_video.mp4`として保存されます。出力ファイル名は省略可能で、省略した場合は`./output/output.mp4`として保存されます。
