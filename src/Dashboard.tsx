import { toAddress, toBigNumber } from "@rarible/types"
import { SellRequest } from "@rarible/protocol-ethereum-sdk/build/order/sell"
import React, { useState } from "react"
import { NftItem } from "@rarible/protocol-api-client"
import { SimpleOrder } from "@rarible/protocol-ethereum-sdk/build/order/sign-order"
import { RaribleSdk } from "@rarible/protocol-ethereum-sdk"

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

const Dashboard: React.FC<DashboardProps> = ({ provider, sdk, accounts }) => {
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

	/**
	 * Mint Nft
	 */
	const lazyMint = async () => {
		const item = await sdk.nft.mintLazy({
			'@type': 'ERC721',
			contract: toAddress('0x6ede7f3c26975aad32a475e1021d8f6f39c89d82'), // rinkeby default Rarible collection
			uri: "/ipfs/QmWLsBu6nS4ovaHbGAXprD1qEssJu4r5taQfB74sCG51tp",
			creators: [{ account: toAddress(accounts[0]), value: 10000 }],
			royalties: [],
		})
		if (item) {
			/**
			 * Get minted nft through SDK
			 */
			const token = await sdk.apis.nftItem.getNftItemById({ itemId: item.id })
			if (token) {
				setCreateOrderForm({
					...createOrderForm,
					contract: token.contract,
					tokenId: token.tokenId,
				})
			}
		}
	}

	/**
	 * Create sell order from minted nft
	 */
	const createSellOrder = async () => {
		if (createOrderForm.contract && createOrderForm.tokenId && createOrderForm.price) {
			const request: SellRequest = {
				makeAssetType: {
					assetClass: "ERC721",
					contract: toAddress(createOrderForm.contract),
					tokenId: toBigNumber(createOrderForm.tokenId),
				},
				amount: 1,
				maker: toAddress(accounts[0]),
				originFees: [],
				payouts: [],
				price: toBigNumber(createOrderForm.price),
				takeAssetType: { assetClass: "ETH" },
			}
			// Create an order
			const resultOrder = await sdk.order.sell(request).then(a => a.runAll())
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
			await sdk.order.fill(order, { amount: parseInt(purchaseOrderForm.amount) }).then(a => a.runAll())
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
	 * input handlers
	 */
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
				<div style={{ padding: '4px' }}>
					<p>Mint item form (TODO)</p>
					<button onClick={lazyMint}>lazy mint</button>
				</div>
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

			<div style={{ padding: '4px' }}>
				<p>Purchase created order form</p>
				<input onChange={handleOrderHash} value={purchaseOrderForm.hash} placeholder={'Order hash'}/>
				<input onChange={handlePurchaseOrderAmount} value={purchaseOrderForm.amount} placeholder={'amount'}/>
				<button onClick={handlePurchaseOrder}>Purchase</button>
			</div>

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
