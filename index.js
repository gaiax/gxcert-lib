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
  createCert(signed) {
    return new Promise((resolve, reject) => {
      const options = {
        uri: this.baseUrl + "/cert",
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
  createUserCert(signed) {
    return new Promise((resolve, reject) => {
      const options = {
        uri: this.baseUrl + "/userCert",
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
  async createProfile(address, signedProfile) {
    return new Promise((resolve, reject) => {
      const options = {
        uri: this.baseUrl + "/profile",
        headers: {
          "Content-Type": "application/json"
        },
        json: {
          address,
          signedProfile,
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
  async createGroup(name, address) {
    return new Promise((resolve, reject) => {
      const options = {
        uri: this.baseUrl + "/group",
        headers: {
          "Content-Type": "application/json"
        },
        json: {
          name,
          member: address,
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
  async inviteMemberToGroup(groupId, signedAddress) {
    return new Promise((resolve, reject) => {
      const options = {
        uri: this.baseUrl + "/invite",
        headers: {
          "Content-Type": "application/json"
        },
        json: {
          signedAddress,
          groupId,
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
  async getCert(certId) {
    const response = await this.contract.methods.getCert(certId).call();
    const cid = response[0];
    const certificate = JSON.parse(await this.getFile(cid));
    certificate.id = certId;
    certificate.cid = cid;
    return certificate;
  }
  async getGroupCerts(groupId) {
    const response = await this.contract.methods.getGroupCerts(groupId).call();
    const certIds = response[0];
    const cids = response[1];
    const certificates = [];
    for (let i = 0; i < certIds.length; i++) {
      const cid = cids[i];
      let certificate;
      try {
        certificate = JSON.parse(await this.getFile(cid));
      } catch(err) {
        console.error(err);
        continue;
      }
      if (!this.isCertificate(certificate)) {
        continue;
      }
      certificate.id = certIds[i];
      certificate.cid = cid;
      certificates.push(certificate);
    }
    return certificates;
  }

  async getIssuedUserCerts(certId) {
    const response = await this.contract.methods.getIssuedUserCerts(certId).call();
    const froms = response[0];
    const tos = response[1];
    const certIds = response[2];
    const times = response[3];
    const userCerts = [];
    for (let i = 0; i < certIds.length; i++) {
      const certificate = await this.getCert(certIds[i]);
      certificate.id = certIds[i];
      userCerts.push({
        from: froms[i],
        to: tos[i],
        timestamp: times[i],
        certificate,
      });
    }
    return userCerts;
  }
  async getReceivedUserCerts(address) {
    const response = await this.contract.methods.getReceivedUserCerts(address).call();
    const froms = response[0];
    const tos = response[1];
    const certIds = response[2];
    const times = response[3];
    const userCerts = [];
    for (let i = 0; i < certIds.length; i++) {
      const certificate = await this.getCert(certIds[i]);
      certificate.id = certIds[i];
      userCerts.push({
        from: froms[i],
        to: tos[i],
        timestamp: times[i],
        certificate,
      });
    }
    return userCerts;
  }
  async getCertByCid(cid) {
    const response = await this.contract.methods.getCertByCid(cid).call();
    const certId = response[0];
    const certificate = JSON.parse(await this.getFile(cid));
    certificate.cid = cid;
    certificate.id = certId;
    return certificate;
  }
  async getGroup(groupId) {
    const response = await this.contract.methods.getGroup(groupId).call();
    const memberNames = response[1];
    const memberAddresses = response[2];
    const members = [];
    for (let i = 0; i < memberNames.length; i++) {
      members.push({
        name: memberNames[i],
        address: memberAddresses[i],
      });
    }
    const group = {
      groupId,
      name: response[0],
      members,
    }
    return group;
  }
  async getGroups(address) {
    const groups = [];
    const response = await this.contract.methods.getGroupIds(address).call();
    for (const groupId of response) {
      const group = await this.getGroup(parseInt(groupId));
      groups.push(group);
    }
    return groups;
  }
  async signMemberAddress(address, accountToSign) {
    const hash = web3.utils.soliditySha3({
      type: "address",
      value: address,
    });
    let signature;
    if (accountToSign.privateKey) {
      signature = await this.web3.eth.accounts.sign(
        hash,
        accountToSign.privateKey,
      ).signature;
    } else if (accountToSign.address) {
      signature = await this.web3.eth.personal.sign(
        hash,
        accountToSign.address,
      );
    } else {
      throw new Error("It needs an account to sign");
    }
    return {
      signature,
      address,
      addressHash: hash,
    }
  }
  async signCertificate(certificate, accountToSign) {
    const { cid } = await this.uploadCertificateToIpfs(certificate);
    const hash = web3.utils.soliditySha3({
      type: "string",
      value: cid,
    });
    let signature;
    if (accountToSign.privateKey) {
      signature = await this.web3.eth.accounts.sign(
        hash,
        accountToSign.privateKey,
      ).signature;
    } else if (accountToSign.address) {
      signature = await this.web3.eth.personal.sign(
        hash,
        accountToSign.address,
      );
    } else {
      throw new Error("It needs an account to sign");
    }
    return {
      signature,
      cidHash: hash,
      cid,
      certificate,
    }
  }
  async signUserCertificate(userCertificate, accountToSign) {
    const hash = web3.utils.soliditySha3({
      type: "uint",
      value: userCertificate.certId,
    });
    let signature;
    if (accountToSign.privateKey) {
      signature = await this.web3.eth.accounts.sign(
        hash,
        accountToSign.privateKey,
      ).signature;
    } else if (accountToSign.address) {
      signature = await this.web3.eth.accounts.sign(
        hash,
        accountToSign.address,
      );
    } else {
      throw new Error("It needs an account to sign");
    }
    return {
      signature,
      userCertificate,
      hash,
    }
  }
  async getProfile(address) {
    const response = await this.contract.methods.getProfile(address).call();
    const name = response[0];
    const email = response[1];
    return {
      name,
      email,
    };
  }
  async signProfile(profile, accountToSign) {
    const nameHash = web3.utils.soliditySha3({
      type: "string",
      value: profile.name,
    });
    const emailHash = web3.utils.soliditySha3({
      type: "string",
      value: profile.email,
    });
    let nameSignature;
    let emailSignature;
    if (accountToSign.privateKey) {
      nameSignature = await this.web3.eth.accounts.sign(
        nameHash,
        accountToSign.privateKey,
      ).signature;
      emailSignature = await this.web3.eth.accounts.sign(
        emailHash,
        accountToSign.privateKey,
      ).signature;
    } else if (accountToSign.address) {
      nameSignature = await this.web3.eth.personal.sign(
        nameHash,
        accountToSign.address,
      );
      emailSignature = await this.web3.eth.personal.sign(
        emailHash,
        accountToSign.address,
      );
    } else {
      throw new Error("It needs an account to sign");
    }
    return {
      nameSignature,
      emailSignature,
      nameHash,
      emailHash,
      profile,
    }
  }
  isCertificate(certificate) {
    if (
      certificate.context === undefined || certificate.context === null
      || Object.prototype.toString.call(certificate.context) !== "[object Object]"
      || typeof certificate.title !== "string"
      || typeof certificate.description !== "string"
      || typeof certificate.image !== "string"
      || typeof certificate.groupId !== "number"
    ) {
      return false;
    }
    return true;
  }
}


module.exports = GxCertClient;
