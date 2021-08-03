const assert = require("assert");
const GxCertClient = require("../index");
const Web3 = require("web3");
const web3 = new Web3();
const client = new GxCertClient(web3);
function generatePrivateKey() {
  const chars = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"];
  let key = "";
  for (let i = 0; i < 64; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return key;
}
const privateKey = generatePrivateKey();

before(async () => {
  await client.init();
});
const validCertificate = {
  context: {},
  from: "from",
  to: "to",
  date: (new Date()).getTime(),
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
      const { signature, cidHash, cid, certificate } = await client.signCertificate(privateKey, validCertificate);
      assert.equal(JSON.stringify(certificate), JSON.stringify(validCertificate));
      assert.equal(typeof cid, "string");
      assert.equal(cid.length, 46);
      assert.equal(typeof cidHash, "string");
      assert.equal(typeof signature.signature, "string");
    });
  });
  describe("isCertificate", () => {
    it ("valid object", () => {
      const isValid = client.isCertificate(validCertificate);
      assert.equal(isValid, true);
    });
    it ("invalid object", () => {
      const keys = Object.keys(validCertificate);
      console.log(keys);
      for (const key of keys) {
        const copy = JSON.parse(JSON.stringify(validCertificate));
        copy[key] = undefined;
        const isValid = client.isCertificate(copy);
        assert.equal(isValid, false);
      }
    });
  });
});
