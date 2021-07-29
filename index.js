const IPFS = require("ipfs-core");
const { sha3num } = require("solidity-sha3");
const EthUtil = require("ethereumjs-util");

class GxCertClient {
  constructor(web3) {
    this.ipfs = null;
    this.web3 = web3;
  }
  async init() {
    this.ipfs = await IPFS.create();
  }
  async getFile(cid) {
    const content = [];
    for await (const file of this.ipfs.get(cid)) {
      if (!file.content) continue;
      const content = [];
      for await (const chunk of file.content) {
        content.push(chunk);
      }
      return content.toString();
    }
  }
  async getCertificate(cid) {
    const content = JSON.parse(await this.getFile(cid));
    if (typeof content.from !== "string"
      || typeof content.to !== "string"
      || typeof content.date !== "number"
      || typeof content.title !== "string"
      || typeof content.description !== "string") {
      throw new Error("Invalid Certificate Object");
    }
    return content;
  }
  async uploadCertificateToIpfs(from, to, date, title, description) {
    const certificate = this.createCertificate(from, to, date, title, description);
    const json = JSON.stringify(certificate);
    const cid = await this.ipfs.add(json);
    return {
      cid: cid.path,
      certificate,
    };
  }
  async signCertificate(privateKey, from, to, date, title, description) {
    const { cid, certificate } = await this.uploadCertificateToIpfs(from, to, date, title, description);
    const hash = sha3num(cid);
    const signature = this.web3.eth.accounts.sign(
      hash,
      privateKey,
    );
    return {
      signature,
      cidHash: hash,
      cid,
      certificate,
    }
  }
  createCertificate(from, to, date, title, description) {
    if (typeof from !== "string"
      || typeof to !== "string"
      || typeof date !== "number"
      || typeof title !== "string"
      || typeof description !== "string") {
      throw new Error("Invalid Certificate Object");
    }
    return {
      from,
      to,
      date,
      title,
      description,
    }
  }
}


module.exports = GxCertClient;
