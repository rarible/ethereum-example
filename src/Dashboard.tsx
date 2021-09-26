import { SellRequest } from "@rarible/protocol-ethereum-sdk/build/order/sell"
import React, { useState } from "react"
import { SimpleOrder } from "@rarible/protocol-ethereum-sdk/build/order/sign-order"
import {
	isLazyErc1155Collection,
	isLazyErc721Collection,
	isLegacyErc1155Collection,
	isLegacyErc721Collection,
	RaribleSdk,
} from "@rarible/protocol-ethereum-sdk"
import { toAddress, toBigNumber } from "@rarible/types"
import { NftCollection_Type, NftItem } from "@rarible/protocol-api-client"
import { debounce } from "./utils/debounce"
import { retry } from "./utils/retry"
import { toBN } from "web3-utils"

type CreateOrderFormState = {
	contract: string,
	tokenId: string,
	price: string,
	hash: string
}

type BuyOrderFormState = {
	hash: string,
	amount: string
}

type DashboardProps = {
	provider: any
	sdk: RaribleSdk
	accounts: string[]
}


type MintForm = { id: string, type: NftCollection_Type, isLazySupported: boolean, isLazy: boolean, loading: boolean }

const mintFormInitial: MintForm = {
	id: "0x6ede7f3c26975aad32a475e1021d8f6f39c89d82", // default collection on "rinkeby" that supports lazy minting
	type: "ERC721",
	isLazy: true,
	isLazySupported: true,
	loading: false,
}


