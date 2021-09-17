const IpfsHttpClient = require("ipfs-http-client");
const { sha3num } = require("solidity-sha3");
const EthUtil = require("ethereumjs-util");
const Web3 = require("web3");
const web3 = new Web3();
const EthereumTx = require("ethereumjs-tx").Transaction;
const request = require("request");
const abi = require("./abi.json");
const BufferList = require("bl/BufferList");
const timeoutSec = 520;

class GxCertClient {
  constructor(web3, contractAddress, baseUrl) {
    this.ipfs = null;
    this.web3 = web3;
    this.contractAddress = contractAddress;
    this.baseUrl = baseUrl;
    this.cache = {
      profiles: {},
    }
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
  async getMyAddress() {
    const accounts = await this.web3.eth.getAccounts();
    if (accounts.length === 0) {
      throw new Error("Failed to fetch address."); 
    }
    this.address = accounts[0];
    return this.address;
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
      setTimeout(resolve, timeoutSec * 1000);
      request.post(options, (err, response, body) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
  invalidateUserCert(signed) {
    return new Promise((resolve, reject) => {
      const options = {
        uri: this.baseUrl + "/invalidate",
        headers: {
          "Content-Type": "application/json"
        },
        json: signed,
      }
      setTimeout(resolve, timeoutSec * 1000);
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
      setTimeout(resolve, timeoutSec * 1000);
      request.post(options, (err, response, body) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
  createUserCerts(signedObjects) {
    return new Promise((resolve, reject) => {
      const options = {
        uri: this.baseUrl + "/userCerts",
        headers: {
          "Content-Type": "application/json"
        },
        json: signedObjects,
      }
      setTimeout(resolve, timeoutSec * 1000);
      request.post(options, (err, response, body) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
  async updateProfile(signedProfile) {
    return new Promise((resolve, reject) => {
      const options = {
        uri: this.baseUrl + "/profile",
        headers: {
          "Content-Type": "application/json"
        },
        json: signedProfile,
      }
      setTimeout(resolve, timeoutSec * 1000);
      request.put(options, (err, response, body) => {
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
      setTimeout(resolve, timeoutSec * 1000);
      request.post(options, (err, response, body) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
  async createGroup(name, residence, phone, address) {
    return new Promise((resolve, reject) => {
      const options = {
        uri: this.baseUrl + "/group",
        headers: {
          "Content-Type": "application/json"
        },
        json: {
          name,
          residence,
          phone,
          member: address,
        },
      }
      setTimeout(resolve, timeoutSec * 1000);
      request.post(options, (err, response, body) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
  async updateGroup(signedGroup) {
    return new Promise((resolve, reject) => {
      const options = {
        uri: this.baseUrl + "/group",
        headers: {
          "Content-Type": "application/json"
        },
        json: signedGroup,
      }
      setTimeout(resolve, timeoutSec * 1000);
      request.put(options, (err, response, body) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
  async disableGroupMember(groupId, signedAddress) {
    return new Promise((resolve, reject) => {
      const options = {
        uri: this.baseUrl + "/disable",
        headers: {
          "Content-Type": "application/json"
        },
        json: {
          signedAddress,
          groupId,
        },
      }
      setTimeout(resolve, timeoutSec * 1000);
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
      setTimeout(resolve, timeoutSec * 1000);
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
  async getUserCert(userCertId) {
    const response = await this.contract.methods.getUserCert(userCertId).call();
    const from = response[0];
    const to = response[1];
    const certId = response[2];
    const timestamp = response[3];
    const certificate = await this.getCert(certId);
    return {
      userCertId,
      from,
      to,
      timestamp,
      certificate,
    }
  }
  async getGroupCerts(groupId) {
    const response = await this.contract.methods.getGroupCerts(groupId).call();
    const certIds = response[0];
    const cids = response[1];
    const certificates = [];
    for (let i = 0; i < certIds.length; i++) {
      const certId = certIds[i];
      let certificate;
      try {
        certificate = await this.getCert(certId);
      } catch(err) {
        console.error(err);
        continue;
      }
      if (!this.isCertificate(certificate)) {
        continue;
      }
      certificates.push(certificate);
    }
    return certificates;
  }

  async getIssuedUserCerts(certId) {
    const response = await this.contract.methods.getIssuedUserCerts(certId).call();
    const froms = response[0];
    const tos = response[1];
    const userCertIds = response[2];
    const certIds = response[3];
    const times = response[4];
    const userCerts = [];
    for (let i = 0; i < certIds.length; i++) {
      const certificate = await this.getCert(certIds[i]);
      userCerts.push({
        userCertId: userCertIds[i],
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
    const userCertIds = response[2];
    const certIds = response[3];
    const times = response[4];
    const userCerts = [];
    for (let i = 0; i < certIds.length; i++) {
      const certificate = await this.getCert(certIds[i]);
      userCerts.push({
        userCertId: userCertIds[i],
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
    const residence = response[1];
    const phone = response[2];

    const memberNames = response[3];
    const memberIcons = response[4];
    const memberAddresses = response[5];
    const members = [];
    for (let i = 0; i < memberNames.length; i++) {
      members.push({
        name: memberNames[i],
        address: memberAddresses[i],
        icon: memberIcons[i],
      });
    }
    const group = {
      groupId,
      residence,
      phone,
      name: response[0],
      members,
    }
    return group;
  }
  async getGroupIds(address) {
    const response = await this.contract.methods.getGroupIds(address).call();
    return response.map(n => {
      return parseInt(n);
    });
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
  async signUserCertForInvalidation(userCertId, accountToSign) {
    const hash = web3.utils.soliditySha3({
      type: "string",
      value: "invalidate:" + this.uintToHexString(userCertId),
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
      hash,
      userCertId,
    }
  }
  async signGroup(group, accountToSign) {
    const groupId = this.uintToHexString(group.groupId);
    const hash = web3.utils.soliditySha3({
      type: "string",
      value: groupId + group.name + group.residence + group.phone, 
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
      hash,
      group,
    }
  }
  async signMemberAddressForInviting(address, accountToSign) {
    const hash = web3.utils.soliditySha3({
      type: "string",
      value: "invite:" + address.toLowerCase(),
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
  async signMemberAddressForDisabling(address, accountToSign) {
    const hash = web3.utils.soliditySha3({
      type: "string",
      value: "disable:" + address.toLowerCase(),
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
  uintToHexString(number) {
    let hexString = this.web3.utils.toHex(number).slice(2);
    for (let i = 1; i < 128 - hexString.length - 1; i++) {
      hexString = "0" + hexString;
    }
    hexString = "0x" + hexString;
    return hexString;
  }
  async signUserCertificates(certId, from, tos, accountToSign) {
    let unsigned = this.uintToHexString(certId) + from.toLowerCase();
    for (const to of tos) {
      unsigned += to.toLowerCase();
    }
    const hash = web3.utils.soliditySha3({
      type: "string",
      value: unsigned,
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
      certId,
      from,
      tos,
      signature,
      hash,
    }
  }
  async signUserCertificate(userCertificate, accountToSign) {
    let certId = this.uintToHexString(userCertificate.certId);
    const hash = web3.utils.soliditySha3({
      type: "string",
      value: userCertificate.to.toLowerCase() + certId,
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
      userCertificate,
      hash,
    }
  }
  async getProfile(address) {
    const response = await this.contract.methods.getProfile(address).call();
    const profileId = response[0];
    const name = response[1];
    const email = response[2];
    const icon = response[3];
    const profile =  {
      profileId,
      name,
      email,
      icon,
    };
    this.cache.profiles[address] = profile;
    return profile;
  }
  async signProfile(profile, accountToSign) {
    const hash = web3.utils.soliditySha3({
      type: "string",
      value: profile.name + profile.email + profile.icon,
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
      hash,
      profile,
    }
  }
  async signProfileForUpdating(profile, accountToSign) {
    const hash = web3.utils.soliditySha3({
      type: "string",
      value: "update:" + profile.name + profile.email + profile.icon,
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
      hash,
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
