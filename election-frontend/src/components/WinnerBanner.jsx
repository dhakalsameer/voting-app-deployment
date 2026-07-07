import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContextValue";
import { API_URL } from "../config";

const POSITION_LABELS = {
  President: "President",
  Secretary: "Secretary",
  General: "General Member",
};

export default function WinnerBanner() {
  const { wallet } = useContext(AuthContext);
  const [winnerInfo, setWinnerInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!wallet) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(`${API_URL}/api/contract/phase`);
        const phaseData = await res.json();
        if (cancelled) return;

        if (phaseData.phase !== 3) {
          setWinnerInfo(null);
          setLoading(false);
          return;
        }

        const [candRes, resultsRes] = await Promise.all([
          fetch(`${API_URL}/api/candidates/by-wallet/${wallet}`),
          fetch(`${API_URL}/api/results/history`),
        ]);

        if (cancelled) return;

        const candidate = await candRes.json();
        const history = await resultsRes.json();

        if (!candidate || !history || history.length === 0) {
          setLoading(false);
          return;
        }

        const latest = history[0];
        const winner = latest.candidates?.find(
          (c) => c.candidate_name === candidate.name && Number(c.vote_count) > 0
        );

        if (winner) {
          setWinnerInfo({
            name: candidate.name,
            position: candidate.position,
            voteCount: winner.vote_count,
          });
        }
      } catch (err) {
        console.error("Winner check failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    check();
    const interval = setInterval(check, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [wallet]);

  if (loading || !winnerInfo) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-sm p-5">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-2xl">🏆</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-amber-800">
            Congratulations {winnerInfo.name}! 🎉
          </p>
          <p className="text-sm text-amber-700 mt-1 leading-relaxed">
            You have been elected as{" "}
            <span className="font-semibold">{POSITION_LABELS[winnerInfo.position] || winnerInfo.position}</span>
            {winnerInfo.voteCount > 0 && (
              <span> with <span className="font-semibold">{winnerInfo.voteCount}</span> vote{winnerInfo.voteCount !== 1 ? "s" : ""}</span>
            )}.
          </p>
          <p className="text-xs text-amber-500 mt-2">
            This recognition will remain until a new election begins.
          </p>
        </div>
      </div>
    </div>
  );
}
