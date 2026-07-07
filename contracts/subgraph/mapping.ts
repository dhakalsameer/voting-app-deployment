import {
  VoteCast,
  BallotCast,
  CandidateRegistered,
  MerkleRootUpdated,
  IdentityMerkleRootUpdated,
  RegCodeMerkleRootUpdated,
  PhaseChanged,
  NewElectionStarted,
} from "./generated/Election3/Election3";
import { Vote, Candidate, ElectionMeta, ElectionResult } from "./generated/schema";
import { BigInt } from "@graphprotocol/graph-ts";

function getOrCreateMeta(): ElectionMeta {
  let meta = ElectionMeta.load("GLOBAL");
  if (!meta) {
    meta = new ElectionMeta("GLOBAL");
    meta.voterCount = BigInt.fromI32(0);
    meta.candidateCount = BigInt.fromI32(0);
  }
  return meta;
}

export function handleVoteCast(event: VoteCast): void {
  let vote = new Vote(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  vote.voter = event.params.voter;
  vote.candidateId = event.params.candidateId;
  vote.timestamp = event.block.timestamp;
  vote.txHash = event.transaction.hash;
  vote.blockNumber = event.block.number;
  vote.save();

  let candidateId = event.params.candidateId.toString();
  let candidate = Candidate.load(candidateId);
  if (candidate) {
    candidate.voteCount = candidate.voteCount.plus(BigInt.fromI32(1));
    candidate.save();
  }

  let meta = getOrCreateMeta();
  meta.voterCount = meta.voterCount.plus(BigInt.fromI32(1));
  meta.save();
}

export function handleCandidateRegistered(event: CandidateRegistered): void {
  let candidate = new Candidate(event.params.id.toString());
  candidate.blockchainId = event.params.id;
  candidate.name = event.params.name;
  candidate.position = event.params.position.toString();
  candidate.voteCount = BigInt.fromI32(0);
  candidate.save();

  let meta = getOrCreateMeta();
  meta.candidateCount = meta.candidateCount.plus(BigInt.fromI32(1));
  meta.save();
}

export function handleMerkleRootUpdated(event: MerkleRootUpdated): void {
  let meta = getOrCreateMeta();
  meta.merkleRoot = event.params.newRoot;
  meta.save();
}

export function handleIdentityMerkleRootUpdated(
  event: IdentityMerkleRootUpdated
): void {
  let meta = getOrCreateMeta();
  meta.identityMerkleRoot = event.params.newRoot;
  meta.save();
}

export function handleBallotCast(event: BallotCast): void {
  let vote = new Vote(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  vote.voter = event.params.voter;
  vote.candidateId = event.params.presId > BigInt.fromI32(0) ? event.params.presId : event.params.secId;
  vote.timestamp = event.block.timestamp;
  vote.txHash = event.transaction.hash;
  vote.blockNumber = event.block.number;
  vote.save();

  let meta = getOrCreateMeta();
  meta.voterCount = meta.voterCount.plus(BigInt.fromI32(1));
  meta.save();
}

export function handlePhaseChanged(event: PhaseChanged): void {}

export function handleRegCodeMerkleRootUpdated(event: RegCodeMerkleRootUpdated): void {
  let meta = getOrCreateMeta();
  meta.save();
}

export function handleNewElectionStarted(event: NewElectionStarted): void {
  let result = new ElectionResult(event.params.electionId.toString());
  result.index = event.params.electionId;
  result.presidentWinnerId = BigInt.fromI32(0);
  result.secretaryWinnerId = BigInt.fromI32(0);
  result.generalMemberWinnerId = BigInt.fromI32(0);
  result.totalCandidates = BigInt.fromI32(0);
  result.timestamp = event.block.timestamp;
  result.save();

  let meta = getOrCreateMeta();
  meta.voterCount = BigInt.fromI32(0);
  meta.candidateCount = BigInt.fromI32(0);
  meta.save();
}
