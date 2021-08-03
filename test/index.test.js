const assert = require("assert");
const GxCertClient = require("../index");

const client = new GxCertClient();

before(async () => {
  await client.init();
});
describe("GxCertClient", () => {
  describe("isCertificate", () => {
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
