import { ArrowRight, Eye, Layers } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import "./hub.css";

const experiments = [
  {
    title: "Looking Back",
    status: "Live",
    href: "/looking-back",
    summary: "A public reflective initiative about the qualities we hope our lives express.",
    meta: "Reflection / aggregate pattern",
    image: "/images/looking-back-card.png"
  },
  {
    title: "How We Disagree",
    status: "Live",
    href: "/study-one",
    guide: "/study-guides/study-one",
    summary: "A Big Brue study of how audience members approach disagreement before and after the festival.",
    meta: "Disagreement / before and after the festival",
    visual: "study-one"
  },
  {
    title: "Panel speakers",
    status: "Before and after",
    href: "/study-two/speaker/before",
    guide: "/study-guides/study-two",
    summary: "21 questions before and 25 after the conversation, about conflict, the issue, yourself and the other panellists.",
    meta: "Study Two / speaker questionnaire",
    visual: "study-one"
  },
  {
    title: "",
    status: "",
    summary: "",
    meta: ""
  }
];

export default function ExperimentsHub() {
  return (
    <main>
      <header className="topbar">
        <Link className="mark" href="/">Initiatives at evolvable.me</Link>
        <a href="https://evolvable.me">Explore evolvable.me</a>
      </header>

      <section className="experiments-hero">
        <div className="experiments-copy">
          <p className="eyebrow">Initiatives</p>
          <h1>Public reflections on how people change.</h1>
          <p>Short participatory studies from evolvable.me.</p>
        </div>
      </section>

      <section className="experiment-grid" aria-label="evolvable.me initiatives">
        {experiments.map((experiment, index) => (
          <article className={experiment.image || experiment.visual ? "experiment-card" : "experiment-card placeholder"} key={`${experiment.title}-${index}`}>
            <div className={`experiment-visual${experiment.visual ? ` ${experiment.visual}` : ""}`} aria-hidden="true">
              {experiment.image && <Image src={experiment.image} alt="" fill sizes="(max-width: 860px) 100vw, 33vw" />}
              {experiment.visual === "study-one" && (
                <div className="study-one-card-mark">
                  <i />
                  <i />
                </div>
              )}
              <span>{String(index + 1).padStart(2, "0")}</span>
            </div>
            <div className="experiment-card-copy">
              <div className={experiment.href ? "experiment-card-topline" : "experiment-card-topline placeholder-topline"}>
                {experiment.href ? (
                  <>
                  <span>{experiment.status}</span>
                  <Eye size={16} />
                  </>
                ) : (
                  <span aria-hidden="true" />
                )}
              </div>
              <h2>{experiment.title}</h2>
              {experiment.summary && <p>{experiment.summary}</p>}
              {experiment.meta && (
                <div className="experiment-meta">
                  <Layers size={15} />
                  <span>{experiment.meta}</span>
                </div>
              )}
            </div>
            <div className="experiment-actions">{experiment.href ? (
              <a className="primary experiment-link" href={experiment.href}>
                Open <ArrowRight size={18} />
              </a>
            ) : (
              <button className="secondary experiment-link" disabled>
                Soon
              </button>
            )}
            {experiment.guide && <Link href={experiment.guide} className="experiment-guide">How to run this study →</Link>}
            </div>
          </article>
        ))}
      </section>
      <section className="hub-review-tools" aria-label="For organisers and reviewers"><Link href="/study-two/review">For organisers: Study Two personal links, setup and downloads →</Link><p>Study Two speakers answer before and after their panel. Organisers can prepare personal links and download saved responses.</p></section>
    </main>
  );
}
