import { AgentFunction, AgentFunctionInfo } from "graphai";
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

const client = new TextToSpeechClient({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  projectId: process.env.GOOGLE_PROJECT_ID,
});

export const ttsGoogleAgent: AgentFunction = async ({
  params,
  namedInputs,
}) => {
  const { throwError, voice = "ja-JP-Standard-A", languageCode = "ja-JP" } = params;
  const { text } = namedInputs;

  try {
    const request = {
      input: { text },
      voice: {
        languageCode,
        name: voice,
      },
      audioConfig: {
        audioEncoding: 'MP3',
      },
    };

    const [response] = await client.synthesizeSpeech(request);
    const buffer = response.audioContent as Buffer;

    return { 
      buffer,
      generatedVoice: {
        voice,
        languageCode
      }
    };
  } catch (e) {
    if (throwError) {
      console.error(e);
      throw new Error("TTS Google Error");
    }
    return {
      error: e,
    };
  }
};

const ttsGoogleAgentInfo: AgentFunctionInfo = {
  name: "ttsGoogleAgent",
  agent: ttsGoogleAgent,
  mock: ttsGoogleAgent,
  samples: [],
  description: "TTS Google Cloud agent",
  category: ["tts"],
  author: "yuki0627",
  repository: "https://github.com/receptron/graphai/",
  license: "MIT",
};

export default ttsGoogleAgentInfo;
