import { GoogleGenAI } from '@google/genai';

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing or empty in workspace settings.');
  }
  return new GoogleGenAI({ apiKey });
}

function pcmToWavDataUrl(
  pcmBase64: string,
  sampleRate = 24000,
  numChannels = 1,
  bitsPerSample = 16
): string {
  const pcmBuffer = Buffer.from(pcmBase64, 'base64');
  const dataSize = pcmBuffer.length;
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const header = Buffer.alloc(44);

  // RIFF header
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);

  // fmt chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  const wavBuffer = Buffer.concat([header, pcmBuffer]);
  return `data:audio/wav;base64,${wavBuffer.toString('base64')}`;
}

export async function handleAnalyzeLandmark(imageBase64: string, mimeType = 'image/jpeg', promptHint = '') {
  const ai = getGenAI();
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  const promptText = `You are an expert architectural historian and photo tourism assistant.
Analyze this photo taken by a tourist in a city.
Identify the landmark shown in the photo with high precision.

${promptHint ? `User notes: "${promptHint}"` : ''}

Respond STRICTLY with a valid JSON object (no markdown surrounding ticks if possible) with this exact schema:
{
  "name": "Landmark Name (e.g. Brandenburg Gate)",
  "city": "City Name (e.g. Berlin)",
  "country": "Country Name (e.g. Germany)",
  "coordinates": "Latitude° N, Longitude° E (e.g. 52.5163° N, 13.3777° E)",
  "confidence": 99.8,
  "style": "Architectural Style (e.g. Neoclassical / Greek Revival)",
  "condition": "Preserved | Restored | Ancient | Modern",
  "builtYear": "Year or era (e.g. 1791)",
  "shortSummary": "A concise 2-sentence description of the monument and its primary cultural significance.",
  "timeline": [
    { "year": "1791", "event": "Official opening of the landmark." },
    { "year": "1806", "event": "Historical milestone event..." },
    { "year": "1989", "event": "Modern historical turning point..." },
    { "year": "2002", "event": "Major restoration or preservation effort..." }
  ],
  "architecturalHighlights": [
    "Highlight 1 (e.g. 12 Doric columns forming 5 passageways)",
    "Highlight 2 (e.g. Quadriga sculpture depicting goddess of victory)",
    "Highlight 3 (e.g. Modeled after the Propylaea of the Athenian Acropolis)"
  ],
  "narrationScript": "A captivating, cinematic 35-50 second tour guide narration script about this landmark. Speak directly to the listener as an AR guide, detailing key historical moments, dramatic architectural facts, and why this spot is world-famous."
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: [
      {
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: cleanBase64,
        },
      },
      {
        text: promptText,
      },
    ],
    config: {
      responseMimeType: 'application/json',
    },
  });

  const responseText = response.text || '';
  const cleanedJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
  const parsed = JSON.parse(cleanedJson);
  return parsed;
}

export async function handleSearchLandmark(landmarkName: string, location: string) {
  const ai = getGenAI();

  const prompt = `Perform a grounded Google Search query for up-to-date tourist information, history, current status, visitor tips, and interesting trivia regarding "${landmarkName}" in ${location}.

Formulate a response formatted as JSON with the following structure:
{
  "groundedHistory": "Comprehensive, up-to-date historical narrative with recent events, restoration news, and cultural impact.",
  "visitorTips": [
    "Tip 1 regarding best visiting hours or photography spots",
    "Tip 2 regarding ticketing or access",
    "Tip 3 regarding nearby highlights"
  ],
  "recentNewsOrFacts": [
    "Recent news or interesting modern fact 1",
    "Recent news or interesting modern fact 2",
    "Recent news or interesting modern fact 3"
  ],
  "funFact": "A fascinating secret or lesser-known detail about this landmark."
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const candidate = response.candidates?.[0];
  const groundingMetadata = candidate?.groundingMetadata;
  const chunks = groundingMetadata?.groundingChunks || [];
  const sources = chunks
    .filter((c: any) => c.web)
    .map((c: any) => ({
      title: c.web.title || c.web.uri,
      url: c.web.uri,
    }));

  let parsed: any = {};
  try {
    const text = response.text || '';
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (err) {
    parsed = {
      groundedHistory: response.text || `Recent historical data and search results for ${landmarkName}.`,
      visitorTips: ['Plan your visit during morning hours for fewer crowds.', 'Check local official guidelines for opening hours.'],
      recentNewsOrFacts: [`Famous global landmark in ${location}`],
      funFact: `One of the most photographed heritage sites in ${location}.`,
    };
  }

  return {
    ...parsed,
    sources: sources.slice(0, 6),
    searchQueries: groundingMetadata?.webSearchQueries || [],
  };
}

export async function handleGenerateTts(text: string, voiceName = 'Puck') {
  const ai = getGenAI();

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-tts-preview',
    contents: [{ text }],
    config: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voiceName || 'Puck',
          },
        },
      },
    },
  });

  const candidate = response.candidates?.[0];
  const part = candidate?.content?.parts?.[0];

  if (!part || !part.inlineData || !part.inlineData.data) {
    throw new Error('No audio data received from Gemini TTS model.');
  }

  const mimeType = part.inlineData.mimeType || 'audio/pcm;rate=24000';
  const base64Data = part.inlineData.data;

  let sampleRate = 24000;
  const rateMatch = mimeType.match(/rate=(\d+)/);
  if (rateMatch) {
    sampleRate = parseInt(rateMatch[1], 10);
  }

  const wavDataUrl = pcmToWavDataUrl(base64Data, sampleRate, 1, 16);

  return {
    audioUrl: wavDataUrl,
    voiceUsed: voiceName,
    mimeType,
  };
}
