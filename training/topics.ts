/**
 * Topic × grade × class-length matrix for SFT data generation.
 *
 * Each row produces TWO training examples (Hunter + Christine) when run
 * through generate_training_data.ts. Goal: enough valid examples per
 * persona that the LoRA learns schema discipline AND grade-band /
 * class-length sensitivity.
 *
 * Topics chosen for breadth (subject mix), classroom realism, and
 * coverage of common K-12 standards. Multiple grade-band variants per
 * topic let the LoRA learn that "5th grade" and "9th grade" need
 * different vocabulary, time blocks, and assessment depth even when
 * the topic is the same.
 *
 * Class-length variants teach time-block flexibility: most rows are
 * 45 min (canonical default), some are 30 / 60 / 90 to give the LoRA
 * exposure to other realistic class periods.
 */

export interface TopicSeed {
  topic: string;
  grades: string[]; // produces one row per grade
  classLengths?: number[]; // default [45]
  subject: string;
  notes?: string;
}

const grades = (...g: string[]) => g;
const LEN = (...n: number[]) => n;

export const TOPIC_MATRIX: TopicSeed[] = [
  // ─── Science (K-12, deep coverage) ───────────────────────────────
  { topic: "Photosynthesis", grades: grades("2nd grade", "3rd grade", "4th grade", "5th grade", "7th grade"), subject: "Science", classLengths: LEN(30, 45, 60) },
  { topic: "The water cycle", grades: grades("1st grade", "2nd grade", "3rd grade", "4th grade", "5th grade", "6th grade"), subject: "Science", classLengths: LEN(30, 45) },
  { topic: "Phases of matter (solid, liquid, gas)", grades: grades("K", "1st grade", "2nd grade", "5th grade"), subject: "Science" },
  { topic: "Simple machines (lever, pulley, wedge)", grades: grades("3rd grade", "4th grade", "5th grade", "6th grade"), subject: "Science" },
  { topic: "Magnets and magnetism", grades: grades("1st grade", "3rd grade", "5th grade"), subject: "Science" },
  { topic: "Ecosystems and food chains", grades: grades("3rd grade", "4th grade", "5th grade", "6th grade"), subject: "Science", classLengths: LEN(45, 60) },
  { topic: "Cell structure and organelles", grades: grades("5th grade", "7th grade", "8th grade", "9th grade"), subject: "Science" },
  { topic: "Weather patterns and forecasting", grades: grades("1st grade", "2nd grade", "3rd grade", "4th grade"), subject: "Science" },
  { topic: "Volcanoes and plate tectonics", grades: grades("3rd grade", "5th grade", "7th grade", "9th grade"), subject: "Science", classLengths: LEN(45, 60) },
  { topic: "Gravity and motion", grades: grades("3rd grade", "4th grade", "6th grade", "8th grade"), subject: "Science" },
  { topic: "Sound waves and vibrations", grades: grades("1st grade", "3rd grade", "6th grade"), subject: "Science" },
  { topic: "Electricity and simple circuits", grades: grades("4th grade", "5th grade", "8th grade"), subject: "Science", classLengths: LEN(45, 60) },
  { topic: "Plant life cycle", grades: grades("K", "1st grade", "2nd grade", "3rd grade"), subject: "Science" },
  { topic: "Atoms and the periodic table", grades: grades("8th grade", "9th grade", "10th grade"), subject: "Science", classLengths: LEN(45, 60) },
  { topic: "Phases of the Moon", grades: grades("2nd grade", "3rd grade", "4th grade", "5th grade", "8th grade"), subject: "Science" },
  { topic: "Dinosaurs and extinction", grades: grades("1st grade", "2nd grade", "3rd grade", "4th grade"), subject: "Science" },
  { topic: "Renewable energy sources", grades: grades("4th grade", "5th grade", "8th grade"), subject: "Science" },
  { topic: "The human skeletal system", grades: grades("3rd grade", "4th grade", "6th grade"), subject: "Science" },
  { topic: "Newton's laws of motion", grades: grades("8th grade", "9th grade", "10th grade"), subject: "Science", classLengths: LEN(45, 60) },
  { topic: "DNA, genes, and heredity", grades: grades("7th grade", "8th grade", "9th grade", "10th grade"), subject: "Science" },
  { topic: "Animal classification (vertebrates, invertebrates)", grades: grades("2nd grade", "3rd grade", "5th grade"), subject: "Science" },
  { topic: "States of water and the freezing point", grades: grades("K", "1st grade", "3rd grade"), subject: "Science" },
  { topic: "The solar system and the planets", grades: grades("2nd grade", "3rd grade", "5th grade", "8th grade"), subject: "Science" },
  { topic: "Pollination and pollinators", grades: grades("2nd grade", "3rd grade", "4th grade"), subject: "Science" },
  { topic: "Erosion and weathering", grades: grades("3rd grade", "4th grade", "5th grade"), subject: "Science" },
  { topic: "The carbon cycle", grades: grades("5th grade", "7th grade", "9th grade"), subject: "Science" },

  // ─── Math (K-12, deep coverage) ──────────────────────────────────
  { topic: "Equal-parts fractions (halves, thirds, fourths)", grades: grades("2nd grade", "3rd grade", "4th grade"), subject: "Math" },
  { topic: "Adding and subtracting fractions with unlike denominators", grades: grades("4th grade", "5th grade"), subject: "Math" },
  { topic: "Multiplication facts up to 12", grades: grades("2nd grade", "3rd grade"), subject: "Math", classLengths: LEN(30, 45) },
  { topic: "Long division with remainders", grades: grades("4th grade", "5th grade"), subject: "Math" },
  { topic: "Place value with whole numbers", grades: grades("1st grade", "2nd grade", "3rd grade"), subject: "Math" },
  { topic: "Decimals and the decimal point", grades: grades("3rd grade", "4th grade", "5th grade"), subject: "Math" },
  { topic: "Area and perimeter of rectangles", grades: grades("3rd grade", "4th grade", "5th grade"), subject: "Math" },
  { topic: "Telling time on an analog clock", grades: grades("K", "1st grade", "2nd grade"), subject: "Math", classLengths: LEN(30, 45) },
  { topic: "Counting money and making change", grades: grades("1st grade", "2nd grade", "3rd grade"), subject: "Math" },
  { topic: "Bar graphs and pictographs", grades: grades("2nd grade", "3rd grade", "4th grade"), subject: "Math" },
  { topic: "Solving one-variable linear equations", grades: grades("6th grade", "7th grade", "8th grade"), subject: "Math" },
  { topic: "Percentages and percent change", grades: grades("5th grade", "6th grade", "7th grade"), subject: "Math" },
  { topic: "The Pythagorean theorem", grades: grades("7th grade", "8th grade", "9th grade"), subject: "Math" },
  { topic: "Probability with dice and coins", grades: grades("4th grade", "5th grade", "7th grade"), subject: "Math" },
  { topic: "Graphing linear equations on a coordinate plane", grades: grades("7th grade", "8th grade", "9th grade"), subject: "Math" },
  { topic: "Counting by 2s, 5s, and 10s", grades: grades("K", "1st grade", "2nd grade"), subject: "Math" },
  { topic: "Geometric shapes: triangles, quadrilaterals, polygons", grades: grades("1st grade", "2nd grade", "3rd grade"), subject: "Math" },
  { topic: "Order of operations (PEMDAS)", grades: grades("4th grade", "5th grade", "6th grade"), subject: "Math" },
  { topic: "Ratios and proportions", grades: grades("6th grade", "7th grade"), subject: "Math" },
  { topic: "Mean, median, and mode", grades: grades("5th grade", "6th grade", "7th grade"), subject: "Math" },

  // ─── ELA / Reading / Writing ────────────────────────────────────
  { topic: "Letter sounds and basic phonics", grades: grades("K", "1st grade"), subject: "ELA", classLengths: LEN(30, 45) },
  { topic: "Sight words for early readers", grades: grades("K", "1st grade", "2nd grade"), subject: "ELA" },
  { topic: "Identifying the main idea of a passage", grades: grades("2nd grade", "3rd grade", "4th grade", "5th grade"), subject: "ELA" },
  { topic: "Character traits and motivation", grades: grades("3rd grade", "4th grade", "5th grade", "6th grade"), subject: "ELA" },
  { topic: "Plot structure: rising action, climax, resolution", grades: grades("4th grade", "5th grade", "6th grade", "7th grade"), subject: "ELA" },
  { topic: "Figurative language: similes and metaphors", grades: grades("3rd grade", "4th grade", "5th grade", "6th grade"), subject: "ELA" },
  { topic: "Parts of speech: nouns, verbs, adjectives", grades: grades("1st grade", "2nd grade", "3rd grade"), subject: "ELA" },
  { topic: "Prefixes, suffixes, and root words", grades: grades("3rd grade", "4th grade", "5th grade"), subject: "ELA" },
  { topic: "Persuasive writing structure", grades: grades("4th grade", "5th grade", "7th grade", "9th grade"), subject: "ELA", classLengths: LEN(45, 60) },
  { topic: "Writing a paragraph with a topic sentence", grades: grades("2nd grade", "3rd grade", "4th grade"), subject: "ELA" },
  { topic: "Summarizing a short story", grades: grades("3rd grade", "4th grade", "5th grade", "6th grade"), subject: "ELA" },
  { topic: "Point of view: first, second, third person", grades: grades("3rd grade", "4th grade", "5th grade", "6th grade"), subject: "ELA" },
  { topic: "Romeo and Juliet, the balcony scene", grades: grades("9th grade", "10th grade"), subject: "ELA", classLengths: LEN(45, 60, 90) },
  { topic: "Symbolism in The Great Gatsby", grades: grades("11th grade"), subject: "ELA", classLengths: LEN(45, 60) },
  { topic: "Spelling rules: short and long vowels", grades: grades("K", "1st grade", "2nd grade"), subject: "ELA" },
  { topic: "Comparing two characters in a story", grades: grades("2nd grade", "3rd grade", "4th grade"), subject: "ELA" },
  { topic: "Identifying author's purpose", grades: grades("3rd grade", "4th grade", "5th grade"), subject: "ELA" },
  { topic: "Citing textual evidence", grades: grades("4th grade", "5th grade", "6th grade", "7th grade"), subject: "ELA" },
  { topic: "Writing an introduction paragraph", grades: grades("3rd grade", "4th grade", "5th grade"), subject: "ELA" },

  // ─── Social Studies ──────────────────────────────────────────────
  { topic: "Communities and community helpers", grades: grades("K", "1st grade", "2nd grade"), subject: "Social Studies" },
  { topic: "Reading maps and compass directions", grades: grades("1st grade", "2nd grade", "3rd grade", "4th grade"), subject: "Social Studies" },
  { topic: "Native American tribes of the Plains", grades: grades("3rd grade", "4th grade"), subject: "Social Studies" },
  { topic: "The American Revolution", grades: grades("4th grade", "5th grade", "8th grade"), subject: "Social Studies", classLengths: LEN(45, 60) },
  { topic: "The Battle of Gettysburg", grades: grades("5th grade", "8th grade", "11th grade"), subject: "Social Studies" },
  { topic: "The Constitution and the Bill of Rights", grades: grades("4th grade", "5th grade", "8th grade", "11th grade"), subject: "Social Studies" },
  { topic: "Ancient Egypt and the pyramids", grades: grades("4th grade", "6th grade"), subject: "Social Studies" },
  { topic: "Ancient Greece and the origins of democracy", grades: grades("5th grade", "6th grade", "9th grade"), subject: "Social Studies" },
  { topic: "Immigration to the United States, 1880-1920", grades: grades("5th grade", "8th grade", "11th grade"), subject: "Social Studies" },
  { topic: "World War II turning points", grades: grades("8th grade", "10th grade", "11th grade"), subject: "Social Studies", classLengths: LEN(45, 60) },
  { topic: "The civil rights movement", grades: grades("4th grade", "5th grade", "8th grade", "11th grade"), subject: "Social Studies" },
  { topic: "Branches of the U.S. government", grades: grades("3rd grade", "4th grade", "5th grade", "8th grade"), subject: "Social Studies" },
  { topic: "Local, state, and federal taxes", grades: grades("5th grade", "7th grade", "10th grade"), subject: "Social Studies" },
  { topic: "Supply and demand", grades: grades("5th grade", "7th grade", "9th grade"), subject: "Social Studies" },

  // ─── Music / Art / Health / PE / Other ──────────────────────────
  { topic: "Reading basic musical notation", grades: grades("2nd grade", "3rd grade", "5th grade"), subject: "Music" },
  { topic: "Rhythm and meter in music", grades: grades("1st grade", "3rd grade", "5th grade"), subject: "Music" },
  { topic: "Color theory: primary, secondary, complementary", grades: grades("1st grade", "2nd grade", "4th grade"), subject: "Art" },
  { topic: "Drawing in one-point perspective", grades: grades("4th grade", "5th grade", "7th grade"), subject: "Art", classLengths: LEN(45, 60) },
  { topic: "Nutrition and the food groups", grades: grades("1st grade", "2nd grade", "3rd grade", "4th grade"), subject: "Health" },
  { topic: "Sleep, exercise, and how the body recovers", grades: grades("4th grade", "5th grade", "7th grade"), subject: "Health" },
  { topic: "Hand-washing and germ transmission", grades: grades("K", "1st grade", "2nd grade"), subject: "Health" },
  { topic: "Mental health basics: stress and coping", grades: grades("5th grade", "7th grade", "9th grade"), subject: "Health" },
  { topic: "Throwing and catching mechanics", grades: grades("K", "1st grade", "2nd grade", "3rd grade"), subject: "PE" },
  { topic: "Cooperative games and teamwork", grades: grades("2nd grade", "3rd grade", "4th grade"), subject: "PE" },
  { topic: "Saving, spending, and budgeting basics", grades: grades("3rd grade", "4th grade", "5th grade", "8th grade"), subject: "Financial Literacy" },
  { topic: "Compound interest and the time value of money", grades: grades("8th grade", "10th grade", "11th grade"), subject: "Financial Literacy" },
  { topic: "Greetings and basic introductions in Spanish", grades: grades("K", "1st grade", "3rd grade"), subject: "World Language" },
  { topic: "Greetings and basic introductions in French", grades: grades("K", "1st grade", "3rd grade"), subject: "World Language" },

  // ─── Computing / Tech ───────────────────────────────────────────
  { topic: "What is an algorithm?", grades: grades("3rd grade", "4th grade", "6th grade"), subject: "Computer Science" },
  { topic: "Sequencing and loops in block-based code", grades: grades("2nd grade", "3rd grade", "4th grade"), subject: "Computer Science" },
  { topic: "Internet safety and digital citizenship", grades: grades("3rd grade", "4th grade", "5th grade", "7th grade"), subject: "Computer Science" },
];

/**
 * Flatten the matrix into one row per (topic, grade, classLength, persona).
 * Class lengths default to [45] when not specified.
 */
export interface GenerationRow {
  topic: string;
  gradeLevel: string;
  classLength: number;
  subject: string;
  persona: "hunter" | "christine";
}

export function expandMatrix(): GenerationRow[] {
  const out: GenerationRow[] = [];
  for (const t of TOPIC_MATRIX) {
    const lengths = t.classLengths ?? [45];
    for (const grade of t.grades) {
      for (const classLength of lengths) {
        for (const persona of ["hunter", "christine"] as const) {
          out.push({
            topic: t.topic,
            gradeLevel: grade,
            classLength,
            subject: t.subject,
            persona,
          });
        }
      }
    }
  }
  return out;
}

/** Stable key for dedup / resume — includes class length so widening
 *  the matrix doesn't re-fire already-completed rows. */
export function rowKey(r: GenerationRow): string {
  return `${r.persona}::${r.gradeLevel}::${r.classLength}min::${r.topic}`;
}
