import React, { useEffect, useState } from 'react'
import Web3 from "web3"
import { createRaribleSdk, RaribleSdk } from "@rarible/protocol-ethereum-sdk"
import './App.css'
import Dashboard from "./Dashboard"
import { Web3Ethereum } from "@rarible/web3-ethereum"

const NETWORK = "rinkeby"

function App() {
	const [provider, setProvider] = useState<any>()
	const [sdk, setSdk] = useState<RaribleSdk>()
	const [accounts, setAccounts] = useState<string[]>([])

	/**
	 * Initialize SDK
	 */
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

	// Handle provider and set it to web3
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
			const raribleSdk = createRaribleSdk(new Web3Ethereum({ web3 }), NETWORK)
			setSdk(raribleSdk)
			// set current account if already connected
			web3.eth.getAccounts().then(e => {
				setAccounts(e)
			})
		} else {
			console.log('Please install MetaMask!')
		}
	}

	if (!provider?.isMetaMask) {
		return <strong>Please install metamask to use the app</strong>
	} else {
		if (sdk) {
			return <Dashboard provider={provider} sdk={sdk} accounts={accounts}/>
		} else {
			return <strong>Sdk not initialized</strong>
		}
	}


}

export default App
