import net from 'node:net'; net.Socket.prototype.connect=()=>{throw Error('independent review denies network')}; globalThis.fetch=()=>{throw Error('independent review denies fetch')};
