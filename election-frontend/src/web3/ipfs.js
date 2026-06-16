import axios from "axios";

const PINATA_API_KEY = "4776f3188c16583323c5";
const PINATA_SECRET = "7b40ef23108de5d06916b37fab3daa8093fc6ab3912ab1cb441fb44f1ef74a7b";

export async function uploadToIPFS(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await axios.post(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET
      }
    }
  );

  const cid = res.data.IpfsHash;
  return cid;
}