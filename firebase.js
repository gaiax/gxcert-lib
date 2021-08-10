const firebase = require("firebase");

const firebaseConfig = {
  apiKey: "AIzaSyBVg-6cdqXuAnS2gECbjHlbJd_Lt8qyQWw",
  authDomain: "gxcert-21233.firebaseapp.com",
  projectId: "gxcert-21233",
  storageBucket: "gxcert-21233.appspot.com",
  messagingSenderId: "500830367528",
  appId: "1:500830367528:web:dfdb8fe5fa6b362d8faa1d",
  measurementId: "G-ZGY6X71Q2R"
};

firebase.initializeApp(firebaseConfig);

module.exports = firebase;
