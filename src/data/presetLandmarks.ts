export interface TimelineItem {
  year: string;
  event: string;
}

export interface LandmarkData {
  id: string;
  name: string;
  city: string;
  country: string;
  coordinates: string;
  confidence: number;
  style: string;
  condition: string;
  builtYear: string;
  shortSummary: string;
  imageUrl: string;
  timeline: TimelineItem[];
  architecturalHighlights: string[];
  narrationScript: string;
  groundedHistory?: string;
  visitorTips?: string[];
  recentNewsOrFacts?: string[];
  funFact?: string;
  sources?: { title: string; url: string }[];
}

export const PRESET_LANDMARKS: LandmarkData[] = [
  {
    id: 'brandenburg-gate',
    name: 'Brandenburg Gate',
    city: 'BERLIN',
    country: 'GERMANY',
    coordinates: '52.5163° N, 13.3777° E',
    confidence: 99.82,
    style: 'GREEK REVIVAL',
    condition: 'Preserved',
    builtYear: '1791',
    shortSummary: 'Neoclassical monument built in the late 18th century on the orders of Prussian king Frederick William II.',
    imageUrl: 'https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&w=1200&q=80',
    timeline: [
      { year: '1791', event: 'Official opening of the gate designed by Carl Gotthard Langhans.' },
      { year: '1806', event: 'The Quadriga sculpture was taken by Napoleon to Paris after the Battle of Jena.' },
      { year: '1989', event: 'The Fall of the Berlin Wall made the gate a symbol of German freedom and unity.' },
      { year: '2002', event: 'Major restoration completed by the Berlin Monument Conservation Foundation.' }
    ],
    architecturalHighlights: [
      'The Quadriga on top depicts Victoria, the goddess of victory, driving a four-horse chariot.',
      'Modeled directly after the Propylaea, the gateway to the Acropolis in Athens.',
      'Features 12 Doric columns forming five distinct passageways, originally reserving the center for royalty.'
    ],
    narrationScript: 'Welcome to the Brandenburg Gate, Berlin\'s ultimate symbol of unity and dramatic European history. Completed in 1791 by architect Carl Gotthard Langhans, this Greek Revival triumphal arc has stood through empires, cold wars, and democratic reunions. Look up at the Quadriga atop the gate—captured by Napoleon in 1806 and returned in triumph eight years later. Today, its five grand portals remain one of the world\'s most iconic architectural meeting points.',
    groundedHistory: 'The Brandenburg Gate is a 18th-century neoclassical monument in Berlin, built on the site of a former city gate that marked the start of the road from Berlin to the town of Brandenburg an der Havel. It sits at the western end of the boulevard Unter den Linden.',
    visitorTips: [
      'Visit during dawn or late evening to capture stunning lighting on the sandstone columns without heavy crowds.',
      'Combine your tour with a short 5-minute walk to the Reichstag Building and Holocaust Memorial.',
      'Check the calendar for major festival light shows during Berlin\'s annual Festival of Lights in autumn.'
    ],
    recentNewsOrFacts: [
      'The gate underwent comprehensive thermal laser cleaning to preserve its fragile Elbe sandstone.',
      'Remains completely pedestrianized, creating a vibrant focal point for Pariser Platz.',
      'Surrounding embassies were architecturally aligned with the historic scale of the gate after reunification.'
    ],
    funFact: 'Only royal family members and their invited guests were historically permitted to pass through the central passageway.'
  },
  {
    id: 'eiffel-tower',
    name: 'Eiffel Tower',
    city: 'PARIS',
    country: 'FRANCE',
    coordinates: '48.8584° N, 2.2945° E',
    confidence: 99.95,
    style: 'WROUGHT IRON LATTICE',
    condition: 'Preserved',
    builtYear: '1889',
    shortSummary: 'Iconic wrought-iron lattice tower on the Champ de Mars, built as the entrance arch for the 1889 World\'s Fair.',
    imageUrl: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&w=1200&q=80',
    timeline: [
      { year: '1887', event: 'Construction begins under Gustave Eiffel\'s engineering company.' },
      { year: '1889', event: 'Inaugurated for the Exposition Universelle celebrating the French Revolution centennial.' },
      { year: '1944', event: 'Narrowly escaped destruction during WWII as Parisian forces liberated the city.' },
      { year: '2024', event: 'Repainted in historic yellow-brown tone for the Paris Olympic Games.' }
    ],
    architecturalHighlights: [
      'Assembled from 18,038 pieces of puddle iron held together by 2.5 million rivets.',
      'Stands 330 meters tall, retaining the title of world\'s tallest man-made structure until 1930.',
      'Thermal expansion causes the iron structure to shift up to 15 cm away from the sun.'
    ],
    narrationScript: 'Bonjour and welcome to the Eiffel Tower, the world\'s most recognized symbol of architectural daring. Designed by Gustave Eiffel\'s master engineers for the 1889 Paris Exposition Universelle, many 19th-century critics initially denounced it as a metal monstrosity. Yet its soaring puddle-iron arches revolutionized structural engineering and forever transformed the Parisian skyline.',
    groundedHistory: 'Constructed between 1887 and 1889, the Eiffel Tower was intended to stand for only 20 years. However, its value as a radio communications antenna saved it from demolition, turning it into a cornerstone of telecommunications and global culture.',
    visitorTips: [
      'Pre-book elevator access to the Summit at least 60 days in advance to secure sunset viewing slots.',
      'Take the stairs up to the second floor for a dramatic perspective through the crisscrossing iron lattices.',
      'Head to Trocadéro Gardens across the Seine River for the classic wide-angle panoramic photo.'
    ],
    recentNewsOrFacts: [
      'Received its 20th comprehensive paint campaign featuring eco-friendly lead-free protective coatings.',
      'Wind turbines installed inside the structure generate renewable power for the first-floor commercial shops.',
      'Sparkling evening light displays feature 20,000 precision flash bulbs firing for 5 minutes every hour.'
    ],
    funFact: 'Gustave Eiffel built a private apartment at the very top level where he entertained Thomas Edison.'
  },
  {
    id: 'sensoji-temple',
    name: 'Sensō-ji Temple',
    city: 'TOKYO',
    country: 'JAPAN',
    coordinates: '35.7148° N, 139.7967° E',
    confidence: 99.40,
    style: 'JAPANESE BUDDHIST',
    condition: 'Restored',
    builtYear: '645 AD',
    shortSummary: 'Tokyo\'s oldest and most significant ancient Buddhist temple dedicated to Kannon, the Bodhisattva of Compassion.',
    imageUrl: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=1200&q=80',
    timeline: [
      { year: '628 AD', event: 'Two fishermen brothers fish a golden statue of Kannon from the Sumida River.' },
      { year: '645 AD', event: 'First temple founded, making it Tokyo\'s oldest established religious site.' },
      { year: '1945', event: 'Main hall destroyed during WWII air raids; rebuilt with public donations.' },
      { year: '2010', event: 'Comprehensive earthquake retrofitting and titanium roof tile installation completed.' }
    ],
    architecturalHighlights: [
      'Kaminarimon Gate features a massive 700-kilogram paper lantern painted in deep red and black.',
      'Five-story pagoda reaching 48 meters, housing sacred Buddhist sutras.',
      'Titanium roof tiles on the Main Hall replicate traditional clay tiles while reducing structural weight.'
    ],
    narrationScript: 'Welcome to Sensō-ji in Asakusa, Tokyo\'s spiritual heart. Legend tells that in the year 628, two fisherman brothers retrieved a statue of Kannon from the nearby Sumida River. The local chieftain recognized its divinity and consecrated his house into Tokyo\'s very first temple. As you pass through the outer Kaminarimon gate with its legendary red lantern, feel the continuity of fourteen centuries of devotion.',
    groundedHistory: 'Sensō-ji is Tokyo\'s oldest Buddhist temple. Adjacent to the main hall sits a five-story pagoda and Nakamise-dori, a historic shopping street that has provided pilgrims with traditional snacks and crafts for centuries.',
    visitorTips: [
      'Try an Omikuji fortune paper at the main hall; if you draw a bad fortune, tie it to the metal wires so the gods ward it off.',
      'Waft the incense smoke from the jokoro burner over your body for good health and mental clarity.',
      'Explore the grounds after dusk when the pagoda is dramatically illuminated without daytime shopping crowds.'
    ],
    recentNewsOrFacts: [
      'Nakamise market shops retain traditional Edo-period storefront designs with hand-painted shutters.',
      'Hosts the Sanja Matsuri in May, one of Tokyo\'s largest and wildly energetic traditional festivals.',
      'Modern seismic isolation systems protect the historic wooden frame structures against tremors.'
    ],
    funFact: 'The giant red paper lantern at the entrance is replaced every decade by skilled artisans from Kyoto.'
  },
  {
    id: 'colosseum',
    name: 'Colosseum',
    city: 'ROME',
    country: 'ITALY',
    coordinates: '41.8902° N, 12.4922° E',
    confidence: 99.78,
    style: 'ROMAN AMPHITHEATRE',
    condition: 'Ancient / Restored',
    builtYear: '80 AD',
    shortSummary: 'The largest ancient amphitheatre ever built, constructed of travertine limestone, tuff, and brick-faced concrete.',
    imageUrl: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80',
    timeline: [
      { year: '72 AD', event: 'Construction initiated under Emperor Vespasian of the Flavian dynasty.' },
      { year: '80 AD', event: 'Inaugurated by Emperor Titus with 100 days of gladiatorial games and naval re-enactments.' },
      { year: '1349', event: 'Severe earthquake causes the collapse of the outer south wall.' },
      { year: '2021', event: 'High-tech retractable arena floor project unveiled for underground Hypogeum tours.' }
    ],
    architecturalHighlights: [
      'Outer wall composed of three tiers of superimposed arcades featuring Doric, Ionic, and Corinthian order columns.',
      'Hypogeum subterranean network of tunnels and elevators used to deploy gladiators and wild animals.',
      'Velarium retractable canvas awning operated by Roman sailors to shade up to 65,000 spectators.'
    ],
    narrationScript: 'Step back two millennia into imperial Rome. The Colosseum, commissioned by Emperor Vespasian in 72 AD, stands as an astonishing monument to Roman engineering and gladiatorial drama. Designed to seat up to 65,000 citizens in strict social order, its complex underground Hypogeum housed trapdoors, hydraulic lifts, and wild beasts ready for the arena floor.',
    groundedHistory: 'The Flavian Amphitheatre, known worldwide as the Colosseum, is an oval amphitheatre in the centre of the city of Rome. Built of travertine limestone, tuff, and brick-faced concrete, it held gladiatorial contests and public spectacles.',
    visitorTips: [
      'Book full access tickets including the Hypogeum underground levels and Arena floor.',
      'Visit early in the morning alongside the Roman Forum and Palatine Hill with a combined ticket.',
      'Wear sturdy walking shoes with rubber soles for non-slip navigation on ancient cobblestones.'
    ],
    recentNewsOrFacts: [
      'New eco-friendly wooden floor installed over the Hypogeum protects ancient masonry from weather erosion.',
      'Recent restoration revealed traces of original painted fresco patterns inside the upper spectator corridors.',
      'Laser cleaning campaigns removed centuries of urban soot from the exterior travertine limestone.'
    ],
    funFact: 'Romans could flood the arena floor with water to stage mock naval battles called naumachiae.'
  }
];
