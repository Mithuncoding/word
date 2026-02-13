import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

const SAFETY_SETTINGS = [
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
];

const MODEL_NAME = "gemini-1.5-flash"; // Switched to 1.5-flash for better stability and quota limits.
// User requested gemini-3-flash-preview but it is not available yet. 2.0-flash-exp hits rate limits.

const SYSTEM_PROMPT = `
You are an expert etymologist and linguistic historian. 
Your task is to trace the journey of a word from its ancient roots to its modern English form.
Return a STRICT JSON object. No markdown formatting, just raw JSON.

Structure:
{
  "word": "target word",
  "currentMeaning": "Brief modern definition",
  "origin": {
    "word": "Original root word",
    "language": "Source Language",
    "meaning": "Original meaning",
    "location": {
      "name": "City/Region, Country",
      "coordinates": [longitude, latitude], // Array of 2 numbers. Longitude first!
      "countryCode": "ISO 2-letter code"
    },
    "century": "e.g. 9th Century"
  },
  "journey": [
    {
      "word": "Intermediate form",
      "language": "Language",
      "century": "Century",
      "location": {
        "name": "City/Region, Country",
        "coordinates": [longitude, latitude],
        "countryCode": "ISO 2-letter code"
      },
      "routeType": "land" | "sea",
      "notes": "How it changed form/meaning here",
      "narrative": "A sentence about this step."
    }
  ],
  "narrative": "A cohesive 2-3 sentence story about the word's entire history.",
  "funFact": "A surprising or obscure fact about this word.",
  "routeSummary": "silk_road" | "maritime" | "colonial" | "scholarly" | "european"
}

Rules:
1. Coordinates MUST be [Longitude, Latitude].
2. Journey steps should be chronological.
3. CRITICAL: Include AT LEAST 4-6 intermediate steps. Do not skip centuries. We want a detailed journey.
4. If a word doesn't exist or is too obscure, return { "error": "Word not found" }.
5. Be precise with geography.
`;

const CACHE_KEY = "wanderword_cache";

