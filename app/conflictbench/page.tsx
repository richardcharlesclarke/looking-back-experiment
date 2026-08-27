import type { Metadata } from "next";
import ConflictBenchQuestionnaire from "./ConflictBenchQuestionnaire";

export const metadata: Metadata = {
  title: "ConflictBench — Brewfest pre-festival questionnaire",
  description: "A pre-festival baseline for how people approach disagreement."
};

export default function ConflictBenchPage() {
  return <ConflictBenchQuestionnaire />;
}
