import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import { ethers } from "ethers";

/**
 * Generates a Merkle Root from an array of wallet addresses.
 * @param {string[]} wallets 
 * @returns {string} The Merkle Root (hex)
 */
export function generateMerkleRoot(wallets) {
  if (!wallets || wallets.length === 0) return ethers.ZeroHash;
  
  const leaves = wallets.map(addr => 
    keccak256(ethers.solidityPacked(["address"], [ethers.getAddress(addr)]))
  );
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  return tree.getHexRoot();
}

/**
 * Generates a Merkle Proof for a specific wallet address.
 * @param {string[]} allWallets 
 * @param {string} targetWallet 
 * @returns {string[]} The Merkle Proof (array of hex strings)
 */
export function generateMerkleProof(allWallets, targetWallet) {
  const leaves = allWallets.map(addr => 
    keccak256(ethers.solidityPacked(["address"], [ethers.getAddress(addr)]))
  );
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const leaf = keccak256(ethers.solidityPacked(["address"], [ethers.getAddress(targetWallet)]));
  return tree.getHexProof(leaf);
}

/**
 * Generates an Identity Merkle Root from an array of verified voter identities.
 * Leaf: keccak256(abi.encodePacked(address, name, year, isFemale))
 * @param {{address: string, name: string, year: number, isFemale: boolean}[]} identities
 * @returns {string} The Identity Merkle Root (hex)
 */
export function generateIdentityMerkleRoot(identities) {
  if (!identities || identities.length === 0) return ethers.ZeroHash;

  const leaves = identities.map(id =>
    keccak256(ethers.solidityPacked(
      ["address", "string", "uint8", "bool"],
      [ethers.getAddress(id.address), id.name, id.year, id.isFemale]
    ))
  );
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  return tree.getHexRoot();
}

/**
 * Generates an Identity Merkle Proof for a specific verified voter identity.
 * Leaf: keccak256(abi.encodePacked(address, name, year, isFemale))
 * @param {{address: string, name: string, year: number, isFemale: boolean}[]} allIdentities
 * @param {{address: string, name: string, year: number, isFemale: boolean}} targetIdentity
 * @returns {string[]} The Identity Merkle Proof (array of hex strings)
 */
export function generateIdentityMerkleProof(allIdentities, targetIdentity) {
  const leaves = allIdentities.map(id =>
    keccak256(ethers.solidityPacked(
      ["address", "string", "uint8", "bool"],
      [ethers.getAddress(id.address), id.name, id.year, id.isFemale]
    ))
  );
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const leaf = keccak256(ethers.solidityPacked(
    ["address", "string", "uint8", "bool"],
    [ethers.getAddress(targetIdentity.address), targetIdentity.name, targetIdentity.year, targetIdentity.isFemale]
  ));
  return tree.getHexProof(leaf);
}

/**
 * Generates a Merkle Root from an array of registration code pairs.
 * Leaf: keccak256(abi.encodePacked(studentId, code))
 * @param {{student_id: string, code: string}[]} regCodes
 * @returns {string} The Merkle Root (hex)
 */
function normalizeCode(code) {
  return code.replace(/-/g, "").toUpperCase();
}

export function generateRegCodeMerkleRoot(regCodes) {
  if (!regCodes || regCodes.length === 0) return ethers.ZeroHash;

  const leaves = regCodes.map(({ student_id, code }) =>
    keccak256(ethers.solidityPacked(["string", "string"], [student_id, normalizeCode(code)]))
  );
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  return tree.getHexRoot();
}

/**
 * Generates a Merkle Proof for a specific registration code pair.
 * @param {{student_id: string, code: string}[]} allRegCodes
 * @param {string} targetStudentId
 * @param {string} targetCode
 * @returns {string[]} The Merkle Proof (array of hex strings)
 */
export function generateRegCodeMerkleProof(allRegCodes, targetStudentId, targetCode) {
  const leaves = allRegCodes.map(({ student_id, code }) =>
    keccak256(ethers.solidityPacked(["string", "string"], [student_id, normalizeCode(code)]))
  );
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const leaf = keccak256(ethers.solidityPacked(["string", "string"], [targetStudentId, normalizeCode(targetCode)]));
  return tree.getHexProof(leaf);
}
