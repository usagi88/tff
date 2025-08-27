import React, { useEffect, useMemo, useState } from 'react';
import { Trophy, Users, Globe, Skull, TrendingUp, Award, FileText, Target, Copy, Share2 } from 'lucide-react';
import teams from '../data/teams.json';
import fixtures from '../data/fixtures.json';
import resultsStatic from '../data/results.json';
import UploadResults from './UploadResults';

type Match = { home: string; away: string; homeScore?: number; awayScore?: number; bye?: string };

export default function TFFPortal() {
  const [activeTab, setActiveTab] = useState<'dashboard'|'chumpions'|'overall'|'weekly'|'fixtures'|'roll'>('dashboard');
  const [refreshKey, setRefreshKey] = useState(0);
  const [copied, setCopied] = useState<null | 'copied' | 'error'>(null);
  const [fixtureWeek, setFixtureWeek] = useState<number>(3);

  // Merge results from localStorage (OCR uploads) with static JSON
  const results = useMemo(() => {
    const fromLS = localStorage.getItem('tff_results');
    if (fromLS) return JSON.parse(fromLS);
    return resultsStatic;
  }, [refreshKey]);

  // standings computed from results (1XI only for Chumpions view)
  type Standing = { team: string; played: number; won: number; drawn: number; lost: number; pf: number; pa: number; pts: number };
  const chumpionsTeamNames = new Set(teams.map(t => t.team));

  const chumpionsStandings: Standing[] = useMemo(() => {
    const table: Record<string, Standing> = {};
    Object.keys(results).forEach(k => {
      if (!k.startsWith('week')) return;
      (results[k] as Match[]).forEach((m: Match) => {
        if ((m as any).bye) return;
        const involved = [m.home, m.away].filter(Boolean) as string[];
        involved.forEach(team => {
          if (!chumpionsTeamNames.has(team)) return;
          if (!table[team]) table[team] = { team, played: 0, won: 0, drawn: 0, lost: 0, pf: 0, pa: 0, pts: 0 };
        });
        if (chumpionsTeamNames.has(m.home) && chumpionsTeamNames.has(m.away)) {
          const hs = m.homeScore ?? 0, as = m.awayScore ?? 0;
          table[m.home].played++; table[m.away].played++;
          table[m.home].pf += hs; table[m.home].pa += as;
          table[m.away].pf += as; table[m.away].pa += hs;
          if (hs > as) { table[m.home].won++; table[m.home].pts += 3; table[m.away].lost++; }
          else if (hs < as) { table[m.away].won++; table[m.away].pts += 3; table[m.home].lost++; }
          else { table[m.home].drawn++; table[m.away].drawn++; table[m.home].pts++; table[m.away].pts++; }
        }
      });
    });
    return Object.values(table).sort((a,b) => b.pts - a.pts || (b.pf - b.pa) - (a.pf - a.pa) || b.pf - a.pf);
  }, [results]);

  // overall standings (1XI + 2XI) by cumulative season points from results (sum pf for each team when it appears)
  type Overall = { team: string; points: number };
  const overallStandings: Overall[] = useMemo(() => {
    const agg: Record<string, number> = {};
    Object.keys(results).forEach(k => {
      if (!k.startsWith('week')) return;
      (results[k] as Match[]).forEach((m: Match) => {
        if ((m as any).bye) return;
        if (typeof m.homeScore === 'number') agg[m.home] = (agg[m.home] || 0) + m.homeScore;
        if (typeof m.awayScore === 'number') agg[m.away] = (agg[m.away] || 0) + m.awayScore;
      });
    });
    return Object.entries(agg).map(([team, points]) => ({ team, points })).sort((a,b) => b.points - a.points);
  }, [results]);

  // dashboard highlights
  const overallLeader = overallStandings[0]?.team ?? '—';
  const chumpionsLeader = chumpionsStandings[0]?.team ?? '—';

  // fixtures helpers
  const weekKeys = Object.keys(fixtures).filter(k => k.startsWith('week')).map(k => Number(k.replace('week',''))).sort((a,b)=>a-b);
  const getResultFor = (w: number, home: string, away: string) => {
    const wk = results[`week${w}`] as Match[] || [];
    const hit = wk.find(m => m.home === home && m.away === away);
    return hit && typeof hit.homeScore === 'number' ? `${hit.homeScore}–${hit.awayScore}` : '';
  };
  const buildShareText = (w: number) => {
    const list = (fixtures as any)[`week${w}`] || [];
    const lines: string[] = [];
    lines.push(`GW${w} Fixtures (Chumpions League – 1XI)`);
    list.forEach((f: any) => {
      if (f.bye) lines.push(`BYE: ${f.bye}`);
      else {
        const score = getResultFor(w, f.home, f.away);
        lines.push(score ? `${f.home} ${score} ${f.away}` : `${f.home} vs ${f.away}`);
      }
    });
    return lines.join('\n');
  };
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildShareText(fixtureWeek));
      setCopied('copied'); setTimeout(()=>setCopied(null),1600);
    } catch { setCopied('error'); setTimeout(()=>setCopied(null),1600); }
  };
  const whatsappHref = () => `https://wa.me/?text=${encodeURIComponent(buildShareText(fixtureWeek))}`;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">TFF Tournament System 2025/26</h1>
          <p className="text-gray-600">Central hub • 13 managers • 26 teams • 4 competitions</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex flex-wrap gap-3">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Trophy },
              { id: 'chumpions', label: 'Chumpions League', icon: Users },
              { id: 'overall', label: 'Overall League', icon: Trophy },
              { id: 'weekly', label: 'Upload Results', icon: FileText },
              { id: 'fixtures', label: 'Fixtures', icon: Target },
              { id: 'roll', label: 'Roll of Honour', icon: Award },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                className={
                  'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ' +
                  (activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
                }>
                <tab.icon size={18} /> {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><TrendingUp /> Current Highlights</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <span className="font-medium">Overall Leader</span>
                <p className="font-bold text-green-700">{overallLeader}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <span className="font-medium">Chumpions League Leader</span>
                <p className="font-bold text-blue-700">{chumpionsLeader}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chumpions' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"><Users className="text-blue-500" size={28} /> Chumpions League Table</h2>
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
                  </tr>
                </thead>
                <tbody>
                  {chumpionsStandings.map((row, idx) => (
                    <tr key={row.team} className={`border-b hover:bg-gray-50 ${idx < 3 ? 'bg-blue-50' : ''}`}>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'overall' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"><Trophy className="text-yellow-500" size={28} /> Overall League (1XI + 2XI)</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left">Pos</th>
                    <th className="px-3 py-3 text-left">Team</th>
                    <th className="px-2 py-3 text-center">Season Points</th>
                  </tr>
                </thead>
                <tbody>
                  {overallStandings.map((row, idx) => (
                    <tr key={row.team} className={`border-b hover:bg-gray-50 ${idx < 3 ? 'bg-yellow-50' : ''}`}>
                      <td className="px-3 py-2 font-bold">{idx + 1}</td>
                      <td className="px-3 py-2">{row.team}</td>
                      <td className="px-2 py-2 text-center font-bold">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'fixtures' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"><Target className="text-green-600" size={28} /> Fixtures</h2>
            <div className="flex items-center gap-3 mb-4">
              <label className="text-sm font-medium text-gray-600">Week:</label>
              <select value={fixtureWeek} onChange={e=>setFixtureWeek(parseInt(e.target.value))} className="border rounded-md px-3 py-2 text-sm">
                {weekKeys.map(w => <option key={w} value={w}>Week {w}</option>)}
              </select>
              <button onClick={handleCopy} className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-gray-800 text-white text-sm hover:bg-gray-700">
                <Copy size={16}/> {copied==='copied'?'Copied!':'Copy'}
              </button>
              <a href={whatsappHref()} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-green-600 text-white text-sm hover:bg-green-700">
                <Share2 size={16}/> Share to WhatsApp
              </a>
            </div>
            <div className="space-y-2">
              {(fixtures as any)[`week${fixtureWeek}`].map((f: any, i: number) => f.bye ? (
                <div key={i} className="p-3 rounded-lg bg-blue-50 border-l-4 border-blue-400"><strong>BYE:</strong> {f.bye}</div>
              ) : (
                <div key={i} className="p-3 rounded-lg bg-gray-50 border-l-4 border-gray-300 flex justify-between">
                  <span className="font-medium">{f.home} vs {f.away}</span>
                  <span className="text-gray-700">{getResultFor(fixtureWeek, f.home, f.away) || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'weekly' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-3 flex items-center gap-3"><FileText className="text-purple-600" size={28} /> Weekly Update</h2>
            <p className="text-gray-600 mb-2">Upload a screenshot to auto-update results via OCR (trial mode saves to your browser only).</p>
            <UploadResults onUpdate={() => setRefreshKey(k => k + 1)} />
          </div>
        )}

        {activeTab === 'roll' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3"><Award className="text-purple-500" size={28} /> Roll of Honour</h2>
            <p className="text-gray-600">Add your historical winners here later.</p>
          </div>
        )}
      </div>
    </div>
  );
}
