const assert = require("assert");
const GxCertClient = require("../index");
const Web3 = require("web3");
const web3 = new Web3();
const client = new GxCertClient(web3, null, "http://localhost:5001/gxcert-21233/asia-northeast1/gxcert");
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

before(async () => {
  await client.init();
});
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
describe("GxCertClient", () => {
  describe("IPFS", () => {
    it ("uploadCertificateToIpfs", async () => {
      const { cid, certificate } = await client.uploadCertificateToIpfs(validCertificate);
      assert.equal(JSON.stringify(certificate), JSON.stringify(validCertificate));
      assert.equal(typeof cid, "string");
      assert.equal(cid.length, 46);
    });
    it ("getCertificate", async () => {
      const { cid } = await client.uploadCertificateToIpfs(validCertificate);
      const certificate = await client.getCertificate(cid);
      assert.equal(JSON.stringify(certificate), JSON.stringify(validCertificate));
    });
    it ("signCertificate", async () => {
      console.log(validCertificate);
      const { signature, cidHash, cid, certificate } = await client.signCertificate(validCertificate, privateKey);
      assert.equal(JSON.stringify(certificate), JSON.stringify(validCertificate));
      assert.equal(typeof cid, "string");
      assert.equal(cid.length, 46);
      assert.equal(typeof cidHash, "string");
      assert.equal(typeof signature, "string");
      console.log(cid);
      console.log(cidHash);
      console.log(certificate);
      console.log(signature);
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
});
