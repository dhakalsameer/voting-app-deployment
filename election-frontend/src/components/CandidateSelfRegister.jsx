import { useState, useEffect, useContext, useRef } from "react";
import { ethers } from "ethers";
import { AuthContext } from "../context/AuthContextValue";
import { getContractV3 } from "../contract";
import { API_URL } from "../config";
import { useToast } from "./ui/Toast";
import BlockExplorerLink from "./ui/BlockExplorerLink";
import { formatContractError } from "../utils/errors";

const POSITIONS = [
  { value: 0, label: "President", icon: "👤", minYear: 4, maxYear: 4 },
  { value: 1, label: "Secretary", icon: "📝", minYear: 3, maxYear: 4 },
  { value: 2, label: "General Member", icon: "🤝", minYear: 1, maxYear: 4 },
];

/*
 * Called when the admin has approved the student's candidate application AND
 * the Registration phase is open on-chain. This component:
 *   1. Loads the current contract phase + checks if already registered
 *   2. Fetches the student's identity Merkle proof from the backend
 *   3. Lets the student pick a position and submit registerCandidate() on-chain
 *   4. On success, shows a confirmation with the transaction link
 */
export default function CandidateSelfRegister({ student, regEnd }) {
  const { wallet } = useContext(AuthContext);
  const { success, error: showError } = useToast();

  const [phase, setPhase] = useState(null);
  const [regEndLocal, setRegEndLocal] = useState(regEnd || null);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [identity, setIdentity] = useState(null);
  const [proof, setProof] = useState(null);
  const [guid, setGuid] = useState(student?.student_id || "");
  const [position, setPosition] = useState(0);
  const [imageCID, setImageCID] = useState(student?.image_cid || "");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(
    student?.image_cid
      ? student.image_cid.startsWith("local:")
        ? `${API_URL}/uploads/${student.image_cid.slice(6)}`
        : student.image_cid.startsWith("http")
          ? student.image_cid
          : `https://ipfs.io/ipfs/${student.image_cid}`
      : null
  );
  const fileInputRef = useRef(null);
  const [loadingPhase, setLoadingPhase] = useState(false);
  const [loadingProof, setLoadingProof] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [txHash, setTxHash] = useState(null);

  const loadPhase = async () => {
    setLoadingPhase(true);
    try {
      const contract = await getContractV3();
      const p = await contract.getPhase();
      setPhase(Number(p));

      if (!regEndLocal) {
        const re = await contract.registrationEnd();
        setRegEndLocal(Number(re));
      }

      if (wallet) {
        const reg = await contract.candidateRegisteredInElection(wallet);
        const electionId = await contract.currentElectionId();
        setIsRegistered(Number(reg) === Number(electionId));
      }
    } catch (err) {
      console.error("loadPhase error:", err);
    } finally {
      setLoadingPhase(false);
    }
  };

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const loadIdentityProof = async () => {
    if (!wallet) return;
    setLoadingProof(true);
    try {
      const res = await fetch(`${API_URL}/api/voters/identity-proof?wallet=${wallet}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get identity proof");
      setProof(data.proof);
      setIdentity(data.identity);
    } catch (err) {
      console.error("loadIdentityProof error:", err);
      showError(err.message || "Could not fetch identity proof");
    } finally {
      setLoadingProof(false);
    }
  };

  useEffect(() => {
    loadPhase();
  }, [wallet]);

  useEffect(() => {
    if (phase === 1 && wallet) {
      loadIdentityProof();
    }
  }, [phase, wallet]);

  const handleUploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) {
      return showError("Only PNG/JPEG/WEBP/GIF images are allowed");
    }
    if (file.size > 5 * 1024 * 1024) {
      return showError("Image must be under 5 MB");
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);

      const res = await fetch(`${API_URL}/api/candidates/upload-photo`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setImageCID(data.url);
      setPhotoPreview(URL.createObjectURL(file));
    } catch (err) {
      showError(err.message || "Photo upload failed");
    } finally {
      setUploadingPhoto(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleRegister = async () => {
    if (!wallet) return showError("Connect your wallet first");
    if (!guid.trim()) return showError("Enter your GUID / Student ID");
    if (!proof || proof.length === 0) return showError("Identity proof not available");
    if (!identity) return showError("Identity data not loaded");

    setRegistering(true);
    try {
      if (!Number.isFinite(identity.year)) throw new Error("Invalid year from identity proof");
      const contract = await getContractV3();
      const tx = await contract.registerCandidate(
        guid.trim(),
        identity.name,
        identity.year,
        identity.isFemale,
        imageCID.trim() || "",
        position,
        proof
      );
      setTxHash(tx.hash);
      await tx.wait();
      success("Successfully registered as candidate!", { txHash: tx.hash });
      setIsRegistered(true);
    } catch (err) {
      console.error(err);
      showError(formatContractError(err, "Registration failed"));
    } finally {
      setRegistering(false);
    }
  };

  const remaining = regEndLocal ? regEndLocal - now : 0;
  const effectivelyOpen = phase === 1 && remaining > 0;

  if (loadingPhase) {
    return (
      <div className="rounded-xl border border-app bg-app-surface p-6 animate-pulse">
        <div className="flex items-center gap-3">
          <span className="h-5 w-5 border-2 border-app-accent/30 border-t-app-accent rounded-full animate-spin" />
          <p className="text-base text-app-muted-text font-medium">Checking election phase…</p>
        </div>
      </div>
    );
  }

  if (isRegistered) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 border-2 border-emerald-500/20 flex items-center justify-center">
          <span className="text-emerald-400 text-lg font-bold">✓</span>
        </div>
        <p className="text-lg font-bold text-emerald-400">Already Registered On-Chain</p>
        <p className="text-base text-app-body">You have already registered as a candidate for this election.</p>
          {txHash && (
            <div className="pt-2">
            <BlockExplorerLink hash={txHash} />
          </div>
        )}
      </div>
    );
  }

  const expired = phase === 1 && remaining <= 0;

  if (phase !== 1) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-6 text-center space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full bg-amber-500/10 border-2 border-amber-500/20 flex items-center justify-center">
          <span className="text-2xl">📋</span>
        </div>
        <p className="text-lg font-bold text-amber-400">Registration Not Open</p>
        <p className="text-base text-app-body max-w-md mx-auto">
          The {expired ? "registration window has expired" : "Registration phase has not started yet"}. {expired ? "Contact the admin." : "The admin must open it before you can register on-chain."}
        </p>
      </div>
    );
  }

  if (!effectivelyOpen) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-6 text-center space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full bg-amber-500/10 border-2 border-amber-500/20 flex items-center justify-center">
          <span className="text-2xl">⏰</span>
        </div>
        <p className="text-lg font-bold text-amber-400">Registration Ended</p>
        <p className="text-base text-app-body max-w-md mx-auto">
          The registration window has expired. Contact the admin if you need an extension.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-app bg-app-surface p-6 space-y-6">
      <div className="flex items-start gap-4 pb-4 border-b border-app/50">
        <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <span className="text-2xl">📝</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-app-heading">Register as Candidate</h2>
          <p className="text-sm text-app-muted-text mt-0.5">Your identity is verified via Merkle tree proof</p>
        </div>
        {remaining > 0 && (
          <div className="text-right shrink-0 pt-1">
            <p className="text-xs uppercase tracking-wider text-app-muted-text">Closes in</p>
            <p className="text-base font-mono font-bold text-emerald-400">
              {remaining > 3600
                ? `${Math.floor(remaining / 3600)}h ${String(Math.floor((remaining % 3600) / 60)).padStart(2, "0")}m`
                : `${Math.floor(remaining / 60)}m ${String(remaining % 60).padStart(2, "0")}s`}
            </p>
          </div>
        )}
      </div>

      {identity ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-sm text-emerald-400 font-bold uppercase tracking-wider">Identity Verified</span>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-app-muted-text uppercase tracking-wider font-medium">Name</p>
              <p className="text-lg font-bold text-app-heading mt-1 truncate">{identity.name}</p>
            </div>
            <div>
              <p className="text-xs text-app-muted-text uppercase tracking-wider font-medium">Year</p>
              <p className="text-lg font-bold text-app-heading mt-1">{identity.year}</p>
            </div>
            <div>
              <p className="text-xs text-app-muted-text uppercase tracking-wider font-medium">Gender</p>
              <p className="text-lg font-bold text-app-heading mt-1 capitalize">{identity.isFemale ? "Female" : "Male"}</p>
            </div>
          </div>
        </div>
      ) : loadingProof ? (
        <div className="rounded-xl border border-app bg-app-muted/30 p-6 animate-pulse flex items-center justify-center gap-3">
          <span className="h-5 w-5 border-2 border-app-accent/30 border-t-app-accent rounded-full animate-spin" />
          <span className="text-base text-app-muted-text font-medium">Verifying your identity via Merkle tree…</span>
        </div>
      ) : (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-5">
          <p className="text-base text-rose-400 font-medium">
            Could not load your verified identity. Make sure your wallet is connected and you're whitelisted as a voter.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="text-sm font-bold uppercase tracking-wider text-app-muted-text">Student ID</label>
          <input
            type="text"
            value={guid}
            disabled
            className="input-field mt-2 text-base font-mono opacity-60 cursor-not-allowed"
          />
        </div>

        <div>
          <label className="text-sm font-bold uppercase tracking-wider text-app-muted-text">Photo</label>
          <div className="mt-2 flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-lg border border-app bg-app-input text-app-muted-text hover:text-app-heading hover:bg-app-elevated transition-all cursor-pointer disabled:opacity-40"
            >
              {uploadingPhoto ? (
                <>
                  <span className="h-4 w-4 border-2 border-app-accent/30 border-t-app-accent rounded-full animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <span className="text-lg">📷</span>
                  <span>{photoPreview ? "Change photo" : "Upload photo"}</span>
                </>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleUploadPhoto}
              className="hidden"
            />
            {photoPreview && (
              <div className="relative shrink-0">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="h-14 w-14 rounded-xl object-cover border-2 border-app"
                />
                <button
                  type="button"
                  onClick={() => { setPhotoPreview(null); setImageCID(""); }}
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center hover:bg-rose-400 transition-colors cursor-pointer shadow-lg"
                >
                  ×
                </button>
              </div>
            )}
          </div>
          {imageCID && !photoPreview && (
            <p className="text-xs text-app-muted-text mt-2 truncate font-mono">{imageCID}</p>
          )}
        </div>
      </div>

      <div>
        <p className="text-base font-bold uppercase tracking-wider text-app-muted-text mb-3">Choose Position</p>
        <div className="grid grid-cols-3 gap-3">
          {POSITIONS.map((pos) => {
            const year = identity?.year;
            const allowed = year >= pos.minYear && year <= pos.maxYear;
            return (
              <div key={pos.value} className="relative group">
                <button
                  type="button"
                  onClick={() => allowed && setPosition(pos.value)}
                  disabled={!allowed}
                   className={`flex flex-col items-center gap-2 rounded-xl border px-4 py-5 text-base font-bold transition-all w-full ${
                    !allowed
                      ? "border-app-border/30 bg-app-muted/30 text-app-muted-text/40 cursor-not-allowed"
                      : position === pos.value
                        ? "border-app-accent bg-app-accent-soft text-app-accent ring-2 ring-app-accent/30 cursor-pointer"
                        : "border-app bg-app-input text-app-muted-text hover:text-app-heading hover:bg-app-elevated cursor-pointer"
                  }`}
                >
                  <span className="text-2xl">{pos.icon}</span>
                  <span>{pos.label}</span>
                </button>
                {!allowed && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-slate-900 text-white text-sm rounded-lg px-3 py-1.5 whitespace-nowrap shadow-lg border border-slate-700">
                      {pos.label === "President" ? "Only 4th-year students" : "Only 3rd or 4th-year students"}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleRegister}
        disabled={registering || loadingProof || !identity}
        className="btn-primary w-full text-base py-3"
      >
        {registering ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-5 w-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin inline-block" />
            Registering on-chain…
          </span>
        ) : (
          "Register as Candidate"
        )}
      </button>
    </div>
  );
}
