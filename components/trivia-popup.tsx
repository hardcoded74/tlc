"use client";

/**
 * Trivia popup — engagement during long lesson generations.
 *
 * The bigger surface (rotating WhileYouWait band, TopicHook, persona
 * narration) gives the user something to read. This gives them
 * something to do. Single question per modal session, multiple
 * choice, reveal answer + brief explanation, then Next pulls another.
 *
 * Question bank is hand-curated and lives in this file. No LLM call,
 * no network round trip — opens instantly. Categories span pedagogy,
 * education history, classroom trivia, and quick subject quizzes so
 * the rotation feels varied.
 *
 * State (score, seen-question indices) is lifted into the parent so
 * the completion scorecard can read it — see lesson-run-view.tsx.
 */

import { useEffect, useMemo, useRef, useState } from "react";

interface Question {
  q: string;
  options: string[];
  correct: number; // index into options
  explain: string;
  category: "pedagogy" | "history" | "classroom" | "subject";
}

const QUESTIONS: Question[] = [
  // Pedagogy
  {
    q: "Vygotsky's 'Zone of Proximal Development' describes the gap between what a learner can do…",
    options: [
      "alone, vs. with help from a more knowledgeable other",
      "before lunch, vs. after lunch",
      "with a textbook, vs. without one",
      "as a child, vs. as an adult",
    ],
    correct: 0,
    explain:
      "ZPD is the 'sweet spot' between independent ability and what's reachable with scaffolding from a teacher or peer.",
    category: "pedagogy",
  },
  {
    q: "Which of these is a retrieval-practice activity, not just a review?",
    options: [
      "Reading the chapter again",
      "Highlighting key terms",
      "Closing the book and writing what you remember",
      "Watching a recorded lecture at 2x speed",
    ],
    correct: 2,
    explain:
      "Retrieval practice is the act of pulling information from memory without prompts. The effort is what builds durable recall — not re-exposure.",
    category: "pedagogy",
  },
  {
    q: "Bloom's Taxonomy lists the lowest-order cognitive task as…",
    options: ["Apply", "Remember", "Evaluate", "Create"],
    correct: 1,
    explain:
      "The 2001 revision goes Remember → Understand → Apply → Analyze → Evaluate → Create.",
    category: "pedagogy",
  },
  {
    q: "Cognitive Load Theory says working memory can typically juggle…",
    options: [
      "About 1-2 chunks at once",
      "About 4 chunks at once",
      "About 12-15 chunks",
      "Unlimited, given enough motivation",
    ],
    correct: 1,
    explain:
      "Cowan's update to Miller's 7±2 puts the working-memory limit closer to 4 chunks. Lesson design lives or dies by respecting that.",
    category: "pedagogy",
  },
  {
    q: "What does the 'Forgetting Curve' (Ebbinghaus, 1885) predict?",
    options: [
      "Students forget faster on Mondays",
      "Memory loss is sharpest immediately after learning, then slows",
      "Memory loss is steady at about 5% per day",
      "Older learners forget faster than younger ones",
    ],
    correct: 1,
    explain:
      "Ebbinghaus showed memory drops steeply within hours of learning, then plateaus. Spaced practice is the antidote.",
    category: "pedagogy",
  },
  {
    q: "'Productive struggle' in math instruction means…",
    options: [
      "Letting students fail without intervention",
      "Engaging with problems just outside current ability, with scaffolds nearby",
      "Assigning extra homework on weekends",
      "Asking trick questions to keep students alert",
    ],
    correct: 1,
    explain:
      "Productive struggle is purposeful difficulty — hard enough to require thinking, scaffolded enough not to be defeating. Sits squarely in the ZPD.",
    category: "pedagogy",
  },
  {
    q: "Which assessment type is most likely to be 'formative'?",
    options: [
      "End-of-year standardized test",
      "Final exam",
      "Exit ticket asking students to summarize today's lesson",
      "Diploma defense",
    ],
    correct: 2,
    explain:
      "Formative assessment happens during learning, gives feedback, and shapes next instruction. Exit tickets are textbook formative.",
    category: "pedagogy",
  },
  // History
  {
    q: "Whose 'Object Lessons' approach (1827) helped popularize hands-on, sensory learning in schools?",
    options: [
      "Maria Montessori",
      "Johann Heinrich Pestalozzi",
      "John Dewey",
      "Friedrich Fröbel",
    ],
    correct: 1,
    explain:
      "Pestalozzi insisted children learn through direct experience with physical objects — a radical idea against the rote-recitation orthodoxy of the time.",
    category: "history",
  },
  {
    q: "Maria Montessori opened her first 'Casa dei Bambini' in…",
    options: ["1868", "1907", "1932", "1955"],
    correct: 1,
    explain:
      "Montessori's first Children's House opened in Rome in 1907, in a working-class district. Self-directed activity in a prepared environment was the core idea.",
    category: "history",
  },
  {
    q: "John Dewey is most associated with which approach to schooling?",
    options: [
      "Experiential / progressive education",
      "Direct instruction",
      "Rote memorization",
      "Socratic dialectic",
    ],
    correct: 0,
    explain:
      "Dewey argued school should be 'a community in miniature' — students learning by doing, then reflecting. His 1916 Democracy and Education is the foundational text.",
    category: "history",
  },
  {
    q: "Brown v. Board of Education (1954) struck down which doctrine?",
    options: [
      "Local control of curriculum",
      "Separate but equal",
      "Religious instruction in schools",
      "Compulsory attendance",
    ],
    correct: 1,
    explain:
      "The Supreme Court held that 'separate educational facilities are inherently unequal,' overturning Plessy v. Ferguson's 1896 'separate but equal' standard.",
    category: "history",
  },
  // Classroom / teacher trivia
  {
    q: "How many decisions does a typical K-12 teacher make in a single school day, by classroom-research estimates?",
    options: ["Around 200", "Around 600", "Around 1,500", "Around 5,000"],
    correct: 2,
    explain:
      "The widely-cited figure is ~1,500 — micro-decisions about pacing, who to call on, when to redirect, how to phrase a question, etc.",
    category: "classroom",
  },
  {
    q: "What share of US public-school teachers report regularly buying classroom supplies with their own money?",
    options: ["About 20%", "About 50%", "About 75%", "About 95%"],
    correct: 3,
    explain:
      "Department of Education surveys put the figure at ~94-95%. Average out-of-pocket spend is in the few-hundreds per year.",
    category: "classroom",
  },
  {
    q: "The 'three-week rule' in classroom management says you should establish norms within…",
    options: [
      "The first three days",
      "The first three weeks",
      "The first three months",
      "The first three units",
    ],
    correct: 1,
    explain:
      "Strong start: clear, consistent norms in the first 2-3 weeks save you the rest of the year. Wong's First Days of School is the canonical reference.",
    category: "classroom",
  },
  {
    q: "Which of these is a real teacher's-meeting acronym?",
    options: [
      "PLC — Professional Learning Community",
      "NPE — Noisy Possum Encounter",
      "DPR — Dramatic Pedagogical Recital",
      "TGI — Truly Grand Inquiry",
    ],
    correct: 0,
    explain:
      "PLC: a small group of teachers meeting regularly to plan and improve practice. The other three I made up. Sorry.",
    category: "classroom",
  },
  // Subject quizzes
  {
    q: "How many words long is Lincoln's Gettysburg Address?",
    options: ["72", "272", "1,272", "5,272"],
    correct: 1,
    explain:
      "272 words. Edward Everett spoke for two hours just before. We remember the 272.",
    category: "subject",
  },
  {
    q: "What's the smallest prime number that is NOT odd?",
    options: ["1", "2", "3", "There is no such number"],
    correct: 1,
    explain:
      "Two is the only even prime. Every other even number has 2 as a factor, ruling it out.",
    category: "subject",
  },
  {
    q: "Which planet has a day longer than its year?",
    options: ["Mercury", "Venus", "Mars", "Neptune"],
    correct: 1,
    explain:
      "Venus rotates so slowly that a Venusian day (~243 Earth days) is longer than its orbit around the Sun (~225 Earth days).",
    category: "subject",
  },
  {
    q: "How many phonemes (distinct sounds) does English have?",
    options: ["About 26", "About 44", "About 80", "About 200"],
    correct: 1,
    explain:
      "English has roughly 44 phonemes mapped onto 26 letters. That mismatch is most of what early-reading instruction is fighting.",
    category: "subject",
  },
  {
    q: "Shakespeare is credited with first recording or inventing roughly how many English words?",
    options: ["About 17", "About 170", "About 1,700", "About 17,000"],
    correct: 2,
    explain:
      "Around 1,700, including 'eyeball,' 'gossip,' 'lonely,' 'bedroom,' and 'fashionable.'",
    category: "subject",
  },
  {
    q: "Photosynthesis converts CO₂, water, and sunlight into…",
    options: [
      "Methane and oxygen",
      "Glucose and oxygen",
      "Glucose and methane",
      "Carbon and water",
    ],
    correct: 1,
    explain:
      "6 CO₂ + 6 H₂O + light → C₆H₁₂O₆ + 6 O₂. The plant keeps the sugar, releases the oxygen.",
    category: "subject",
  },
  {
    q: "What's special about the number 153?",
    options: [
      "It's prime",
      "It equals the sum of the cubes of its digits (1³+5³+3³)",
      "It's a perfect square",
      "It can't be made from any base-10 sum",
    ],
    correct: 1,
    explain:
      "1³ + 5³ + 3³ = 1 + 125 + 27 = 153. Numbers like this are called Armstrong numbers (or narcissistic numbers).",
    category: "subject",
  },
  {
    q: "Which mountain range is older: the Appalachians or the Rockies?",
    options: [
      "The Appalachians (about 480 million years older)",
      "The Rockies",
      "They formed at roughly the same time",
      "Neither — both are younger than the Andes",
    ],
    correct: 0,
    explain:
      "The Appalachians began forming ~480 mya during the Ordovician. The Rockies are recent geological newcomers — ~80 mya.",
    category: "subject",
  },
  {
    q: "How long is a single 'astronomical unit' (AU)?",
    options: [
      "The diameter of the moon",
      "The Earth-to-Sun distance, ~93 million miles",
      "The radius of Earth's orbit, ~150 light-years",
      "1,000 km",
    ],
    correct: 1,
    explain:
      "1 AU = the average Earth-to-Sun distance, about 149.6 million km / 93 million miles. The yardstick for measuring our solar system.",
    category: "subject",
  },
  {
    q: "Which document was signed first?",
    options: [
      "The Magna Carta (1215)",
      "The US Declaration of Independence (1776)",
      "The Treaty of Westphalia (1648)",
      "The English Bill of Rights (1689)",
    ],
    correct: 0,
    explain:
      "The Magna Carta. Signed at Runnymede in 1215 between King John and rebellious barons. The seed idea: even the king is under the law.",
    category: "subject",
  },
  {
    q: "What does the 'L' in LASER stand for?",
    options: ["Lens", "Light", "Linear", "Logic"],
    correct: 1,
    explain:
      "Light Amplification by Stimulated Emission of Radiation. Einstein predicted stimulated emission in 1917, almost half a century before the first working laser.",
    category: "subject",
  },
  {
    q: "Roughly how many of Beethoven's symphonies were composed after he was already going deaf?",
    options: ["1 of 9", "Half of them", "All 9", "He never finished any"],
    correct: 1,
    explain:
      "Beethoven's hearing began declining in his late 20s. The symphonies from #3 onward — including the famous 5th, 7th, and 9th — were written as he lost it.",
    category: "subject",
  },
  {
    q: "What is the only US state name that ends in three vowels?",
    options: ["Hawaii", "Iowa", "Ohio", "Indiana"],
    correct: 0,
    explain:
      "Hawaii ends in -aii. (Hawaiian also has a glottal stop in the spelling — Hawaiʻi — but the vowel cluster stands.)",
    category: "subject",
  },
  {
    q: "Whose four-color theorem was the first major mathematical proof completed by computer (1976)?",
    options: ["Gödel's", "The Riemann Hypothesis", "Appel and Haken's", "Fermat's Last"],
    correct: 2,
    explain:
      "Appel and Haken proved that any planar map can be colored with at most four colors, using thousands of computer-checked cases. Caused real fights about what 'proof' means.",
    category: "subject",
  },
  {
    q: "Which of these is NOT one of Earth's major rock types?",
    options: ["Igneous", "Sedimentary", "Metamorphic", "Photogenic"],
    correct: 3,
    explain: "Igneous, sedimentary, and metamorphic. The fourth is what your students think you are.",
    category: "subject",
  },
];

