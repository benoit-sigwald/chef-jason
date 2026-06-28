import type { Recipe } from '../types';

const isUrl = (s?: string) => !!s && /^https?:\/\//i.test(s);

export default function RecipeCard({ r, index }: { r: Recipe; index: number }) {
  const meta = [
    { k: 'Convives', v: r.pourPersonnes ?? '—' },
    { k: 'Temps', v: r.tempsTotalMinutes ? `${r.tempsTotalMinutes} min` : '—' },
    { k: 'Difficulté', v: r.difficulte || '—' },
    { k: 'Budget', v: r.prixEstime || '—' },
  ];

  return (
    <article
      className="reveal overflow-hidden rounded-2xl border border-[#e4d8c2] bg-card shadow-soft transition hover:-translate-y-1 hover:shadow-lift"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      {r.image && (
        <img src={r.image} alt={r.titre} loading="lazy" className="h-48 w-full object-cover" />
      )}

      <div className="px-7 pb-5 pt-6">
        <span className="mb-3 inline-block rounded-full border border-gold px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-gold2">
          {r.styleCuisine || 'Cuisine du Chef'}
        </span>
        <h3 className="font-serif text-3xl leading-tight">{r.titre}</h3>
        {r.accroche && <p className="mt-2 font-serif text-lg italic text-ink2">{r.accroche}</p>}
      </div>

      <div className="grid grid-cols-2 border-y border-black/10 bg-paper/60 sm:grid-cols-4">
        {meta.map((m, i) => (
          <div key={i} className="border-r border-black/10 px-2 py-3 text-center last:border-r-0">
            <span className="block text-[0.58rem] font-semibold uppercase tracking-wider text-gold2">
              {m.k}
            </span>
            <b className="text-sm">{m.v}</b>
          </div>
        ))}
      </div>

      <div className="grid gap-6 px-7 py-6">
        <div>
          <h4 className="mb-2 font-serif text-xl font-semibold">Ingrédients</h4>
          <ul className="columns-2 gap-8 [&>li]:break-inside-avoid">
            {r.ingredients.map((ing, i) => (
              <li key={i} className="border-b border-dotted border-[#e4d8c2] py-1.5 text-sm">
                {ing.quantite && <b className="font-semibold">{ing.quantite} </b>}
                {ing.nom}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-2 font-serif text-xl font-semibold">Préparation</h4>
          <ol className="grid gap-4">
            {r.etapes.map((s, i) => (
              <li key={i} className="relative pl-10 text-sm">
                <span className="absolute left-0 top-0 grid h-7 w-7 place-items-center rounded-full border border-gold font-serif text-sm text-gold2">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </div>

        {r.astuceChef && (
          <div className="rounded-lg border border-[#e4d8c2] border-l-[3px] border-l-gold bg-paper/70 px-4 py-3 text-sm">
            <span className="mb-1 block text-[0.62rem] font-semibold uppercase tracking-wider text-gold2">
              Le geste du Chef
            </span>
            {r.astuceChef}
          </div>
        )}
      </div>

      {(r.accordMets || r.sourceInspiration) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 bg-paper px-7 py-4 text-sm text-ink2">
          <span>{r.accordMets ? `🍷 ${r.accordMets}` : ''}</span>
          {r.sourceInspiration &&
            (isUrl(r.sourceInspiration) ? (
              <a
                href={r.sourceInspiration}
                target="_blank"
                rel="noopener noreferrer"
                className="border-b border-current text-gold2 hover:text-copper"
              >
                Source ↗
              </a>
            ) : (
              <span>Inspiration : {r.sourceInspiration}</span>
            ))}
        </div>
      )}
    </article>
  );
}
