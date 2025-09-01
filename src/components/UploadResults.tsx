import React, { useState } from 'react';
import { useOCR } from '../utils/useOCR';
import resultsData from '../data/results.json';

export default function UploadResults({ onUpdate }: { onUpdate: () => void }) {
  const { extractText, loading, error } = useOCR();
  const [week, setWeek] = useState<number>(3);
  const [hint, setHint] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png','image/jpeg'].includes(file.type)) { setHint('Upload a PNG or JPG screenshot'); return; }
    if (file.size > 10*1024*1024) { setHint('File too large (max 10MB)'); return; }
    setHint(null);

    const text = await extractText(file);
    if (!text) { setHint('OCR failed to read text. Try a sharper crop.'); return; }

    const matchRegex = /([A-Za-z'() .&]+?)\s+(\d+)\s*[-:]\s*(\d+)\s+([A-Za-z'() .&]+)/g;
    const weekResults: any[] = [];
    let m: RegExpExecArray | null;
    while ((m = matchRegex.exec(text)) !== null) {
      weekResults.push({ home: m[1].trim(), homeScore: parseInt(m[2]), awayScore: parseInt(m[3]), away: m[4].trim() });
    }
    if (weekResults.length === 0) { setHint('No valid results detected.'); return; }

    const updated = { ...(resultsData as any), [`week${week}`]: weekResults };
    localStorage.setItem('tff_results', JSON.stringify(updated));
    alert(`✅ Week ${week} results uploaded! (local trial)`);
    onUpdate();
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 mt-4">
      <h3 className="text-lg font-bold mb-3">📸 Upload Weekly Results (OCR)</h3>
      <div className="flex items-center gap-3">
        <label className="text-sm">Week</label>
        <input type="number" min={1} max={38} value={week} onChange={e=>setWeek(parseInt(e.target.value))} className="border rounded-md px-3 py-2 text-sm w-24"/>
        <input type="file" accept="image/png,image/jpeg" onChange={handleFileChange} className="border rounded-md px-3 py-2 text-sm"/>
      </div>
      {loading && <p className="text-blue-600 mt-2">Processing image…</p>}
      {error && <p className="text-red-600 mt-2">{error}</p>}
      {hint && <p className="text-amber-700 mt-2">{hint}</p>}
    </div>
  );
}
