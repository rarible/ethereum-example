import React, {useEffect, useState} from 'react';
import Web3 from "web3";
import {createRaribleSdk, RaribleSdk} from "@rarible/protocol-ethereum-sdk";
import {NftItem} from "@rarible/protocol-api-client/build/models";
import {testSignAndCreateLazyMint} from "./lazy-mint/script";
import {retry} from "./utils/retry";
import { toAddress, toBigNumber } from "@rarible/types"
import {SellRequest} from "@rarible/protocol-ethereum-sdk/build/order/sell";
import {network} from "./config";
import './App.css';
import {SimpleOrder} from "@rarible/protocol-ethereum-sdk/build/order/sign-order";

type CreateOrderFormState = {
    contract: string,
    tokenId: string,
    price: number,
    hash: string
}

type BuyOrderFormState = {
    hash: string,
    amount: string
}

function App() {
    const [provider, setProvider] = useState<any>()
    const [accounts, setAccounts] = useState<string[]>([])
    const [sdk, setSdk] = useState<RaribleSdk>()
    const [mintedNft, setMintedNft] = useState<NftItem>()
    const [order, setOrder] = useState<SimpleOrder>()
    const [createOrderForm, setCreateOrderForm] = useState<CreateOrderFormState>({contract: '', tokenId: '', price: 10, hash: ''})
    const [purchaseOrderForm, setPurchaseOrderForm] = useState<BuyOrderFormState>({hash: '', amount: '1'})

    /**
     * Handle provider and set it to web3
     * Initialize SDK
     */
    useEffect(() => {
        if ((window as any).ethereum) {
            handleEthereum();
            setProvider((window as any).ethereum)
            let web3 = new Web3((window as any).ethereum)
            setSdk(createRaribleSdk(web3, network))
            web3.eth.getAccounts().then(e => {
                setAccounts(e)
            })
        } else {
            window.addEventListener('ethereum#initialized', handleEthereum, {
                once: true,
            });
            setTimeout(handleEthereum, 3000); // 3 seconds
        }

    }, [])

    function handleEthereum() {
        const { ethereum } = window as any;
        if (ethereum && ethereum.isMetaMask) {
            console.log('Ethereum successfully detected!');
        } else {
            console.log('Please install MetaMask!');
        }
    }

    /**
     * Handle connect to wallet
     */
    const connectWalletHandler = () => {
        provider.request({ method: 'eth_requestAccounts' })
    }

    /**
     * Mint Nft
     */
    const lazyMint = () => {
        testSignAndCreateLazyMint()
            .then(async (x) => {
                setMintedNft(x)
                retry(30, async () => {
                    /**
                     * Get minted nft thru SDK
                     */
                    const token = await sdk?.apis.nftItem.getNftItemById({itemId: `${x?.id}:${x.owners[0]}`})
                    if (token) {
                        setCreateOrderForm({
                            ...createOrderForm,
                            contract: token.contract,
                            tokenId: token.tokenId,
                        })
                    }
                })
            })
            .catch(err => console.error("ERROR", err))
    }

    const handleChangeOrderContract = (e: React.FormEvent<HTMLInputElement>): void => {
        setCreateOrderForm({...createOrderForm, contract: e.currentTarget.value})
    }
    const handleChangeOrderTokenId = (e: React.FormEvent<HTMLInputElement>): void => {
        setCreateOrderForm({...createOrderForm, tokenId: e.currentTarget.value})
    }
    const handleChangeOrderPrice = (e: React.FormEvent<HTMLInputElement>): void => {
        setCreateOrderForm({...createOrderForm, price: +e.currentTarget.value})
    }

    /**
     * Create sell order from minted nft
     */
    const createSellOrder = async () => {
        if (createOrderForm.contract && createOrderForm.tokenId && createOrderForm.price) {
            console.log(mintedNft)
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
                price: createOrderForm.price,
                takeAssetType: {assetClass: "ETH"},
            }
            // Create an order
            const resultOrder = await sdk?.order.sell(request).then(a => a.runAll())
            if (resultOrder) {
                setOrder(resultOrder)
                setPurchaseOrderForm({...purchaseOrderForm, hash: resultOrder.hash})
            }
        }
    }

    /**
     * Buy order
     */
    const handlePurchaseOrder = async () => {
        if (order) {
            await sdk?.order.fill(order, { payouts: [], originFees: [], amount: parseInt(purchaseOrderForm.amount), infinite: true })
        }
    }

    return (
    <div className="App">
        <button onClick={connectWalletHandler} disabled={!!provider?.selectedAddress}>
        {accounts.length ? 'Connected' : 'Connect wallet'}
        </button>
        {accounts.length && <span>Connected address: {accounts[0]}</span>}
        <div style={{padding: '4px'}}><button onClick={lazyMint}>lazy mint</button></div>
        <div style={{padding: '4px'}}>
            <input onChange={e => handleChangeOrderContract(e)} value={createOrderForm?.contract} placeholder={"Contract address"}/>
            <input onChange={e => handleChangeOrderTokenId(e)} value={createOrderForm?.tokenId} placeholder={"Token Id"}/>
            <input onChange={e => handleChangeOrderPrice(e)} value={createOrderForm?.price} placeholder={"Price"}/>
            <button onClick={createSellOrder}>
                Sell erc721
            </button>
        </div>
        <div style={{padding: '4px'}}>
            <input value={purchaseOrderForm.hash} placeholder={'Order hash'}/>
            <input value={purchaseOrderForm.amount} placeholder={'amount'}/>
            <button onClick={handlePurchaseOrder}>Purchase</button>
        </div>
    </div>
    );
}

export default App;
