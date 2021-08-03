import { randomBinary } from "./binary"

declare const validAddress: unique symbol

export type Address = string & {
    [validAddress]: true
}

export function toAddress(value: string): Address {
    let hex: string
    if (value.startsWith("0x")) {
        hex = value.substring(2).toLowerCase()
    } else {
        hex = value.toLowerCase()
    }
    const re = /[0-9a-f]{40}/g
    if (re.test(hex)) {
        return `0x${hex}` as Address
    } else {
        throw new Error(`not an address: ${value}`)
    }
}

export const ZERO_ADDRESS: Address = "0x0000000000000000000000000000000000000000" as Address

export function randomAddress() {
    return randomBinary(20)
}