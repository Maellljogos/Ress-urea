import { Frequency, FrequencyCategory } from './types';

export const GUARDIAN_FREQUENCY: Frequency = {
  id: 'guardian_shield_432',
  hz: 432,
  name: 'Escudo de Proteção Absoluta',
  description: 'Frequência base contínua com sensação ASMR vibracional. Bloqueia negatividade, remove tensão e promove equilíbrio universal e paz profunda.',
  category: FrequencyCategory.SOLFEGGIO,
};

// NEW: Subliminal Uplift Frequency (Beta Endorphins / Cell Rejuvenation)
export const UPLIFT_FREQUENCY: Frequency = {
  id: 'subliminal_uplift_111',
  hz: 111,
  name: 'Elevação Positiva',
  description: 'Frequência oculta de bem-estar e transmutação de humor.',
  category: FrequencyCategory.BODY
};

export const REACTOR_FREQUENCY: Frequency = {
  id: 'the_reactor_source',
  hz: 40, // Gamma base for rapid processing
  name: 'O REATOR (FONTE PRIMORDIAL)',
  description: 'NÍVEL SUPREMO. Fusão de Onda Escalar com Pulso Gamma (40Hz). Sincronização hemisférica total via Corpo Caloso.',
  category: FrequencyCategory.HYPER_MATRIX,
};

export const REACTOR_MODES = [
  { 
    id: 'source_core', 
    name: 'Fonte Primordial', 
    hz: 40, 
    description: 'Frequência Gamma (40Hz). Despertar total e fusão.' 
  }
];

