const assert = require("assert");
const GxCertClient = require("../index");
const Web3 = require("web3");
const web3 = new Web3("https://matic-mumbai.chainstacklabs.com");
const client = new GxCertClient(web3, "0xB16070e105567515FCA925eD621229DDc75815B7", "http://localhost:5001/gxcert-21233/asia-northeast1/gxcert");
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
const privateKey = account.privateKey;
const address = account.address;
web3.eth.accounts.privateKeyToAccount(privateKey);

const validCertificate = {
  context: {},
  from: address,
  to: to.address,
  issued_at: (new Date()).getTime(),
  title: "title",
  description: "description",
  image: "image",
  url: "https://gaiax.com",
  groupId: null, // It will be set during test.
}
let validCertificateCid;
let groupId;
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
  describe("Group", async () => {
    it("create group", async function () {
      groupId = await client.createGroup("group1", address);
      validCertificate.groupId = groupId;
    });

    it("get group", async function () {
      const group = await client.getGroup(groupId);
      assert.equal(group.name, "group1");
      assert.equal(group.members.length, 1);
      assert.equal(group.members[0], address);
    });
  });
  describe("IPFS", () => {
    it ("uploadCertificateToIpfs", async function() {
      this.timeout(20 * 1000);
      const { cid, certificate } = await client.uploadCertificateToIpfs(validCertificate);
      validCertificateCid = cid;
      assert.equal(certificate.from, validCertificate.from);
      assert.equal(certificate.to, validCertificate.to);
      assert.equal(certificate.title, validCertificate.title);
      assert.equal(certificate.description, validCertificate.description);
      assert.equal(certificate.image, validCertificate.image);
      assert.equal(certificate.url, validCertificate.url);
      assert.equal(certificate.groupId, validCertificate.groupId);
      assert.equal(cid.length, 46);
    });
    it ("signCertificate", async () => {
      const { signature, cidHash, cid, certificate } = await client.signCertificate(validCertificate, privateKey);
      assert.equal(certificate.from, validCertificate.from);
      assert.equal(certificate.to, validCertificate.to);
      assert.equal(certificate.title, validCertificate.title);
      assert.equal(certificate.description, validCertificate.description);
      assert.equal(certificate.image, validCertificate.image);
      assert.equal(certificate.url, validCertificate.url);
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
  describe("sendSignedCertificateToGx", () => {
    it ("valid certificate", async function() {
      this.timeout(20 * 1000);
      const signed = await client.signCertificate(validCertificate, privateKey);
      await client.sendSignedCertificateToGx(signed);
    });
  });
  describe("get received & sent cert", () => {
    it ("get received cert", async function () {
      this.timeout(20 * 1000);
      const receivedCert = await client.getReceivedCert(to.address, 1);
      assert.equal(receivedCert.to, to.address);
      assert.equal(receivedCert.cid, validCertificateCid);
    });
    it ("get sent cert", async function() {
      this.timeout(20 * 1000);
      const sentCert = await client.getSentCert(groupId, 1);
      assert.equal(sentCert.groupId, groupId);
      assert.equal(sentCert.cid, validCertificateCid);
    });
    it ("get cert by cid", async function() {
      this.timeout(20 * 1000);
      const cert = await client.getCertByCid(validCertificateCid);
      assert.equal(cert.groupId, validCertificate.groupId);
      assert.equal(cert.cid, validCertificateCid);
    });
  });
  describe("get received & sent certs", () => {
    it ("get received certs", async function () {
      this.timeout(20 * 1000);
      const certs = await client.getReceivedCerts(to.address);
      assert.equal(certs.length, 1);
      assert.equal(certs[0].to, to.address);
      assert.equal(certs[0].cid, validCertificateCid);
    });
    it ("get sent certs", async function () {
      this.timeout(20 * 1000);
      const certs = await client.getSentCerts(groupId);
      assert.equal(certs.length, 1);
      assert.equal(certs[0].groupId, groupId);
      assert.equal(certs[0].cid, validCertificateCid);
    });
  });
});
