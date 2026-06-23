import { useState } from "react";
import { useToast } from "../ui/Toast";
import SectionHeader from "../ui/SectionHeader";

/**
 * @deprecated Candidate registration is now self-service via the contract's
 * registerCandidate() function. Students register themselves on-chain during
 * the Registration phase using their identity Merkle proof. Admin approval
 * in the backend still marks the application as approved in the database,
 * but the on-chain registration step is performed by the candidate.
 */
export default function RegisterCandidate() {
  const { success } = useToast();

  const handleCopyGuidance = () => {
    const text = `Candidate registration is now self-service.

Students must:
1. Apply via the student portal
2. Wait for admin approval in the DB
3. Self-register on-chain during the Registration phase using their identity Merkle proof

The contract function is: registerCandidate(guid, name, year, isFemale, imageCID, position, proof)`;
    navigator.clipboard.writeText(text);
    success("Guidance copied to clipboard");
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <SectionHeader
        icon="ℹ️"
        title="Candidate Registration"
        subtitle="Self-Service Flow"
      />

      <div className="rounded-xl border border-app bg-app-input p-5 space-y-4">
        <p className="text-sm text-app-muted">
          Candidates now <strong className="text-app-heading">self-register on-chain</strong>.
          The admin no longer adds candidates directly.
        </p>

        <ol className="list-decimal list-inside text-sm text-app-muted space-y-2 pl-1">
          <li>Student applies via the portal</li>
          <li>Admin approves the application in the database</li>
          <li>Student calls <code className="text-emerald-400 font-mono text-xs">registerCandidate()</code> on-chain during the Registration phase</li>
        </ol>

        <p className="text-sm text-app-muted">
          The contract verifies the student&apos;s identity (name, year, gender) against the identity Merkle tree.
          Only the <strong className="text-app-heading">GUID and position</strong> are provided by the student;
          all other details come from the verified Merkle leaf.
        </p>

        <button
          onClick={handleCopyGuidance}
          className="btn-primary w-full py-3"
        >
          <span>📋 Copy Guidance</span>
        </button>
      </div>
    </div>
  );
}
