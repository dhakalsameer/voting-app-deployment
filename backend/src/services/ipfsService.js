import axios from "axios";
import FormData from "form-data";
import { config } from "../config/env.js";

export async function uploadToIPFS(fileBuffer, fileName) {
  const form = new FormData();
  form.append("file", fileBuffer, { filename: fileName });

  const res = await axios.post(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    form,
    {
      headers: {
        ...form.getHeaders(),
        pinata_api_key: config.pinataKey,
        pinata_secret_api_key: config.pinataSecret,
      },
    }
  );

  return res.data.IpfsHash;
}
