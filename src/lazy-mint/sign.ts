import { signTypedData_v4 } from "eth-sig-util"
import { privateToAddress } from "ethereumjs-util"
import { web3 } from "./script"

export type TypedData = Array<Record<string, any>>;
const DOMAIN_TYPE: TypedData = [
  {
    type: "string",
    name: "name"
  },
  {
    type: "string",
    name: "version"
  },
  {
    type: "uint256",
    name: "chainId"
  },
  {
    type: "address",
    name: "verifyingContract"
  }
];

export type DomainData = {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
};

export function createTypeData(
  domainData: DomainData,
  primaryType: string,
  message: any,
  types: Record<string, TypedData>
) {
  return {
    types: Object.assign(
      {
        EIP712Domain: DOMAIN_TYPE
      },
      types
    ),
    domain: domainData,
    primaryType: primaryType,
    message: message
  };
}

// @ts-ignore
const privateKey: { value: string } = {value: ''}

export async function signTypedData(from: string, data: any) {
  if (privateKey.value) {
    const account = extractAddress(privateKey.value)
    if (from !== account) {
      throw new Error("account error")
    }
    return signTypedData_v4(Buffer.from(privateKey.value, "hex"), { data })
  } else {
    const msgData = JSON.stringify(data);
    return (await new Promise<any>((resolve, reject) => {
      function cb(err: any, result: any) {
        if (err) return reject(err);
        if (result.error) return reject(result.error);
        const sig = result.result;
        const sig0 = sig.substring(2);
        const r = "0x" + sig0.substring(0, 64);
        const s = "0x" + sig0.substring(64, 128);
        const v = parseInt(sig0.substring(128, 130), 16);
        resolve({ data, sig, v, r, s });
      }

      // @ts-ignore
      return web3.currentProvider.sendAsync({
        method: "eth_signTypedData_v4",
        params: [from, msgData],
        from
      }, cb);
    })).sig
  }
}

function extractAddress(privateKey: string) {
  return `0x${privateToAddress(Buffer.from(privateKey, "hex")).toString("hex")}`
}

export async function getAccount(): Promise<string> {
  if (privateKey.value) {
    return extractAddress(privateKey.value)
  } else {
    const [from] = await web3.eth.getAccounts()
    return from
  }
}
