import { useState } from "react";
import { API_URL } from "../config";

function getImageUrl(cid) {
  if (!cid) return "";
  if (cid.startsWith("http")) return cid;
  if (cid.startsWith("local:")) return `${API_URL}/uploads/${cid.slice(6)}`;
  return `https://ipfs.io/ipfs/${cid}`;
}

export default function VoterStatusCard({ voterStatus, balance }) {
  const [imgErr, setImgErr] = useState(false);
  const steps = [
    { done: voterStatus.registered },
    { done: voterStatus.registered && voterStatus.walletLinked },
    { done: voterStatus.registered && voterStatus.walletLinked && voterStatus.verified },
    { done: voterStatus.canVote },
  ];

  const done = steps.filter(s => s.done).length;
  const total = steps.length;

  const statusText = done === total
    ? "Ready to vote"
    : !voterStatus.registered
      ? "Register your account"
      : !voterStatus.walletLinked
        ? "Link your wallet"
        : !voterStatus.verified
          ? "Awaiting verification"
          : "Complete setup";

  const photoUrl = getImageUrl(voterStatus.image_cid);

  return (
    <div className="rounded-xl border border-app bg-app-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {photoUrl && !imgErr ? (
            <img
              src={photoUrl}
              alt=""
              className="h-10 w-10 rounded-lg object-cover border border-app"
              onError={() => setImgErr(true)}
            />
          ) : voterStatus.registered ? (
            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-amber-300 via-emerald-500 to-sky-500 text-sm font-black text-slate-950 border border-app">
              {voterStatus.name?.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()}
            </div>
          ) : null}
          <div>
            <span className="text-sm font-medium text-app-heading">Status</span>
            <span className={`text-sm font-medium ml-2 ${done === total ? "text-emerald-400" : "text-app-muted-text"}`}>
              {done}/{total}
            </span>
          </div>
        </div>
        {balance !== null && Number(balance) < 0.001 && (
          <span className="text-xs font-mono text-rose-400">Low gas</span>
        )}
      </div>

      <div className="flex gap-1 mb-3">
        {steps.map((s, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              s.done ? "bg-emerald-400" : "bg-app-border/50"
            }`}
          />
        ))}
      </div>

      <p className={`text-sm font-medium ${done === total ? "text-emerald-400" : "text-app-muted-text"}`}>
        {statusText}
      </p>
    </div>
  );
}
