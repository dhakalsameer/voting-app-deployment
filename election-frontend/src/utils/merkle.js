import { MerkleTree } from "merkletreejs";
import { ethers } from "ethers";
import { Buffer } from "buffer";

function keccak256(input) {
  return Buffer.from(ethers.keccak256(input).slice(2), "hex");
}

/**
 * Generates a Merkle Proof for a wallet given a list of all eligible wallets.
 * @param {string[]} allWallets 
 * @param {string} targetWallet 
 * @returns {string[]} The Merkle Proof
 */
export function getProof(allWallets, targetWallet) {
  if (!allWallets || allWallets.length === 0) return [];
  
  const leaves = allWallets.map((addr) =>
    keccak256(ethers.solidityPacked(["address"], [ethers.getAddress(addr)]))
  );

  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });

  const leaf = keccak256(
    ethers.solidityPacked(["address"], [ethers.getAddress(targetWallet)])
  );

  return tree.getHexProof(leaf);
}

/**
 * Validates a Merkle Root against a list of wallets.
 * @param {string[]} allWallets 
 * @returns {string} The Merkle Root
 */
export function getRoot(allWallets) {
  if (!allWallets || allWallets.length === 0) return ethers.ZeroHash;

  const leaves = allWallets.map((addr) =>
    keccak256(ethers.solidityPacked(["address"], [ethers.getAddress(addr)]))
  );

  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  return tree.getHexRoot();
}
