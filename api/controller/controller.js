// var RSA = require('hybrid-crypto-js').RSA;
// var Crypt = require('hybrid-crypto-js').Crypt;

// // Increase amount of entropy
// const keyObj = {}



// // Select default message digest

// keyObj.keyCreations = async (req, res) => {


//     try {
//         var rsa = new RSA({
//             keySize: 4096,
//         });
//         rsa.generateKeyPair(function (keyPair) {
//             // Callback function receives new 1024 bit key pair as a first argument
//             var publicKey = keyPair.publicKey;
//             var privateKey = keyPair.privateKey;
//             console.log("Public Key:  " + publicKey)
//             console.log("private Key:  " + privateKey)
//         }, 1024); // K
//         res.status(200).json({
//             message: "Success",

//         })



//     } catch (err) {
//         const request = req
//         // Helper.writeErrorLog(request, err)
//         return res.status(404).send({
//             message: err,
//             error: err
//         })
//     }
// }


// // Select AES or RSA standard


// // Alternate AES keysize (some AES algorithms requires specific key size)


// module.exports = keyObj