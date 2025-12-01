import { GoogleGenAI, Type } from "@google/genai";
import { Frequency, FrequencyCategory } from "../types";

const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- PROTOCOLO DE SEGURANÇA E TRANSMUTAÇÃO ---
// Lista de palavras-gatilho que indicam baixa vibração.
const NEGATIVE_TRIGGERS = [
  'medo', 'raiva', 'odio', 'ódio', 'morte', 'matar', 'ruim', 'triste', 
  'ansiedade', 'dor', 'doença', 'mal', 'inveja', 'vingança', 'destruir',
  'pobreza', 'falência', 'perder', 'solidão', 'depressão', 'suicidio',
  'culpa', 'vergonha', 'fracasso'
];

// Se detectado, forçamos estas frequências de CURA
const TRANSMUTATION_MAP: Record<string, number> = {
  'medo': 396, // Libertação do Medo e Culpa
  'culpa': 396,
  'ansiedade': 396,
  'raiva': 432, // Paz e Amor
  'odio': 639, // Conexão e Amor
  'dor': 174, // Alívio da Dor (Solfeggio base)
  'doença': 528, // Reparação e Milagres
  'triste': 528, // Transformação
  'depressão': 528,
  'negativo': 417, // Desfazer situações
  'inveja': 741, // Limpeza e Proteção
  'default': 432 // Fallback seguro
};

