import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContextValue";
import { API_URL } from "../config";
import { getContract } from "../contract";

const getImageUrl = (imageCID) => {
  if (!imageCID) return "";
  if (imageCID.startsWith("http://") || imageCID.startsWith("https://")) return imageCID;
  return `https://ipfs.io/ipfs/${imageCID}`;
};

const getPositionLabel = (position) => {
  if (position === 0) return "President";
  if (position === 1) return "Secretary";
  return "General Member";
};

function CandidateOption({ candidate, selected, onSelect }) {
  const [imageError, setImageError] = useState(false);
  const imageUrl = getImageUrl(candidate.imageCID);
  const initials = candidate.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full overflow-hidden rounded-lg border-2 bg-white text-left transition-all hover:border-green-300 hover:shadow-md ${
        selected ? "border-green-500 bg-green-50 shadow-md" : "border-green-200"
      }`}
    >
      <div className="flex gap-4 p-4">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-green-100/40">
          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={`${candidate.name} profile`}
              className="h-full w-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-green-100 text-xl font-bold text-green-700">
              {initials || "?"}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="break-words text-base font-bold text-green-950">{candidate.name}</p>
              <p className="text-sm font-medium text-green-700">{getPositionLabel(candidate.position)}</p>
            </div>
            {selected && (
              <span className="rounded-full bg-green-600 px-3 py-1 text-xs font-bold text-white">
                Selected
              </span>
            )}
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-green-700/70">Year</dt>
              <dd className="font-semibold text-green-900">Year {candidate.year || "N/A"}</dd>
            </div>
            <div>
              <dt className="text-green-700/70">Student ID</dt>
              <dd className="break-words font-semibold text-green-900">{candidate.studentId || "N/A"}</dd>
            </div>
            <div>
              <dt className="text-green-700/70">Candidate ID</dt>
              <dd className="font-semibold text-green-900">#{candidate.id}</dd>
            </div>
            <div>
              <dt className="text-green-700/70">Category</dt>
              <dd className="font-semibold text-green-900">
                {candidate.isFemale ? "Female Candidate" : "Open Candidate"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </button>
  );
}

export default function VotingPanel() {
  const { wallet } = useContext(AuthContext);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selection, setSelection] = useState({
    president: null,
    secretary: null,
    members: []
  });

  const loadCandidates = async () => {
    try {
      const response = await fetch(`${API_URL}/api/candidates`);
      const rows = await response.json();

      setCandidates(
        rows.map((candidate) => ({
          id: Number(candidate.blockchain_id),
          name: candidate.name,
          studentId: candidate.student_id,
          year: candidate.year || null,
          isFemale: Boolean(candidate.is_female),
          imageCID: candidate.image_cid,
          position:
            candidate.position === "President"
              ? 0
              : candidate.position === "Secretary"
                ? 1
                : 2,
          voteCount: Number(candidate.vote_count || 0),
        }))
      );
    } catch (err) {
      console.error("Load candidates error:", err);
    }
  };

  const castVote = async () => {
    if (!wallet) return alert("Please connect wallet");
    if (!selection.president || !selection.secretary || selection.members.length !== 7) {
      return alert("Please select 1 President, 1 Secretary, and 7 Members");
    }

    setLoading(true);
    try {
      const contract = await getContract();
      const tx = await contract.vote(
        selection.president,
        selection.secretary,
        selection.members
      );
      await tx.wait();
      alert("Vote cast successfully!");
      loadCandidates();
    } catch (err) {
      console.error("Voting error:", err);
      alert(err.reason || "Transaction failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, [wallet]);

  const toggleMember = (id) => {
    setSelection(prev => {
      const members = prev.members.includes(id) 
        ? prev.members.filter(m => m !== id)
        : prev.members.length < 7 ? [...prev.members, id] : prev.members;
      return { ...prev, members };
    });
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow mt-8">
      <h2 className="text-2xl font-bold mb-6">Voting Panel</h2>

      <div className="space-y-8">
        {/* Presidents */}
        <section>
          <h3 className="text-lg font-semibold mb-3 border-b pb-1">President (Select 1)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {candidates.filter(c => c.position === 0).map(c => (
              <CandidateOption
                key={c.id}
                candidate={c}
                selected={selection.president === c.id}
                onSelect={() => setSelection({ ...selection, president: c.id })}
              />
            ))}
          </div>
        </section>

        {/* Secretary */}
        <section>
          <h3 className="text-lg font-semibold mb-3 border-b pb-1">Secretary (Select 1)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {candidates.filter(c => c.position === 1).map(c => (
              <CandidateOption
                key={c.id}
                candidate={c}
                selected={selection.secretary === c.id}
                onSelect={() => setSelection({ ...selection, secretary: c.id })}
              />
            ))}
          </div>
        </section>

        {/* General Members */}
        <section>
          <h3 className="text-lg font-semibold mb-3 border-b pb-1">General Members (Select 7)</h3>
          <p className="text-sm text-green-700/70 mb-2">Selected: {selection.members.length}/7</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {candidates.filter(c => c.position === 2).map(c => (
              <CandidateOption
                key={c.id}
                candidate={c}
                selected={selection.members.includes(c.id)}
                onSelect={() => toggleMember(c.id)}
              />
            ))}
          </div>
        </section>

        <button 
          onClick={castVote}
          disabled={loading || !wallet}
          className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-green-700 disabled:bg-green-300 transition-colors shadow-lg"
        >
          {loading ? "Processing Vote..." : "Submit My Vote"}
        </button>
      </div>
    </div>
  );
}
