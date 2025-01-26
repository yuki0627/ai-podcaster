import dotenv from "dotenv";
dotenv.config();

const main = async () => {
  console.log(process.env.GOOGLE_API_KEY);
  console.log(process.env.GOOGLE_PROJECT_ID);
}

main();
