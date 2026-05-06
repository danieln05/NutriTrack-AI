/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { MealItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeMealImage(base64Image: string): Promise<Omit<MealItem, "id" | "timestamp" | "imageUrl">> {
  const model = "gemini-2.0-flash"; // User specifically requested 2.0 or newer

  const response = await ai.models.generateContent({
    model: model,
    contents: [
      {
        parts: [
          {
            text: "Analysiere das Bild dieser Mahlzeit. Identifiziere alle erkennbaren Lebensmittel, schätze die Portionsgröße realistisch und berechne die Nährwerte. Antworte ausschließlich im vorgegebenen JSON-Format. Sei bei der Schätzung eher konservativ realistisch als optimistisch.",
          },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image.split(",")[1] || base64Image,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: "Der Name des erkannten Gerichts oder des Hauptlebensmittels.",
          },
          portionGrams: {
            type: Type.NUMBER,
            description: "Die geschätzte Portionsgröße in Gramm.",
          },
          nutrition: {
            type: Type.OBJECT,
            properties: {
              calories: { type: Type.NUMBER, description: "Energie in kcal" },
              protein: { type: Type.NUMBER, description: "Protein in Gramm" },
              carbs: { type: Type.NUMBER, description: "Kohlenhydrate in Gramm" },
              sugar: { type: Type.NUMBER, description: "Davon Zucker in Gramm" },
              fat: { type: Type.NUMBER, description: "Fett in Gramm" },
              saturatedFat: { type: Type.NUMBER, description: "Davon gesättigte Fette in Gramm" },
              fiber: { type: Type.NUMBER, description: "Ballaststoffe in Gramm" },
              salt: { type: Type.NUMBER, description: "Salz in Gramm" },
            },
            required: ["calories", "protein", "carbs", "sugar", "fat", "saturatedFat", "fiber", "salt"],
          },
        },
        required: ["name", "portionGrams", "nutrition"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("Keine Antwort von der KI erhalten.");
  
  return JSON.parse(text);
}
