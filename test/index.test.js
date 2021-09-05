const assert = require("assert");
const GxCertClient = require("../index");
const Web3 = require("web3");
const web3 = new Web3("https://matic-mumbai.chainstacklabs.com");
const client = new GxCertClient(web3, "0xc5fF867995497133cce2567FDB98577d8797bedD", "http://localhost:5001/gxcert-21233/asia-northeast1/gxcert");
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

let validProfile = {
  name: "alice",
  email: "alice@example.com",
  icon: "icon",
}
let validCertificateCid;
let groupId;
let certId;
let userCertId;
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
      assert.equal(profile.icon, validProfile.icon);
    });
    it ("update profile", async function () {
      this.timeout(20 * 1000);
      const newProfile = {
        name: "alice2",
        email: "email2",
        icon: "icon2",
      }
      const signedProfile = await client.signProfileForUpdating(newProfile, { privateKey });
      try {
        await client.updateProfile(signedProfile);
      } catch(err) {
        console.error(err);
        assert.fail();
        return;
      }
      let profile;
      try {
        profile = await client.getProfile(address);
      } catch(err) {
        console.error(err);
        assert.fail();
        return;
      }
      assert.equal(profile.name, newProfile.name);
      assert.equal(profile.email, newProfile.email);
      assert.equal(profile.icon, newProfile.icon);
      validProfile = newProfile;
    });
  });
  describe("Group", async () => {
    it("create group", async function () {
      this.timeout(20 * 1000);
      await client.createGroup("group1", "residence", "phone", address);
    });
    it ("get groups", async function () {
      this.timeout(20 * 1000);
      let groups = await client.getGroups(address);
      assert.equal(groups.length, 1);
      assert.equal(groups[0].name, "group1");
      assert.equal(groups[0].residence, "residence");
      assert.equal(groups[0].phone, "phone");
      assert.equal(groups[0].members.length, 1);
      assert.equal(groups[0].members[0].name, validProfile.name);
      assert.equal(groups[0].members[0].address, address);
      assert.equal(groups[0].members[0].icon, validProfile.icon);
      groupId = groups[0].groupId;
      validCertificate.groupId = groupId;
    });
    it ("invite member to group", async function () {
      this.timeout(20 * 1000);
      const targetAddress = charlie.address;
      const signedMember = await client.signMemberAddressForInviting(targetAddress, { privateKey });
      await client.inviteMemberToGroup(groupId, signedMember);
    });
    it("get group", async function () {
      this.timeout(20 * 1000);
      const group = await client.getGroup(groupId);
      assert.equal(group.name, "group1");
      assert.equal(group.residence, "residence");
      assert.equal(group.phone, "phone");
      assert.equal(group.members.length, 2);
      assert.equal(group.members[0].name, validProfile.name);
      assert.equal(group.members[0].address, address);
      assert.equal(group.members[0].icon, validProfile.icon);
      assert.equal(group.members[1].name, "");
      assert.equal(group.members[1].address, charlie.address);
      assert.equal(group.members[1].icon, "");
    });
    it ("disable group member", async function() {
      this.timeout(20 * 1000);
      const targetAddress = charlie.address;
      const signedMember = await client.signMemberAddressForDisabling(targetAddress, { privateKey });
      await client.disableGroupMember(groupId, signedMember);
    });
    it("get group after disabling member", async function () {
      this.timeout(20 * 1000);
      const group = await client.getGroup(groupId);
      assert.equal(group.name, "group1");
      assert.equal(group.residence, "residence");
      assert.equal(group.phone, "phone");
      assert.equal(group.members.length, 1);
      assert.equal(group.members[0].name, validProfile.name);
      assert.equal(group.members[0].address, address);
      assert.equal(group.members[0].icon, validProfile.icon);
    });
    it ("update group", async function() {
      this.timeout(20 * 1000);
      const group = {
        groupId,
        name: "group2",
        residence: "residence2",
        phone: "phone2",
      }
      const signedGroup = await client.signGroup(group, { privateKey });
      try {
        await client.updateGroup(signedGroup);
      } catch(err) {
        console.error(err);
        assert.fail();
        return;
      }
      const _group = await client.getGroup(groupId);
      assert.equal(_group.name, group.name);
      assert.equal(_group.residence, group.residence);
      assert.equal(_group.phone, group.phone);
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
    it ("valid user certificates", async function() {
      this.timeout(20 * 1000);
      const signed = await client.signUserCertificate(validUserCertificate, { privateKey });
      const signedObjects = [];
      for (let i = 0; i < 5; i++) {
        signedObjects.push(signed);
      }
      await client.createUserCerts(signedObjects);
    });

  });
  describe("get user certificate", () => {
    it ("get issued user certificates", async function() {
      this.timeout(20 * 1000);
      const userCertificates = await client.getIssuedUserCerts(certId);
      assert.equal(userCertificates.length, 6);
      assert.equal(userCertificates[0].from, validUserCertificate.from);
      assert.equal(userCertificates[0].to, validUserCertificate.to);
      assert.equal(userCertificates[0].certificate.id, validUserCertificate.certId);
      userCertId = userCertificates[0].userCertId;
      for (let i = 0; i < 5; i++) {
        assert.equal(userCertificates[1 + i].from, validUserCertificate.from);
        assert.equal(userCertificates[1 + i].to, validUserCertificate.to);
        assert.equal(userCertificates[1 + i].certificate.id, validUserCertificate.certId);
      }
    });
    it ("get received user certificates", async function() {
      this.timeout(20 * 1000);
      const userCertificates = await client.getReceivedUserCerts(validUserCertificate.to);
      assert.equal(userCertificates.length, 6);
      assert.equal(userCertificates[0].from, validUserCertificate.from);
      assert.equal(userCertificates[0].to, validUserCertificate.to);
      assert.equal(userCertificates[0].certificate.id, validUserCertificate.certId);
      assert.equal(userCertificates[0].userCertId, userCertId);
      for (let i = 0; i < 5; i++) {
        assert.equal(userCertificates[1 + i].from, validUserCertificate.from);
        assert.equal(userCertificates[1 + i].to, validUserCertificate.to);
        assert.equal(userCertificates[1 + i].certificate.id, validUserCertificate.certId);
      }
    });
    it ("get user certificates", async function() {
      this.timeout(20 * 1000);
      const userCertificate = await client.getUserCert(userCertId);
      assert.equal(userCertificate.from, validUserCertificate.from);
      assert.equal(userCertificate.to, validUserCertificate.to);
      assert.equal(userCertificate.certificate.id, validUserCertificate.certId);
      assert.equal(userCertificate.userCertId, userCertId);
    });
  });
});
