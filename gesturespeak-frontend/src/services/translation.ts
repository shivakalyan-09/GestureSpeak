import { BACKEND_URL } from '../context/AuthContext';

export const LANGUAGES = [
  { name: 'English', code: 'en', locale: 'en-US' },
  { name: 'Telugu', code: 'te', locale: 'te-IN' },
  { name: 'Hindi', code: 'hi', locale: 'hi-IN' },
  { name: 'Tamil', code: 'ta', locale: 'ta-IN' },
  { name: 'Kannada', code: 'kn', locale: 'kn-IN' },
  { name: 'Malayalam', code: 'ml', locale: 'ml-IN' },
  { name: 'French', code: 'fr', locale: 'fr-FR' },
  { name: 'Spanish', code: 'es', locale: 'es-ES' }
];

export async function translateText(text: string, targetLangCode: string, sourceLangCode: string = 'en'): Promise<string> {
  if (!text || text.trim() === '') return '';

  console.log("================= TRANSLATION DIAGNOSTICS ================= ");
  console.log("Selected Source Language:", sourceLangCode);
  console.log("Selected Target Language:", targetLangCode);
  console.log("Input Text:", text);

  if (sourceLangCode === targetLangCode) {
    console.log("Translated Output (No swap needed):", text);
    console.log("==========================================================");
    return text;
  }

  const url = `${BACKEND_URL}/api/translate`;
  console.log("Translation API Request (Backend):", url);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        targetLang: targetLangCode,
        sourceLang: sourceLangCode
      })
    });

    const data = await response.json();
    console.log("Translation API Response (Backend):", data);

    if (!response.ok) {
      throw new Error(data.error || `Server status ${response.status}`);
    }

    if (data.translatedText) {
      const translated = data.translatedText.trim();
      // If the response is identical to input and they should be different, treat it as a failure
      if (translated === '' || (translated.toLowerCase() === text.toLowerCase().trim() && sourceLangCode !== targetLangCode)) {
        throw new Error('API returned empty or untranslated text.');
      }
      console.log("Translated Output (API):", translated);
      console.log("==========================================================");
      return translated;
    }
    throw new Error('No translation data returned from API.');
  } catch (error) {
    console.error('Translation API failure. Attempting mock fallback. Error details:', error);
    
    // Call mock translation
    const fallback = getMockTranslation(text, targetLangCode, sourceLangCode);
    console.log("Translated Output (Mock Fallback):", fallback);
    console.log("==========================================================");

    // If fallback returned identical output (excluding same lang)
    if (fallback === text && sourceLangCode !== targetLangCode) {
      throw new Error("Translation Failed. Please try again.");
    }
    
    return fallback;
  }
}

