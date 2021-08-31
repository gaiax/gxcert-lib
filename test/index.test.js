const assert = require("assert");
const GxCertClient = require("../index");
const Web3 = require("web3");
const web3 = new Web3("https://matic-mumbai.chainstacklabs.com");
const client = new GxCertClient(web3, "0xFC5eE41B4defa960d1823DABa8433bbdf6254392", "http://localhost:5001/gxcert-21233/asia-northeast1/gxcert");
function generatePrivateKey() {
  const chars = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];
  let key = "";
  for (let i = 0; i < 64; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}
const account = web3.eth.accounts.create();
const to = web3.eth.accounts.create();
const charlie = web3.eth.accounts.create();
const privateKey = account.privateKey;
const address = account.address;
web3.eth.accounts.privateKeyToAccount(privateKey);

function wait(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms);
  });
}

const validCertificate = {
  context: {},
  title: "title",
  description: "description",
  image: "image",
  groupId: null, // It will be set during test.
}

const validUserCertificate = {
  certId: null,
  from: address,
  to: to.address,
}

const validProfile = {
  name: "alice",
  email: "alice@example.com",
}
let validCertificateCid;
let groupId;
let certId;
describe("GxCertClient", () => {
  describe("isInitialized", async () => {
    it("not initialized", async function() {
      assert.equal(client.isInitialized(), false);
    });
    it("initialized", async function() {
      this.timeout(20 * 1000);
      await client.init();
      assert.equal(client.isInitialized(), true);
    });
  });
  describe("Profile", async () => {
    it ("create profile", async function () {
      this.timeout(20 * 1000);
      const signedProfile = await client.signProfile(validProfile, { privateKey: privateKey });
      await client.createProfile(
        address,
        signedProfile,
      );
    });
    it ("get profile", async function() {
      this.timeout(20 * 1000);
      const profile = await client.getProfile(address);
      assert.equal(profile.name, validProfile.name);
      assert.equal(profile.email, validProfile.email);
    });
  });
  describe("Group", async () => {
    it("create group", async function () {
      this.timeout(20 * 1000);
      await client.createGroup("group1", address);
    });
    it ("get groups", async function () {
      this.timeout(20 * 1000);
      let groups = await client.getGroups(address);
      assert.equal(groups.length, 1);
      assert.equal(groups[0].name, "group1");
      assert.equal(groups[0].members.length, 1);
      assert.equal(groups[0].members[0].name, "alice");
      assert.equal(groups[0].members[0].address, address);
      groupId = groups[0].groupId;
      validCertificate.groupId = groupId;
    });
    it ("invite member to group", async function () {
      this.timeout(20 * 1000);
      const targetAddress = charlie.address;
      const signedMember = await client.signMemberAddress(targetAddress, { privateKey });
      await client.inviteMemberToGroup(groupId, signedMember);
    });
    it("get group", async function () {
      this.timeout(100 * 1000);
      const group = await client.getGroup(groupId);
      assert.equal(group.name, "group1");
      assert.equal(group.members.length, 2);
      assert.equal(group.members[0].name, "alice");
      assert.equal(group.members[0].address, address);
      assert.equal(group.members[1].name, "");
      assert.equal(group.members[1].address, charlie.address);
    });
  });
  describe("IPFS", () => {
    it ("uploadCertificateToIpfs", async function() {
      this.timeout(20 * 1000);
      const { cid, certificate } = await client.uploadCertificateToIpfs(validCertificate);
      assert.equal(certificate.title, validCertificate.title);
      assert.equal(certificate.description, validCertificate.description);
      assert.equal(certificate.image, validCertificate.image);
      assert.equal(certificate.groupId, validCertificate.groupId);
      assert.equal(cid.length, 46);
    });
    it ("signCertificate", async () => {
      const { signature, cidHash, cid, certificate } = await client.signCertificate(validCertificate, { privateKey });
      assert.equal(certificate.title, validCertificate.title);
      assert.equal(certificate.description, validCertificate.description);
      assert.equal(certificate.image, validCertificate.image);
      assert.equal(certificate.groupId, validCertificate.groupId);
      assert.equal(cid.length, 46);
      assert.equal(typeof cidHash, "string");
      assert.equal(typeof signature, "string");
    });
  });
  describe("isCertificate", () => {
    it ("valid object", () => {
      const isValid = client.isCertificate(validCertificate);
      assert.equal(isValid, true);
    });
    it ("invalid object", () => {
      const keys = Object.keys(validCertificate);
      for (const key of keys) {
        const copy = JSON.parse(JSON.stringify(validCertificate));
        copy[key] = undefined;
        const isValid = client.isCertificate(copy);
        assert.equal(isValid, false);
      }
    });
  });
  describe("createCert", () => {
    it ("valid certificate", async function() {
      this.timeout(20 * 1000);
      const signed = await client.signCertificate(validCertificate, { privateKey });
      validCertificateCid = signed.cid;
      await client.createCert(signed);
    });
  });
  describe("get certificate", () => {
    it ("get group certificates", async function() {
      this.timeout(20 * 1000);
      console.log(groupId);
      console.log(validCertificate);
      const certificates = await client.getGroupCerts(groupId);
      assert.equal(certificates.length, 1);
      assert.equal(certificates[0].title, validCertificate.title);
      assert.equal(certificates[0].description, validCertificate.description);
      assert.equal(certificates[0].image, validCertificate.image);
      certId = certificates[0].id;
      validUserCertificate.certId = certId;
    });
    it ("get certificate", async function() {
      this.timeout(20 * 1000);
      const certificate = await client.getCert(certId);
      assert.equal(certificate.id, certId);
      assert.equal(certificate.title, validCertificate.title);
      assert.equal(certificate.description, validCertificate.description);
      assert.equal(certificate.image, validCertificate.image);
    });
    it ("get certificate by cid", async function() {
      this.timeout(20 * 1000);
      const certificate = await client.getCertByCid(validCertificateCid);
      assert.equal(certificate.id, certId);
      assert.equal(certificate.title, validCertificate.title);
      assert.equal(certificate.description, validCertificate.description);
      assert.equal(certificate.image, validCertificate.image);
    });
  });
  describe("createUserCert", () => {
    it ("valid user certificate", async function() {
      this.timeout(20 * 1000);
      const signed = await client.signUserCertificate(validUserCertificate, { privateKey });
      await client.createUserCert(signed);
    });
  });
  describe("get user certificate", () => {
    it ("get issued user certificates", async function() {
      const userCertificates = await client.getIssuedUserCerts(certId);
      assert.equal(userCertificates.length, 1);
      assert.equal(userCertificates[0].from, validUserCertificate.from);
      assert.equal(userCertificates[0].to, validUserCertificate.to);
    });
    it ("get received user certificates", async function() {
      this.timeout(20 * 1000);
      const userCertificates = await client.getReceivedUserCerts(validUserCertificate.to);
      assert.equal(userCertificates.length, 1);
      assert.equal(userCertificates[0].from, validUserCertificate.from);
      assert.equal(userCertificates[0].to, validUserCertificate.to);
    });
  });
});
