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
    if (!this.isCertificate(content)) {
      throw new Error("The certificate is invalid.");
    }
    return content;
  }
  async uploadCertificateToIpfs(certificate) {
    if (!this.isCertificate(certificate)) {
      throw new Error("The certificate is invalid.");
    }
    const json = JSON.stringify(certificate);
    const cid = await this.ipfs.add(json);
    return {
      cid: cid.path,
      certificate,
    };
  }
  async signCertificate(privateKey, certificate) {
    const { cid } = await this.uploadCertificateToIpfs(certificate);
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
  isCertificate(certificate) {
    if (
      certificate.context === undefined || certificate.context === null
      || Object.prototype.toString.call(certificate.context) !== "[object Object]"
      || typeof certificate.from !== "string"
      || typeof certificate.to !== "string"
      || typeof certificate.issued_at !== "number"
      || typeof certificate.title !== "string"
      || typeof certificate.description !== "string"
      || typeof certificate.image !== "string"
      || typeof certificate.url !== "string"
    ) {
      return false;
    }
    return true;
  }
}


module.exports = GxCertClient;
