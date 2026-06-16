package com.gesturespeak.backend.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.HashMap;
import java.util.Map;

@Service
public class TranslationService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Local mock translation dictionary matching frontend and requirements
    private static final Map<String, Map<String, String>> DICTIONARY = new HashMap<>();

    static {
        // hello
        Map<String, String> helloMap = new HashMap<>();
        helloMap.put("te", "హలో");
        helloMap.put("hi", "नमस्ते");
        helloMap.put("ta", "வணக்கம்");
        helloMap.put("kn", "ಹಲೋ");
        helloMap.put("ml", "ഹലോ");
        helloMap.put("fr", "Bonjour");
        helloMap.put("es", "Hola");
        DICTIONARY.put("hello", helloMap);

        // good morning
        Map<String, String> morningMap = new HashMap<>();
        morningMap.put("te", "శుభోదయం");
        morningMap.put("hi", "सुप्रभात");
        morningMap.put("ta", "காலை வணக்கம்");
        morningMap.put("kn", "ಶುಭ ಮುಂಜಾನೆ");
        morningMap.put("ml", "സുപ്രഭാതം");
        morningMap.put("fr", "bonjour");
        morningMap.put("es", "buenos días");
        DICTIONARY.put("good morning", morningMap);

        // hi how are you
        Map<String, String> hiHowMap = new HashMap<>();
        hiHowMap.put("te", "హాయ్, మీరు ఎలా ఉన్నారు?");
        hiHowMap.put("hi", "नमस्ते, आप कैसे हैं?");
        hiHowMap.put("ta", "வணக்கம், நீங்கள் எப்படி இருக்கிறீர்கள்?");
        hiHowMap.put("kn", "ಹಾಯ್, ಹೇಗಿದ್ದೀರಾ?");
        hiHowMap.put("ml", "ഹായ്, സുഖമാണോ?");
        hiHowMap.put("fr", "Bonjour, comment allez-vous ?");
        hiHowMap.put("es", "Hola, ¿cómo estás?");
        DICTIONARY.put("hi how are you", hiHowMap);

        // how are you
        Map<String, String> howMap = new HashMap<>();
        howMap.put("te", "మీరు ఎలా ఉన్నారు?");
        howMap.put("hi", "आप कैसे हैं?");
        howMap.put("ta", "எப்படி இருக்கிறீர்கள்?");
        howMap.put("kn", "ಹೇಗಿದ್ದೀರಾ?");
        howMap.put("ml", "സുഖമാണോ?");
        howMap.put("fr", "comment ça va");
        howMap.put("es", "cómo estás");
        DICTIONARY.put("how are you", howMap);

        // thank you
        Map<String, String> thanksMap = new HashMap<>();
        thanksMap.put("te", "ధన్యవాదాలు");
        thanksMap.put("hi", "धन्यवाद");
        thanksMap.put("ta", "நன்றி");
        thanksMap.put("kn", "ಧನ್ಯವಾದ");
        thanksMap.put("ml", "നന്ദി");
        thanksMap.put("fr", "merci");
        thanksMap.put("es", "gracias");
        DICTIONARY.put("thank you", thanksMap);

        // help
        Map<String, String> helpMap = new HashMap<>();
        helpMap.put("te", "సహాయం");
        helpMap.put("hi", "मदद");
        helpMap.put("ta", "உதவி");
        helpMap.put("kn", "ಸಹಾಯ");
        helpMap.put("ml", "സഹായം");
        helpMap.put("fr", "aide");
        helpMap.put("es", "ayuda");
        DICTIONARY.put("help", helpMap);

        // no
        Map<String, String> noMap = new HashMap<>();
        noMap.put("te", "వద్దు");
        noMap.put("hi", "नहीं");
        noMap.put("ta", "இல்லை");
        noMap.put("kn", "ಇಲ್ಲ");
        noMap.put("ml", "ഇല്ല");
        noMap.put("fr", "non");
        noMap.put("es", "no");
        DICTIONARY.put("no", noMap);

        // please
        Map<String, String> pleaseMap = new HashMap<>();
        pleaseMap.put("te", "దయచేసి");
        pleaseMap.put("hi", "कृपया");
        pleaseMap.put("ta", "தயவுசெய்து");
        pleaseMap.put("kn", "ದಾಯವಿಟ್ಟು");
        pleaseMap.put("ml", "ദയവായി");
        pleaseMap.put("fr", "s'il vous plaît");
        pleaseMap.put("es", "por favor");
        DICTIONARY.put("please", pleaseMap);

        // school
        Map<String, String> schoolMap = new HashMap<>();
        schoolMap.put("te", "పాఠశాల");
        schoolMap.put("hi", "स्कूल");
        schoolMap.put("ta", "பள்ளி");
        schoolMap.put("kn", "ಶಾಲೆ");
        schoolMap.put("ml", "സ്കൂൾ");
        schoolMap.put("fr", "école");
        schoolMap.put("es", "escuela");
        DICTIONARY.put("school", schoolMap);

        // what
        Map<String, String> whatMap = new HashMap<>();
        whatMap.put("te", "ఏమిటి");
        whatMap.put("hi", "क्या");
        whatMap.put("ta", "என்ன");
        whatMap.put("kn", "ಏನು");
        whatMap.put("ml", "എന്ത്");
        whatMap.put("fr", "quoi");
        whatMap.put("es", "qué");
        DICTIONARY.put("what", whatMap);

        // who
        Map<String, String> whoMap = new HashMap<>();
        whoMap.put("te", "ఎవరు");
        whoMap.put("hi", "कौन");
        whoMap.put("ta", "யார்");
        whoMap.put("kn", "ಯಾರು");
        whoMap.put("ml", "ആര്");
        whoMap.put("fr", "qui");
        whoMap.put("es", "quién");
        DICTIONARY.put("who", whoMap);

        // why
        Map<String, String> whyMap = new HashMap<>();
        whyMap.put("te", "ఎందుకు");
        whyMap.put("hi", "क्यों");
        whyMap.put("ta", "ஏன்");
        whyMap.put("kn", "ಏಕೆ");
        whyMap.put("ml", "എന്തുകൊണ്ട്");
        whyMap.put("fr", "pourquoi");
        whyMap.put("es", "por qué");
        DICTIONARY.put("why", whyMap);

        // yes
        Map<String, String> yesMap = new HashMap<>();
        yesMap.put("te", "అవును");
        yesMap.put("hi", "हाँ");
        yesMap.put("ta", "ஆம்");
        yesMap.put("kn", "ಹೌದು");
        yesMap.put("ml", "അതെ");
        yesMap.put("fr", "oui");
        yesMap.put("es", "sí");
        DICTIONARY.put("yes", yesMap);

        // you
        Map<String, String> youMap = new HashMap<>();
        youMap.put("te", "నువ్వు");
        youMap.put("hi", "तुम");
        youMap.put("ta", "நீ");
        youMap.put("kn", "ನೀನು");
        youMap.put("ml", "നീ");
        youMap.put("fr", "toi");
        youMap.put("es", "tú");
        DICTIONARY.put("you", youMap);
    }

    public String translateText(String text, String targetLang, String sourceLang) {
        if (text == null || text.trim().isEmpty()) {
            return "";
        }

        String cleanedText = text.trim();
        String src = (sourceLang == null) ? "en" : sourceLang.toLowerCase().trim();
        String tgt = (targetLang == null) ? "te" : targetLang.toLowerCase().trim();

        System.out.println("================= BACKEND TRANSLATION SERVICE ================= ");
        System.out.println("Input Text: " + cleanedText);
        System.out.println("Source Language: " + src);
        System.out.println("Target Language: " + tgt);

        if (src.equals(tgt)) {
            System.out.println("Output (No swap needed): " + cleanedText);
            System.out.println("==========================================================");
            return cleanedText;
        }

        // Check local dictionary first
        String mockOutput = getMockTranslation(cleanedText, tgt, src);
        if (!mockOutput.equalsIgnoreCase(cleanedText)) {
            System.out.println("Local Dictionary Match: " + mockOutput);
            System.out.println("==========================================================");
            return mockOutput;
        }

        // If not matched, try MyMemory API
        try {
            String url = String.format("https://api.mymemory.translated.net/get?q=%s&langpair=%s|%s",
                    org.springframework.web.util.UriUtils.encode(cleanedText, "UTF-8"),
                    src,
                    tgt
            );
            System.out.println("Translation Request: " + url);
            String response = restTemplate.getForObject(url, String.class);
            System.out.println("Translation Response Payload: " + response);

            JsonNode root = objectMapper.readTree(response);
            int status = root.path("responseStatus").asInt();
            if (status == 200) {
                String translated = root.path("responseData").path("translatedText").asText().trim();
                // Check if API returned non-empty and non-identical translation
                if (!translated.isEmpty() && !translated.equalsIgnoreCase(cleanedText)) {
                    System.out.println("API Output: " + translated);
                    System.out.println("==========================================================");
                    return translated;
                } else {
                    System.out.println("API returned empty/untranslated text.");
                }
            } else {
                System.out.println("API Status non-200 (" + status + ").");
            }
        } catch (Exception e) {
            System.err.println("API connection failure: " + e.getMessage());
        }

        System.out.println("Mock Fallback (No Match Found): " + cleanedText);
        System.out.println("==========================================================");

        if (src.equals(tgt)) {
            return cleanedText;
        }

        throw new RuntimeException("Translation Failed. Please try again.");
    }

    private String getMockTranslation(String text, String targetCode, String sourceCode) {
        String cleanText = text.toLowerCase()
                .replace("_", " ")
                .replaceAll("[?,!.]", "")
                .replaceAll("\\s+", " ")
                .trim();

        // If source is English, lookup directly
        if ("en".equals(sourceCode)) {
            Map<String, String> translations = DICTIONARY.get(cleanText);
            if (translations != null && translations.containsKey(targetCode)) {
                return translations.get(targetCode);
            }
        }

        // If target is English, search dictionary values
        if ("en".equals(targetCode)) {
            for (Map.Entry<String, Map<String, String>> entry : DICTIONARY.entrySet()) {
                String targetVal = entry.getValue().get(sourceCode);
                String cleanTargetVal = targetVal != null
                        ? targetVal.toLowerCase().replace("_", " ").replaceAll("[?,!.]", "").replaceAll("\\s+", " ").trim()
                        : "";
                if (cleanTargetVal.equals(cleanText)) {
                    return entry.getKey();
                }
            }
        }

        // Non-English to Non-English (e.g. te -> hi)
        String englishMiddle = null;
        for (Map.Entry<String, Map<String, String>> entry : DICTIONARY.entrySet()) {
            String sourceVal = entry.getValue().get(sourceCode);
            String cleanSourceVal = sourceVal != null
                    ? sourceVal.toLowerCase().replace("_", " ").replaceAll("[?,!.]", "").replaceAll("\\s+", " ").trim()
                    : "";
            if (cleanSourceVal.equals(cleanText)) {
                englishMiddle = entry.getKey();
                break;
            }
        }

        if (englishMiddle != null) {
            Map<String, String> targetMap = DICTIONARY.get(englishMiddle);
            if (targetMap != null && targetMap.containsKey(targetCode)) {
                return targetMap.get(targetCode);
            }
        }

        return text;
    }
}