function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface TriviaScore {
  right: number;
  wrong: number;
  total: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onScoreChange: (score: TriviaScore) => void;
}

export function TriviaPopup({ open, onClose, onScoreChange }: Props) {
  const orderRef = useRef<Question[] | null>(null);
  if (orderRef.current == null) {
    orderRef.current = shuffle(QUESTIONS);
  }
  const order = orderRef.current;

  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [right, setRight] = useState(0);
  const [wrong, setWrong] = useState(0);

  const question = order[index % order.length];
  const submitted = picked != null;
  const isRight = submitted && picked === question.correct;

  // Bubble score updates up so the completion scorecard can read them.
  useEffect(() => {
    onScoreChange({ right, wrong, total: right + wrong });
  }, [right, wrong, onScoreChange]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  function submit(i: number) {
    if (submitted) return;
    setPicked(i);
    if (i === question.correct) setRight((r) => r + 1);
    else setWrong((w) => w + 1);
  }

  function next() {
    setIndex((i) => i + 1);
    setPicked(null);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-xl rounded-md border border-hunter-200 bg-paper p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs uppercase tracking-widest text-(--color-muted)">
            Trivia · {question.category}
          </p>
          <p className="text-xs text-(--color-muted)">
            {right} right · {wrong} wrong
          </p>
        </div>

        <h3 className="mt-2 font-serif text-xl leading-snug">{question.q}</h3>

        <div className="mt-4 space-y-2">
          {question.options.map((opt, i) => {
            const isCorrect = i === question.correct;
            const isPicked = i === picked;
            const showAsCorrect = submitted && isCorrect;
            const showAsWrong = submitted && isPicked && !isCorrect;
            const cls = showAsCorrect
              ? "border-green-400 bg-green-50 text-green-900"
              : showAsWrong
                ? "border-red-300 bg-red-50 text-red-900"
                : "border-hunter-200 bg-white hover:bg-hunter-50";
            return (
              <button
                key={i}
                type="button"
                disabled={submitted}
                onClick={() => submit(i)}
                className={`w-full text-left rounded border px-3 py-2 text-sm ${cls} disabled:cursor-default`}
              >
                <span className="mr-2 font-mono text-xs text-(--color-muted)">
                  {String.fromCharCode(65 + i)}.
                </span>
                {opt}
              </button>
            );
          })}
        </div>

        {submitted ? (
          <div className="mt-4 rounded bg-hunter-50 px-3 py-2 text-sm">
            <p className="font-medium">
              {isRight ? "Correct." : "Not quite."}
            </p>
            <p className="mt-1 text-(--color-muted)">{question.explain}</p>
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-hunter-700 hover:underline"
          >
            Close
          </button>
          <button
            type="button"
            onClick={next}
            disabled={!submitted}
            className="rounded bg-hunter-700 text-white text-sm px-4 py-2 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact opener button — sits inline near WhileYouWait.
 * Intentionally low-key so it doesn't shout at the teacher who'd rather
 * just read.
 */
export function TriviaOpener({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded border border-hunter-200 bg-white px-3 py-1.5 text-xs text-hunter-700 hover:bg-hunter-50"
    >
      <span aria-hidden>🎲</span>
      Play trivia while you wait
    </button>
  );
}
