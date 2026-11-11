export interface DiseaseDetails {
  plant: string;
  disease: string;
  isHealthy: boolean;
  scientificName?: string;
  pathogenType: 'Fungus' | 'Bacterium' | 'Virus' | 'Pest' | 'None';
  severity: 'None' | 'Low' | 'Moderate' | 'High' | 'Severe';
  description: string;
  symptoms: string[];
  organicTreatment: string[];
  chemicalTreatment: string[];
  prevention: string[];
}

export const DISEASE_KNOWLEDGE_BASE: Record<string, DiseaseDetails> = {
  // Tomato Diseases
  'tomato - Bacterial_spot': {
    plant: 'Tomato',
    disease: 'Bacterial Spot',
    isHealthy: false,
    scientificName: 'Xanthomonas perforans / euvesicatoria',
    pathogenType: 'Bacterium',
    severity: 'High',
    description:
      'Bacterial spot is a devastating foliar disease causing small, dark, water-soaked lesions on leaves and fruit, often surrounded by yellow halos.',
    symptoms: [
      'Small, circular brown-to-black spots with greasy or water-soaked margins',
      'Yellow chlorotic halos surrounding lesions on foliage',
      'Blister-like scabby spots on green tomato fruits',
      'Extensive leaf drop and defoliation during warm, wet weather',
    ],
    organicTreatment: [
      'Apply copper hydroxide or copper octanoate sprays early in morning',
      'Spray beneficial bacteria like Bacillus subtilis (Serenade ASO)',
      'Prune and destroy infected lower leaves immediately (do not compost)',
    ],
    chemicalTreatment: [
      'Fixed copper combined with Mancozeb spray program',
      'Streptomycin sprays where legally labeled for nursery transplants',
    ],
    prevention: [
      'Use certified pathogen-free seed and resistant hybrids',
      'Avoid overhead sprinkler irrigation; use drip lines at the soil level',
      'Practice 2-3 year crop rotation away from solanaceous crops',
    ],
  },

  'tomato - Early_blight': {
    plant: 'Tomato',
    disease: 'Early Blight',
    isHealthy: false,
    scientificName: 'Alternaria solani',
    pathogenType: 'Fungus',
    severity: 'Moderate',
    description:
      'A very common fungal disease identified by distinctive concentric "bullseye" rings on older lower leaves, progressively defoliating the vine.',
    symptoms: [
      'Concentric target-like brown rings on older lower foliage',
      'Yellow chlorosis developing around the dark concentric rings',
      'Sunken leathery black lesions on tomato stem ends',
      'Premature leaf senescence exposing fruits to sunscald',
    ],
    organicTreatment: [
      'Apply liquid copper fungicide or potassium bicarbonate at first sign',
      'Spray biofungicides containing Bacillus amyloliquefaciens',
      'Mulch heavily around base with straw to stop soil-splash spore transfer',
    ],
    chemicalTreatment: [
      'Chlorothalonil (Bravo, Daconil) preventive spray every 7-10 days',
      'Azoxystrobin (Quadris) or Pyraclostrobin strobilurin fungicides',
    ],
    prevention: [
      'Stake or cage tomato vines to enhance air circulation and canopy drying',
      'Prune bottom 12 inches of foliage above ground once plants establish',
      'Disinfect garden tools and stakes with 10% bleach solution between seasons',
    ],
  },

  'tomato - Late_blight': {
    plant: 'Tomato',
    disease: 'Late Blight',
    isHealthy: false,
    scientificName: 'Phytophthora infestans',
    pathogenType: 'Fungus',
    severity: 'Severe',
    description:
      'An extremely destructive water-mold disease capable of wiping out entire tomato and potato fields within days during cool, humid conditions.',
    symptoms: [
      'Pale green to dark olive water-soaked blotches on leaves',
      'White fuzzy fungal growth on the undersides of wet leaves in high humidity',
      'Dark greasy brown to purplish lesions on petioles and stems',
      'Greasy, firm, mottled brown rot on green and ripe tomato fruit',
    ],
    organicTreatment: [
      'Copper-based fungicides applied as strict protective cover',
      'Immediately pull, bag, and discard entire infected plants to protect neighbors',
    ],
    chemicalTreatment: [
      'Systemic fungicides such as Mandipropamid (Revus) or Cymoxanil',
      'Mefenoxam (Ridomil Gold) in rotation with multisite protectants (Mancozeb)',
    ],
    prevention: [
      'Plant late-blight resistant cultivars (e.g., Defiant, Mountain Magic, Plum Regal)',
      'Monitor national and regional blight forecasting alert networks',
      'Never compost diseased vine residues; bag and dispose in landfill',
    ],
  },

  'tomato - Leaf_Mold': {
    plant: 'Tomato',
    disease: 'Leaf Mold',
    isHealthy: false,
    scientificName: 'Passalora fulva (Cladosporium fulvum)',
    pathogenType: 'Fungus',
    severity: 'Moderate',
    description:
      'Common in greenhouses and high tunnels with relative humidity above 85%, causing olive-green downy mold patches underneath leaves.',
    symptoms: [
      'Diffuse pale green or yellowish spots on upper leaf surfaces',
      'Dense olive-green to brownish velvety mold carpet on leaf undersides',
      'Leaves curl upward, wither, and drop prematurely',
    ],
    organicTreatment: [
      'Increase ventilation, spacing, and air flow through exhaust fans',
      'Spray Neem oil or sulfur-based organic fungicides',
    ],
    chemicalTreatment: [
      'Chlorothalonil or Azoxystrobin applied to leaf undersides thoroughly',
      'Copper octanoate protective sprays',
    ],
    prevention: [
      'Keep greenhouse relative humidity below 80% with cross-ventilation',
      'Water only in early morning via ground drip lines',
      'Select tomato cultivars carrying Cf resistance genes',
    ],
  },

  'tomato - Septoria_leaf_spot': {
    plant: 'Tomato',
    disease: 'Septoria Leaf Spot',
    isHealthy: false,
    scientificName: 'Septoria lycopersici',
    pathogenType: 'Fungus',
    severity: 'High',
    description:
      'Abundant tiny, circular spots with gray or tan centers and dark brown borders, containing tiny black spore-producing pycnidia specks.',
    symptoms: [
      'Numerous small (1-3mm) circular spots on lower leaves',
      'Light gray/tan centers with distinctive dark margins',
      'Tiny black pepper-like dots (pycnidia) visible inside spot centers',
      'Severe progressive leaf yellowing and upward defoliation',
    ],
    organicTreatment: [
      'Copper fungicide sprays applied at 7-day intervals during wet periods',
      'Promptly remove spotted lower leaves before disease climbs canopy',
    ],
    chemicalTreatment: [
      'Chlorothalonil or Mancozeb protective fungicide applications',
      'Trifloxystrobin or Boscalid systemic treatments',
    ],
    prevention: [
      'Apply organic mulch (straw/plastic) to block soil splash',
      'Avoid working among wet tomato foliage',
      'Control solanaceous weeds (horsenettle, nightshade) harboring the fungus',
    ],
  },

  'tomato - Spider_mites Two-spotted_spider_mite': {
    plant: 'Tomato',
    disease: 'Two-Spotted Spider Mite Infestation',
    isHealthy: false,
    scientificName: 'Tetranychus urticae',
    pathogenType: 'Pest',
    severity: 'High',
    description:
      'Microscopic arachnid pests that pierce leaf cells in hot, dry weather, leaving behind bronze stippling and fine silken webbing.',
    symptoms: [
      'Fine yellow-white speckled stippling on leaf tops',
      'Silky webbing covering leaf axils, stems, and flower clusters',
      'Leaves turn bronzed, brittle, dry up, and drop off',
      'Clusters of microscopic yellow-green mites visible under 10x magnification',
    ],
    organicTreatment: [
      'Release predatory mites (Phytoseiulus persimilis or Neoseiulus californicus)',
      'Spray insecticidal soap or horticultural oil targeting leaf undersides',
      'Cold water jet blasting to dislodge mite colonies and break webbing',
    ],
    chemicalTreatment: [
      'Abamectin (Agri-Mek) or Bifenazate (Acramite) miticides',
      'Spiromesifen (Oberon) insect growth regulator',
    ],
    prevention: [
      'Maintain plant vigor with adequate watering; drought triggers mite explosions',
      'Wash dust off perimeter roads and pathways to discourage colonization',
      'Avoid broad-spectrum pyrethroids that destroy beneficial predatory bugs',
    ],
  },

  'tomato - Target_Spot': {
    plant: 'Tomato',
    disease: 'Target Spot',
    isHealthy: false,
    scientificName: 'Corynespora cassiicola',
    pathogenType: 'Fungus',
    severity: 'Moderate',
    description:
      'Target spot thrives in warm, humid subtropical climates, forming necrotic brown lesions with faint concentric rings and fruit indentations.',
    symptoms: [
      'Pinpoint brown specks enlarging into circular brown lesions with yellow halos',
      'Concentric laminated rings resembling a target board',
      'Deep, pitted dark lesions on green and mature fruits',
    ],
    organicTreatment: [
      'Liquid copper fungicide applications every 7-10 days',
      'Maintain vigorous calcium and potassium soil balance',
    ],
    chemicalTreatment: [
      'Pyraclostrobin (Cabrio) or Fluxapyroxad + Pyraclostrobin (Priaxor)',
      'Chlorothalonil barrier sprays',
    ],
    prevention: [
      'Provide wide row spacing (minimum 36 inches between rows)',
      'Destroy crop refuse and wild host plants immediately post-harvest',
    ],
  },

  'tomato - Tomato_Yellow_Leaf_Curl_Virus': {
    plant: 'Tomato',
    disease: 'Tomato Yellow Leaf Curl Virus (TYLCV)',
    isHealthy: false,
    scientificName: 'Tomato yellow leaf curl virus (Begomovirus)',
    pathogenType: 'Virus',
    severity: 'Severe',
    description:
      'A persistent virus transmitted by the sweetpotato/silverleaf whitefly (Bemisia tabaci), causing stunted bushy growth and severely cupped leaves.',
    symptoms: [
      'Leaves cup upward with pale green or bright yellow margins',
      'Marked stunting of the main vine with short internodes and bushy growth',
      'Severe reduction in leaf size and puckered texture',
      'Flower buds drop before setting fruit; drastic yield loss',
    ],
    organicTreatment: [
      'No cure once infected; immediately rogued (uproot) infected plants',
      'Spray pyrethrin or insecticidal soap to knock down whitefly vectors',
      'Hang yellow sticky traps around crop perimeter to monitor whitefly levels',
    ],
    chemicalTreatment: [
      'Imidacloprid or Dinotefuran systemic neonicotinoid drench for whiteflies',
      'Cyantraniliprole (Exirel) foliar insecticide targeting nymphs and adults',
    ],
    prevention: [
      'Plant TYLCV-resistant hybrids (e.g., Tycoon, Charger, Invicta)',
      'Use 50-mesh insect exclusion netting in nursery and tunnel beds',
      'Eradicate alternative weed hosts (mallow, nightshade) nearby',
    ],
  },

  'tomato - Tomato_mosaic_virus': {
    plant: 'Tomato',
    disease: 'Tomato Mosaic Virus (ToMV)',
    isHealthy: false,
    scientificName: 'Tomato mosaic virus (Tobamovirus)',
    pathogenType: 'Virus',
    severity: 'High',
    description:
      'An extremely stable virus mechanically transmitted by hands, tools, and clothing, causing mottled light/dark green patches and leaf distortion.',
    symptoms: [
      'Mottled light and dark green mosaic patterns on foliage',
      'Fern-like distortion or "shoestring" narrowing of leaf blades',
      'Stunted plant growth and bronze internal browning of fruit flesh',
      'Yellowish blotchy fruit ripening',
    ],
    organicTreatment: [
      'No chemical or organic cure exists once virus enters plant vascular system',
      'Immediately remove and burn or bag infected vines to halt field spread',
    ],
    chemicalTreatment: [
      'No chemical viricides available; focus entirely on sanitation and vector hygiene',
    ],
    prevention: [
      'Wash hands with milk or soap before handling plants (inactivates virus)',
      'Sterilize pruning shears in 20% non-fat dry milk solution or 10% TSP',
      'Plant certified tobacco-mosaic resistant varieties (bearing "Tm-2" gene)',
      'Strictly prohibit tobacco smoking or vaping near tomato plants',
    ],
  },

  'tomato - healthy': {
    plant: 'Tomato',
    disease: 'Healthy Tomato Specimen',
    isHealthy: true,
    pathogenType: 'None',
    severity: 'None',
    description:
      'The tomato leaf specimen exhibits normal vigor, uniform deep-green coloration, healthy turgor pressure, and no visible signs of pathogenic lesions or pest feeding.',
    symptoms: [
      'Vibrant uniform green coloration without chlorosis or yellowing',
      'Clean leaf margins free of necrotic brown spots or water-soaked halos',
      'No visible webbing, stippling, powdery coating, or viral distortion',
      'Strong, healthy petioles with proper leaf angle and expansion',
    ],
    organicTreatment: [
      'Continue balanced organic fertigation (liquid seaweed, fish emulsion)',
      'Maintain 2-3 inches of clean organic straw mulch around root zone',
      'Inspect weekly for early pest scouting',
    ],
    chemicalTreatment: [
      'No chemical treatment required. Maintain standard preventive crop management.',
    ],
    prevention: [
      'Maintain regular morning drip irrigation (1-2 inches of water per week)',
      'Ensure balanced soil nutrition with adequate calcium to prevent blossom end rot',
      'Keep pruning tools sanitized to preserve specimen health',
    ],
  },
};

