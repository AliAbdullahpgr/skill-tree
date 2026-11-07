import Link from 'next/link';

export default function NotFound() {
  return <main className="not-found">
    <section className="not-found-card">
      <span className="not-found-brand">SkillWeave</span>
      <span className="not-found-eyebrow">404 · the path is lost</span>
      <h1>This page is not on the atlas.</h1>
      <p>The address may be old, or the skill may have moved. Return to your board to keep going.</p>
      <Link className="gold-button" href="/">Back to your atlas</Link>
    </section>
  </main>;
}
