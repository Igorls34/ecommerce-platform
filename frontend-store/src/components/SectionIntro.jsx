export function SectionIntro({ eyebrow, title, copy, action }) {
  return (
    <div className="section-intro">
      <div>
        <p className="section-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {copy ? <p>{copy}</p> : null}
      </div>
      {action}
    </div>
  );
}
