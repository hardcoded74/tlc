/**
 * "Did you know..." card — a single hand-curated fact about the
 * lesson topic, anchored under the WhileYouWait band. Static, no
 * fade, no rotation. Hides on terminal status (the page becomes the
 * lesson at that point).
 *
 * Hand-curated so we never claim something we can't stand behind.
 * Topic match is regex-substring; first match wins. No match = no
 * card (don't risk showing "Did you know" with a lukewarm filler).
 */

const TOPIC_HOOKS: Array<{ match: RegExp; line: string; credit?: string }> = [
  {
    match: /photosynth/i,
    line:
      "A single mature tree can release enough oxygen in a day to support a family of four. The leaves are a chemical factory running on sunlight.",
  },
  {
    match: /fraction/i,
    line:
      "Ancient Egyptians wrote almost every fraction as a sum of unit fractions: 5/8 was 1/2 + 1/8. Calculations on the Rhind papyrus look impossible until you remember they had no shortcut for 'three-fifths.'",
  },
  {
    match: /water cycle/i,
    line:
      "About 90% of Earth's atmospheric water comes from the ocean — and most of it falls right back into the ocean as rain. The cycle is tilted toward the sea.",
  },
  {
    match: /gettysburg/i,
    line:
      "Lincoln's Gettysburg Address was 272 words. Edward Everett, the headline speaker that day, spoke for two hours. We remember the 272.",
  },
  {
    match: /moon|lunar|phases/i,
    line:
      "We always see the same face of the Moon — tidal locking. The far side wasn't photographed until a Soviet probe in 1959, more than 4 billion years after the Moon stopped turning.",
  },
  {
    match: /letter sound|phonics|phoneme/i,
    line:
      "English has 26 letters but roughly 44 phonemes. Most of what early reading instruction is fighting is the gap between those two numbers.",
  },
  {
    match: /cell|organelle|mitochond/i,
    line:
      "A single human liver cell can contain over a thousand mitochondria. Heart-muscle cells go even higher — they need the energy.",
  },
  {
    match: /shakespear/i,
    line:
      "Shakespeare invented or first recorded around 1,700 English words. 'Eyeball,' 'gossip,' 'bedroom,' and 'lonely' all show up in his work before they show up anywhere else.",
  },
  {
    match: /laser/i,
    line:
      "The 'L' in 'laser' originally stood for 'light' — short for Light Amplification by Stimulated Emission of Radiation. Einstein predicted stimulated emission in 1917, almost half a century before the first working laser fired in 1960.",
  },
  {
    match: /civil war|reconstruction/i,
    line:
      "More Americans died in the Civil War than in any other conflict in U.S. history — by some counts more than every subsequent war combined.",
  },
  {
    match: /volcano|magma|plate tectonic/i,
    line:
      "There are roughly 1,500 potentially active volcanoes on land. About 50 erupt every year — most of them along the Pacific 'Ring of Fire.'",
  },
  {
    match: /dinosaur|mesozoic|cretaceous/i,
    line:
      "Birds are the only living dinosaurs. Every robin, every chicken, every penguin — direct descendants of the theropod lineage that survived the Cretaceous-Paleogene extinction.",
  },
  {
    match: /electricity|circuit|conductor/i,
    line:
      "Electrons in a 'live' wire don't actually move very fast — typical drift velocity is millimeters per second. The signal that tells them to move travels near the speed of light. That's the difference between flipping a switch and waiting for current.",
  },
];

function lookupHook(
  topic: string,
): { line: string; credit?: string } | null {
  for (const h of TOPIC_HOOKS) {
    if (h.match.test(topic)) {
      return { line: h.line, credit: h.credit };
    }
  }
  return null;
}

export function TopicHook({
  topic,
  hidden,
}: {
  topic: string;
  hidden?: boolean;
}) {
  if (hidden) return null;
  const hook = lookupHook(topic);
  if (!hook) return null;
  return (
    <aside
      aria-label="Topic context"
      className="rounded-lg border border-christine-100 bg-christine-50/30 px-5 py-4"
    >
      <p className="text-[10px] uppercase tracking-widest text-christine-700 font-medium mb-1">
        Did you know
      </p>
      <p className="text-sm leading-relaxed">{hook.line}</p>
      {hook.credit ? (
        <p className="text-xs text-(--color-muted) mt-1.5">— {hook.credit}</p>
      ) : null}
    </aside>
  );
}
