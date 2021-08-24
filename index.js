const IpfsHttpClient = require("ipfs-http-client");
const { sha3num } = require("solidity-sha3");
const EthUtil = require("ethereumjs-util");
const Web3 = require("web3");
const web3 = new Web3();
const EthereumTx = require("ethereumjs-tx").Transaction;
const request = require("request");
const abi = require("./abi.json");
const BufferList = require("bl/BufferList");

class GxCertClient {
  constructor(web3, contractAddress, baseUrl) {
    this.ipfs = null;
    this.web3 = web3;
    this.contractAddress = contractAddress;
    this.baseUrl = baseUrl;
  }
  isInitialized() {
    return (this.ipfs !== undefined && this.contract !== undefined);
  }
  async init() {
    this.ipfs = IpfsHttpClient({
      host: "ipfs.infura.io",
      port: 5001,
      protocol: "https"
    });
    this.contract = await new this.web3.eth.Contract(abi, this.contractAddress);
  }
  sendSignedCertificateToGx(signed) {
    return new Promise((resolve, reject) => {
      const options = {
        uri: this.baseUrl + "/new",
        headers: {
          "Content-Type": "application/json"
        },
        json: signed,
      }
      request.post(options, (err, response, body) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
  async createGroup(name, address) {
    return new Promise((resolve, reject) => {
      const options = {
        uri: this.baseUrl + "/group",
        headers: {
          "Content-Type": "application/json"
        },
        json: {
          name,
          address,
        },
      }
      request.post(options, (err, response, body) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
  async inviteMemberToGroup(signedAddress) {
    return new Promise((resolve, reject) => {
      const options = {
        uri: this.baseUrl + "/group",
        headers: {
          "Content-Type": "application/json"
        },
        json: signedAddress,
      }
      request.post(options, (err, response, body) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
  async uploadImageToIpfs(imageBuf) {
    const cid = await this.ipfs.add(imageBuf);
    return cid.path;
  }
  async getFile(cid) {
    for await (const file of this.ipfs.get(cid)) {
      const content = new BufferList();
      for await (const chunk of file.content) {
        content.append(chunk);
      }
      return content.toString();
    }
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
  async getReceivedCert(address, index) {
    const response = await this.contract.methods.getReceivedCert(address, index).call();
    const cid = response[2];
    const certificate = JSON.parse(await this.getFile(cid));
    certificate.cid = cid;
    return certificate;
  }
  async getSentCert(groupId, index) {
    const response = await this.contract.methods.getSentCert(groupId, index).call();
    const cid = response[2];
    const certificate = JSON.parse(await this.getFile(cid));
    certificate.cid = cid;
    return certificate;
  }
  async getSentCerts(groupId) {
    const response = await this.contract.methods.getSentCerts(groupId).call();
    const certificates = [];
    const cids = response[2];
    for (const cid of cids) {
      const certificate = JSON.parse(await this.getFile(cid));
      certificate.cid = cid;
      if (this.isCertificate(certificate)) {
        certificates.push(certificate);
      }
    }
    return certificates;
  }
  async getReceivedCerts(address) {
    const response = await this.contract.methods.getReceivedCerts(address).call();
    const certificates = [];
    const cids = response[2];
    for (const cid of cids) {
      const certificate = JSON.parse(await this.getFile(cid));
      certificate.cid = cid;
      if (this.isCertificate(certificate)) {
        certificates.push(certificate);
      }
    }
    return certificates;
  }
  async getCertByCid(cid) {
    const response = await this.contract.methods.getCertByCid(cid).call();
    const certificate = JSON.parse(await this.getFile(cid));
    certificate.cid = cid;
    return certificate;
  }
  async getGroup(groupId) {
    const response = await this.contract.methods.getGroup(groupId).call();
    const group = {
      name: response[0],
      members: response[1],
    }
    return group;
  }
  async signMemberAddress(address, privateKey) {
    const hash = sha3num(address);
    let signature;
    if (privateKey) {
      signature = await this.web3.eth.accounts.sign(
        hash,
        privateKey,
      ).signature;
    } else {
      signature = await this.web3.eth.personal.sign(
        hash,
        certificate.from,
      );
    }
    return {
      signature,
      address,
      addressHash: hash,
    }
  }
  async signCertificate(certificate, privateKey) {
    const { cid } = await this.uploadCertificateToIpfs(certificate);
    const hash = sha3num(cid);
    let signature;
    if (privateKey) {
      signature = await this.web3.eth.accounts.sign(
        hash,
        privateKey,
      ).signature;
    } else {
      signature = await this.web3.eth.personal.sign(
        hash,
        certificate.from,
      );
    }
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
      || typeof certificate.groupId !== "number"
    ) {
      return false;
    }
    return true;
  }
}


module.exports = GxCertClient;
