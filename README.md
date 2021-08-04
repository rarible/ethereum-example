# Rarible protocol ethereum sdk react example

In this example we're using [Metamask](https://metamask.io/) wallet to interact with ethereum blockchain.

What we have done in this example:
- Configure RaribleSDK
- Mint NFT item (TODO: make it through SDK)
- Create sell order
- Purchase (buy item) an order


Lets start new react ts project and add dependencies
```shell
npx create-react-app protocol-example --template typescript
yarn add web3
yarn add -D @rarible/protocol-ethereum-sdk
```

```create-react-app``` - creates blank react app project. Learn more about command options on their github [CRA](https://github.com/facebook/create-react-app) repo


#### Configuring RaribleSDK

Let's create a new function in the App.tsx file named `handleInit`. Which serves to check the presence of the Metamask provider in the browser and create an instance of the SDK.
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
        // TODO replace 'network' to one of network types string like 'rinkeby'
        const raribleSdk = createRaribleSdk(web3, network)
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

Now we will create a hook that will be launched when the App component is mounted, and add to it a simple check for the presence of the provider object in the browser and run the previously created `handleInit` function if it exists.
```typescript
useEffect(() => {
    if ((window as any).ethereum) {
        handleInit();
    } else {
        window.addEventListener('ethereum#initialized', handleInit, {
            once: true,
        });
        setTimeout(handleInit, 3000); // 3 seconds
    }

}, [])
```