const Dashboard: React.FC<DashboardProps> = ({ provider, sdk, accounts }) => {
	const [collection, setCollection] = useState<MintForm>(mintFormInitial)
	const [ownedItems, setOwnedItems] = useState<NftItem[]>()
	const [order, setOrder] = useState<SimpleOrder>()
	const [createOrderForm, setCreateOrderForm] = useState<CreateOrderFormState>({
		contract: '',
		tokenId: '',
		price: '10',
		hash: '',
	})
	const [purchaseOrderForm, setPurchaseOrderForm] = useState<BuyOrderFormState>({ hash: '', amount: '1' })
	/**
	 * Handle connect to wallet
	 */
	const connectWalletHandler = () => {
		provider.request({ method: 'eth_requestAccounts' })
	}

	async function buyGenArt() {
		const order = await sdk.apis.order.getOrderByHash({ hash: "0x8b2c609e8e20b19d2d656a4592a315b9fd04b09484aa619a586133a36e157264" })
		const ab = await sdk.order.fill(order, { amount: 1 })
		const tx = await ab.build().runAll()
		const receipt = await tx.wait()
		console.log(receipt)
		const ids = receipt.events
			.filter((e: any) => e.raw && e.raw.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef")
			.map((e: any) => e.raw.topics[3])
			.map((e: any) => toBN(e).toString(10))
		console.log("ids are", ids)
	}

	async function genArt() {
		const ab = await sdk.order.upsertOrder({
			maker: toAddress(accounts[0]),
			type: "RARIBLE_V2",
			make: {
				value: toBigNumber("10000"),
				assetType: {
					assetClass: "GEN_ART",
					contract: toAddress("0x375f8fa95573b48dcdab0f8836b0a19e8a430122")
				}
			},
			take: {
				value: toBigNumber("10000000"),
				assetType: {
					assetClass: "ETH"
				}
			},
			data: {
				"dataType": "RARIBLE_V2_DATA_V1",
				payouts: [],
				originFees: []
			},
			salt: toBigNumber("10")
		})
		const order = await ab.build().runAll()
		console.log("order is", order)
	}

	/**
	 * Mint Nft
	 */
	const mint = async () => {
		let tokenId: string
		const nftCollection = await sdk.apis.nftCollection.getNftCollectionById({ collection: collection.id })
		if (isLazyErc721Collection(nftCollection)) {
			const resp = await sdk.nft.mint({
				collection: nftCollection,
				uri: "/ipfs/QmWLsBu6nS4ovaHbGAXprD1qEssJu4r5taQfB74sCG51tp",
				creators: [{ account: toAddress(accounts[0]), value: 10000 }],
				royalties: [],
				lazy: collection.isLazy,
			})
			tokenId = resp.tokenId
		} else if (isLazyErc1155Collection(nftCollection)) {
			const resp = await sdk.nft.mint({
				collection: nftCollection,
				uri: "/ipfs/QmWLsBu6nS4ovaHbGAXprD1qEssJu4r5taQfB74sCG51tp",
				creators: [{ account: toAddress(accounts[0]), value: 10000 }],
				royalties: [],
				supply: toBigNumber('1'),
				lazy: collection.isLazy,
			})
			tokenId = resp.tokenId
		} else if (isLegacyErc721Collection(nftCollection)) {
			const resp = await sdk.nft.mint({
				collection: nftCollection,
				uri: "/ipfs/QmWLsBu6nS4ovaHbGAXprD1qEssJu4r5taQfB74sCG51tp",
				royalties: [],
			})
			tokenId = resp.tokenId
		} else if (isLegacyErc1155Collection(nftCollection)) {
			const resp = await sdk.nft.mint({
				collection: nftCollection,
				uri: "/ipfs/QmWLsBu6nS4ovaHbGAXprD1qEssJu4r5taQfB74sCG51tp",
				royalties: [],
				supply: 1,
			})
			tokenId = resp.tokenId
		} else {
			tokenId = ""
			console.log("Wrong collection")
		}

		if (tokenId) {
			/**
			 * Get minted nft through SDK
			 */
			if (collection.isLazySupported && !collection.isLazy) {
				await retry(30, async () => { // wait when indexer aggregate an onChain nft
						await getTokenById(tokenId)
					},
				)
			} else {
				await getTokenById(tokenId)
			}
		}
	}

	const getTokenById = async (tokenId: string) => {
		const token = await sdk.apis.nftItem.getNftItemById({ itemId: `0x6ede7f3c26975aad32a475e1021d8f6f39c89d82:${tokenId}` })
		if (token) {
			setCreateOrderForm({
				...createOrderForm,
				contract: token.contract,
				tokenId: token.tokenId,
			})
		}
	}

	/**
	 * Create sell order from minted nft
	 */
	const createSellOrder = async () => {
		if (createOrderForm.contract && createOrderForm.tokenId && createOrderForm.price) {
			const request: SellRequest = {
				makeAssetType: {
					assetClass: collection.type,
					contract: toAddress(createOrderForm.contract),
					tokenId: toBigNumber(createOrderForm.tokenId),
				},
				amount: 1,
				maker: toAddress(accounts[0]),
				originFees: [],
				payouts: [],
				price: createOrderForm.price,
				takeAssetType: { assetClass: "ETH" },
			}
			// Create an order
			const resultOrder = await sdk.order.sell(request).then(a => a.build().runAll())
			if (resultOrder) {
				setOrder(resultOrder)
				setPurchaseOrderForm({ ...purchaseOrderForm, hash: resultOrder.hash })
			}
		}
	}

	/**
	 * Buy order
	 */
	const handlePurchaseOrder = async () => {
		if (order) {
			await sdk.order.fill(order, { amount: parseInt(purchaseOrderForm.amount) }).then(a => a.build().runAll())
		}
	}

	/**
	 * Handle get NFT's owned by connected wallet
	 */
	const handleGetMyNfts = async () => {
		const items = await sdk.apis.nftItem.getNftItemsByOwner({ owner: accounts[0] })
		setOwnedItems(items?.items)
	}

	/**
	 * debounce function for define collection type by collection id(contract address)
	 */
	const searchType = debounce(async (collectionAddress: string) => {
		if (collectionAddress) {
			setCollection(prevState => ({ ...prevState, loading: true }))
			const collectionResponse = await sdk.apis.nftCollection.getNftCollectionById({ collection: collectionAddress })
			setCollection(prevState => ({
				...prevState,
				type: collectionResponse.type,
				isLazySupported: collectionResponse.features.includes("MINT_AND_TRANSFER"), // check if it supports lazy minting
				loading: false,
			}))
		}
	}, 500)

	/**
	 * input handlers
	 */
	const handleChangeCollection = async (e: React.FormEvent<HTMLInputElement>) => {
		const value = e.currentTarget.value
		setCollection(prevState => ({ ...prevState, id: value }))
		if (value) {
			await searchType(value)
		}
	}
	const handleChangeLazy = (e: React.FormEvent<HTMLInputElement>): void => {
		setCollection(prevState => ({ ...prevState, isLazy: !prevState.isLazy }))
	}
	const handleChangeOrderContract = (e: React.FormEvent<HTMLInputElement>): void => {
		setCreateOrderForm({ ...createOrderForm, contract: e.currentTarget.value })
	}
	const handleChangeOrderTokenId = (e: React.FormEvent<HTMLInputElement>): void => {
		setCreateOrderForm({ ...createOrderForm, tokenId: e.currentTarget.value })
	}
	const handleChangeOrderPrice = (e: React.FormEvent<HTMLInputElement>): void => {
		setCreateOrderForm({ ...createOrderForm, price: e.currentTarget.value })
	}
	const handleOrderHash = (e: React.FormEvent<HTMLInputElement>): void => {
		setPurchaseOrderForm({ ...purchaseOrderForm, hash: e.currentTarget.value })
	}
	const handlePurchaseOrderAmount = (e: React.FormEvent<HTMLInputElement>): void => {
		setPurchaseOrderForm({ ...createOrderForm, amount: e.currentTarget.value })
	}
	return (
		<div className="App">
			<div>
				<button onClick={connectWalletHandler} disabled={!!provider?.selectedAddress}>
					{accounts.length ? 'Connected' : 'Connect wallet'}
				</button>
				{accounts.length && <span>Connected address: {accounts[0]}</span>}
				<hr/>
				<div style={{ padding: '4px' }}>
					<p>Mint item form</p>
					<input onChange={handleChangeCollection} value={collection.id}
								 placeholder="Collection (contract address)"/>
					<p>collection type: {collection.loading ? "..." : collection.type}</p>
					{collection.isLazySupported && <p>Lazy?&nbsp;
              <input type="checkbox" onChange={handleChangeLazy} checked={collection.isLazy}/>
              &nbsp;&nbsp;
          </p>}
					<button onClick={mint}>mint</button>
					<button onClick={genArt}>gen-art</button>
					<button onClick={buyGenArt}>buy-gen-art</button>
				</div>
				<hr/>
			</div>

			<div style={{ padding: '4px' }}>
				<p>Create sell order form</p>
				<input onChange={handleChangeOrderContract} value={createOrderForm?.contract}
							 placeholder={"Contract address"}/>
				<input onChange={handleChangeOrderTokenId} value={createOrderForm?.tokenId} placeholder={"Token Id"}/>
				<input onChange={handleChangeOrderPrice} value={createOrderForm?.price} placeholder={"Price"}/>
				<button onClick={createSellOrder}>
					Sell
				</button>
			</div>
			<hr/>
			<div style={{ padding: '4px' }}>
				<p>Purchase created order form</p>
				<input onChange={handleOrderHash} value={purchaseOrderForm.hash} placeholder={'Order hash'}/>
				<input onChange={handlePurchaseOrderAmount} value={purchaseOrderForm.amount} placeholder={'amount'}/>
				<button onClick={handlePurchaseOrder}>Purchase</button>
			</div>
			<hr/>
			<div>
				<p>NFT items owned by me: <button onClick={handleGetMyNfts}>Refresh</button></p>
				<ul>
					{ownedItems?.length && ownedItems.map(i => {
						return (
							<li key={i.id}>
								<p><strong>Item</strong> id: {i.id}</p>
								<p><strong>Lazy supply:</strong> {i.lazySupply}</p>
							</li>
						)
					})}
				</ul>
			</div>
		</div>
	)
}

export default Dashboard