function getMockTranslation(text: string, targetCode: string, sourceCode: string): string {
  const dictionary: Record<string, Record<string, string>> = {
    'hello': { 'te': 'హలో', 'hi': 'नमस्ते', 'ta': 'வணக்கம்', 'kn': 'ಹಲೋ', 'ml': 'ഹലോ', 'fr': 'Bonjour', 'es': 'Hola' },
    'good morning': { 'te': 'శుభోదయం', 'hi': 'सुप्रभात', 'ta': 'காலை வணக்கம்', 'kn': 'ಶುಭ ಮುಂಜಾನೆ', 'ml': 'സുപ്രഭാതം', 'fr': 'Bonjour', 'es': 'Buenos días' },
    'hi how are you': { 'te': 'హాయ్, మీరు ఎలా ఉన్నారు?', 'hi': 'नमस्ते, आप कैसे हैं?', 'ta': 'வணக்கம், நீங்கள் எப்படி இருக்கிறீர்கள்?', 'kn': 'ಹಾಯ್, ಹೇಗಿದ್ದೀರಾ?', 'ml': 'ഹായ്, സുഖമാണോ?', 'fr': 'Bonjour, comment allez-vous ?', 'es': 'Hola, ¿cómo estás?' },
    'how are you': { 'te': 'మీరు ఎలా ఉన్నారు?', 'hi': 'आप कैसे हैं?', 'ta': 'எப்படி இருக்கிறீர்கள்?', 'kn': 'ಹೇಗಿದ್ದೀರಾ?', 'ml': 'സുഖമാണോ?', 'fr': 'comment ça va', 'es': 'cómo estás' },
    'thank you': { 'te': 'ధన్యవాదాలు', 'hi': 'धन्यवाद', 'ta': 'நன்றி', 'kn': 'ಧನ್ಯವಾದ', 'ml': 'നന്ദി', 'fr': 'merci', 'es': 'gracias' },
    'help': { 'te': 'సహాయం', 'hi': 'मदद', 'ta': 'உதவி', 'kn': 'ಸಹಾಯ', 'ml': 'സഹായം', 'fr': 'aide', 'es': 'ayuda' },
    'no': { 'te': 'వద్దు', 'hi': 'नहीं', 'ta': 'இல்லை', 'kn': 'ಇಲ್ಲ', 'ml': 'இല്ല', 'fr': 'non', 'es': 'no' },
    'please': { 'te': 'దయచేసి', 'hi': 'कृपया', 'ta': 'தயவுசெய்து', 'kn': 'ದಾಯವಿಟ್ಟು', 'ml': 'దയവായി', 'fr': 's\'il vous plaît', 'es': 'por favor' },
    'school': { 'te': 'పాఠశాల', 'hi': 'स्कूल', 'ta': 'பள்ளி', 'kn': 'ಶಾಲೆ', 'ml': 'സ്കൂൾ', 'fr': 'école', 'es': 'escuela' },
    'what': { 'te': 'ఏమిటి', 'hi': 'क्या', 'ta': 'என்ன', 'kn': 'ಏನು', 'ml': 'ఎന്ത്', 'fr': 'quoi', 'es': 'qué' },
    'who': { 'te': 'ఎవరు', 'hi': 'कौन', 'ta': 'யார்', 'kn': 'யಾರು', 'ml': 'ఆര്', 'fr': 'qui', 'es': 'quién' },
    'why': { 'te': 'ఎందుకు', 'hi': 'क्यों', 'ta': 'ஏன்', 'kn': 'ஏಕೆ', 'ml': 'எന്തുകൊണ്ട്', 'fr': 'pourquoi', 'es': 'por qué' },
    'yes': { 'te': 'అవును', 'hi': 'हाँ', 'ta': 'ஆம்', 'kn': 'ಹೌದು', 'ml': 'അതെ', 'fr': 'oui', 'es': 'sí' },
    'you': { 'te': 'నువ్వు', 'hi': 'तुम', 'ta': 'நீ', 'kn': 'ನೀನು', 'ml': 'നീ', 'fr': 'toi', 'es': 'tú' }
  };

  // Strip punctuation, replace underscores with spaces, and normalize spaces for matching
  const cleanText = text.toLowerCase()
                        .replace(/_/g, ' ')
                        .replace(/[?,!.]/g, '')
                        .replace(/\s+/g, ' ')
                        .trim();

  // If source is English, lookup directly
  if (sourceCode === 'en') {
    const translations = dictionary[cleanText];
    if (translations && translations[targetCode]) {
      return translations[targetCode];
    }
  }

  // If target is English, search the dictionary values
  if (targetCode === 'en') {
    for (const [englishWord, transMap] of Object.entries(dictionary)) {
      const cleanTargetVal = transMap[sourceCode] 
        ? transMap[sourceCode].toLowerCase().replace(/_/g, ' ').replace(/[?,!.]/g, '').replace(/\s+/g, ' ').trim()
        : '';
      if (cleanTargetVal === cleanText) {
        return englishWord;
      }
    }
  }

  // If both source and target are non-English (e.g. te -> hi)
  let englishMiddle = '';
  for (const [englishWord, transMap] of Object.entries(dictionary)) {
    const cleanSourceVal = transMap[sourceCode]
      ? transMap[sourceCode].toLowerCase().replace(/_/g, ' ').replace(/[?,!.]/g, '').replace(/\s+/g, ' ').trim()
      : '';
    if (cleanSourceVal === cleanText) {
      englishMiddle = englishWord;
      break;
    }
  }
  if (englishMiddle) {
    const targetMap = dictionary[englishMiddle];
    if (targetMap && targetMap[targetCode]) {
      return targetMap[targetCode];
    }
  }

  return text;
}
