
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

// --- ELITE DATABASE (OFFLINE LOOKUP) ---
// Pre-defined exact frequencies for common intents to ensure accuracy
const FREQUENCY_DATABASE: Record<string, number> = {
  'cura': 528, 'curar': 528, 'saude': 528, 'milagre': 528,
  'dinheiro': 888, 'riqueza': 888, 'prosperidade': 888, 'sucesso': 888,
  'amor': 639, 'relacionamento': 639, 'alma gemea': 639, 'paixao': 221.23,
  'foco': 14, 'estudo': 14, 'memoria': 12, 'inteligencia': 14,
  'paz': 432, 'calma': 432, 'ansiedade': 396, 'medo': 396,
  'sono': 0.5, 'dormir': 3.4, 'insonia': 0.5,
  'dor': 174, 'alivio': 174, 'cabeca': 160, 'enxaqueca': 160,
  'limpeza': 741, 'detox': 741, 'energia': 741,
  'deus': 963, 'universo': 963, 'espiritual': 963,
  'matrix': 55, 'download': 55, 'aprendizado': 40
};

const generateOfflineFrequencies = (intent: string, category: FrequencyCategory): Frequency[] => {
  const cleanIntent = intent.trim();
  const lowerIntent = cleanIntent.toLowerCase();
  
  if (!cleanIntent) return [];

  // 1. SAFETY CHECK
  const detectedNegative = NEGATIVE_TRIGGERS.find(trigger => lowerIntent.includes(trigger));

  if (detectedNegative) {
    const cureHz = TRANSMUTATION_MAP[detectedNegative] || 432;
    return [
      {
        id: `safety_shield_${Date.now()}_1`,
        hz: cureHz,
        name: `Transmutação: ${cleanIntent.charAt(0).toUpperCase() + cleanIntent.slice(1)}`,
        description: 'BLINDAGEM ATIVA: Negatividade convertida em Luz e Cura.',
        category: category
      },
      {
        id: `safety_shield_${Date.now()}_2`,
        hz: 888,
        name: 'Proteção Divina Absoluta',
        description: 'Campo de blindagem áurica. Nada negativo penetra.',
        category: category
      },
      {
        id: `safety_shield_${Date.now()}_3`,
        hz: 528,
        name: 'Harmonia Restaurada',
        description: 'Elevação vibracional para anular pensamentos intrusos.',
        category: category
      }
    ];
  }

  // 2. DATABASE LOOKUP (EXACT MATCH)
  // Check if any keyword in the intent matches our elite database
  let dbHz = 0;
  for (const key of Object.keys(FREQUENCY_DATABASE)) {
    if (lowerIntent.includes(key)) {
      dbHz = FREQUENCY_DATABASE[key];
      break;
    }
  }

  // 3. GENERATION
  const baseHz = dbHz > 0 ? dbHz : 432; // Default to 432 if no match
  
  // Create variations based on the intent geometry (ASCII seed)
  let seed = 0;
  for (let i = 0; i < cleanIntent.length; i++) {
    seed += cleanIntent.charCodeAt(i);
  }

  const results: Frequency[] = [];
  
  for (let i = 0; i < 3; i++) {
    // If we found a DB match, use it as the center. If not, calculate harmonic.
    let finalHz = baseHz;
    
    if (dbHz === 0) {
       // Calculation Mode (Geometry)
       const baseScales = [396, 417, 432, 528, 639, 741, 852, 963];
       const scaleIndex = (seed + i) % baseScales.length;
       const modulation = (seed % 100) / 100;
       finalHz = Math.abs(Number((baseScales[scaleIndex] + (i * 1.5) + modulation).toFixed(2)));
    } else {
       // Database Mode (Variation)
       // i=0: Exact, i=1: +Slight, i=2: -Slight (Binaural effect style)
       if (i === 1) finalHz += 1.5;
       if (i === 2) finalHz -= 1.5;
       finalHz = Number(finalHz.toFixed(2));
    }

    if (finalHz < 20) finalHz += 100;
    if (finalHz > 1200) finalHz = 963;

    let name = "";
    let desc = "";

    if (category === FrequencyCategory.HYPER_MATRIX) {
        // Gamma Force (40Hz+)
        const gammaBase = 40;
        const uniqueGamma = (seed % 60) + (i * 3.33); 
        const safeGamma = Number((gammaBase + uniqueGamma).toFixed(2));

        name = `Matrix Download: ${cleanIntent.substring(0, 15)}`;
        desc = i === 0 
           ? `Frequência Gamma Primária (${safeGamma}Hz) para absorção de "${cleanIntent}".`
           : `Integração Neural (${safeGamma}Hz) do conhecimento solicitado.`;
        
        results.push({
            id: `offline_matrix_${Date.now()}_${i}`,
            hz: safeGamma,
            name: name,
            description: desc,
            category: category
        });
    } else {
        name = `Sintonia: ${cleanIntent.substring(0, 15)}`;
        desc = dbHz > 0 
           ? `Frequência Exata do Banco de Dados (${finalHz}Hz) para "${cleanIntent}".`
           : `Frequência Raiz Calculada (${finalHz}Hz) pela geometria sagrada.`;

        results.push({
            id: `offline_custom_${Date.now()}_${i}`,
            hz: finalHz,
            name: name,
            description: desc,
            category: category
        });
    }
  }

  return results;
};

export const generateFrequenciesFromIntent = async (intent: string, category: FrequencyCategory = FrequencyCategory.CUSTOM): Promise<Frequency[]> => {
  // SAFETY: Safely access process.env to prevent browser crash if undefined
  const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : null;

  // Force offline logic if offline OR no key
  if (!navigator.onLine || !apiKey) {
    console.log("App is Offline or No API Key. Using Sacred Geometry/DB Algorithm.");
    return generateOfflineFrequencies(intent, category);
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
      
      *** SAFETY PROTOCOL ***
      1. NO NEGATIVE FREQUENCIES.
      2. If intent is negative (harm, fear, etc), TRANSMUTE to Love/Protection/Healing.
      
      ${promptContext}
      
      Return a pure JSON array (triad of 3 frequencies). Each object:
      - hz: number
      - name: string
      - description: string
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
    console.error("Gemini Error, using fallback:", error);
    return generateOfflineFrequencies(intent, category);
  }
};
