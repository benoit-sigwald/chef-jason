export default function Footer() {
  return (
    <footer className="mt-12 grid justify-items-center gap-3 border-t border-black/10 px-6 py-12 text-center">
      <img
        src="/chef.jpg"
        alt="Le Chef Jason"
        className="h-20 w-20 rounded-full border-2 border-gold object-cover shadow-soft"
      />
      <p className="font-serif text-2xl">Le Chef Jason</p>
      <p className="max-w-[46ch] text-xs text-ink2/70">
        Recettes gratuites via TheMealDB · Gemini 3 pour l'analyse des photos · Inspiré des grandes tables
        (Michelin, Great British Chefs, Taste of France).
      </p>
    </footer>
  );
}
