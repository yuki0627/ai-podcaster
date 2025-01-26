import { GoogleAuth } from 'google-auth-library';
import dotenv from "dotenv";
dotenv.config();

// Replace with your project details
const PROJECT_ID = process.env.GOOGLE_PROJECT_ID; // Your Google Cloud Project ID
const ENDPOINT = `https://us-central1-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/us-central1/publishers/google/models/text-to-image:predict`;

// Replace with your API key or use a service account for authentication
const API_KEY = process.env.GOOGLE_API_KEY; // Your Vertex AI API Key

// Function to generate an image from a text prompt
async function generateImage(prompt: string): Promise<string> {
  try {
    // Create a GoogleAuth instance for authentication (optional if using API Key directly)
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    // Prepare the payload for the API request
    const payload = {
      instances: [{
        content: prompt,
      }],
    };

    // Make the API call using fetch
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`, // Use API Key directly or client.getAccessToken() for service accounts
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status} - ${response.statusText}`);
    }

    const responseData: any = await response.json();

    // Parse and return the generated image URL or data
    const predictions = responseData.predictions;
    if (predictions && predictions.length > 0) {
      return predictions[0].image; // Adjust based on the API response structure
    } else {
      throw new Error('No predictions returned from the API.');
    }
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
}

// Example usage
const main = async () => {
  const prompt = 'A futuristic city with flying cars and neon lights';

  try {
    const imageUrl = await generateImage(prompt);
    console.log('Generated Image URL:', imageUrl);
  } catch (error) {
    console.error('Failed to generate image:', error);
  }
}


main();