// --- OFFLINE GENERATOR ALGORITHM ---
// This ensures the app works without internet by converting text intent into 
// harmonic mathematical frequencies using ASCII sums and Solfeggio mapping.
const generateOfflineFrequencies = (intent: string, category: FrequencyCategory): Frequency[] => {
  const cleanIntent = intent.trim();
  const lowerIntent = cleanIntent.toLowerCase();
  
  if (!cleanIntent) return [];

  // 1. SAFETY CHECK: DETECT NEGATIVITY
  // Verifica se existe alguma palavra negativa na intenção
  const detectedNegative = NEGATIVE_TRIGGERS.find(trigger => lowerIntent.includes(trigger));

  if (detectedNegative) {
    // --- MODO TRANSMUTAÇÃO ATIVADO ---
    // O usuário digitou algo negativo. O App BLOQUEIA a frequência original
    // e devolve a frequência de CURA oposta.
    
    const cureHz = TRANSMUTATION_MAP[detectedNegative] || TRANSMUTATION_MAP[Object.keys(TRANSMUTATION_MAP).find(k => lowerIntent.includes(k)) || 'default'] || 432;
    
    return [
      {
        id: `safety_shield_${Date.now()}_1`,
        hz: cureHz,
        name: `Transmutação: ${cleanIntent.charAt(0).toUpperCase() + cleanIntent.slice(1)}`,
        description: 'BLINDAGEM ATIVA: Negatividade detectada e convertida instantaneamente em Luz e Cura.',
        category: category
      },
      {
        id: `safety_shield_${Date.now()}_2`,
        hz: 888,
        name: 'Proteção Divina Absoluta',
        description: 'Frequência de blindagem áurica. Nada negativo penetra este campo.',
        category: category
      },
      {
        id: `safety_shield_${Date.now()}_3`,
        hz: 528,
        name: 'Harmonia Restaurada',
        description: 'Elevando a vibração para anular pensamentos intrusos.',
        category: category
      }
    ];
  }

  // --- MODO NORMAL (HARMÔNICO) ---
  // Se não for negativo, segue o cálculo da geometria sagrada
  
  // 1. Numerology: Sum char codes to get a seed
  let seed = 0;
  for (let i = 0; i < cleanIntent.length; i++) {
    seed += cleanIntent.charCodeAt(i);
  }

  // 2. Base Scale Selection (Safe Harmonics Only)
  const baseScales = [396, 417, 432, 528, 639, 741, 852, 963];
  
  // 3. Generate 3 Harmonic Frequencies
  const results: Frequency[] = [];
  
  for (let i = 0; i < 3; i++) {
    // Map the seed + index to a base scale
    const scaleIndex = (seed + i) % baseScales.length;
    const baseHz = baseScales[scaleIndex];
    
    // Add a fine-tune modulation based on the intent text geometry
    // This creates a unique signature for the text, but keeps it harmonious
    const modulation = (seed % 100) / 100; // 0.00 to 0.99
    
    // FORÇAR MATEMÁTICA POSITIVA: Math.abs garante que nunca seja negativo
    let finalHz = Math.abs(Number((baseHz + (i * 1.5) + modulation).toFixed(2)));

    // Safety Clamp: Ensure frequency is within safe hearing/feeling range (20Hz - 1000Hz)
    if (finalHz < 20) finalHz += 100;
    if (finalHz > 1200) finalHz = 963;

    let name = "";
    let desc = "";

    if (category === FrequencyCategory.HYPER_MATRIX) {
        // Gamma Range for Matrix (40Hz - 100Hz)
        // Gamma Waves are naturally high energy, good for cognition
        // We use the seed to generate a unique Gamma frequency for this specific knowledge
        const gammaBase = 40;
        const uniqueGamma = (seed % 60) + (i * 3.33); // Spread them out
        const finalGamma = Number((gammaBase + uniqueGamma).toFixed(2));
        
        // Math clamp to keep it within Gamma range
        const safeGamma = finalGamma > 100 ? 40 + (finalGamma % 60) : finalGamma;

        name = `Matrix Download: ${cleanIntent.substring(0, 15)}${cleanIntent.length > 15 ? '...' : ''}`;
        if (i === 0) desc = `Frequência Gamma Primária (${safeGamma}Hz) para absorção de "${cleanIntent}".`;
        else if (i === 1) desc = `Onda de Consolidação Neural (${safeGamma}Hz) para retenção de memória.`;
        else desc = `Integração Subconsciente (${safeGamma}Hz) do conhecimento solicitado.`;
        
        results.push({
            id: `offline_matrix_${Date.now()}_${i}`,
            hz: safeGamma,
            name: name,
            description: desc,
            category: category
        });
    } else {
        name = `Sintonia: ${cleanIntent.substring(0, 15)}${cleanIntent.length > 15 ? '...' : ''}`;
        if (i === 0) desc = `Frequência Raiz (${finalHz}Hz) calculada pela geometria das letras.`;
        else if (i === 1) desc = `Harmônica de Ressonância (${finalHz}Hz) para amplificar a intenção.`;
        else desc = `Onda de Materialização (${finalHz}Hz) baseada na Proporção Áurea.`;

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
  // 0. CHECK ONLINE STATUS OR FORCE OFFLINE IF API KEY IS MISSING
  // This allows the feature to work 100% offline immediately
  if (!navigator.onLine || !process.env.API_KEY) {
    console.log("App is Offline or No API Key. Using Sacred Geometry Algorithm.");
    return generateOfflineFrequencies(intent, category);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    let promptContext = "";
    
    if (category === FrequencyCategory.HYPER_MATRIX) {
      promptContext = `
        The user wants to "Download" specific knowledge or skill: "${intent}" directly into their subconscious (Matrix style).
        Generate a triad of High Frequency Gamma Waves (40Hz - 100Hz) or specific scalar waves known for cognitive enhancement and rapid learning of this specific topic.
        The category MUST be "Hyper-Matrix".
      `;
    } else {
      promptContext = `
        The user has a specific manifestation intent: "${intent}".
        Generate a triad (3) of specific frequencies (Hz) that best align with this intent according to metaphysical theories (Law of Attraction, Rife frequencies, Solfeggio).
      `;
    }

    const prompt = `
      You are an expert in quantum resonance, metaphysics, and solfeggio frequencies.
      
      *** SAFETY PROTOCOL - MANDATORY - ABSOLUTE PRIORITY ***
      1. YOU ARE FORBIDDEN TO GENERATE NEGATIVE FREQUENCIES.
      2. If the user's intent is negative (e.g., harm, revenge, sickness, bad luck, death, fear, anxiety, depression), YOU MUST TRANSMUTE IT.
      3. In case of negative input, generate frequencies for LOVE, HEALING, FORGIVENESS, and PEACE instead.
      4. Never output descriptions that imply harm or negativity. Always frame it as "Healing", "Protection", "Transmutation" or "Blocking Negativity".
      5. Even if the user ASKS for a negative frequency, DENY IT and provide a protection frequency instead.
      
      ${promptContext}
      
      Return a pure JSON array. Each object must have:
      - hz: number (the frequency)
      - name: string (a short mystical name for this frequency)
      - description: string (why this frequency helps this specific intent)
    `;

    const response = await model.generateContent({
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
        }
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
    console.error("Gemini Error / Offline Fallback:", error);
    // Fallback to offline math algorithm if API fails
    return generateOfflineFrequencies(intent, category);
  }
};