/**
 * Helper to retrieve disease details with intelligent fallback
 */
export function getDiseaseDetails(className: string): DiseaseDetails {
  if (!className || typeof className !== 'string') {
    return DISEASE_KNOWLEDGE_BASE['tomato - healthy'];
  }

  // Direct match
  if (DISEASE_KNOWLEDGE_BASE[className]) {
    return DISEASE_KNOWLEDGE_BASE[className];
  }

  // Normalized key match
  const cleanKey = className.replace('___', ' - ').trim();
  if (DISEASE_KNOWLEDGE_BASE[cleanKey]) {
    return DISEASE_KNOWLEDGE_BASE[cleanKey];
  }

  // Search by disease name
  const cleanLower = className.toLowerCase();
  for (const [key, details] of Object.entries(DISEASE_KNOWLEDGE_BASE)) {
    if (key.toLowerCase().includes(cleanLower) || cleanLower.includes(key.toLowerCase())) {
      return details;
    }
  }

  // Fallback default
  const isHealthy = cleanLower.includes('healthy');
  let plant = 'Crop';
  let disease = className;
  if (className.includes(' - ')) {
    const parts = className.split(' - ');
    plant = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    disease = parts[1].replace(/_/g, ' ');
  } else if (className.includes('___')) {
    const parts = className.split('___');
    plant = parts[0];
    disease = parts[1].replace(/_/g, ' ');
  }

  return {
    plant,
    disease: disease.charAt(0).toUpperCase() + disease.slice(1),
    isHealthy,
    pathogenType: isHealthy ? 'None' : 'Fungus',
    severity: isHealthy ? 'None' : 'Moderate',
    description: isHealthy
      ? `The ${plant} leaf exhibits healthy characteristics without obvious active infection.`
      : `Visual symptoms consistent with ${disease} observed on the ${plant} leaf specimen.`,
    symptoms: isHealthy
      ? ['Uniform leaf pigmentation', 'Normal leaf turgidity and surface texture']
      : ['Foliar discoloration and visible lesions', 'Potential premature leaf senescence'],
    organicTreatment: isHealthy
      ? ['Maintain regular monitoring and standard organic cultivation practices.']
      : ['Prune visibly infected leaf tissue and apply organic copper protective spray.'],
    chemicalTreatment: isHealthy
      ? ['No chemical intervention needed.']
      : ['Consult local agricultural extension for registered fungicides/bactericides.'],
    prevention: [
      'Ensure proper plant spacing and airflow.',
      'Use drip irrigation to prevent foliar wetting.',
      'Maintain regular crop rotation.',
    ],
  };
}
