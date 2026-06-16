# Smart Contract DVoting

A decentralized voting system built with Foundry, featuring secure candidate registration, voter verification, and multi-position voting (President, Secretary, General Members).

## Features
- **Admin Controls**: Manage election states (Draft, Registration, Voting, Ended).
- **Candidate Registration**: Register candidates with details like name, student ID, and IPFS image CID.
- **Voter Verification**: Secure registration and admin-led verification.
- **Robust Voting**: Supports voting for President, Secretary, and 7 General Members in a single transaction.

## Foundry Details
Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```
