export default function Hero() {
  return (
    <header
      className="relative bg-ink bg-cover text-center text-paper"
      style={{
        backgroundImage:
          "linear-gradient(180deg, rgba(18,13,8,0.42) 0%, rgba(18,13,8,0.80) 100%), url('/hero.jpg')",
        backgroundPosition: 'center 35%',
      }}
    >
      <div className="px-6 pb-12 pt-16 sm:pb-16 sm:pt-24">
        <span className="text-[0.72rem] font-semibold uppercase tracking-[0.4em] text-[#e2bd6e]">
          Sélection gastronomique sur mesure
        </span>
        <h1
          className="my-4 font-serif text-5xl leading-none text-[#fdfaf3] sm:text-7xl"
          style={{ textShadow: '0 2px 36px rgba(0,0,0,0.4)' }}
        >
          Trois recettes
          <br />
          <em className="font-medium italic text-[#e6b667]">d'exception</em>
        </h1>
        <div className="mx-auto my-5 h-px w-16 bg-gold" />
        <p className="mx-auto max-w-[32ch] font-serif text-lg italic text-paper/90">
          Dites votre envie ou montrez vos placards. Le Chef compose et vous régale.
        </p>
      </div>
    </header>
  );
}
