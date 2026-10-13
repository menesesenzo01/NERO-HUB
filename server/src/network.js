import os from 'node:os';

// Adaptadores virtuais (WSL, Hyper-V, VirtualBox, VPN...) não são alcançáveis pelo celular.
const VIRTUAL = /(vethernet|virtualbox|vmware|hyper-v|wsl|docker|loopback|tailscale|zerotier|vpn|bluetooth)/i;

function score(address, name) {
  let s = 0;
  if (address.startsWith('192.168.')) s += 30;
  else if (address.startsWith('10.')) s += 20;
  else if (/^172\.(1[6-9]|2\d|3[01])\./.test(address)) s += 10;
  if (/(wi-?fi|wlan|wireless)/i.test(name)) s += 5;
  if (/(ethernet|eth|en\d)/i.test(name)) s += 3;
  if (VIRTUAL.test(name)) s -= 100;
  return s;
}

/** Lista os IPv4 da máquina na rede local, o mais provável primeiro. */
export function getLanAddresses() {
  const list = [];
  for (const [name, entries] of Object.entries(os.networkInterfaces())) {
    for (const e of entries ?? []) {
      if (e.family !== 'IPv4' && e.family !== 4) continue;
      if (e.internal || e.address.startsWith('169.254.')) continue;
      list.push({ name, address: e.address, virtual: VIRTUAL.test(name), score: score(e.address, name) });
    }
  }
  return list.sort((a, b) => b.score - a.score);
}

const LOCAL = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/** Verdadeiro quando a requisição vem do próprio PC (localhost ou um IP da máquina). */
export function isLocalRequest(ip) {
  if (LOCAL.has(ip)) return true;
  const clean = ip.replace(/^::ffff:/, '');
  return getLanAddresses().some((a) => a.address === clean);
}
