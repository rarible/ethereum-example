# Rarible protocol ethereum sdk react example

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
yarn add web3
yarn add -D @rarible/protocol-ethereum-sdk
```

```create-react-app``` - creates blank react app project. Learn more about command options on their
github [CRA](https://github.com/facebook/create-react-app) repo

#### Configuring RaribleSDK

For this example we use simple non styled .tsx template and local state management. full example of `App.tsx` you can
find in `src/` folder in root of repository.

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
        const raribleSdk = createRaribleSdk(web3, 'rinkeby')
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

#### Create Lazy mint NFT item

Now we need some nft object to interact with it. the code below shows how you can create lazy-mint ERC721 token nft
using SDK. Create a new async function inside our App.tsx component called `lazyMint`

```typescript
const lazyMint = async () => {
    const item = await sdk?.nft.mintLazy({
        '@type': 'ERC721', // type of NFT to mint
        contract: toAddress('0x509fd4cdaa29be7b1fad251d8ea0fca2ca91eb60'), // rinkeby default Rarible collection
        uri: "/ipfs/QmWLsBu6nS4ovaHbGAXprD1qEssJu4r5taQfB74sCG51tp", // tokenUri, url to media that nft stores
        creators: [{ account: toAddress(accounts[0]), value: 10000 }], // list of creators
        royalties: [], // royalties
    })
    if (item) {
        /**
         * Get minted nft through SDK
         */
        const token = await sdk?.apis.nftItem.getNftItemById({ itemId: item.id })

        if (token) {
            setCreateOrderForm({
                ...createOrderForm,
                contract: token.contract,
                tokenId: token.tokenId,
            })
        }
    }
}
```

What it's going on?

- `sdk.nft.mintLazy` - create lazy minted NFT token
- `sdk.apis.nftItem.getNftItemById` - returns the created token object by `itemId` from the server (there is no need to
  use it here because method `sdk.nft.mintLazy` returns the same object, we will use it for example only)

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
