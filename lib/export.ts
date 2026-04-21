/**
 * Lesson package exporters — markdown, HTML, JSON.
 *
 * The markdown shape is what teachers will paste into Google Docs; the HTML
 * shape is what they'd print. Both render every section and include inline
 * source_origin pills.
 */

import type { LessonPackage, SourceOrigin } from "./types";

const PILL = (origin: SourceOrigin): string => {
  switch (origin) {
    case "grounded":
      return " *[source-grounded]*";
    case "scaffolded":
      return " *[scaffolded]*";
    case "generated":
      return " *[AI-generated — review before use]*";
    case "not_applicable":
      return "";
  }
};

const PILL_HTML = (origin: SourceOrigin): string => {
  switch (origin) {
    case "grounded":
      return ' <span class="pill pill-grounded">source-grounded</span>';
    case "scaffolded":
      return ' <span class="pill pill-scaffolded">scaffolded</span>';
    case "generated":
      return ' <span class="pill pill-generated">AI-generated — review</span>';
    case "not_applicable":
      return "";
  }
};

// ──────────────────────────────────────────────────────────────────────
// Markdown
// ──────────────────────────────────────────────────────────────────────

export function toMarkdown(pkg: LessonPackage): string {
  const lines: string[] = [];
  lines.push(`# ${pkg.title}`);
  lines.push("");
  lines.push(`*Grade level: ${pkg.grade_level}* · *Estimated: ${pkg.estimated_minutes} min*${pkg.subject ? ` · *${pkg.subject}*` : ""}`);
  lines.push("");
  lines.push(`**Objective.** ${pkg.objective}`);
  lines.push("");
  lines.push(`## Overview`);
  lines.push(pkg.overview);
  lines.push("");

  lines.push(`## Materials`);
  for (const m of pkg.materials) {
    const qty = m.quantity ? ` (${m.quantity})` : "";
    lines.push(`- ${m.name}${qty}${PILL(m.source_origin)}`);
  }
  lines.push("");

  if (pkg.engagement) {
    lines.push(`## Engagement (${pkg.engagement.minutes} min)`);
    lines.push(`**Type:** ${pkg.engagement.type.replace(/_/g, " ")}`);
    lines.push("");
    lines.push(`${pkg.engagement.prompt}${PILL(pkg.engagement.source_origin)}`);
    lines.push("");
  }

  if (pkg.demo) {
    lines.push(`## Demonstration`);
    lines.push(pkg.demo.description + PILL(pkg.demo.source_origin));
    if (pkg.demo.materials_needed.length) {
      lines.push("");
      lines.push("**Materials:** " + pkg.demo.materials_needed.join(", "));
    }
    if (pkg.demo.teacher_tip) {
      lines.push("");
      lines.push(`*Teacher tip:* ${pkg.demo.teacher_tip}`);
    }
    if (pkg.demo.safety_notes) {
      lines.push("");
      lines.push(`*Safety:* ${pkg.demo.safety_notes}`);
    }
    lines.push("");
  }

  lines.push(`## Lesson Steps`);
  for (const s of pkg.lesson_steps) {
    lines.push(`${s.step}. **(${s.minutes} min) Teacher:** ${s.teacher_action}`);
    lines.push(`   **Students:** ${s.student_action}${PILL(s.source_origin)}`);
  }
  lines.push("");

  if (pkg.guided_practice) {
    lines.push(`## Guided Practice (${pkg.guided_practice.duration_minutes} min, ${pkg.guided_practice.format.replace(/_/g, " ")})`);
    lines.push(pkg.guided_practice.description + PILL(pkg.guided_practice.source_origin));
    lines.push("");
  }

  if (pkg.independent_practice) {
    lines.push(`## Independent Practice (${pkg.independent_practice.duration_minutes} min)`);
    lines.push(pkg.independent_practice.description + PILL(pkg.independent_practice.source_origin));
    if (pkg.independent_practice.deliverable) {
      lines.push("");
      lines.push(`**Deliverable:** ${pkg.independent_practice.deliverable}`);
    }
    lines.push("");
  }

  lines.push(`## Assessment (${pkg.assessment.format.replace(/_/g, " ")}, ${pkg.assessment.estimated_minutes} min)`);
  for (const q of pkg.assessment.questions) {
    lines.push(`**${q.id.toUpperCase()}.** ${q.question}${PILL(q.source_origin)}`);
    lines.push(`   *Expected:* ${q.expected_answer}`);
    if (q.rubric_notes) lines.push(`   *Rubric:* ${q.rubric_notes}`);
  }
  lines.push("");

  if (pkg.teacher_notes) {
    lines.push(`## Teacher Notes`);
    lines.push(pkg.teacher_notes);
    lines.push("");
  }

  if (pkg.discussion_prompts.length) {
    lines.push(`## Discussion Prompts`);
    for (const d of pkg.discussion_prompts) {
      lines.push(`- **(${d.purpose.replace(/_/g, " ")})** ${d.prompt}${PILL(d.source_origin)}`);
    }
    lines.push("");
  }

  if (pkg.vocabulary.length) {
    lines.push(`## Vocabulary`);
    for (const v of pkg.vocabulary) {
      lines.push(`- **${v.term}** — ${v.definition}${PILL(v.source_origin)}`);
      if (v.example) lines.push(`  *Example:* ${v.example}`);
    }
    lines.push("");
  }

  if (pkg.misconceptions.length) {
    lines.push(`## Common Misconceptions`);
    for (const m of pkg.misconceptions) {
      lines.push(`- **Misconception:** ${m.misconception}`);
      lines.push(`  **Correction:** ${m.correction}`);
      lines.push(`  **How to address:** ${m.how_to_address}`);
    }
    lines.push("");
  }

  if (pkg.differentiation) {
    lines.push(`## Differentiation`);
    lines.push(`**Struggling learners:** ${pkg.differentiation.struggling}`);
    lines.push(`**Advanced learners:** ${pkg.differentiation.advanced}`);
    if (pkg.differentiation.multilingual_learners) {
      lines.push(`**Multilingual learners:** ${pkg.differentiation.multilingual_learners}`);
    }
    lines.push("");
  }

  if (pkg.homework) {
    lines.push(`## Homework${pkg.homework.optional ? " (optional)" : ""}`);
    lines.push(pkg.homework.description);
    lines.push("");
    lines.push(`*Estimated: ${pkg.homework.estimated_minutes} min*`);
    lines.push("");
  }

  if (pkg.enrichment) {
    lines.push(`## Enrichment`);
    lines.push(`*For students who:* ${pkg.enrichment.for_students_who}`);
    lines.push("");
    lines.push(pkg.enrichment.description);
    lines.push("");
  }

  if (pkg.standards_alignment && pkg.standards_alignment.standards_cited.length) {
    lines.push(`## Standards`);
    for (const s of pkg.standards_alignment.standards_cited) {
      lines.push(`- **${s.framework} ${s.code}** — ${s.description}`);
    }
    if (pkg.standards_alignment.notes) {
      lines.push("");
      lines.push(pkg.standards_alignment.notes);
    }
    lines.push("");
  }

  lines.push(`---`);
  lines.push(`*Generated by TLC · ${pkg.source_summary.overall_grounding.replace(/_/g, " ")} · ${pkg.source_summary.grounded_section_count} grounded / ${pkg.source_summary.generated_section_count} generated sections*`);
  return lines.join("\n");
}

