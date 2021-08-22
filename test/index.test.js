const assert = require("assert");
const GxCertClient = require("../index");
const Web3 = require("web3");
const web3 = new Web3("https://matic-mumbai.chainstacklabs.com");
const client = new GxCertClient(web3, "0x4F09E3a387aF774FB9815850b893D44781563904", "http://localhost:5001/gxcert-21233/asia-northeast1/gxcert");
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
}
let validCertificateCid;
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
  describe("IPFS", () => {
    it ("uploadCertificateToIpfs", async function() {
      this.timeout(20 * 1000);
      const { cid, certificate } = await client.uploadCertificateToIpfs(validCertificate);
      validCertificateCid = cid;
      assert.equal(JSON.stringify(certificate), JSON.stringify(validCertificate));
      assert.equal(typeof cid, "string");
      assert.equal(cid.length, 46);
    });
    it ("signCertificate", async () => {
      const { signature, cidHash, cid, certificate } = await client.signCertificate(validCertificate, privateKey);
      assert.equal(JSON.stringify(certificate), JSON.stringify(validCertificate));
      assert.equal(typeof cid, "string");
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
    });
    it ("get sent cert", async function() {
      this.timeout(20 * 1000);
      const sentCert = await client.getSentCert(address, 1);
      assert.equal(sentCert.from, address);
    });
    it ("get cert by cid", async function() {
      this.timeout(20 * 1000);
      const cert = await client.getCertByCid(validCertificateCid);
      assert.equal(cert.from, validCertificate.from);
    });
  });
  describe("get received & sent certs", () => {
    it ("get received certs", async function () {
      this.timeout(20 * 1000);
      const certs = await client.getReceivedCerts(to.address);
      assert.equal(certs.length, 1);
      assert.equal(certs[0].to, to.address);
    });
    it ("get sent certs", async function () {
      this.timeout(20 * 1000);
      const certs = await client.getSentCerts(to.address);
      assert.equal(certs.length, 1);
      assert.equal(certs[0].from, address);
    });
  });
});
