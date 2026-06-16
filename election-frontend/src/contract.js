import { ethers } from "ethers";
import ABI from "./abi/Election.json";
import { CONTRACT_ADDRESS } from "./config";


export async function getContract(){

    const provider =
        new ethers.BrowserProvider(window.ethereum);


    const signer =
        await provider.getSigner();


    const contract =
        new ethers.Contract(
            CONTRACT_ADDRESS,
            ABI.abi,
            signer
        );


    return contract;
}