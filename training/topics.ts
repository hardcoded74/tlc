/**
 * Topic × grade matrix for SFT data generation.
 *
 * Each row produces TWO training examples (Hunter + Christine) when run
 * through generate_training_data.ts. Goal: ~250 *valid* examples per
 * persona after schema-validation filter.
 *
 * Topics chosen for breadth (subject mix), classroom realism, and
 * coverage of common K-12 standards. Some intentionally overlap with
 * the gallery seeds in examples/seed_lessons/ so the LoRA learns to
 * reproduce shapes the verifier already vouched for.
 */

export interface TopicSeed {
  topic: string;
  grades: string[]; // produces one row per grade
  subject: string;
  notes?: string;
}

const grades = (...g: string[]) => g;
const ELEM = grades("K", "1st grade", "2nd grade", "3rd grade", "4th grade", "5th grade");
const MIDDLE = grades("6th grade", "7th grade", "8th grade");
const HIGH = grades("9th grade", "10th grade", "11th grade", "12th grade");

export const TOPIC_MATRIX: TopicSeed[] = [
  // ─── Science ─────────────────────────────────────────────────────
  { topic: "Photosynthesis", grades: grades("3rd grade", "5th grade", "7th grade"), subject: "Science" },
  { topic: "The water cycle", grades: grades("2nd grade", "4th grade", "6th grade"), subject: "Science" },
  { topic: "Phases of matter", grades: grades("2nd grade", "5th grade"), subject: "Science" },
  { topic: "Simple machines", grades: grades("4th grade", "6th grade"), subject: "Science" },
  { topic: "Magnets and magnetism", grades: grades("3rd grade", "5th grade"), subject: "Science" },
  { topic: "Ecosystems and food chains", grades: grades("4th grade", "6th grade"), subject: "Science" },
  { topic: "Cell organelles", grades: grades("7th grade", "9th grade"), subject: "Science" },
  { topic: "Weather patterns", grades: grades("2nd grade", "4th grade"), subject: "Science" },
  { topic: "Volcanoes and plate tectonics", grades: grades("5th grade", "7th grade", "9th grade"), subject: "Science" },
  { topic: "Gravity and motion", grades: grades("4th grade", "8th grade"), subject: "Science" },
  { topic: "Sound waves", grades: grades("3rd grade", "6th grade"), subject: "Science" },
  { topic: "Electricity and circuits", grades: grades("4th grade", "8th grade"), subject: "Science" },
  { topic: "Plant life cycle", grades: grades("K", "2nd grade"), subject: "Science" },
  { topic: "Atoms and the periodic table", grades: grades("8th grade", "10th grade"), subject: "Science" },
  { topic: "Phases of the Moon", grades: grades("3rd grade", "5th grade"), subject: "Science" },
  { topic: "Dinosaurs and extinction", grades: grades("2nd grade", "4th grade"), subject: "Science" },
  { topic: "Renewable energy sources", grades: grades("5th grade", "8th grade"), subject: "Science" },
  { topic: "The human skeletal system", grades: grades("4th grade", "6th grade"), subject: "Science" },
  { topic: "Newton's laws of motion", grades: grades("8th grade", "10th grade"), subject: "Science" },
  { topic: "DNA and heredity", grades: grades("8th grade", "10th grade"), subject: "Science" },

  // ─── Math ────────────────────────────────────────────────────────
  { topic: "Equal-parts fractions", grades: grades("3rd grade", "4th grade"), subject: "Math" },
  { topic: "Adding and subtracting fractions with unlike denominators", grades: grades("5th grade"), subject: "Math" },
  { topic: "Multiplication facts up to 12", grades: grades("3rd grade"), subject: "Math" },
  { topic: "Long division", grades: grades("4th grade", "5th grade"), subject: "Math" },
  { topic: "Place value with whole numbers", grades: grades("2nd grade", "3rd grade"), subject: "Math" },
  { topic: "Decimals and the decimal point", grades: grades("4th grade", "5th grade"), subject: "Math" },
  { topic: "Area and perimeter", grades: grades("3rd grade", "5th grade"), subject: "Math" },
  { topic: "Telling time on an analog clock", grades: grades("1st grade", "2nd grade"), subject: "Math" },
  { topic: "Counting money and making change", grades: grades("2nd grade", "3rd grade"), subject: "Math" },
  { topic: "Bar graphs and pictographs", grades: grades("2nd grade", "4th grade"), subject: "Math" },
  { topic: "Solving one-variable equations", grades: grades("6th grade", "8th grade"), subject: "Math" },
  { topic: "Percentages and percent change", grades: grades("6th grade", "7th grade"), subject: "Math" },
  { topic: "The Pythagorean theorem", grades: grades("8th grade", "9th grade"), subject: "Math" },
  { topic: "Probability with dice and coins", grades: grades("5th grade", "7th grade"), subject: "Math" },
  { topic: "Graphing linear equations", grades: grades("8th grade", "9th grade"), subject: "Math" },

  // ─── ELA / Reading / Writing ────────────────────────────────────
  { topic: "Letter sounds and phonics", grades: grades("K", "1st grade"), subject: "ELA" },
  { topic: "Sight words for early readers", grades: grades("K", "1st grade"), subject: "ELA" },
  { topic: "Identifying the main idea", grades: grades("3rd grade", "5th grade"), subject: "ELA" },
  { topic: "Character traits and motivation", grades: grades("4th grade", "6th grade"), subject: "ELA" },
  { topic: "Plot structure: rising action, climax, resolution", grades: grades("5th grade", "7th grade"), subject: "ELA" },
  { topic: "Figurative language: similes and metaphors", grades: grades("4th grade", "6th grade"), subject: "ELA" },
  { topic: "Parts of speech: nouns, verbs, adjectives", grades: grades("2nd grade", "3rd grade"), subject: "ELA" },
  { topic: "Prefixes and suffixes", grades: grades("3rd grade", "5th grade"), subject: "ELA" },
  { topic: "Persuasive writing structure", grades: grades("5th grade", "7th grade", "9th grade"), subject: "ELA" },
  { topic: "Writing a paragraph with a topic sentence", grades: grades("3rd grade", "4th grade"), subject: "ELA" },
  { topic: "Summarizing a short story", grades: grades("4th grade", "6th grade"), subject: "ELA" },
  { topic: "Point of view: first, second, third person", grades: grades("4th grade", "6th grade"), subject: "ELA" },
  { topic: "Romeo and Juliet, the balcony scene", grades: grades("9th grade"), subject: "ELA" },
  { topic: "Symbolism in The Great Gatsby", grades: grades("11th grade"), subject: "ELA" },

  // ─── Social Studies ──────────────────────────────────────────────
  { topic: "Communities and helpers", grades: grades("K", "1st grade"), subject: "Social Studies" },
  { topic: "Reading maps and compass directions", grades: grades("2nd grade", "4th grade"), subject: "Social Studies" },
  { topic: "Native American tribes of the Plains", grades: grades("4th grade"), subject: "Social Studies" },
  { topic: "The American Revolution", grades: grades("5th grade", "8th grade"), subject: "Social Studies" },
  { topic: "The Battle of Gettysburg", grades: grades("5th grade", "8th grade"), subject: "Social Studies" },
  { topic: "The Constitution and Bill of Rights", grades: grades("5th grade", "8th grade", "11th grade"), subject: "Social Studies" },
  { topic: "Ancient Egypt", grades: grades("6th grade"), subject: "Social Studies" },
  { topic: "Ancient Greece and democracy", grades: grades("6th grade", "9th grade"), subject: "Social Studies" },
  { topic: "Immigration to the United States, 1880-1920", grades: grades("8th grade", "11th grade"), subject: "Social Studies" },
  { topic: "World War II turning points", grades: grades("8th grade", "11th grade"), subject: "Social Studies" },
  { topic: "The civil rights movement", grades: grades("5th grade", "8th grade", "11th grade"), subject: "Social Studies" },

  // ─── Music / Art / Health ───────────────────────────────────────
  { topic: "Reading basic musical notation", grades: grades("3rd grade", "5th grade"), subject: "Music" },
  { topic: "Color theory: primary, secondary, complementary", grades: grades("2nd grade", "4th grade"), subject: "Art" },
  { topic: "Nutrition and the food groups", grades: grades("2nd grade", "4th grade"), subject: "Health" },
  { topic: "Sleep, exercise, and how the body recovers", grades: grades("5th grade", "7th grade"), subject: "Health" },
];

/**
 * Flatten the matrix into one row per (topic, grade, persona) triple.
 * The total count this produces is the upper bound for generation —
 * actual yield depends on how many pass schema validation.
 */
export interface GenerationRow {
  topic: string;
  gradeLevel: string;
  subject: string;
  persona: "hunter" | "christine";
}

export function expandMatrix(): GenerationRow[] {
  const out: GenerationRow[] = [];
  for (const t of TOPIC_MATRIX) {
    for (const grade of t.grades) {
      for (const persona of ["hunter", "christine"] as const) {
        out.push({ topic: t.topic, gradeLevel: grade, subject: t.subject, persona });
      }
    }
  }
  return out;
}

/** Stable key for dedup / resume. */
export function rowKey(r: GenerationRow): string {
  return `${r.persona}::${r.gradeLevel}::${r.topic}`;
}
