export const ai = {
  models: {
    generateContent: async () => ({ text: "{}" }),
  },
};

export async function generateImage() {
  return { mimeType: "image/png", b64_json: "" };
}