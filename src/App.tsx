import { useState } from 'react';
import Hero from './components/Hero';
import Composer from './components/Composer';
import Results from './components/Results';
import Loader from './components/Loader';
import Footer from './components/Footer';
import type { Photo } from './components/PhotoUpload';
import type { Criteria, GenerateResult } from './types';
import { generateRecipes, fileToInline } from './lib/recipes';

export default function App() {
  const [mode, setMode] = useState<'envie' | 'frigo'>('envie');
  const [criteria, setCriteria] = useState<Criteria>({
    personnes: '2',
    prix: 'Moyen',
    difficulte: 'Intermédiaire',
    style: '',
  });
  const [demande, setDemande] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<GenerateResult | null>(null);

  async function onSubmit() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const images = mode === 'frigo' ? await Promise.all(photos.map((p) => fileToInline(p.file))) : [];
      const crit: Criteria = mode === 'envie' ? { ...criteria, demande } : criteria;
      const data = await generateRecipes({ criteria: crit, images });
      setResult(data);
      setTimeout(
        () => document.getElementById('results-anchor')?.scrollIntoView({ behavior: 'smooth' }),
        60,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setError(
        /quota/i.test(msg)
          ? 'Quota Gemini atteint et aucune recette de secours trouvée. Réessayez dans un instant.'
          : msg || 'Une erreur est survenue. Réessayez.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Hero />
      <main className="mx-auto max-w-[1080px] px-4 pb-16 sm:px-6">
        <Composer
          mode={mode}
          setMode={setMode}
          criteria={criteria}
          setCriteria={setCriteria}
          demande={demande}
          setDemande={setDemande}
          photos={photos}
          setPhotos={setPhotos}
          onSubmit={onSubmit}
          loading={loading}
        />

        <div id="results-anchor" />

        {loading && <Loader />}
        {error && !loading && (
          <p className="mt-10 text-center font-serif text-xl text-copper">✕ {error}</p>
        )}
        {result && !loading && <Results result={result} />}
      </main>
      <Footer />
    </div>
  );
}
