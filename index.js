const { create } = require("ipfs-http-client");
const Web3 = require("web3");
const web3 = new Web3();
const EthereumTx = require("ethereumjs-tx").Transaction;
const request = require("request");
const abi = require("./abi.json");
const BufferList = require("bl/BufferList");
const timeoutSec = 520;
const axiosBase = require("axios");
const leftPad = require("left-pad");

class GxCertClient {
  constructor(web3, contractAddress, baseUrl, ipfsConfig, ipfsBaseUrlForFetching) {
    this.ipfs = create(ipfsConfig);
    this.web3 = web3;
    this.contractAddress = contractAddress;
    this.baseUrl = baseUrl;
    this.cache = {
      profiles: {},
    };
    if (!ipfsBaseUrlForFetching) {
      ipfsBaseUrlForFetching = "http://ipfs.gaiax-blockchain.com:8080/ipfs";
    }
    this.axios = axiosBase.create({
      baseURL: ipfsBaseUrlForFetching,
      responseType: "json",
    });
  }
  isInitialized() {
    return this.ipfs !== undefined && this.contract !== undefined;
  }

  keccak256(...args) {
    const values = args.map(arg => {
      if (typeof arg === "string") {
        if (arg.substring(0, 2) === "0x") {
          return {
            type: "address",
            value: arg,
          };
        } else {
          return {
            type: "string",
            value: arg,
          };
        }
      } else if (typeof arg === "number") {
        return {
          type: "uint256",
          value: arg,
        }
      } else {
        return arg;
      }
    });
    return this.web3.utils.soliditySha3(...values);
  }
  async init() {
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
  postRequest(endPoint, signed) {
    return new Promise((resolve, reject) => {
      const options = {
        uri: this.baseUrl + endPoint,
        headers: {
          "Content-Type": "application/json",
        },
        json: signed,
      };
      setTimeout(resolve, timeoutSec * 1000);
      request.post(options, (err, response, body) => {
        if (err) {
          reject(err);
          return;
        }
        if (body.error && body.error.includes("insufficient funds")) {
          reject(new Error("insufficient funds"));
          return;
        }
        resolve(body.transactionHash);
      });
    });
  }
  putRequest(endPoint, signed) {
    return new Promise((resolve, reject) => {
      const options = {
        uri: this.baseUrl + endPoint,
        headers: {
          "Content-Type": "application/json",
        },
        json: signed,
      };
      setTimeout(resolve, timeoutSec * 1000);
      request.put(options, (err, response, body) => {
        if (err) {
          reject(err);
          return;
        }
        if (body.error && body.error.includes("insufficient funds")) {
          reject(new Error("insufficient funds"));
          return;
        }
        resolve(body.transactionHash);
      });
    });
  }
  createCert(signed) {
    return this.postRequest("/cert", signed);
  }
  invalidateUserCert(signed) {
    return this.postRequest("/invalidate", signed);
  }
  createUserCert(signed) {
    return this.postRequest("/userCert", signed);
  }
  createUserCerts(signed) {
    return this.postRequest("/userCerts", signed);
  }
  async updateProfile(signed) {
    return this.putRequest("/profile", signed);
  }
  async createProfile(address, signedProfile) {
    const signed = {
      address,
      signedProfile,
    };
    return this.postRequest("/profile", signed);
  }
  async createGroup(name, residence, phone, address) {
    const signed = {
      name,
      residence,
      phone,
      member: address,
    };
    return this.postRequest("/group", signed);
  }
  async updateGroup(signed) {
    return this.putRequest("/group", signed);
  }
  async disableGroupMember(groupId, signedAddress) {
    const signed = {
      signedAddress,
      groupId,
    };
    return this.postRequest("/disable", signed);
  }
  async inviteMemberToGroup(groupId, signedAddress) {
    const signed = {
      signedAddress,
      groupId,
    };
    return this.postRequest("/invite", signed);
  }
  async uploadImageToIpfs(imageBuf) {
    const cid = await this.ipfs.add(imageBuf);
    return cid.path;
  }
  async upload(json) {
    const cid = await this.ipfs.add(JSON.stringify(json));
    return cid.path;
  }
  async getFile(cid) {
    return (await this.axios.get("/" + cid)).data;
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
    const certificate = await this.getFile(cid);
    certificate.certId = certId;
    certificate.cid = cid;
    return certificate;
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
      } catch (err) {
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
    const response = await this.contract.methods
      .getIssuedUserCerts(certId)
      .call();
    const froms = response[0];
    const tos = response[1];
    const userCertIds = response[2];
    const certIds = response[3];
    const times = response[4];
    const userCerts = [];
    for (let i = 0; i < certIds.length; i++) {
      userCerts.push({
        userCertId: userCertIds[i],
        from: froms[i],
        to: tos[i],
        timestamp: times[i],
        certId,
      });
    }
    return userCerts;
  }
  async getReceivedUserCerts(address) {
    const response = await this.contract.methods
      .getReceivedUserCerts(address)
      .call();
    const froms = response[0];
    const tos = response[1];
    const userCertIds = response[2];
    const certIds = response[3];
    const times = response[4];
    const userCerts = [];
    for (let i = 0; i < certIds.length; i++) {
      userCerts.push({
        certId: certIds[i],
        userCertId: userCertIds[i],
        from: froms[i],
        to: tos[i],
        timestamp: times[i],
      });
    }
    return userCerts;
  }
  async getUserCert(userCertId) {
    const response = await this.contract.methods.getUserCert(userCertId).call();
    const from = response[0];
    const to = response[1];
    const certId = response[2];
    const timestamp = response[3];
    return {
      userCertId,
      from,
      to,
      timestamp,
      certId,
    };
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
    };
    return group;
  }
  async getGroupIds(address) {
    const response = await this.contract.methods.getGroupIds(address).call();
    return response.map((n) => {
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
  async getProfile(address) {
    const response = await this.contract.methods.getProfile(address).call();
    const profileId = response[0];
    const name = response[1];
    const email = response[2];
    const icon = response[3];
    const profile = {
      profileId,
      name,
      email,
      icon,
    };
    this.cache.profiles[address] = profile;
    return profile;
  }
  async sign(hash, accountToSign) {
    let signature;
    if (accountToSign.privateKey) {
      signature = await this.web3.eth.accounts.sign(
        hash,
        accountToSign.privateKey
      ).signature;
    } else if (accountToSign.address) {
      signature = await this.web3.eth.personal.sign(
        hash,
        accountToSign.address
      );
    } else {
      throw new Error("It needs an account to sign");
    }
    return signature;
  }
  async signUserCertForInvalidation(userCertId, accountToSign) {
    const hash = this.keccak256("invalidate:", userCertId);
    const signature = await this.sign(hash, accountToSign);
    return {
      signature,
      hash,
      userCertId,
    };
  }
  async signGroup(group, accountToSign) {
    const groupId = this.uintToHexString(group.groupId);
    const hash = this.keccak256(group.groupId, group.name, group.residence, group.phone);
    const signature = await this.sign(hash, accountToSign);
    return {
      signature,
      hash,
      group,
    };
  }
  async signMemberAddressForInviting(address, accountToSign) {
    const hash = this.keccak256("invite:", address.toLowerCase());
    const signature = await this.sign(hash, accountToSign);
    return {
      signature,
      address,
      addressHash: hash,
    };
  }
  async signMemberAddressForDisabling(address, accountToSign) {
    const hash = this.keccak256("disable:", address.toLowerCase());
    const signature = await this.sign(hash, accountToSign);
    return {
      signature,
      address,
      addressHash: hash,
    };
  }
  async signCertificate(certificate, accountToSign) {
    const { cid } = await this.uploadCertificateToIpfs(certificate);
    const hash = this.keccak256(cid);
    const signature = await this.sign(hash, accountToSign);
    return {
      signature,
      cidHash: hash,
      cid,
      certificate,
    };
  }
  async signUserCertificates(certId, from, tos, accountToSign) {
    const unsigned = [certId, from.toLowerCase()];
    for (const to of tos) {
      unsigned.push(to.toLowerCase());
    }
    const hash = this.keccak256(...unsigned);
    const signature = await this.sign(hash, accountToSign);
    return {
      certId,
      from,
      tos,
      signature,
      hash,
    };
  }
  async signUserCertificate(userCertificate, accountToSign) {
    const hash = this.keccak256(userCertificate.to.toLowerCase(), userCertificate.certId);
    const signature = await this.sign(hash, accountToSign);
    return {
      signature,
      userCertificate,
      hash,
    };
  }
  async signProfile(profile, accountToSign) {
    const hash = this.keccak256(profile.name, profile.email, profile.icon);
    const signature = await this.sign(hash, accountToSign);
    return {
      signature,
      hash,
      profile,
    };
  }
  async signProfileForUpdating(profile, accountToSign) {
    const hash = this.keccak256("update:", profile.name, profile.email, profile.icon);
    const signature = await this.sign(hash, accountToSign);
    return {
      signature,
      hash,
      profile,
    };
  }
  isCertificate(certificate) {
    if (
      certificate.context === undefined ||
      certificate.context === null ||
      Object.prototype.toString.call(certificate.context) !==
        "[object Object]" ||
      typeof certificate.title !== "string" ||
      typeof certificate.description !== "string" ||
      typeof certificate.image !== "string" ||
      typeof certificate.groupId !== "number"
    ) {
      return false;
    }
    return true;
  }
  uintToHexString(number) {
    let hexString = this.web3.utils.toHex(number).slice(2);
    for (let i = 1; i < 128 - hexString.length - 1; i++) {
      hexString = "0" + hexString;
    }
    hexString = "0x" + hexString;
    return hexString;
  }
}

module.exports = GxCertClient;