// Pre-filled data (truncated for brevity, but kept essential ones)
const CACHED_DATA = {
  "chocolate": {
    word: "Chocolate",
    currentMeaning: "A food made from roasted and ground cacao seeds.",
    origin: { word: "Xocolatl", language: "Nahuatl (Aztec)", meaning: "Bitter Water", location: { name: "Tenochtitlan, Mexico", coordinates: [-99.1, 19.4], countryCode: "MX" }, century: "15th Century" },
    journey: [
      { word: "Chocolat", language: "Spanish", century: "16th Century", location: { name: "Madrid, Spain", coordinates: [-3.7, 40.4], countryCode: "ES" }, routeType: "sea", notes: "Sweetened drink", narrative: "Hernán Cortés introduced it to Spain, where sugar was added." },
      { word: "Chocolat", language: "French", century: "17th Century", location: { name: "Paris, France", coordinates: [2.3, 48.8], countryCode: "FR" }, routeType: "land", notes: "Aristocratic treat", narrative: "Became a fashionable drink among French nobility." },
      { word: "Chocolate", language: "English", century: "17th Century", location: { name: "London, UK", coordinates: [-0.1, 51.5], countryCode: "GB" }, routeType: "sea", notes: "Mass production", narrative: "Industrial revolution turned it from a drink to a bar." }
    ],
    narrative: "A sacred Aztec bitter drink that conquered the world as a sweet treat.",
    funFact: "Aztec emperors drank it from golden goblets, believing it gave them wisdom and power.",
    routeSummary: "colonial"
  },
  "tea": {
    word: "Tea",
    currentMeaning: "A hot drink made by infusing dried crushed leaves in boiling water.",
    origin: { word: "Tu", language: "Old Chinese", meaning: "Bitter Vegetable", location: { name: "Yunnan, China", coordinates: [100.2, 25.0], countryCode: "CN" }, century: "2nd Century BC" },
    journey: [
      { word: "Cha", language: "Mandarin", century: "8th Century", location: { name: "Xi'an, China", coordinates: [108.9, 34.3], countryCode: "CN" }, routeType: "land", notes: "Spread via Silk Road", narrative: "The character 'cha' became the standard in China." },
      { word: "Chay", language: "Persian", century: "15th Century", location: { name: "Isfahan, Iran", coordinates: [51.6, 32.6], countryCode: "IR" }, routeType: "land", notes: "Adopted by traders", narrative: "Camel caravans carried 'chay' across Central Asia." },
      { word: "Te", language: "Min Nan (Hokkien)", century: "17th Century", location: { name: "Fujian, China", coordinates: [118.0, 26.0], countryCode: "CN" }, routeType: "sea", notes: "Coastal dialect pronunciation", narrative: "Dutch traders heard 'te' in Fujian ports." },
      { word: "Tea", language: "English", century: "17th Century", location: { name: "London, UK", coordinates: [-0.1, 51.5], countryCode: "GB" }, routeType: "sea", notes: "Global commodity", narrative: "Britain's obsession globalized the word 'tea'." }
    ],
    narrative: "From a medicinal herb in Yunnan to a global ritual, 'tea' traveled two distinct paths: 'cha' by land and 'te' by sea.",
    funFact: "Languages that got tea via the Silk Road say 'cha' (Hindi, Russian), while those via trade ships say 'te' (English, Spanish).",
    routeSummary: "silk_road"
  },

  "coffee": {
    word: "Coffee",
    currentMeaning: "A drink made from roasted bean-like seeds of a tropical shrub.",
    origin: { word: "Qahwah", language: "Arabic", meaning: "Wine/Energizing Drink", location: { name: "Yemen", coordinates: [48.5, 15.5], countryCode: "YE" }, century: "15th Century" },
    journey: [
      { word: "Kahve", language: "Ottoman Turkish", century: "16th Century", location: { name: "Istanbul, Turkey", coordinates: [28.9, 41.0], countryCode: "TR" }, routeType: "land", notes: "Social revolution", narrative: "Coffeehouses became the centers of social life in Istanbul." },
      { word: "Caffè", language: "Italian", century: "17th Century", location: { name: "Venice, Italy", coordinates: [12.3, 45.4], countryCode: "IT" }, routeType: "sea", notes: "European entry", narrative: "Venetian merchants introduced the 'wine of Araby' to Europe." },
      { word: "Coffee", language: "English", century: "17th Century", location: { name: "London, UK", coordinates: [-0.1, 51.5], countryCode: "GB" }, routeType: "sea", notes: "Anglicized", narrative: "London coffeehouses fueled the Enlightenment." }
    ],
    narrative: "An Ethiopian berry that became an Arab wine, a Turkish social lubricant, and finally the fuel of the modern world.",
    funFact: "Coffee was originally banned in Mecca in 1511 because it was believed to stimulate radical thinking.",
    routeSummary: "colonial"
  },
  "robot": {
    word: "Robot",
    currentMeaning: "A machine capable of carrying out a complex series of actions automatically.",
    origin: { word: "Robota", language: "Old Church Slavonic", meaning: "Servitude/Forced Labor", location: { name: "Prague, Czechia", coordinates: [14.4, 50.0], countryCode: "CZ" }, century: "1920" },
    journey: [
      { word: "Rabota", language: "Russian/Slavic", century: "19th Century", location: { name: "Moscow, Russia", coordinates: [37.6, 55.7], countryCode: "RU" }, routeType: "land", notes: "Hard labor", narrative: "Cognate with words for heavy, forced labor across Slavic languages." },
      { word: "Robot", language: "Czech", century: "1920", location: { name: "Prague, Czechia", coordinates: [14.4, 50.0], countryCode: "CZ" }, routeType: "land", notes: "Literary invention", narrative: "Karel Čapek introduced 'Robot' in his play R.U.R." },
      { word: "Robot", language: "English", century: "1923", location: { name: "London, UK", coordinates: [-0.1, 51.5], countryCode: "GB" }, routeType: "sea", notes: "Global adoption", narrative: "The play's success cemented the word in English and global sci-fi." },
      { word: "Robotics", language: "Sci-Fi English", century: "1941", location: { name: "New York, USA", coordinates: [-74.0, 40.7], countryCode: "US" }, routeType: "sea", notes: "Asimov's Coinage", narrative: "Isaac Asimov coined 'robotics' to describe the field of study." }
    ],
    narrative: "Born from a word for feudal forced labor, 'robot' now defines our technological future slaves/overlords.",
    funFact: "Karel Čapek's brother Josef invented the word; Karel originally wanted to call them 'laboři'.",
    routeSummary: "scholarly"
  },
  "ketchup": {
    word: "Ketchup",
    currentMeaning: "A spicy sauce made chiefly from tomatoes and vinegar.",
    origin: { word: "Kê-tsiap", language: "Hokkien", meaning: "Fermented Fish Sauce", location: { name: "Fujian, China", coordinates: [119.3, 26.1], countryCode: "CN" }, century: "17th Century" },
    journey: [
      { word: "Kecap", language: "Malay", century: "18th Century", location: { name: "Malacca, Malaysia", coordinates: [102.2, 2.2], countryCode: "MY" }, routeType: "sea", notes: "Trade adaptation", narrative: "British sailors discovered this savory sauce in Southeast Asia." },
      { word: "Catsup", language: "English", century: "18th Century", location: { name: "London, UK", coordinates: [-0.1, 51.5], countryCode: "GB" }, routeType: "sea", notes: "Mushroom based", narrative: "The British recreated it with mushrooms and walnuts." },
      { word: "Ketchup", language: "American English", century: "19th Century", location: { name: "New York, USA", coordinates: [-74.0, 40.7], countryCode: "US" }, routeType: "sea", notes: "Tomato revolution", narrative: "Americans added tomatoes, creating the modern classic." }
    ],
    narrative: "A journey from a pungent Chinese fish brine to the quintessential American tomato condiment.",
    funFact: "Early English recipes for ketchup included anchovies, oysters, lemons, and walnuts—but no tomatoes.",
    routeSummary: "maritime"
  },
  "whisky": {
    word: "Whisky",
    currentMeaning: "A spirit distilled from malted grain, especially barley or rye.",
    origin: { word: "Uisge beatha", language: "Old Irish/Gaelic", meaning: "Water of Life", location: { name: "Ireland", coordinates: [-8.2, 53.1], countryCode: "IE" }, century: "12th Century" },
    journey: [
      { word: "Usquebaugh", language: "Anglicized Gaelic", century: "16th Century", location: { name: "Edinburgh, Scotland", coordinates: [-3.2, 55.9], countryCode: "GB" }, routeType: "land", notes: "Phonetic shift", narrative: "The term traveled to Scotland and began to shorten." },
      { word: "Whiskybae", language: "Scots", century: "17th Century", location: { name: "Highlands, Scotland", coordinates: [-4.2, 57.5], countryCode: "GB" }, routeType: "land", notes: "Further shortening", narrative: "Shortened further in local dialects." },
      { word: "Whisky", language: "English", century: "18th Century", location: { name: "London, UK", coordinates: [-0.1, 51.5], countryCode: "GB" }, routeType: "land", notes: "Modern spelling", narrative: "Eventually shortened to just 'whisky' (or whiskey)." }
    ],
    narrative: "From the monastic 'water of life' to a global commodity, whisky's name is a toast to its vital spirit.",
    funFact: "The word and concept (water of life) is a direct translation of the Latin 'aqua vitae'.",
    routeSummary: "european"
  },
  "assassin": {
    word: "Assassin",
    currentMeaning: "A murderer of an important person in a surprise attack for political or religious reasons.",
    origin: { word: "Hashishin", language: "Arabic", meaning: "Hashish Users", location: { name: "Alamut Castle, Iran", coordinates: [50.5, 36.4], countryCode: "IR" }, century: "11th Century" },
    journey: [
      { word: "Assassini", language: "Italian", century: "13th Century", location: { name: "Venice, Italy", coordinates: [12.3, 45.4], countryCode: "IT" }, routeType: "land", notes: "Crusader tales", narrative: "Marco Polo brought back tales of the 'Old Man of the Mountain'." },
      { word: "Assassinate", language: "English", century: "1600", location: { name: "London, UK", coordinates: [-0.1, 51.5], countryCode: "GB" }, routeType: "sea", notes: "Shakespeare", narrative: "Shakespeare used 'assassination' in Macbeth." },
      { word: "Assassin", language: "French", century: "16th Century", location: { name: "Paris, France", coordinates: [2.3, 48.8], countryCode: "FR" }, routeType: "land", notes: "Political murder", narrative: "Entered French and English as a term for political killer." }
    ],
    narrative: "Originally a derogatory term for a secretive Nizari Ismaili sect, it became the universal word for political murder.",
    funFact: "The legend that they were high on hashish during missions is likely Crusader propaganda.",
    routeSummary: "scholarly"
  },
  "checkmate": {
    word: "Checkmate",
    currentMeaning: "A winning position in chess in which the opponent's king is under threat.",
    origin: { word: "Shah Mat", language: "Persian", meaning: "The King is Helpless", location: { name: "Ctesiphon, Iraq", coordinates: [44.6, 33.1], countryCode: "IQ" }, century: "6th Century" },
    journey: [
      { word: "Shaakh maat", language: "Arabic", century: "7th Century", location: { name: "Baghdad, Iraq", coordinates: [44.4, 33.3], countryCode: "IQ" }, routeType: "land", notes: "Islamic conquest", narrative: "Adopted into the Arab game of Shatranj." },
      { word: "Eschec mat", language: "Old French", century: "12th Century", location: { name: "Paris, France", coordinates: [2.3, 48.8], countryCode: "FR" }, routeType: "land", notes: "Knightly game", narrative: "Entered Europe through Moorish Spain and the Crusades." },
      { word: "Checkmate", language: "Middle English", century: "14th Century", location: { name: "London, UK", coordinates: [-0.1, 51.5], countryCode: "GB" }, routeType: "sea", notes: "Modern form", narrative: "The final blow in the game of kings." }
    ],
    narrative: "A phrase declaring the defeat of a monarch, traveling from the Sassanid empire to medieval Europe.",
    funFact: "'Shah Mat' doesn't mean 'King is dead', but 'King is helpless' or 'ambushed'.",
    routeSummary: "silk_road"
  },
  "shampoo": {
    word: "Shampoo",
    currentMeaning: "A liquid preparation for washing the hair.",
    origin: { word: "Champo", language: "Hindi", meaning: "To Press/Massage", location: { name: "India", coordinates: [78.9, 20.6], countryCode: "IN" }, century: "18th Century" },
    journey: [
      { word: "Champu", language: "Sanskrit", century: "Ancient", location: { name: "Varanasi, India", coordinates: [83.0, 25.3], countryCode: "IN" }, routeType: "land", notes: "Root word", narrative: "Derived from 'Chapati' (to press/knead)." },
      { word: "Shampoo", language: "English", century: "1762", location: { name: "Brighton, UK", coordinates: [-0.1, 50.8], countryCode: "GB" }, routeType: "sea", notes: "Medical massage", narrative: "Introduced by Sake Dean Mahomed as a therapeutic massage." },
      { word: "Shampoo", language: "English", century: "1860", location: { name: "London, UK", coordinates: [-0.1, 51.5], countryCode: "GB" }, routeType: "land", notes: "Hair washing", narrative: "Meaning shifted from body massage to hair washing." }
    ],
    narrative: "Originally a relaxing head massage from India, it evolved into the soap we use today.",
    funFact: "Sake Dean Mahomed was the first Indian to publish a book in English and opened the first curry house in Britain.",
    routeSummary: "colonial"
  },
  "jungle": {
    word: "Jungle",
    currentMeaning: "An area of land overgrown with dense forest and tangled vegetation.",
    origin: { word: "Jangala", language: "Sanskrit", meaning: "Arid/Dry Land", location: { name: "Varanasi, India", coordinates: [83.0, 25.3], countryCode: "IN" }, century: "Ancient" },
    journey: [
      { word: "Jangal", language: "Hindi", century: "16th Century", location: { name: "Delhi, India", coordinates: [77.1, 28.7], countryCode: "IN" }, routeType: "land", notes: "Uncultivated land", narrative: "Meaning shifted to 'uncultivated ground'." },
      { word: "Jungle", language: "English", century: "18th Century", location: { name: "Kolkata, India", coordinates: [88.3, 22.5], countryCode: "IN" }, routeType: "sea", notes: "Colonial adaptation", narrative: "British colonists used it for dense forests, inverting the original Sanskrit meaning." },
      { word: "Urban Jungle", language: "Modern English", century: "1906", location: { name: "Chicago, USA", coordinates: [-87.6, 41.8], countryCode: "US" }, routeType: "sea", notes: "Metaphor", narrative: "Upton Sinclair used it to describe the chaos of the city." }
    ],
    narrative: "Ironically, a Sanskrit word for 'dry desert' became the English word for 'wet rainforest'.",
    funFact: "The original Sanskrit 'Jangala' referred to dry lands suitable for biological balance, opposite of 'Anupa' (wet land).",
    routeSummary: "colonial"
  },
  "candy": {
    word: "Candy",
    currentMeaning: "A sweet food made with sugar or syrup.",
    origin: { word: "Khanda", language: "Sanskrit", meaning: "Sugar pieces", location: { name: "India", coordinates: [77.2, 28.6], countryCode: "IN" }, century: "4th Century BC" },
    journey: [
      { word: "Kand", language: "Persian", century: "6th Century", location: { name: "Persepolis, Iran", coordinates: [52.8, 29.9], countryCode: "IR" }, routeType: "land", notes: "Trade item", narrative: "Persians adopted the crystal sugar technology." },
      { word: "Qandi", language: "Arabic", century: "9th Century", location: { name: "Baghdad, Iraq", coordinates: [44.4, 33.3], countryCode: "IQ" }, routeType: "land", notes: "Sugar trade", narrative: "Arabs refined sugar processing and spread the term." },
      { word: "Sucre candi", language: "Old French", century: "13th Century", location: { name: "Paris, France", coordinates: [2.3, 48.8], countryCode: "FR" }, routeType: "land", notes: "Crystallized sugar", narrative: "Crusaders brought 'sugar candy' back to Europe." },
      { word: "Candy", language: "English", century: "15th Century", location: { name: "London, UK", coordinates: [-0.1, 51.5], countryCode: "GB" }, routeType: "sea", notes: "Sweet treat", narrative: "Became a generic term for sweets." }
    ],
    narrative: "A sweet journey tracking the spread of sugar crystallization technology from India to the West.",
    funFact: "India was the first place to crystallize sugar; before that, honey was the main sweetener.",
    routeSummary: "silk_road"
  },
  "lemon": {
    word: "Lemon",
    currentMeaning: "A yellow, oval citrus fruit with thick skin and fragrant, acidic juice.",
    origin: { word: "Nimbu", language: "Sanskrit", meaning: "Citrus fruit", location: { name: "Assam, India", coordinates: [92.9, 26.2], countryCode: "IN" }, century: "Ancient" },
    journey: [
      { word: "Limu", language: "Persian", century: "10th Century", location: { name: "Shiraz, Iran", coordinates: [52.5, 29.5], countryCode: "IR" }, routeType: "land", notes: "Trade route", narrative: "Persian traders encounted the fruit in India." },
      { word: "Laymun", language: "Arabic", century: "12th Century", location: { name: "Cairo, Egypt", coordinates: [31.2, 30.0], countryCode: "EG" }, routeType: "land", notes: "Mediterranean trade", narrative: "Arabs introduced the fruit to the Mediterranean." },
      { word: "Limon", language: "Old French", century: "14th Century", location: { name: "Marseille, France", coordinates: [5.4, 43.3], countryCode: "FR" }, routeType: "sea", notes: "European adoption", narrative: "Became a staple in European cuisine." },
       { word: "Lemon", language: "Middle English", century: "15th Century", location: { name: "London, UK", coordinates: [-0.1, 51.5], countryCode: "GB" }, routeType: "sea", notes: "Anglicization", narrative: "Adopted into English from French." }
    ],
    narrative: "Starting in the foothills of the Himalayas, the lemon soured its way across Persia and Arabia to Europe.",
    funFact: "The British Navy used lemons to cure scurvy long before they knew what Vitamin C was.",
    routeSummary: "silk_road"
  },
  "avatar": {
    word: "Avatar",
    currentMeaning: "An icon or figure representing a particular person in video games or internet forums.",
    origin: { word: "Avatara", language: "Sanskrit", meaning: "Descent", location: { name: "Varanasi, India", coordinates: [83.0, 25.3], countryCode: "IN" }, century: "Ancient" },
    journey: [
      { word: "Avatara", language: "Hindu Philosophy", century: "Ancient", location: { name: "Mathura, India", coordinates: [77.6, 27.4], countryCode: "IN" }, routeType: "land", notes: "Divine Descent", narrative: "Refers specifically to deities descending to earth." },
      { word: "Avatar", language: "English", century: "1784", location: { name: "London, UK", coordinates: [-0.1, 51.5], countryCode: "GB" }, routeType: "sea", notes: "Theological term", narrative: "Adopted by Indologists to describe the descent of a deity." },
      { word: "Metaverse Avatar", language: "Digital English", century: "1992", location: { name: "Seattle, USA", coordinates: [-122.3, 47.6], countryCode: "US" }, routeType: "land", notes: "Snow Crash", narrative: "Neal Stephenson popularized 'avatar' for digital bodies in his novel Snow Crash." }
    ],
    narrative: "From a god descending to earth, to a human descending into the digital realm.",
    funFact: "In Hinduism, it specifically refers to Vishnu descending to restore cosmic order.",
    routeSummary: "scholarly"
  },
  "bungalow": {
    word: "Bungalow",
    currentMeaning: "A low house, typically having only one storey or, in the upper rooms, set into the roof.",
    origin: { word: "Bangla", language: "Hindi/Bengali", meaning: "Belonging to Bengal", location: { name: "Bengal, India", coordinates: [88.0, 23.0], countryCode: "IN" }, century: "17th Century" },
    journey: [
      { word: "Bangla", language: "Hindustani", century: "1650", location: { name: "Dhaka, Bangladesh", coordinates: [90.4, 23.8], countryCode: "BD" }, routeType: "land", notes: "Local style", narrative: "Referring to the thatched roof cottages of the region." },
      { word: "Bungales", language: "English", century: "1696", location: { name: "Kolkata, India", coordinates: [88.3, 22.5], countryCode: "IN" }, routeType: "sea", notes: "Colonial housing", narrative: "Early East India Company officials described the local thatched huts." },
      { word: "Bungalow", language: "English", century: "19th Century", location: { name: "Kent, UK", coordinates: [1.0, 51.2], countryCode: "GB" }, routeType: "sea", notes: "Seaside cottages", narrative: "Exported to Britain as a style for vacation homes." }
    ],
    narrative: "A peasant hut from Bengal that became the template for suburban housing across the Western world.",
    funFact: "The first bungalows in Britain were built near the sea for upper-class vacationers.",
    routeSummary: "colonial"
  },
  "tycoon": {
    word: "Tycoon",
    currentMeaning: "A wealthy, powerful person in business or industry.",
    origin: { word: "Taikun", language: "Japanese", meaning: "Great Lord", location: { name: "Edo (Tokyo), Japan", coordinates: [139.6, 35.6], countryCode: "JP" }, century: "19th Century" },
    journey: [
      { word: "Da-jun", language: "Chinese", century: "Ancient", location: { name: "Beijing, China", coordinates: [116.4, 39.9], countryCode: "CN" }, routeType: "land", notes: "Great Prince", narrative: "The Japanese term derives from the Chinese 'Da-jun'." },
      { word: "Tycoon", language: "English", century: "1857", location: { name: "Washington, USA", coordinates: [-77.0, 38.9], countryCode: "US" }, routeType: "sea", notes: "Diplomatic title", narrative: "Used by Commodore Perry to refer to the Shogun of Japan." },
      { word: "Tycoon", language: "English", century: "1920", location: { name: "New York, USA", coordinates: [-74.0, 40.7], countryCode: "US" }, routeType: "land", notes: "Business magnate", narrative: "Later applied to powerful business leaders like Rockefellers." }
    ],
    narrative: "A title created to make the Shogun sound equal to the Emperor, eventually applied to American business kings.",
    funFact: "The word was popularized by Abraham Lincoln's aides, who affectionately called him 'The Tycoon'.",
    routeSummary: "scholarly"
  },
  "tattoo": {
    word: "Tattoo",
    currentMeaning: "A design made by inserting pigment into punctures in the skin.",
    origin: { word: "Tatau", language: "Samoan/Polynesian", meaning: "To Strike", location: { name: "Apia, Samoa", coordinates: [-171.7, -13.8], countryCode: "WS" }, century: "Ancient" },
    journey: [
      { word: "Tatau", language: "Tahitian", century: "18th Century", location: { name: "Papeete, Tahiti", coordinates: [-149.5, -17.5], countryCode: "PF" }, routeType: "sea", notes: "Polynesian practice", narrative: "The practice was widespread across Polynesia." },
      { word: "Tattaow", language: "English", century: "1769", location: { name: "Tahiti", coordinates: [-149.4, -17.6], countryCode: "PF" }, routeType: "sea", notes: "Cook's voyages", narrative: "Captain Cook recorded the practice in his journals." },
      { word: "Tattoo", language: "English", century: "19th Century", location: { name: "London, UK", coordinates: [-0.1, 51.5], countryCode: "GB" }, routeType: "sea", notes: "Sailor culture", narrative: "Adopted by sailors and eventually the wider public." }
    ],
    narrative: "A rhythmic tapping sound ('tatau') from the Pacific islands that left its mark on skin worldwide.",
    funFact: "Before 'tattoo', widely traveled Europeans used the word 'pricking' or 'staining'.",
    routeSummary: "maritime"
  },
  "hazard": {
    word: "Hazard",
    currentMeaning: "A danger or risk.",
    origin: { word: "Az-zahr", language: "Arabic", meaning: "The Dice", location: { name: "Aleppo, Syria", coordinates: [37.1, 36.2], countryCode: "SY" }, century: "11th Century" },
    journey: [
      { word: "Azar", language: "Spanish", century: "13th Century", location: { name: "Toledo, Spain", coordinates: [-4.0, 39.8], countryCode: "ES" }, routeType: "land", notes: "Game of chance", narrative: "Adopted by Crusaders and in Moorish Spain as a gambling game." },
      { word: "Hasard", language: "French", century: "14th Century", location: { name: "Paris, France", coordinates: [2.3, 48.8], countryCode: "FR" }, routeType: "land", notes: "Risk", narrative: "Evolved from the game itself to the risk of playing it." },
      { word: "Hazard", language: "English", century: "16th Century", location: { name: "London, UK", coordinates: [-0.1, 51.5], countryCode: "GB" }, routeType: "sea", notes: "Danger", narrative: "Generalized to mean any kind of risk or danger." }
    ],
    narrative: "From a roll of the dice in medieval castles to a warning sign on modern chemicals.",
    funFact: "The original game 'Hazard' was a complex precursor to the modern dice game Craps.",
    routeSummary: "silk_road"
  },
  "safari": {
    word: "Safari",
    currentMeaning: "An expedition to observe or hunt animals in their natural habitat.",
    origin: { word: "Safar", language: "Arabic", meaning: "Journey", location: { name: "Zanzibar, Tanzania", coordinates: [39.2, -6.1], countryCode: "TZ" }, century: "Ancient" },
    journey: [
      { word: "Safari", language: "Swahili", century: "19th Century", location: { name: "Nairobi, Kenya", coordinates: [36.8, -1.2], countryCode: "KE" }, routeType: "land", notes: "Expedition", narrative: "Became the Swahili word for any journey." },
      { word: "Safari", language: "English", century: "1850s", location: { name: "London, UK", coordinates: [-0.1, 51.5], countryCode: "GB" }, routeType: "sea", notes: "Burton & Speke", narrative: "Explorers popularized the term for their African expeditions." },
      { word: "Photo Safari", language: "Modern English", century: "20th Century", location: { name: "Maasai Mara, Kenya", coordinates: [35.1, -1.4], countryCode: "KE" }, routeType: "land", notes: "Conservation", narrative: "Shifted from hunting to photography and conservation." }
    ],
    narrative: "An Arabic concept of travel that became the definitive word for African wildlife expeditions.",
    funFact: "In Swahili, 'safari' just means 'trip'. You can go on a safari to the grocery store.",
    routeSummary: "colonial"
  },
  "zero": {
    word: "Zero",
    currentMeaning: "The arithmetical symbol 0 or the absence of quantity.",
    origin: { word: "Sunya", language: "Sanskrit", meaning: "Empty", location: { name: "Gwalior, India", coordinates: [78.1, 26.2], countryCode: "IN" }, century: "5th Century" },
    journey: [
      { word: "Sifr", language: "Arabic", century: "9th Century", location: { name: "Baghdad, Iraq", coordinates: [44.4, 33.3], countryCode: "IQ" }, routeType: "land", notes: "Translation", narrative: "Islamic mathematicians adopted the concept of void." },
      { word: "Zephyrum", language: "Latin", century: "12th Century", location: { name: "Pisa, Italy", coordinates: [10.4, 43.7], countryCode: "IT" }, routeType: "sea", notes: "Fibonacci", narrative: "Fibonacci introduced the concept to Europe." },
      { word: "Zero", language: "Italian", century: "15th Century", location: { name: "Venice, Italy", coordinates: [12.3, 45.4], countryCode: "IT" }, routeType: "land", notes: "Shortening", narrative: "Shortened from zefero to zero." }
    ],
    narrative: "The concept of 'nothing' that revolutionized mathematics, traveling from India to the digital age.",
    funFact: "The word 'Cipher' also comes from the same Arabic root 'sifr'.",
    routeSummary: "scholarly"
  },
  "loot": {
    word: "Loot",
    currentMeaning: "Goods or money obtained illegally, typically during war or riots.",
    origin: { word: "Lut", language: "Hindi", meaning: "Plunder", location: { name: "Delhi, India", coordinates: [77.1, 28.7], countryCode: "IN" }, century: "18th Century" },
    journey: [
      { word: "Loot", language: "English", century: "18th Century", location: { name: "India", coordinates: [78.0, 21.0], countryCode: "IN" }, routeType: "sea", notes: "Colonial slang", narrative: "Adopted by British soldiers to describe spoils of war." },
      { word: "Loot", language: "Global English", century: "20th Century", location: { name: "London, UK", coordinates: [-0.1, 51.5], countryCode: "GB" }, routeType: "sea", notes: "General theft", narrative: "Entered common usage for any stolen goods." },
      { word: "Loot Box", language: "Digital English", century: "21st Century", location: { name: "Seoul, South Korea", coordinates: [126.9, 37.5], countryCode: "KR" }, routeType: "sea", notes: "Gaming term", narrative: "Reapplied to virtual rewards in video games." }
    ],
    narrative: "A direct borrowing from Hindi that describes the spoils of empire.",
    funFact: "It's one of the first words absorbed from Hindi into English, reflecting early colonial interaction.",
    routeSummary: "colonial"
  },
  "paradise": {
    word: "Paradise",
    currentMeaning: "An ideal or idyllic place or state.",
    origin: { word: "Pairidaeza", language: "Avestan", meaning: "Walled Garden", location: { name: "Persepolis, Iran", coordinates: [52.8, 29.9], countryCode: "IR" }, century: "6th Century BC" },
    journey: [
      { word: "Paradeisos", language: "Greek", century: "4th Century BC", location: { name: "Athens, Greece", coordinates: [23.7, 37.9], countryCode: "GR" }, routeType: "land", notes: "Xenophon", narrative: "Xenophon used it to describe Persian royal gardens." },
      { word: "Paradisus", language: "Latin", century: "1st Century", location: { name: "Rome, Italy", coordinates: [12.4, 41.9], countryCode: "IT" }, routeType: "sea", notes: "Biblical", narrative: " adopted into Christian theology to describe Eden." },
      { word: "Paradise", language: "English", century: "12th Century", location: { name: "Canterbury, UK", coordinates: [1.0, 51.2], countryCode: "GB" }, routeType: "land", notes: "Heaven", narrative: "Came to mean heaven itself." }
    ],
    narrative: "From a royal Persian garden to the ultimate spiritual destination.",
    funFact: "The original concept was simply a secure, beautiful garden protected from the harsh desert.",
    routeSummary: "silk_road"
  }
};

