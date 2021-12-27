# Rarible Protocol Ethereum SDK React Example

What we have done in this example:

- Configure Rarible Protocol Ethereum SDK
- Create Lazy Minting NFT item
- Create sell order
- Purchase (buy item) an order
- Get your own NFT from your current wallet

In this example we're using [Metamask](https://metamask.io/) wallet to interact with ethereum blockchain.

## Install

1. Clone repository
2. Install dependencies in the project folder:

    ```shell
    yarn
    ```

3. Start application:

    ```shell
    yarn start
    ```

The application is available at [http://localhost:3000](http://localhost:3000)

## Configuring

We use a simple non-styled .tsx template and local state management for this example. Full example of app you can find
in `src/` folder in the repository's root in App.tsx and Dashboard.tsx components.

Function `handleInit` in the App.tsx check the presence of the Metamask provider in the browser and create an instance of the SDK.

```typescript
function handleInit() {
	const { ethereum } = window as any
	if (ethereum && ethereum.isMetaMask) {
		console.log('Ethereum successfully detected!')
		setProvider(ethereum)

		// add listener on accountsChanged event to render actual address
		ethereum.on('accountsChanged', setAccounts)
		// configure web3
		const web3 = new Web3(ethereum)
		// configure raribleSdk
		const raribleSdk = createRaribleSdk(new Web3Ethereum({ web3 }), "rinkeby")
		setSdk(raribleSdk)
		// set current account if already connected
		web3.eth.getAccounts().then(e => {
			setAccounts(e)
		})
	} else {
		console.log('Please install MetaMask!')
	}
}
```

This hook will be launched when the App component is mounted. It also checks for the
presence of the provider object in the browser and runs the previously created `handleInit` function if it exists.

```typescript
useEffect(() => {
	if ((window as any).ethereum) {
		handleInit()
	} else {
		window.addEventListener('ethereum#initialized', handleInit, {
			once: true,
		})
		setTimeout(handleInit, 3000) // 3 seconds
	}

}, [])
```

## Mint NFT Items

We can mint ERC-721 or ERC-1155 NFT items through Rarible Protocol Ethereum SDK, and both of them can be minted "on-chain" or "off-chain" (
lazy minting).

The code below shows how you can mint nft token using SDK. Full component code example located in `src/Dashboard.tsx`

```typescript
type MintForm = {
	id: string,
	type: NftCollection_Type,
	isLazySupported: boolean,
	isLazy: boolean,
	loading: boolean
}

const mintFormInitial: MintForm = {
	id: "0x6ede7f3c26975aad32a475e1021d8f6f39c89d82", // default collection on "rinkeby" that supports lazy minting
	type: NftCollectionType.ERC721,
	isLazy: true,
	isLazySupported: true,
	loading: false,
}

const Dashboard: React.FC<DashboardProps> = ({ provider, sdk, accounts }) => {
	const [collection, setCollection] = useState<MintForm>(mintFormInitial)
	const [ownedItems, setOwnedItems] = useState<NftItem[]>()
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

	const mint = async () => {
		let tokenId: string
		const nftCollection = await sdk.apis.nftCollection.getNftCollectionById({ collection: collection.id })
		if (isErc721v3Collection(nftCollection)) {
			const resp = await sdk.nft.mint({
				collection: nftCollection,
				uri: "ipfs://ipfs/QmWLsBu6nS4ovaHbGAXprD1qEssJu4r5taQfB74sCG51tp",
				creators: [{ account: toAddress(accounts[0]), value: 10000 }],
				royalties: [],
				lazy: collection.isLazy,
			})
			tokenId = resp.tokenId
		} else if (isErc1155v2Collection(nftCollection)) {
			const resp = await sdk.nft.mint({
				collection: nftCollection,
				uri: "/ipfs/QmWLsBu6nS4ovaHbGAXprD1qEssJu4r5taQfB74sCG51tp",
				creators: [{ account: toAddress(accounts[0]), value: 10000 }],
				royalties: [],
				supply: 1,
				lazy: collection.isLazy,
			})
			tokenId = resp.tokenId
		} else if (isErc721v2Collection(nftCollection)) {
			const resp = await sdk.nft.mint({
				collection: nftCollection,
				uri: "/ipfs/QmWLsBu6nS4ovaHbGAXprD1qEssJu4r5taQfB74sCG51tp",
				royalties: [],
			})
			tokenId = resp.tokenId
		} else if (isErc1155v1Collection(nftCollection)) {
			const resp = await sdk.nft.mint({
				collection: nftCollection,
				uri: "/ipfs/QmWLsBu6nS4ovaHbGAXprD1qEssJu4r5taQfB74sCG51tp",
				royalties: [],
				supply: 1,
			})
			tokenId = resp.tokenId
		} else if (isErc721v1Collection(nftCollection)) {
			const resp = await sdk.nft.mint({
				collection: nftCollection,
				uri: "/ipfs/QmWLsBu6nS4ovaHbGAXprD1qEssJu4r5taQfB74sCG51tp",
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
```

## Create Sell Order

The function below creates Sell Order from minted NFT.

```typescript
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
		const resultOrder = await sdk.order.sell(request)
		if (resultOrder) {
			setPurchaseOrderForm({ ...purchaseOrderForm, hash: resultOrder.hash })
		}
	}
}
```

## Buy item (fill sell order)

```typescript
const handlePurchaseOrder = async () => {
	const order = await sdk.apis.order.getOrderByHash({ hash: purchaseOrderForm.hash })
	switch (order.type) {
		case "RARIBLE_V1":
			await sdk.order.buy({ order, amount: parseInt(purchaseOrderForm.amount), originFee: 0 })
			break;
		case "RARIBLE_V2":
			await sdk.order.buy({ order, amount: parseInt(purchaseOrderForm.amount) })
			break;
		case "OPEN_SEA_V1":
			await sdk.order.buy({ order, amount: parseInt(purchaseOrderForm.amount) })
			break;
		default:
			throw new Error(`Unsupported order : ${JSON.stringify(order)}`)
	}
}
```

`sdk.order.buy` takes the `order` object (which we got in the previous step) and the `amount` to buy as arguments, and
returns hash of the  transaction.

## Get your own NFT from your current wallet

```typescript
const handleGetMyNfts = async () => {
	const items = await sdk.apis.nftItem.getNftItemsByOwner({ owner: accounts[0] })
	setOwnedItems(items?.items)
}
```

## Suggestions

You are welcome to [suggest features](https://github.com/rarible/protocol/discussions) and [report bugs found](https://github.com/rarible/protocol/issues)!

## License

Rarible Protocol Ethereum SDK React Example is available under [MIT License](LICENSE).
