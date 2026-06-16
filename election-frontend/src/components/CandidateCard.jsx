export default function CandidateCard({ candidate }) {
  const imageURL = candidate?.imageCID
    ? `https://ipfs.io/ipfs/${candidate.imageCID}`
    : "/default-avatar.png";

  const getPosition = (pos) => {
    const p = Number(pos);

    if (p === 0) return "President";
    if (p === 1) return "Secretary";
    return "General Member";
  };

  return (
    <div
      className="card"
      style={{
        border: "1px solid #ddd",
        padding: "16px",
        borderRadius: "10px",
        width: "220px",
      }}
    >
      {/* IMAGE */}
      <img
        src={imageURL}
        alt={`${candidate.name} profile`}
        style={{
          width: "120px",
          height: "120px",
          objectFit: "cover",
          borderRadius: "10px",
        }}
      />

      {/* NAME */}
      <h3>{candidate.name}</h3>

      {/* POSITION */}
      <p>
        Position: <b>{getPosition(candidate.position)}</b>
      </p>

      {/* VOTES */}
      <p>
        Votes: <b>{candidate.voteCount.toString()}</b>
      </p>
    </div>
  );
}
