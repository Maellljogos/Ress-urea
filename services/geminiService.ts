
import { GoogleGenAI, Type } from "@google/genai";
import { Frequency, FrequencyCategory } from "../types";

// --- PROTOCOLO DE SEGURANÇA E TRANSMUTAÇÃO ---
const NEGATIVE_TRIGGERS = [
  'medo', 'raiva', 'odio', 'ódio', 'morte', 'matar', 'ruim', 'triste', 
  'ansiedade', 'dor', 'doença', 'mal', 'inveja', 'vingança', 'destruir',
  'pobreza', 'falência', 'perder', 'solidão', 'depressão', 'suicidio',
  'culpa', 'vergonha', 'fracasso'
];

const TRANSMUTATION_MAP: Record<string, number> = {
  'medo': 396, 'culpa': 396, 'ansiedade': 396,
  'raiva': 432, 'odio': 639, 'dor': 174, 
  'doença': 528, 'triste': 528, 'depressão': 528,
  'negativo': 417, 'inveja': 741, 'default': 432
};

export const generateFrequenciesFromIntent = async (intent: string, category: FrequencyCategory = FrequencyCategory.CUSTOM): Promise<Frequency[]> => {
  // SAFETY: Safely access process.env to prevent browser crash if undefined
  const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : null;

  // ONLINE CHECK ONLY
  if (!navigator.onLine || !apiKey) {
    console.log("App is Offline or No API Key. Cannot download frequencies.");
    return [{
        id: `sys_offline_msg_${Date.now()}`,
        hz: 0,
        name: "Sem Conexão",
        description: "É necessário internet para baixar novas frequências da nuvem.",
        category: category
    }];
  }

  try {
    // LAZY INITIALIZATION - Prevents crash on load
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let promptContext = "";
    
    if (category === FrequencyCategory.HYPER_MATRIX) {
      promptContext = `
        The user wants to "Download" specific knowledge: "${intent}".
        Search your database for proven Gamma frequencies (40Hz-100Hz) for this skill.
        Category: "Hyper-Matrix".
        Explain why this Hz helps with this specific skill in the description.
      `;
    } else {
      promptContext = `
        User intent: "${intent}".
        Search your database for exact Rife, Solfeggio, or Brainwave frequencies matching this intent.
        DO NOT invent random numbers. Use historically proven Hz values (e.g., Royal Rife, Solfeggio, Monroe Institute).
        If multiple frequencies exist, pick the 3 most potent ones.
      `;
    }

    const prompt = `
      You are an expert frequency database engine.
      
      *** LANGUAGE REQUIREMENT: PORTUGUESE (BRAZIL) / PORTUGUÊS DO BRASIL ***
      All names and descriptions MUST be in Portuguese (Brazil).
      
      *** SAFETY PROTOCOL ***
      1. NO NEGATIVE FREQUENCIES.
      2. If intent is negative (harm, fear, etc), TRANSMUTE to Love/Protection/Healing.
      
      ${promptContext}
      
      Return a pure JSON array (triad of 3 frequencies). Each object:
      - hz: number
      - name: string (In Portuguese)
      - description: string (In Portuguese)
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              hz: { type: Type.NUMBER },
              name: { type: Type.STRING },
              description: { type: Type.STRING },
            },
            required: ["hz", "name", "description"]
          }
        },
        // Using a modest thinking budget to ensure the model selects accurate frequencies
        thinkingConfig: { thinkingBudget: 1024 }
      }
    });

    const data = JSON.parse(response.text || "[]");
    return data.map((item: any, index: number) => ({
      id: `custom_${Date.now()}_${index}`,
      hz: item.hz,
      name: item.name,
      description: item.description,
      category: category,
    }));

  } catch (error) {
    console.error("Gemini Error:", error);
    return [{
        id: `sys_error_msg_${Date.now()}`,
        hz: 0,
        name: "Erro de Conexão",
        description: "Não foi possível conectar ao banco de dados quântico. Tente novamente.",
        category: category
    }];
  }
};
