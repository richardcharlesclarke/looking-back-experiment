import { ArrowRight, Eye, Layers } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const experiments = [
  {
    title: "Looking Back",
    status: "Live",
    href: "/looking-back",
    summary: "A public reflective experiment about the qualities we hope our lives express.",
    meta: "Reflection / aggregate pattern",
    image: "/images/looking-back-card.png"
  },
  {
    title: "Coming soon",
    status: "Coming soon",
    summary: "",
    meta: ""
  },
  {
    title: "Coming soon",
    status: "Coming soon",
    summary: "",
    meta: ""
  },
  {
    title: "Coming soon",
    status: "Coming soon",
    summary: "",
    meta: ""
  }
];

export default function ExperimentsHub() {
  return (
    <main>
      <header className="topbar">
        <Link className="mark" href="/">Experiments at Evolvable</Link>
        <a href="https://evolvable.me">Explore Evolvable</a>
      </header>

      <section className="experiments-hero">
        <div className="experiments-copy">
          <p className="eyebrow">Experiments</p>
          <h1>Public reflections on how people change.</h1>
          <p>
            Short participatory studies from Evolvable. Each experiment turns a private question into a shared pattern.
          </p>
        </div>
      </section>

      <section className="experiment-grid" aria-label="Evolvable experiments">
        {experiments.map((experiment, index) => (
          <article className={experiment.image ? "experiment-card" : "experiment-card empty"} key={`${experiment.title}-${index}`}>
            {experiment.image && (
              <div className="experiment-visual" aria-hidden="true">
                <Image src={experiment.image} alt="" fill sizes="(max-width: 860px) 100vw, 33vw" />
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
            )}
            <div className="experiment-card-copy">
              {experiment.status === "Live" && (
                <div className="experiment-card-topline">
                  <span>{experiment.status}</span>
                  <Eye size={16} />
                </div>
              )}
              <h2>{experiment.title}</h2>
              {experiment.summary && <p>{experiment.summary}</p>}
              {experiment.meta && (
                <div className="experiment-meta">
                  <Layers size={15} />
                  <span>{experiment.meta}</span>
                </div>
              )}
            </div>
            {experiment.href ? (
              <Link className="primary experiment-link" href={experiment.href}>
                Open <ArrowRight size={18} />
              </Link>
            ) : (
              <button className="secondary experiment-link" disabled>
                Soon
              </button>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
