import React, { useMemo, useState } from 'react';
import { Trophy, Users, TrendingUp, Award, FileText, Target, Copy, Share2, Skull } from 'lucide-react';
import teams from '../data/teams.json';
import fixtures from '../data/fixtures.json';
import resultsStatic from '../data/results.json';
import meta from '../data/meta.json';
import roll from '../data/rollofhonour.json';
import UploadResults from './UploadResults';

type Match = { home?: string; away?: string; homeScore?: number; awayScore?: number; bye?: string; byeScore?: number };
type Standing = { team: string; played: number; won: number; drawn: number; lost: number; pf: number; pa: number; pts: number };
type OverallRow = { team: string; points: number };

export default function TFFPortal() {
  const [activeTab, setActiveTab] = useState<'dashboard'|'chumpions'|'overall'|'weekly'|'fixtures'|'roll'|'nations'|'lms'>('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);
  const [copied, setCopied] = useState<null | 'copied' | 'error'>(null);
  const [fixtureWeek, setFixtureWeek] = useState<number>((meta as any).currentWeek ?? 1);

  const results = useMemo(() => {
    const fromLS = typeof window !== 'undefined' ? localStorage.getItem('tff_results') : null;
    if (fromLS) return JSON.parse(fromLS);
    return resultsStatic;
  }, [refreshKey]);

  const currentWeek = (meta as any).currentWeek ?? 1;

  const chumpionsTeamNames = new Set((teams as any[]).map(t => t.team));

  const chumpionsStandings: Standing[] = useMemo(() => {
    const table: Record<string, Standing> = {};
    const byePoint = 1;
    for (let w = 1; w <= currentWeek; w++) {
      const wk = (results as any)[`week${w}`] as Match[] || [];
      wk.forEach((m: Match) => {
        if (m.bye) {
          if (!table[m.bye]) table[m.bye] = { team: m.bye, played: 0, won: 0, drawn: 0, lost: 0, pf: 0, pa: 0, pts: 0 };
          table[m.bye].pts += byePoint;
          return;
        }
        if (!m.home || !m.away) return;
        if (!chumpionsTeamNames.has(m.home) || !chumpionsTeamNames.has(m.away)) return;
        [m.home, m.away].forEach(t => { if (!table[t]) table[t] = { team:t, played:0, won:0, drawn:0, lost:0, pf:0, pa:0, pts:0 } });
        const hs = m.homeScore ?? 0, as = m.awayScore ?? 0;
        table[m.home].played++; table[m.away].played++;
        table[m.home].pf += hs; table[m.home].pa += as;
        table[m.away].pf += as; table[m.away].pa += hs;
        if (hs > as) { table[m.home].won++; table[m.home].pts += 3; table[m.away].lost++; }
        else if (hs < as) { table[m.away].won++; table[m.away].pts += 3; table[m.home].lost++; }
        else { table[m.home].drawn++; table[m.away].drawn++; table[m.home].pts++; table[m.away].pts++; }
      });
    }
    const arr = Object.values(table) as Standing[];
    arr.sort((a: Standing, b: Standing) =>
      b.pts - a.pts || (b.pf - b.pa) - (a.pf - a.pa) || b.pf - a.pf
    );
    return arr;
  }, [results, currentWeek]);

  const overallByWeek: Record<number, OverallRow[]> = useMemo(() => {
    const out: Record<number, Record<string, number>> = {};
    for (let w = 1; w <= currentWeek; w++) {
      const key = `week${w}`;
      const agg = { ...(out[w-1] || {}) } as Record<string, number>;
      const wk = (results as any)[key] || [];
      wk.forEach((m: Match) => {
        if (m.bye && typeof m.byeScore === 'number') { agg[m.bye] = (agg[m.bye]||0) + m.byeScore; return; }
        if (!m.bye) {
          if (m.home && typeof m.homeScore === 'number') agg[m.home] = (agg[m.home] || 0) + m.homeScore;
          if (m.away && typeof m.awayScore === 'number') agg[m.away] = (agg[m.away] || 0) + m.awayScore;
        }
      });
      out[w] = agg;
    }
    const ranked: Record<number, OverallRow[]> = {};
    Object.keys(out).forEach((k: string) => {
      const w = Number(k);
      ranked[w] = Object.entries(out[w])
        .map(([team, points]) => ({ team, points: Number(points) }))
        .sort((a: OverallRow, b: OverallRow) => b.points - a.points);
    });
    return ranked;
  }, [results, currentWeek]);

  const overallStandings = overallByWeek[currentWeek] || [];
  const lastWeekStandings = overallByWeek[currentWeek-1] || [];

  const posIndex = (arr: OverallRow[], team: string) => {
    const i = arr.findIndex(r => r.team === team);
    return i === -1 ? null : i + 1;
  };

  const resultLetter = (hs:number, as:number) => hs>as?'W':hs<as?'L':'D';
  const computeForm = (team:string) => {
    const letters: string[] = [];
    for (let w = currentWeek; w >= 1 && letters.length < 5; w--) {
      const wk = (results as any)[`week${w}`] || [];
      const bye = wk.find((m:Match) => m.bye === team);
      if (bye) { letters.push('B'); continue; }
      const m = wk.find((m:Match) => m.home === team || m.away === team);
      if (!m || typeof m.homeScore !== 'number' || typeof m.awayScore !== 'number') continue;
      letters.push(m.home === team ? resultLetter(m.homeScore!, m.awayScore!) : resultLetter(m.awayScore!, m.homeScore!));
    }
    return letters.reverse().join('');
  };

  const weekKeys: number[] = Object.keys(fixtures as Record<string, unknown>)
    .filter((k: string) => k.startsWith('week'))
    .map((k: string) => Number(k.replace('week', '')))
    .sort((a: number, b: number) => a - b);

  const getResultFor = (w:number, home:string, away:string) => {
    const wk = (results as any)[`week${w}`] as Match[] || [];
    const hit = wk.find(m => m.home === home && m.away === away);
    return hit && typeof hit.homeScore === 'number' ? `${hit.homeScore}–${hit.awayScore}` : '';
  };

  const buildShareText = (w:number) => {
    const list = (fixtures as any)[`week${w}`] || [];
    const lines:string[] = [];
    lines.push(`GW${w} Fixtures (Chumpions – 1XI)`);
    list.forEach((f:any) => {
      if (f.bye) lines.push(`BYE: ${f.bye}`);
      else {
        const score = getResultFor(w, f.home, f.away);
        lines.push(score ? `${f.home} ${score} ${f.away}` : `${f.home} vs ${f.away}`);
      }
    });
    return lines.join('\n');
  };

  const overallLeader = overallStandings[0]?.team ?? '—';
  const chumpionsLeader = chumpionsStandings[0]?.team ?? '—';

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">TFF Portal v2 — 2025/26</h1>
          <p className="text-gray-600">13 managers • 26 teams • Chumpions → Nations → LMS</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex flex-wrap gap-3">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Trophy },
              { id: 'chumpions', label: 'Chumpions League', icon: Users },
              { id: 'overall', label: 'Overall League', icon: Trophy },
              { id: 'fixtures', label: 'Fixtures', icon: Target },
              { id: 'weekly', label: 'Upload Results', icon: FileText },
              { id: 'nations', label: 'Nations League', icon: Users },
              { id: 'lms', label: 'LMS', icon: Skull },
              { id: 'roll', label: 'Roll of Honour', icon: Award }
            ].map(tab => (
              <button key={tab.id} onClick={()=>setActiveTab(tab.id as any)}
                className={'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all '+(activeTab===tab.id?'bg-blue-600 text-white shadow-lg':'bg-gray-100 text-gray-700 hover:bg-gray-200')}>
                <tab.icon size={18}/> {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><TrendingUp/> Current Highlights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <span className="font-medium">Overall Leader</span>
                <p className="font-bold text-green-700">{overallLeader}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <span className="font-medium">Chumpions Leader</span>
                <p className="font-bold text-blue-700">{chumpionsLeader}</p>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Latest Results — Week {currentWeek}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {((results as any)[`week${currentWeek}`] || []).map((m:Match, i:number) => m.bye ? (
                  <div key={i} className="p-3 rounded-md bg-blue-50 border-l-4 border-blue-400">BYE: {m.bye} {typeof m.byeScore==='number' ? `(${m.byeScore})` : ''}</div>
                ) : (
                  <div key={i} className="p-3 rounded-md bg-gray-50 border-l-4 border-gray-300 flex justify-between">
                    <span>{m.home} vs {m.away}</span>
                    <span className="font-semibold">{typeof m.homeScore==='number'?`${m.homeScore}–${m.awayScore}`:'—'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Weekly Report (1 → {currentWeek})</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Array.from({length: currentWeek}, (_,i)=>i+1).map(week => {
                  const wk = (results as any)[`week${week}`] || [];
                  const scores = wk.filter((m:Match)=>!m.bye && typeof m.homeScore==='number').flatMap((m:Match)=>[m.homeScore as number, m.awayScore as number]);
                  const avg = scores.length? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0;
                  const max = scores.length? Math.max(...scores):0;
                  const min = scores.length? Math.min(...scores):0;
                  return (
                    <div key={week} className="p-3 rounded-md bg-white border">
                      <div className="font-medium mb-1">Week {week}</div>
                      <div className="text-sm text-gray-600">Games: {wk.filter((m:Match)=>!m.bye).length}</div>
                      <div className="text-sm text-gray-600">Avg Score: {avg}</div>
                      <div className="text-sm text-gray-600">High/Low: {max}/{min}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chumpions' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"><Users className="text-blue-500" size={28}/> Chumpions League Table</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left">Pos</th>
                    <th className="px-3 py-3 text-left">Team</th>
                    <th className="px-2 py-3 text-center">P</th>
                    <th className="px-2 py-3 text-center">W</th>
                    <th className="px-2 py-3 text-center">D</th>
                    <th className="px-2 py-3 text-center">L</th>
                    <th className="px-2 py-3 text-center">PF</th>
                    <th className="px-2 py-3 text-center">PA</th>
                    <th className="px-2 py-3 text-center">GD</th>
                    <th className="px-2 py-3 text-center">Pts</th>
                    <th className="px-2 py-3 text-center">Form (5)</th>
                  </tr>
                </thead>
                <tbody>
                  {chumpionsStandings.map((row, idx) => (
                    <tr key={row.team} className={'border-b hover:bg-gray-50 '+(idx<3?'bg-blue-50':'')}>
                      <td className="px-3 py-2 font-bold">{idx + 1}</td>
                      <td className="px-3 py-2">{row.team}</td>
                      <td className="px-2 py-2 text-center">{row.played}</td>
                      <td className="px-2 py-2 text-center">{row.won}</td>
                      <td className="px-2 py-2 text-center">{row.drawn}</td>
                      <td className="px-2 py-2 text-center">{row.lost}</td>
                      <td className="px-2 py-2 text-center">{row.pf}</td>
                      <td className="px-2 py-2 text-center">{row.pa}</td>
                      <td className="px-2 py-2 text-center">{row.pf - row.pa}</td>
                      <td className="px-2 py-2 text-center font-bold">{row.pts}</td>
                      <td className="px-2 py-2 text-center font-mono text-sm">{computeForm(row.team) || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'overall' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"><Trophy className="text-yellow-500" size={28}/> Overall League (1XI + 2XI)</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left">Pos</th>
                    <th className="px-3 py-3 text-left">Team</th>
                    <th className="px-2 py-3 text-center">Season Points</th>
                    <th className="px-2 py-3 text-center">Move</th>
                  </tr>
                </thead>
                <tbody>
                  {overallStandings.map((row, idx) => {
                    const prev = posIndex(lastWeekStandings, row.team);
                    const now = idx + 1;
                    const delta = prev ? prev - now : 0;
                    const arrow = delta > 0 ? '▲' : delta < 0 ? '▼' : '•';
                    return (
                      <tr key={row.team} className={'border-b hover:bg-gray-50 '+(idx<3?'bg-yellow-50':'')}>
                        <td className="px-3 py-2 font-bold">{now}</td>
                        <td className="px-3 py-2">{row.team}</td>
                        <td className="px-2 py-2 text-center font-bold">{row.points}</td>
                        <td className="px-2 py-2 text-center">{arrow} {delta!==0?Math.abs(delta):''}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'fixtures' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"><Target className="text-green-600" size={28}/> Fixtures</h2>
            <div className="flex items-center gap-3 mb-4">
              <label className="text-sm font-medium text-gray-600">Week:</label>
              <select value={fixtureWeek} onChange={e=>setFixtureWeek(parseInt(e.target.value))} className="border rounded-md px-3 py-2 text-sm">
                {weekKeys.map((w:number) => <option key={w} value={w}>Week {w}</option>)}
              </select>
              <button onClick={async()=>{ try{ await navigator.clipboard.writeText(buildShareText(fixtureWeek)); setCopied('copied'); setTimeout(()=>setCopied(null),1600);}catch{ setCopied('error'); setTimeout(()=>setCopied(null),1600);} }} className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gray-800 text-white text-sm hover:bg-gray-700"><Copy size={16}/> {copied==='copied'?'Copied!':'Copy'}</button>
              <a href={`https://wa.me/?text=${encodeURIComponent(buildShareText(fixtureWeek))}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-green-600 text-white text-sm hover:bg-green-700"><Share2 size={16}/> Share to WhatsApp</a>
            </div>
            <div className="space-y-2">
              {(fixtures as any)[`week${fixtureWeek}`].map((f:any, i:number) => f.bye ? (
                <div key={i} className="p-3 rounded-lg bg-blue-50 border-l-4 border-blue-400"><strong>BYE:</strong> {f.bye}</div>
              ) : (
                <div key={i} className="p-3 rounded-lg bg-gray-50 border-l-4 border-gray-300 flex justify-between">
                  <span className="font-medium">{f.home} vs {f.away}</span>
                  <span className="text-gray-700">{getResultFor(fixtureWeek, f.home, f.away) || '—'}</span>
                </div>
              ))}
              {(fixtures as any)[`week${fixtureWeek}`].length===0 && <div className="text-gray-600">No fixtures loaded for Week {fixtureWeek} yet.</div>}
            </div>
          </div>
        )}

        {activeTab === 'weekly' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-3 flex items-center gap-3"><FileText className="text-purple-600" size={28}/> Weekly Update</h2>
            <p className="text-gray-600 mb-2">Upload a PNG/JPG screenshot to OCR results (trial mode saves to your browser only).</p>
            <UploadResults onUpdate={() => setRefreshKey(k => k + 1)} />
          </div>
        )}

        {activeTab === 'nations' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-3">Nations League</h2>
            <p className="text-gray-600">Begins Week {(meta as any).nationsStartWeek}. We’ll display group tables and weekly promotions/relegations here.</p>
          </div>
        )}

        {activeTab === 'lms' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-3">Last Man Standing</h2>
            <p className="text-gray-600">Starts after Nations League (Week {(meta as any).lmsStartWeek}). Tracks eliminations each week for all 26 teams.</p>
          </div>
        )}

        {activeTab === 'roll' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"><Award className="text-purple-500" size={28}/> Roll of Honour</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(roll as any).seasons.map((s:any)=>(
                <div key={s.year} className="p-4 border rounded-lg bg-white">
                  <div className="font-bold mb-2">{s.year}</div>
                  <div className="text-sm text-gray-700">Overall Champion: <span className="font-medium">{s.overallChampion}</span></div>
                  <div className="text-sm text-gray-700">Chumpions League: <span className="font-medium">{s.chumpionsChampion}</span></div>
                  <div className="text-sm text-gray-700">Nations League: <span className="font-medium">{s.nationsChampion}</span></div>
                  <div className="text-sm text-gray-700">LMS: <span className="font-medium">{s.lmsWinner}</span></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
