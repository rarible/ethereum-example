# Rarible Protocol Ethereum SDK React Example

In this example we're using [Metamask](https://metamask.io/) wallet to interact with ethereum blockchain.

What we have done in this example:

- Configure RaribleSDK
- Create Lazy mint NFT item
- Create sell order
- Purchase (buy item) an order
- Get your own NFT from your current wallet

Lets start new react ts project and add dependencies

```shell
npx create-react-app protocol-example --template typescript

yarn add @rarible/protocol-ethereum-sdk@0.1.4 @ethereumjs/common@^2.4.0 @ethereumjs/tx@^3.3.0 @rarible/action@0.2.5 @rarible/protocol-api-client@0.1.4 ethereumjs-util@^7.1.0 tslib@^2.3.1 web3@1.2.11 web3-eth-contract@1.2.11 web3-utils@1.2.11 @rarible/types@0.1.2
```

```create-react-app``` - creates blank react app project. Learn more about command options on their
github [CRA](https://github.com/facebook/create-react-app) repo

#### Configuring RaribleSDK

For this example we use simple non styled .tsx template and local state management. full example of app you can find
in `src/` folder in root of repository in App.tsx and Dashboard.tsx components.

Let's create a new function in the App.tsx file named `handleInit`. Which serves to check the presence of the Metamask
provider in the browser and create an instance of the SDK.

```typescript
 function handleInit() {
    const { ethereum } = window as any;
    if (ethereum && ethereum.isMetaMask) {
        console.log('Ethereum successfully detected!');
        // set thereum provider into state to connet to wallet in next steps
        setProvider(ethereum) 

        // add listener on accountsChanged event to render actual address
        ethereum.on('accountsChanged', function (accounts: string[]) {
            setAccounts(accounts)
        });
        
        // configure web3
        const web3 = new Web3(ethereum)
        
        // configure raribleSdk
			const raribleSdk = createRaribleSdk(new Web3Ethereum({ web3 }), network)
        // set created Rarible SDK into state
        setSdk(raribleSdk)
        
        // set current account if already connected
        web3.eth.getAccounts().then(e => {
            setAccounts(e)
        })
    } else {
        console.log('Please install MetaMask!');
    }
}

```

Now we will create a hook that will be launched when the App component is mounted, and add to it a simple check for the
presence of the provider object in the browser and run the previously created `handleInit` function if it exists.

```typescript
useEffect(() => {
    if ((window as any).ethereum) {
        handleInit();
    } else {
        window.addEventListener('ethereum#initialized', handleInit, {
            once: true,
        });
        setTimeout(handleInit, 3000);
    }

}, [])
```

#### Mint NFT items

We can mint ERC721 or ERC1155 nft items through Rarible SDK, and both of it can be minted "on chain" of "off chain"(
lazy).

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
	type: "ERC721",
	isLazy: true,
	isLazySupported: true,
	loading: false,
}
...

const Dashboard: React.FC<DashboardProps> = ({ provider, sdk, accounts }) => {

	const [collection, setCollection] = useState<MintForm>(mintFormInitial)
...

...
	const mint = async () => {
		let tokenId: string
		const prepareCollection = {
			id: toAddress(collection.id),
			type: collection.type,
			supportsLazyMint: collection.isLazySupported,
		}
		if (isLazyErc721Collection(prepareCollection)) {
			tokenId = await sdk.nft.mint({
				collection: prepareCollection,
				uri: "/ipfs/QmWLsBu6nS4ovaHbGAXprD1qEssJu4r5taQfB74sCG51tp",
				creators: [{ account: toAddress(accounts[0]), value: 10000 }],
				royalties: [],
				lazy: collection.isLazy,
			})
		} else if (isLazyErc1155Collection(prepareCollection)) {
			tokenId = await sdk.nft.mint({
				collection: prepareCollection,
				uri: "/ipfs/QmWLsBu6nS4ovaHbGAXprD1qEssJu4r5taQfB74sCG51tp",
				creators: [{ account: toAddress(accounts[0]), value: 10000 }],
				royalties: [],
				supply: toBigNumber('1'),
				lazy: collection.isLazy,
			})
		} else if (isLegacyErc721Collection(prepareCollection)) {
			tokenId = await sdk.nft.mint({
				collection: prepareCollection,
				uri: "/ipfs/QmWLsBu6nS4ovaHbGAXprD1qEssJu4r5taQfB74sCG51tp",
				royalties: [],
			})
		} else if (isLegacyErc1155Collection(prepareCollection)) {
			tokenId = await sdk.nft.mint({
				collection: prepareCollection,
				uri: "/ipfs/QmWLsBu6nS4ovaHbGAXprD1qEssJu4r5taQfB74sCG51tp",
				royalties: [],
				supply: 1,
			})
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

#### Create sell order

Function below creates a order for sale.

```typescript
const createSellOrder = async () => {
    if (createOrderForm.contract && createOrderForm.tokenId && createOrderForm.price) {
    	
        // Create an order
        const resultOrder = await sdk?.order.sell(
            {
                makeAssetType: {
                    assetClass: "ERC721",
                    contract: toAddress(createOrderForm.contract),
                    tokenId: toBigNumber(createOrderForm.tokenId),
                }, // asset type, must includes contract address and tokenId
                amount: 1, // amount to sell, in our case for ERC721 always will be 1
                maker: toAddress(accounts[0]), // who sell an item
                originFees: [], // fees description
                payouts: [], // payouts
                price: toBigNumber(createOrderForm.price),
                takeAssetType: { assetClass: "ETH" }, // for what currency
            }
        ).then(a => a.runAll())
      
      if (resultOrder) {
            setOrder(resultOrder)
            setPurchaseOrderForm({ ...purchaseOrderForm, hash: resultOrder.hash })
        }
    }
}
```

#### Purchase (buy item) an order

```typescript
const handlePurchaseOrder = async () => {
    if (order) {
        await sdk?.order.fill(order, { amount: parseInt(purchaseOrderForm.amount) }).then(a => a.runAll())
    }
}
```

`sdk.order.fill` takes the `order` object (which we got in the previous step) and the `amount` to buy as arguments, and
returns hash of transaction

#### Get your own NFT from your current wallet

```typescript
const handleGetMyNfts = async () => {
    const items = await sdk?.apis.nftItem.getNftItemsByOwner({ owner: accounts[0] })
    setOwnedItems(items?.items)
}
```

## Suggestions

You are welcome to [suggest features](https://github.com/rarible/protocol/discussions) and [report bugs found](https://github.com/rarible/protocol/issues)!

## License

Rarible Protocol Ethereum SDK React Example is available under [MIT License](LICENSE).
