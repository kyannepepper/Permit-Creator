import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "" });

// Function to generate an image using DALL-E
export async function generateImage(prompt: string): Promise<{ url: string }> {
  try {
    const response = await openai.images.generate({
      model: "dall-e-3", // the newest OpenAI model is "dall-e-3" which was released after your knowledge cutoff
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    // Ensure we have a URL
    const imageUrl = response.data[0].url;
    if (!imageUrl) {
      throw new Error("No image URL received from OpenAI");
    }

    return { url: imageUrl };
  } catch (error: unknown) {
    console.error("Error generating image:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate image: ${error.message}`);
    } else {
      throw new Error(`Failed to generate image: Unknown error`);
    }
  }
}