import { getContract } from "../contract";

export async function vote(presidentId, secretaryId, memberIds) {
  const contract = await getContract();

  const tx = await contract.vote(
    presidentId,
    secretaryId,
    memberIds
  );

  await tx.wait();
  alert("Vote submitted successfully!");
}