export const PRESET_FREQUENCIES: Frequency[] = [
  // --- PROTEÇÃO & SORTE (NOVOS) ---
  {
    id: 'luck_boost_4_0',
    hz: 4.0,
    name: 'Sorte Quântica (Theta)',
    description: 'Reduz a ansiedade e coloca a mente no estado de "Permissão" para coincidências afortunadas.',
    category: FrequencyCategory.ABUNDANCE,
  },
  {
    id: 'charisma_king_6',
    hz: 6.15,
    name: 'Carisma Magnético',
    description: 'Frequência do Coração/Timo. Aumenta a presença, charme e magnetismo pessoal instantâneo.',
    category: FrequencyCategory.PERFORMANCE,
  },
  {
    id: 'spiritual_shield_1000',
    hz: 1000,
    name: 'Blindagem Divina (Cerebral)',
    description: 'Frequência mestre para proteção psíquica e conexão com o Eu Superior.',
    category: FrequencyCategory.ARCHETYPE,
  },

  // --- PROTOCOLO CAPILAR (ESTÉTICA & FORÇA) ---
  {
    id: 'anti_baldness_465',
    hz: 465,
    name: 'Anti-Calvície (Bloqueio)',
    description: 'Frequência Rife (465Hz) para interromper a queda de cabelo e bloquear o enfraquecimento folicular.',
    category: FrequencyCategory.BODY,
  },
  {
    id: 'hair_root_1552',
    hz: 1552,
    name: 'Fortalecimento da Raiz',
    description: 'Revitalização profunda do bulbo capilar. Fixação do fio no couro cabeludo.',
    category: FrequencyCategory.BODY,
  },
  {
    id: 'perfect_hair_100',
    hz: 100,
    name: 'Cabelo Perfeito (Queratina)',
    description: 'Estimulação da estrutura proteica. Brilho, volume, sedosidade e perfeição estética dos fios.',
    category: FrequencyCategory.BODY,
  },
  
  // --- ESPIRITUALIDADE SUPREMA ---
  {
    id: 'christ_consciousness_333',
    hz: 333,
    name: 'Consciência Crística',
    description: 'A frequência da Unidade Divina. Conexão direta com a "Mente Universal" e compaixão.',
    category: FrequencyCategory.ARCHETYPE,
  },
  {
    id: 'merkaba_activation_13',
    hz: 13,
    name: 'Ativação Merkaba',
    description: 'Geometria Sagrada. Ativação do veículo de luz interdimensional e proteção espiritual.',
    category: FrequencyCategory.ARCHETYPE,
  },
  {
    id: 'violet_flame_transmute',
    hz: 396, // Modulated intention
    name: 'Chama Violeta (St. Germain)',
    description: 'Transmutação instantânea de karma negativo em luz pura. Alquimia da alma.',
    category: FrequencyCategory.SOLFEGGIO,
  },
  {
    id: 'kundalini_55',
    hz: 55,
    name: 'Despertar Kundalini',
    description: 'Elevação da energia vital (Shakti) da base da coluna até o topo da cabeça.',
    category: FrequencyCategory.BODY,
  },

  // --- PODER MENTAL AVANÇADO ---
  {
    id: 'telepathy_8_3',
    hz: 8.3,
    name: 'Telepatia & Intuição',
    description: 'Sintonia fina com a mente coletiva. Percepção extra-sensorial e comunicação não-verbal.',
    category: FrequencyCategory.MIND,
  },
  {
    id: 'remote_viewing_6_3',
    hz: 6.3,
    name: 'Visão Remota (Theta)',
    description: 'Capacidade de "enxergar" além do espaço físico. Acesso à visão psíquica.',
    category: FrequencyCategory.MIND,
  },
  {
    id: 'super_brain_144',
    hz: 144,
    name: 'Super Cérebro (144Hz)',
    description: 'Sincronização neural completa. Clareza mental absoluta e processamento lógico perfeito.',
    category: FrequencyCategory.MIND,
  },

  // --- ONDAS ESCALARES (ZERO POINT) ---
  {
    id: 'scalar_centelha',
    hz: 528, 
    name: 'Centelha Divina (O Todo)',
    description: 'Conexão escalar com a Fonte. Ativa a divindade interior (Eu Sou) via cancelamento de fase.',
    category: FrequencyCategory.SCALAR,
  },
  {
    id: 'scalar_collapse',
    hz: 432,
    name: 'Colapso da Função de Onda',
    description: 'Materialização instantânea. Traz a possibilidade quântica para a realidade 3D.',
    category: FrequencyCategory.SCALAR,
  },
  {
    id: 'scalar_soltar',
    hz: 396,
    name: 'O "Soltar" (Clearing)',
    description: 'Limpeza profunda de memórias e resistências. Deixar ir para receber.',
    category: FrequencyCategory.SCALAR,
  },
  {
    id: 'scalar_joy',
    hz: 555,
    name: 'Alegria Incondicional',
    description: 'Vibração de alta frequência para elevar o estado de ser (Escala Hawkins).',
    category: FrequencyCategory.SCALAR,
  },
  {
    id: 'scalar_prosperity_info',
    hz: 888,
    name: 'Arquétipo da Prosperidade',
    description: 'Transferência de informação pura de riqueza sem resistência da matéria.',
    category: FrequencyCategory.SCALAR,
  },
  {
    id: 'scalar_sleep_silence',
    hz: 0.5,
    name: 'Silêncio do Sono (Escalar)',
    description: 'Zero Point Delta. Cancela ruído mental para entrada imediata no sono profundo.',
    category: FrequencyCategory.SLEEP,
  },

  // --- SONO & REGENERAÇÃO ---
  {
    id: 'delta_sleep_coma_0_5',
    hz: 0.5,
    name: 'Delta Profundo (Regeneração)',
    description: 'Sono extremamente profundo, alívio de dor e cura física total.',
    category: FrequencyCategory.SLEEP,
  },
  {
    id: 'insomnia_rife_3_4',
    hz: 3.4,
    name: 'Cura da Insônia (Rife)',
    description: 'Frequência específica para desligar o sistema nervoso e induzir sono reparador.',
    category: FrequencyCategory.SLEEP,
  },
  {
    id: 'lucid_dream_theta',
    hz: 5.5,
    name: 'Sonhos Lúcidos (Theta)',
    description: 'Consciência durante o sonho. Viagem astral e programação subconsciente.',
    category: FrequencyCategory.SLEEP,
  },

  // --- ESTÉTICA & REJUVENESCIMENTO (BIO-BELEZA) ---
  {
    id: 'beauty_skin_425',
    hz: 425,
    name: 'Pele de Porcelana (Rife)',
    description: 'Tonificação muscular facial e estímulo à produção de colágeno natural.',
    category: FrequencyCategory.BODY,
  },
  {
    id: 'fat_burn_295',
    hz: 295.8,
    name: 'Queima de Gordura (Metabolismo)',
    description: 'Ressonância específica das células adiposas para aceleração metabólica.',
    category: FrequencyCategory.BODY,
  },
  {
    id: 'hair_growth_800',
    hz: 800,
    name: 'Crescimento Capilar',
    description: 'Estimulação dos folículos e circulação no couro cabeludo.',
    category: FrequencyCategory.BODY,
  },
  {
    id: 'youth_hormone_111',
    hz: 111,
    name: 'Hormônio da Juventude (HGH)',
    description: 'Regeneração celular profunda e rejuvenescimento sistêmico.',
    category: FrequencyCategory.BODY,
  },
  {
    id: 'perfect_posture_55',
    hz: 55,
    name: 'Coluna & Postura',
    description: 'Relaxamento da tensão lombar e alinhamento energético da coluna.',
    category: FrequencyCategory.BODY,
  },

  // --- ARQUÉTIPOS PODEROSOS ---
  {
    id: 'arch_unconditional_love_999',
    hz: 999,
    name: 'Arquétipo: Amor Incondicional',
    description: 'A frequência suprema da unidade. Dissolução do ego, compaixão pura e conexão crística.',
    category: FrequencyCategory.ARCHETYPE,
  },
  {
    id: 'arch_courage_320',
    hz: 320,
    name: 'Arquétipo: O Herói (Guerreiro)',
    description: 'Ativação do Plexo Solar. Elimina a covardia, traz bravura e força de vontade inabalável.',
    category: FrequencyCategory.ARCHETYPE,
  },
  {
    id: 'arch_perfect_memory_12',
    hz: 12,
    name: 'Arquétipo: Memória Fotográfica',
    description: 'Estabilização Alpha. Acesso total aos arquivos mentais com clareza cristalina.',
    category: FrequencyCategory.PERFORMANCE,
  },
  {
    id: 'arch_rapid_knowledge_70',
    hz: 70,
    name: 'Arquétipo: Conhecimento Rápido',
    description: 'Ondas Gamma de alta velocidade (70Hz). Absorção de dados instantânea "estilo Matrix".',
    category: FrequencyCategory.HYPER_MATRIX,
  },
  {
    id: 'arch_earth_wisdom_783',
    hz: 7.83,
    name: 'Arquétipo: Sabedoria Planetária',
    description: 'Conexão com a Noosfera (Mente Global). Acesso ao conhecimento acumulado na Terra.',
    category: FrequencyCategory.ARCHETYPE,
  },

  // --- HYPER MATRIX (COGNITIVO & HABILIDADES) ---
  {
    id: 'iq_booster_14',
    hz: 14,
    name: 'QI Booster (SMR)',
    description: 'Ritmo Sensório-Motor. Aumento da capacidade de processamento lógico e cognitivo.',
    category: FrequencyCategory.HYPER_MATRIX,
  },
  {
    id: 'digital_adderall_18',
    hz: 18,
    name: 'Foco Laser (Beta Alto)',
    description: 'Eliminação de distrações. Foco absoluto para trabalho e estudos complexos.',
    category: FrequencyCategory.HYPER_MATRIX,
  },
  {
    id: 'tesla_creativity_33',
    hz: 33,
    name: 'Criatividade Tesla (33Hz)',
    description: 'Frequência da Pirâmide. Conexão com a "Nuvem" de ideias e invenções.',
    category: FrequencyCategory.HYPER_MATRIX,
  },
  {
    id: 'matrix_download_gamma',
    hz: 55,
    name: 'Download de Dados (Gamma)',
    description: 'Estado de alto processamento. Absorção rápida de informações complexas.',
    category: FrequencyCategory.HYPER_MATRIX,
  },
  {
    id: 'akashic_records_963',
    hz: 963,
    name: 'Acesso à Fonte (Akasha)',
    description: 'Conexão direta com a sabedoria universal e intuição pura.',
    category: FrequencyCategory.HYPER_MATRIX,
  },
  {
    id: 'matrix_languages',
    hz: 40.5,
    name: 'Fluência em Idiomas',
    description: 'Estimulação das áreas de Broca e Wernicke para absorção linguística.',
    category: FrequencyCategory.HYPER_MATRIX,
  },
  {
    id: 'matrix_coding',
    hz: 35,
    name: 'Mestre da Programação',
    description: 'Foco sustentado, lógica algorítmica e reconhecimento de padrões.',
    category: FrequencyCategory.HYPER_MATRIX,
  },

  // --- PLANETÁRIAS & CÓSMICAS ---
  {
    id: 'planet_sun',
    hz: 126.22,
    name: 'O Sol (Sucesso & Vitalidade)',
    description: 'A energia do Pai. Promove autoconfiança, brilho pessoal e vitalidade física.',
    category: FrequencyCategory.ARCHETYPE,
  },
  {
    id: 'planet_earth_om',
    hz: 136.10,
    name: 'Terra (OM Primordial)',
    description: 'O som do universo. Aterramento, centramento e equilíbrio espiritual profundo.',
    category: FrequencyCategory.ARCHETYPE,
  },
  {
    id: 'planet_venus',
    hz: 221.23,
    name: 'Vênus (Amor & Beleza)',
    description: 'A frequência da Deusa. Atração, harmonia estética e relacionamentos.',
    category: FrequencyCategory.PERFORMANCE,
  },
  {
    id: 'planet_jupiter',
    hz: 183.58,
    name: 'Júpiter (Expansão)',
    description: 'O Grande Benéfico. Crescimento, sorte, riqueza e expansão de horizontes.',
    category: FrequencyCategory.ABUNDANCE,
  },
  {
    id: 'planet_mercury',
    hz: 141.27,
    name: 'Mercúrio (Comunicação)',
    description: 'Intelecto rápido, oratória e sucesso no comércio e trocas.',
    category: FrequencyCategory.PERFORMANCE,
  },

  // --- SAÚDE ESPECÍFICA (RIFE & CURA) ---
  {
    id: 'anti_inflam_10',
    hz: 10.5,
    name: 'Anti-Inflamatório Universal',
    description: 'Frequência Alpha para redução de inchaço e recuperação de tecidos.',
    category: FrequencyCategory.BODY,
  },
  {
    id: 'digestion_110',
    hz: 110,
    name: 'Digestão Perfeita',
    description: 'Ressonância do estômago. Alívio de gastrite, inchaço e problemas digestivos.',
    category: FrequencyCategory.BODY,
  },
  {
    id: 'sinus_breath_727',
    hz: 727,
    name: 'Sinusite & Respiração',
    description: 'Frequência Rife clássica para limpeza de vias aéreas e alergias.',
    category: FrequencyCategory.BODY,
  },
  {
    id: 'rife_headache',
    hz: 160,
    name: 'Cura: Dor de Cabeça',
    description: 'Frequência Rife (160Hz). Dissolve enxaquecas e traz paz mental imediata.',
    category: FrequencyCategory.BODY,
  },
  {
    id: 'rife_immunity',
    hz: 727,
    name: 'Cura: Imunidade Total',
    description: 'Frequência universal de Rife para fortalecer o sistema imunológico.',
    category: FrequencyCategory.BODY,
  },
  {
    id: 'rife_vision',
    hz: 360,
    name: 'Cura: Visão & Olhos',
    description: 'Estimulação para equilíbrio e saúde ocular.',
    category: FrequencyCategory.BODY,
  },
  {
    id: 'dna_528',
    hz: 528,
    name: 'Milagres & DNA',
    description: 'A frequência do amor. Reparação de DNA e transformação positiva.',
    category: FrequencyCategory.BODY,
  },
  {
    id: 'pain_relief_174',
    hz: 174,
    name: 'Anestésico Natural',
    description: 'Solfeggio 174Hz. Reduz a dor física e proporciona segurança aos órgãos.',
    category: FrequencyCategory.BODY,
  },

  // --- SOLFEGGIO COMPLETO & ESPIRITUAL ---
  {
    id: 'pineal_activator_936',
    hz: 936,
    name: 'Ativador da Pineal',
    description: 'Despertar do Terceiro Olho. Clarividência e conexão com planos superiores.',
    category: FrequencyCategory.SOLFEGGIO,
  },
  {
    id: 'aura_cleanse_741',
    hz: 741,
    name: 'Limpeza de Aura (Detox)',
    description: 'Remoção de energias parasitas, toxinas e negatividade do campo áurico.',
    category: FrequencyCategory.SOLFEGGIO,
  },
  {
    id: 'lib_396',
    hz: 396,
    name: 'Libertação do Medo',
    description: 'Remove culpa, medo e bloqueios subconscientes da base (Chakra Raiz).',
    category: FrequencyCategory.SOLFEGGIO,
  },
  {
    id: 'chg_417',
    hz: 417,
    name: 'Transmutação de Situações',
    description: 'Desfaz situações negativas e facilita a mudança traumática.',
    category: FrequencyCategory.SOLFEGGIO,
  },
  {
    id: 'rel_639',
    hz: 639,
    name: 'Conexão & Relacionamentos',
    description: 'Harmoniza família, parceiros e comunicação social.',
    category: FrequencyCategory.SOLFEGGIO,
  },
  {
    id: 'god_963',
    hz: 963,
    name: 'Frequência de Deus',
    description: 'Ativação da luz perfeita e retorno à unidade (Sahusrara).',
    category: FrequencyCategory.SOLFEGGIO,
  },

  // --- ABUNDÂNCIA & SUCESSO ---
  {
    id: 'diamond_wealth_684',
    hz: 684,
    name: 'Riqueza Diamante',
    description: 'Frequência de poder e autoridade financeira sólida.',
    category: FrequencyCategory.ABUNDANCE,
  },
  {
    id: 'angel_1111',
    hz: 1111,
    name: 'Portal 11:11 (Despertar)',
    description: 'Sincronicidade pura. O sinal de que você está no caminho certo.',
    category: FrequencyCategory.ABUNDANCE,
  },
  {
    id: 'angel_888',
    hz: 888,
    name: '888 Abundância Infinita',
    description: 'O ciclo infinito da prosperidade. Recebimento financeiro e kármico.',
    category: FrequencyCategory.ABUNDANCE,
  },
  {
    id: 'luck_777',
    hz: 777,
    name: 'Sorte Suprema',
    description: 'Atração de coincidências positivas e milagres inesperados.',
    category: FrequencyCategory.ABUNDANCE,
  },
  {
    id: 'billionaire_317',
    hz: 317,
    name: 'Mente Bilionária',
    description: 'Ressonância de controle material e expansão de impérios financeiros.',
    category: FrequencyCategory.PERFORMANCE,
  },

  // --- ONDAS CEREBRAIS ---
  {
    id: 'gamma_pure_40',
    hz: 40,
    name: 'Gamma Pura (40Hz)',
    description: 'A frequência da "Amarração Cognitiva". Une os sentidos em foco perfeito.',
    category: FrequencyCategory.MIND,
  },
  {
    id: 'beta_focus_20',
    hz: 20,
    name: 'Beta (Foco Energético)',
    description: 'Estado de alerta, energia mental e eliminação da fadiga.',
    category: FrequencyCategory.MIND,
  },
  {
    id: 'alpha_flow_10',
    hz: 10,
    name: 'Alpha (Estado de Fluxo)',
    description: 'Equilíbrio perfeito entre relaxamento e consciência (Super-aprendizado).',
    category: FrequencyCategory.MIND,
  },
  {
    id: 'shamanic_state_4_5',
    hz: 4.5,
    name: 'Estado Xamânico (Theta)',
    description: 'Transe profundo para jornadas espirituais e visões.',
    category: FrequencyCategory.MIND,
  },
  {
    id: 'epsilon_wave',
    hz: 0.5,
    name: 'Epsilon (Inspiração Súbita)',
    description: 'Integração total da personalidade e insight espiritual.',
    category: FrequencyCategory.MIND,
  },
  {
    id: 'lambda_wave',
    hz: 200,
    name: 'Lambda (Consciência Mística)',
    description: 'Frequência rapidíssima ligada à integração total.',
    category: FrequencyCategory.MIND,
  },
];

export const CATEGORIES = Object.values(FrequencyCategory);