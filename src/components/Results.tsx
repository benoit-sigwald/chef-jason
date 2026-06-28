import type { GenerateResult } from '../types';
import RecipeCard from './RecipeCard';

export default function Results({ result }: { result: GenerateResult }) {
  return (
    <section className="mt-10 grid gap-6" aria-live="polite">
      {result.introduction && (
        <p className="reveal mx-auto max-w-[36ch] text-center font-serif text-xl italic">
          « {result.introduction} »
        </p>
      )}

      {result.ingredientsDetectes && result.ingredientsDetectes.length > 0 && (
        <p className="reveal text-center text-sm text-ink2">
          Repéré&nbsp;:{' '}
          {result.ingredientsDetectes.map((x, i) => (
            <span key={i} className="mx-1 inline-block rounded-full bg-paper2 px-2 py-0.5 text-xs">
              {x}
            </span>
          ))}
        </p>
      )}

      <div className="grid gap-6">
        {result.recettes.map((r, i) => (
          <RecipeCard key={i} r={r} index={i} />
        ))}
      </div>
    </section>
  );
}
