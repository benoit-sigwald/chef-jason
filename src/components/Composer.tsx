import ChipGroup from './ChipGroup';
import PhotoUpload, { type Photo } from './PhotoUpload';
import type { Criteria } from '../types';

const PERSONNES = ['1', '2', '4', '6', '8+'].map((v) => ({ value: v, label: v }));
const BUDGET = ['Économique', 'Moyen', 'Généreux', 'Sans limite'].map((v) => ({ value: v, label: v }));
const DIFF = ['Facile', 'Intermédiaire', 'Difficile', 'Chef étoilé'].map((v) => ({ value: v, label: v }));
const STYLE = [
  { value: '', label: 'Au choix du Chef' },
  { value: 'Gastronomie française', label: 'Française' },
  { value: 'Bistronomie', label: 'Bistronomie' },
  { value: 'Méditerranéenne', label: 'Méditerranéenne' },
  { value: 'Cuisine du terroir', label: 'Terroir' },
  { value: 'Cuisine du monde', label: 'Du monde' },
  { value: 'Végétarienne', label: 'Végétarienne' },
];
const SUGGESTIONS = ['Dîner romantique', 'Comfort food', 'Repas léger & sain', 'Dessert chocolat', 'Brunch'];

export default function Composer({
  mode,
  setMode,
  criteria,
  setCriteria,
  demande,
  setDemande,
  photos,
  setPhotos,
  onSubmit,
  loading,
}: {
  mode: 'envie' | 'frigo';
  setMode: (m: 'envie' | 'frigo') => void;
  criteria: Criteria;
  setCriteria: React.Dispatch<React.SetStateAction<Criteria>>;
  demande: string;
  setDemande: (v: string) => void;
  photos: Photo[];
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>;
  onSubmit: () => void;
  loading: boolean;
}) {
  const set = (k: keyof Criteria) => (v: string) => setCriteria((prev) => ({ ...prev, [k]: v }));

  return (
    <section className="mx-auto mt-9 max-w-[680px] rounded-[18px] border border-[#e4d8c2] bg-card p-5 shadow-lift sm:mt-14 sm:p-6">
      {/* Contrôle segmenté */}
      <div className="relative mb-6 grid grid-cols-2 rounded-full bg-paper2 p-1.5">
        <span
          className={`absolute bottom-1.5 top-1.5 w-[calc(50%-6px)] rounded-full bg-card shadow-soft transition-transform duration-300 ${
            mode === 'frigo' ? 'translate-x-full' : ''
          }`}
        />
        <button
          type="button"
          onClick={() => setMode('envie')}
          className={`relative z-10 rounded-full py-2.5 text-sm font-semibold tracking-wide transition ${
            mode === 'envie' ? 'text-ink' : 'text-ink2/60'
          }`}
        >
          Par envie
        </button>
        <button
          type="button"
          onClick={() => setMode('frigo')}
          className={`relative z-10 rounded-full py-2.5 text-sm font-semibold tracking-wide transition ${
            mode === 'frigo' ? 'text-ink' : 'text-ink2/60'
          }`}
        >
          Mes placards
        </button>
      </div>

      <div className="grid gap-5">
        {mode === 'envie' ? (
          <div className="grid gap-1.5">
            <label htmlFor="demande" className="text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-gold2">
              Votre envie
            </label>
            <input
              id="demande"
              value={demande}
              onChange={(e) => setDemande(e.target.value)}
              placeholder="Ex : un dîner autour du poisson"
              className="w-full rounded-[11px] border border-[#e4d8c2] bg-white px-4 py-3 text-base outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/15"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDemande(s)}
                  className="rounded-full border border-[#e4d8c2] bg-paper px-3 py-1.5 text-xs text-ink2 transition hover:-translate-y-0.5 hover:border-gold hover:text-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <PhotoUpload photos={photos} setPhotos={setPhotos} />
        )}

        <ChipGroup label="Convives" options={PERSONNES} value={criteria.personnes || ''} onChange={set('personnes')} />
        {mode === 'envie' && (
          <ChipGroup label="Budget" options={BUDGET} value={criteria.prix || ''} onChange={set('prix')} />
        )}
        <ChipGroup label="Difficulté" options={DIFF} value={criteria.difficulte || ''} onChange={set('difficulte')} />
        {mode === 'envie' && (
          <ChipGroup label="Style" options={STYLE} value={criteria.style || ''} onChange={set('style')} scroll />
        )}

        <button
          type="button"
          onClick={onSubmit}
          disabled={loading || (mode === 'frigo' && photos.length === 0)}
          className="mt-1 inline-flex items-center justify-center gap-2 rounded-[11px] bg-ink px-6 py-4 font-serif text-lg text-paper shadow-soft transition hover:bg-copper hover:shadow-lift disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? 'Le Chef cuisine…' : mode === 'envie' ? 'Composer ma sélection' : 'Inspirer le Chef'}
          {!loading && <span aria-hidden>→</span>}
        </button>
      </div>
    </section>
  );
}
