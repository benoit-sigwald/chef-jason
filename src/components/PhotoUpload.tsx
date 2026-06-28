import { useRef } from 'react';

export interface Photo {
  id: string;
  file: File;
  url: string;
}

export default function PhotoUpload({
  photos,
  setPhotos,
}: {
  photos: Photo[];
  setPhotos: React.Dispatch<React.SetStateAction<Photo[]>>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function add(files: FileList | null) {
    if (!files) return;
    const next: Photo[] = [];
    for (const f of Array.from(files)) {
      if (f.type.startsWith('image/')) {
        next.push({
          id: (crypto.randomUUID && crypto.randomUUID()) || String(Math.random()),
          file: f,
          url: URL.createObjectURL(f),
        });
      }
    }
    if (next.length) setPhotos((prev) => [...prev, ...next]);
  }

  function remove(id: string) {
    setPhotos((prev) => {
      const p = prev.find((x) => x.id === id);
      if (p) URL.revokeObjectURL(p.url);
      return prev.filter((x) => x.id !== id);
    });
  }

  return (
    <div className="grid gap-3">
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-[1.5px] border-dashed border-[#e4d8c2] bg-paper px-6 py-8 text-center transition hover:border-gold hover:bg-[#fbf6ec]">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          hidden
          onChange={(e) => {
            add(e.target.files);
            e.target.value = '';
          }}
        />
        <span className="text-3xl" aria-hidden>📷</span>
        <span className="font-serif text-xl">Frigo, congélateur, placards…</span>
        <span className="text-xs text-ink2/70">
          Ajoutez autant de photos que vous voulez — aucune limite
        </span>
      </label>

      {photos.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((p) => (
              <div
                key={p.id}
                className="relative aspect-square overflow-hidden rounded-xl border border-[#e4d8c2]"
              >
                <img src={p.url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  aria-label="Retirer la photo"
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ink/80 text-sm text-paper transition hover:bg-copper"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-ink2/70">{photos.length} photo(s) prête(s)</p>
        </>
      )}
    </div>
  );
}
