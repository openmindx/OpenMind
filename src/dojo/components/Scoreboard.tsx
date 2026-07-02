import { ScoreboardEntry, beltForRank } from '../dojo-types';
import './Scoreboard.css';

interface ScoreboardProps {
  entries: ScoreboardEntry[];
  roundCount: number;
}

export function Scoreboard({ entries, roundCount }: ScoreboardProps) {
  if (entries.length === 0) return null;

  const sorted = [...entries].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    const avgA = a.rounds > 0 ? a.totalOverall / a.rounds : 0;
    const avgB = b.rounds > 0 ? b.totalOverall / b.rounds : 0;
    return avgB - avgA;
  });

  return (
    <div className="scoreboard">
      <div className="scoreboard__header">
        <span>Scoreboard</span>
        <span className="scoreboard__rounds">{roundCount} round{roundCount !== 1 ? 's' : ''}</span>
      </div>
      <table className="scoreboard__table">
        <thead>
          <tr>
            <th className="sb-th sb-th--rank">#</th>
            <th className="sb-th sb-th--model">Model</th>
            <th className="sb-th">Wins</th>
            <th className="sb-th">Rounds</th>
            <th className="sb-th">Avg</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry, i) => {
            const avg = entry.rounds > 0
              ? (entry.totalOverall / entry.rounds).toFixed(1)
              : '—';
            const isTop = i === 0 && entry.wins > 0;
            const belt = beltForRank(i);
            return (
              <tr key={entry.model} className={isTop ? 'sb-row--top' : ''}>
                <td className="sb-td sb-td--rank">
                  <span
                    className="sb-belt"
                    style={{ background: belt.color }}
                    title={`${belt.name} belt`}
                  />
                  {i + 1}
                </td>
                <td className="sb-td sb-td--model" title={entry.model}>
                  {entry.model}
                </td>
                <td className="sb-td sb-td--wins">{entry.wins}</td>
                <td className="sb-td sb-td--rounds">{entry.rounds}</td>
                <td className="sb-td sb-td--avg">{avg}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
