import { useEffect, useState } from 'react';

const MESSAGES = [
  'Le Chef consulte les grandes tables',
  'Le Chef compose votre sélection',
  'Le Chef dresse les assiettes',
  'Le Chef affine les accords',
];

export default function Loader() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % MESSAGES.length), 3000);
    return () => clearInterval(t);
  }, []);
  return (
    <section className="mt-10 grid gap-6" aria-live="polite">
      <p className="text-center font-serif text-xl italic text-ink2">{MESSAGES[i]}…</p>
      <div className="grid gap-6">
        {[0, 1, 2].map((k) => (
          <div
            key={k}
            className="h-56 animate-pulse rounded-2xl border border-[#e4d8c2] bg-card/70"
          />
        ))}
      </div>
    </section>
  );
}
