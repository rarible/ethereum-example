import { createTypeData, getAccount, signTypedData } from "./sign"
import { ERC1155Types, ERC721Types, LazyMint } from "./domain"

import Web3 from "web3"
import 'regenerator-runtime/runtime'
import axios from "axios"
import {baseURL} from "../config";

const provider = (window as any).ethereum
export const web3 = new Web3(provider)

export const client = axios.create({
	baseURL,
})

async function generateTokenId(type: "ERC721" | "ERC1155", minter: string): Promise<string> {
	console.log("generating tokenId for", getAddress(type), minter)
	const res = await client.get(`/protocol/v0.1/ethereum/nft/collections/${getAddress(type)}/generate_token_id?minter=${minter}`)
	return res.data.tokenId
}

async function putLazyMint(form: LazyMint) {
	const res = await client.post("/protocol/v0.1/ethereum/nft/mints", form)
	return res.data
}

export async function signAndPutLazyMint(form: Omit<LazyMint, "signatures">): Promise<any> {
	const signed = await signLazyMint(form)
	return putLazyMint(signed)
}

async function signLazyMint(form: Omit<LazyMint, "signatures">): Promise<LazyMint> {
	const signature = await signLazyMintMessage(
		form,
		form.creators[0].account,
		4,
		getAddress(form["@type"])
	);
	return { ...form, signatures: [signature] } as any
}

function getAddress(type: "ERC721" | "ERC1155"): string {
	// ropsten
	// return type === "ERC721" ? "0xB0EA149212Eb707a1E5FC1D2d3fD318a8d94cf05" : "0x6a94aC200342AC823F909F142a65232E2f052183"
	// rinkeby
	return type === "ERC721" ? "0x75fDbe19C2dc673384dDc14C9F453dB86F5f32E8" : "0x0cF0AAb68432a3710ECbf2f1b112a11cEe31a83C"

}

async function signLazyMintMessage(
	form: Omit<LazyMint, "signatures">,
	account: string,
	chainId: number,
	verifyingContract: string
) {
	const typeName = form["@type"] === "ERC721" ? "Mint721" : "Mint1155"
	const data = createTypeData(
		{
			name: typeName,
			version: "1",
			chainId,
			verifyingContract
		},
		typeName,
		{ ...form, tokenURI: form.uri },
		form["@type"] === "ERC721" ? ERC721Types : ERC1155Types
	);
	console.log("signing", data)
	return signTypedData(account, data);
}

export async function createTestLazyMint(): Promise<Omit<LazyMint, "signatures">> {
	const creator = await getAccount()
	console.log("creator is", creator)
	const tokenId = await generateTokenId("ERC721", creator)
	console.log("generated tokenId", tokenId)
	return {
		"@type": "ERC721",
		contract: getAddress("ERC721"),
		tokenId: tokenId,
		uri: "/ipfs/QmWLsBu6nS4ovaHbGAXprD1qEssJu4r5taQfB74sCG51tp",
		creators: [{ account: creator, value: "10000" }],
		royalties: []
	}
}

export async function testSignAndCreateLazyMint(): Promise<any> {
	const form = await createTestLazyMint()
	return await signAndPutLazyMint(form)
}