export const ALL_WORDS = [
  "tea", "coffee", "chocolate", "ketchup", "robot", "assassin", "whisky", "pyjamas", 
  "shampoo", "juggernaut", "candy", "lemon", "avatar", "bungalow", "checkmate", 
  "tycoon", "vodka", "cookie", "yacht", "plaza", "zero", "algebra", "sofa", 
  "magazine", "arsenal", "hazard", "guitar", "tsunami", "yoga", "karma", "loot", "jungle"
];

function getLocalCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveToCache(word, data) {
  try {
    const current = getLocalCache();
    current[word.toLowerCase()] = data;
    localStorage.setItem(CACHE_KEY, JSON.stringify(current));
  } catch (e) {
    console.warn("Failed to save to cache", e);
  }
}

export async function fetchWordJourney(word) {
  const normWord = word.trim().toLowerCase();
  
  // 1. Check Memory Cache (Static Data)
  if (CACHED_DATA[normWord]) {
    console.log("Serving from static cache:", normWord);
    await new Promise(r => setTimeout(r, 600)); // Fake latency for UX
    return { ...CACHED_DATA[normWord], source: 'ARCHIVE' };
  }

  // 2. Check LocalStorage Cache
  const localCache = getLocalCache();
  if (localCache[normWord]) {
    console.log("Serving from local storage:", normWord);
    await new Promise(r => setTimeout(r, 400));
    return { ...localCache[normWord], source: 'CACHE' };
  }

  // 3. Fetch from API
  console.log("Fetching from Gemini:", normWord);
  
  try {
    // Attempt 1: User's COMPULSORY Model (gemini-3-flash-preview)
    try {
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3-flash-preview", 
            safetySettings: SAFETY_SETTINGS
        });
        const result = await model.generateContent(`${SYSTEM_PROMPT}\n\nTrace the etymology of the word: "${word}"`);
        const response = await result.response;
        const text = response.text();
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const data = JSON.parse(jsonStr);
        if (data.error) throw new Error(data.error);
        
        saveToCache(normWord, data);
        return { ...data, source: 'LIVE_AI_V3' };
    } catch (v3Error) {
        console.warn("Gemini 3 Flash Preview Failed, falling back to 2.5 Flash:", v3Error);
        
        // Attempt 2: User's COMPULSORY Fallback (gemini-2.5-flash)
        try {
            const model = genAI.getGenerativeModel({ 
                model: "gemini-2.5-flash", 
                safetySettings: SAFETY_SETTINGS
            });
            const result = await model.generateContent(`${SYSTEM_PROMPT}\n\nTrace the etymology of the word: "${word}"`);
            const response = await result.response;
            const text = response.text();
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(jsonStr);
            if (data.error) throw new Error(data.error);
            
            saveToCache(normWord, data);
            return { ...data, source: 'LIVE_AI_V2.5' };
        } catch (v25Error) {
             console.warn("Gemini 2.5 Flash Failed, initiating Safe Mode (1.5 Flash):", v25Error);
             
             // Attempt 3: Safe Mode (gemini-1.5-flash) - Ensuring app capability
             const model = genAI.getGenerativeModel({ 
                model: "gemini-1.5-flash", 
                safetySettings: SAFETY_SETTINGS
            });
            const result = await model.generateContent(`${SYSTEM_PROMPT}\n\nTrace the etymology of the word: "${word}"`);
            const response = await result.response;
            const text = response.text();
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(jsonStr);
            if (data.error) throw new Error(data.error);
            
            saveToCache(normWord, data);
            return { ...data, source: 'LIVE_AI_SAFE' };
        }
    }

  } catch (error) {
    console.error("All Gemini API Attempts Failed:", error);
    throw new Error(`COULD_NOT_TRACE_ROOTS: ${error.message || "Unknown Error"}`);
  }
}