// ──────────────────────────────────────────────────────────────────────
// HTML
// ──────────────────────────────────────────────────────────────────────

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function toHtml(pkg: LessonPackage): string {
  const escaped = (s: string) => escape(s);
  const section = (title: string, body: string) =>
    `<section><h2>${escape(title)}</h2>${body}</section>`;

  const parts: string[] = [];
  parts.push(`<h1>${escaped(pkg.title)}</h1>`);
  parts.push(
    `<p class="meta">Grade level: ${escaped(pkg.grade_level)} · Estimated: ${pkg.estimated_minutes} min${pkg.subject ? ` · ${escaped(pkg.subject)}` : ""}</p>`,
  );
  parts.push(`<p class="objective"><strong>Objective.</strong> ${escaped(pkg.objective)}</p>`);
  parts.push(section("Overview", `<p>${escaped(pkg.overview)}</p>`));

  parts.push(
    section(
      "Materials",
      `<ul>${pkg.materials
        .map(
          (m) =>
            `<li>${escaped(m.name)}${m.quantity ? ` (${escaped(m.quantity)})` : ""}${PILL_HTML(m.source_origin)}</li>`,
        )
        .join("")}</ul>`,
    ),
  );

  parts.push(
    section(
      `Engagement (${pkg.engagement.minutes} min)`,
      `<p class="tag">${escaped(pkg.engagement.type.replace(/_/g, " "))}</p><p>${escaped(pkg.engagement.prompt)}${PILL_HTML(pkg.engagement.source_origin)}</p>`,
    ),
  );

  if (pkg.demo) {
    const mats = pkg.demo.materials_needed.length
      ? `<p><strong>Materials:</strong> ${pkg.demo.materials_needed.map(escaped).join(", ")}</p>`
      : "";
    const tip = pkg.demo.teacher_tip ? `<p><em>Teacher tip:</em> ${escaped(pkg.demo.teacher_tip)}</p>` : "";
    const safety = pkg.demo.safety_notes ? `<p><em>Safety:</em> ${escaped(pkg.demo.safety_notes)}</p>` : "";
    parts.push(
      section(
        "Demonstration",
        `<p>${escaped(pkg.demo.description)}${PILL_HTML(pkg.demo.source_origin)}</p>${mats}${tip}${safety}`,
      ),
    );
  }

  parts.push(
    section(
      "Lesson Steps",
      `<ol>${pkg.lesson_steps
        .map(
          (s) =>
            `<li><strong>(${s.minutes} min) Teacher:</strong> ${escaped(s.teacher_action)}<br/><strong>Students:</strong> ${escaped(s.student_action)}${PILL_HTML(s.source_origin)}</li>`,
        )
        .join("")}</ol>`,
    ),
  );

  parts.push(
    section(
      `Assessment (${pkg.assessment.format.replace(/_/g, " ")}, ${pkg.assessment.estimated_minutes} min)`,
      `<ol>${pkg.assessment.questions
        .map(
          (q) =>
            `<li><strong>${escaped(q.id.toUpperCase())}.</strong> ${escaped(q.question)}${PILL_HTML(q.source_origin)}<br/><em>Expected:</em> ${escaped(q.expected_answer)}${q.rubric_notes ? `<br/><em>Rubric:</em> ${escaped(q.rubric_notes)}` : ""}</li>`,
        )
        .join("")}</ol>`,
    ),
  );

  if (pkg.teacher_notes) {
    parts.push(section("Teacher Notes", `<p>${escaped(pkg.teacher_notes)}</p>`));
  }

  if (pkg.discussion_prompts.length) {
    parts.push(
      section(
        "Discussion Prompts",
        `<ul>${pkg.discussion_prompts
          .map(
            (d) =>
              `<li><strong>(${escaped(d.purpose.replace(/_/g, " "))})</strong> ${escaped(d.prompt)}${PILL_HTML(d.source_origin)}</li>`,
          )
          .join("")}</ul>`,
      ),
    );
  }

  if (pkg.vocabulary.length) {
    parts.push(
      section(
        "Vocabulary",
        `<dl>${pkg.vocabulary
          .map(
            (v) =>
              `<dt>${escaped(v.term)}${PILL_HTML(v.source_origin)}</dt><dd>${escaped(v.definition)}${v.example ? `<br/><em>Example:</em> ${escaped(v.example)}` : ""}</dd>`,
          )
          .join("")}</dl>`,
      ),
    );
  }

  if (pkg.misconceptions.length) {
    parts.push(
      section(
        "Common Misconceptions",
        `<ul>${pkg.misconceptions
          .map(
            (m) =>
              `<li><strong>Misconception:</strong> ${escaped(m.misconception)}<br/><strong>Correction:</strong> ${escaped(m.correction)}<br/><strong>How to address:</strong> ${escaped(m.how_to_address)}</li>`,
          )
          .join("")}</ul>`,
      ),
    );
  }

  if (pkg.differentiation) {
    parts.push(
      section(
        "Differentiation",
        `<p><strong>Struggling:</strong> ${escaped(pkg.differentiation.struggling)}</p><p><strong>Advanced:</strong> ${escaped(pkg.differentiation.advanced)}</p>${pkg.differentiation.multilingual_learners ? `<p><strong>Multilingual:</strong> ${escaped(pkg.differentiation.multilingual_learners)}</p>` : ""}`,
      ),
    );
  }

  if (pkg.homework) {
    parts.push(
      section(
        `Homework${pkg.homework.optional ? " (optional)" : ""}`,
        `<p>${escaped(pkg.homework.description)}</p><p class="meta">Estimated: ${pkg.homework.estimated_minutes} min</p>`,
      ),
    );
  }

  if (pkg.enrichment) {
    parts.push(
      section(
        "Enrichment",
        `<p class="meta">For students who: ${escaped(pkg.enrichment.for_students_who)}</p><p>${escaped(pkg.enrichment.description)}</p>`,
      ),
    );
  }

  if (pkg.standards_alignment && pkg.standards_alignment.standards_cited.length) {
    parts.push(
      section(
        "Standards",
        `<ul>${pkg.standards_alignment.standards_cited
          .map(
            (s) => `<li><strong>${escaped(s.framework)} ${escaped(s.code)}</strong> — ${escaped(s.description)}</li>`,
          )
          .join("")}</ul>${pkg.standards_alignment.notes ? `<p>${escape(pkg.standards_alignment.notes)}</p>` : ""}`,
      ),
    );
  }

  const provenance = `<p class="meta">Generated by TLC · ${pkg.source_summary.overall_grounding.replace(/_/g, " ")} · ${pkg.source_summary.grounded_section_count} grounded / ${pkg.source_summary.generated_section_count} generated sections</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${escaped(pkg.title)}</title>
<style>
  body { font-family: Georgia, "Times New Roman", serif; max-width: 42rem; margin: 2rem auto; padding: 0 1rem; color: #111827; line-height: 1.6; }
  h1 { font-size: 1.75rem; margin-bottom: 0.25rem; }
  h2 { font-size: 1.25rem; margin-top: 2rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.25rem; }
  .meta { color: #6b7280; font-size: 0.9rem; }
  .objective { border-left: 3px solid #415a77; padding-left: 0.75rem; }
  .tag { font-style: italic; color: #6b7280; margin: 0; }
  .pill { display: inline-block; font-family: system-ui, sans-serif; font-size: 0.7rem; padding: 0.05rem 0.45rem; border-radius: 999px; margin-left: 0.35rem; vertical-align: middle; }
  .pill-grounded { background: #dcfce7; color: #166534; }
  .pill-scaffolded { background: #dbeafe; color: #1e40af; }
  .pill-generated { background: #fef3c7; color: #92400e; }
  ol, ul, dl { padding-left: 1.25rem; }
  li { margin-bottom: 0.5rem; }
  dt { font-weight: 600; margin-top: 0.5rem; }
  dd { margin-left: 0; }
  @media print { body { max-width: none; } h2 { page-break-after: avoid; } }
</style>
</head>
<body>
${parts.join("\n")}
${provenance}
</body>
</html>`;
}

// ──────────────────────────────────────────────────────────────────────
// JSON — just the package + a minimal wrapper
// ──────────────────────────────────────────────────────────────────────

export function toJson(pkg: LessonPackage, meta?: { runId: string; generatedAt: string }): string {
  return JSON.stringify(
    {
      tlc_version: "0.1",
      package: pkg,
      meta: meta ?? null,
    },
    null,
    2,
  );
}
