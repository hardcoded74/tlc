/**
 * Standards-code validation against published frameworks.
 *
 * Today this is regex-only: we check whether each cited code matches
 * the documented format for its framework. A code like "5-LS1-1" passes
 * the NGSS pattern; "5-FAKE-99" does not. This catches the failure mode
 * we actually see in practice — Gemma occasionally fabricates codes
 * that look plausible but aren't valid.
 *
 * A future iteration could load the full published catalog (NGSS has
 * ~200 codes, Common Core ~600 in math + ELA combined) and verify each
 * code's description matches. The regex pass already eliminates the
 * worst hallucinations, which is what the verifier needs first.
 */

import type { StandardReference } from "../types";

export interface StandardsCodeResult {
  framework: string;
  frameworkLabel: string;
  code: string;
  description: string;
  valid: boolean;
  note: string | null;
  referenceUrl: string | null;
}

interface FrameworkPattern {
  /** Match these labels (case-insensitive substring). */
  labelMatchers: string[];
  /** Display label for the verification UI. */
  label: string;
  /** Regex the code must match. */
  pattern: RegExp;
  /** Where teachers can look up the canonical code list. */
  referenceUrl: string;
  /** Human-readable hint when the code doesn't match. */
  formatHint: string;
}

// Documented formats. Keep this list short and precise — false-flagging
// real codes is more harmful than missing fabricated ones.
const FRAMEWORKS: FrameworkPattern[] = [
  {
    labelMatchers: ["ngss", "next generation science"],
    label: "NGSS",
    // Performance Expectations: <grade-band>-<DCI>-<number>
    // grade-band: K | 1-5 | MS | HS
    // DCI: PS / LS / ESS / ETS followed by a digit (or the literal "PS1", "LS2", etc.)
    pattern: /^(K|[1-5]|MS|HS)-(PS|LS|ESS|ETS)\d-\d+$/,
    referenceUrl: "https://www.nextgenscience.org/standards/standards",
    formatHint:
      'NGSS performance expectations look like "5-LS1-1" or "MS-PS1-2" — grade band, hyphen, DCI letters + digit, hyphen, number.',
  },
  {
    labelMatchers: ["common core", "ccss", "ccss.math", "ccss.ela"],
    label: "Common Core",
    // Math: CCSS.MATH.CONTENT.<grade>.<domain>.<cluster>.<standard>
    // ELA: CCSS.ELA-LITERACY.<strand>.<grade>.<standard>
    // We accept both forms loosely.
    pattern:
      /^CCSS\.(MATH\.CONTENT\.[K0-9]+(\.[A-Z]+)+\.[0-9a-z]+|ELA-LITERACY\.[A-Z]+(\.\d+|\.[K0-9]+)+(\.[0-9a-z]+)?)$/,
    referenceUrl: "https://corestandards.org/read-the-standards/",
    formatHint:
      'Common Core codes look like "CCSS.MATH.CONTENT.5.NF.B.4" or "CCSS.ELA-LITERACY.RL.5.1" — framework, dotted hierarchy.',
  },
];

function matchFramework(framework: string): FrameworkPattern | null {
  const lower = framework.toLowerCase();
  for (const fw of FRAMEWORKS) {
    if (fw.labelMatchers.some((m) => lower.includes(m))) {
      return fw;
    }
  }
  return null;
}

export function validateStandardsCodes(
  cited: StandardReference[],
): StandardsCodeResult[] {
  return cited.map((ref) => {
    const fw = matchFramework(ref.framework);
    if (!fw) {
      // Unknown framework — we don't have a pattern, so we can't say
      // either way. Mark valid=true and note the limitation; the
      // verifier won't flag it but the inspector shows "no validator
      // available".
      return {
        framework: ref.framework,
        frameworkLabel: ref.framework,
        code: ref.code,
        description: ref.description,
        valid: true,
        note: `No validator wired up for "${ref.framework}". Code accepted without format check.`,
        referenceUrl: null,
      };
    }
    const valid = fw.pattern.test(ref.code.trim());
    return {
      framework: ref.framework,
      frameworkLabel: fw.label,
      code: ref.code,
      description: ref.description,
      valid,
      note: valid ? null : fw.formatHint,
      referenceUrl: fw.referenceUrl,
    };
  });
}
