import { notFound } from "next/navigation";
import Questionnaire from "../Questionnaire";
import PairParticipant from '../PairParticipant';
import FestivalParticipant from '../FestivalParticipant';
import { STUDIES } from "@/lib/brufest/instruments";
import type { Study } from "@/lib/brufest/types";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ study: string }>;
}) {
  const { study } = await params;
  return {
    title: `${STUDIES[study as Study]?.label ?? "Brufest"} — evolvable.me`,
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ study: string }>;
}) {
  const { study } = await params;
  if (!Object.prototype.hasOwnProperty.call(STUDIES, study)) notFound();
  return study === 'festival' ? <FestivalParticipant /> : study === 'pairs' ? <PairParticipant /> : <Questionnaire study={study as Study} />;
}
