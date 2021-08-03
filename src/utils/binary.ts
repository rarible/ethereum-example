declare const validBinary: unique symbol

export type Binary = string & {
    [validBinary]: true
}

export function toBinary(value: string): Binary {
    let hex: string
    if (value.startsWith("0x")) {
        hex = value.substring(2).toLowerCase()
    } else {
        hex = value.toLowerCase()
    }
    const re = /[0-9a-f]*/g
    if (re.test(hex)) {
        return `0x${hex}` as Binary
    } else {
        throw new Error(`not a binary: ${value}`)
    }
}

export function randomBinary(size: number): Binary {
    return `0x${Array.from(Array(size * 2))
        .map(() => Math.floor(Math.random() * 16).toString(16))
        .join("")}` as Binary
}