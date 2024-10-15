import OpenAI from "openai";
import dotenv from "dotenv";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});