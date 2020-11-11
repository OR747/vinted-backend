const express = require("express");
const router = express.Router();
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: "dxs9pzi5h",
  api_key: "129469558594812",
  api_secret: "eknrugUnuoKwt3yY0BSJHGrws34",
});

// Import models
//const IsAuthenticated = require("../middleware/IsAuthenticated");
const User = require("../models/User");
const Offer = require("../models/Offer");

//Créer un compte "SignUp"

router.post("/user/signup", async (req, res) => {
  //res.json({"ok"});
  //const{email, username, phone, password}= req.fields =>destructuring

  try {
    //condition de création du compte
    const userFounded = await User.findOne({ email: req.fields.email });
    const username = req.fields.username;

    if (userFounded === null && username !== undefined) {
      //Programme password génére l'encryptage du MP et le token

      const password = req.fields.password;
      const salt = uid2(64);
      //console.log(salt);
      const hash = SHA256(password + salt).toString(encBase64);
      //console.log(hash);
      const token = uid2(64);
      //création du nouveau utilisateur
      const newuser = await new User({
        email: req.fields.email,
        account: {
          username: req.fields.username,
          phone: req.fields.phone,
          //avatar: result,
        },
        token: token,
        hash: hash,
        salt: salt,
      });
      //Ajouter une photo
      //const pictureToUpload = req.files.picture.path;
      //const result = await cloudinary.uploader.upload(pictureToUpload);
      //newuser.account.avatar = result

      await newuser.save();
      //On peut filtrer au niveau de la réponse
      res.status(200).json({
        id: newuser.id,
        email: newuser.email,
        account: newuser.account,
        token: newuser.token,
      });
    } else {
      res
        .status(400)
        .json({ message: "This email or username already has an account" });
    }
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

// Se connecter à son compte "LogIn"

router.post("/user/login", async (req, res) => {
  try {
    const { email, password } = req.fields; //destructuring

    const user = await User.findOne({ email: email });
    // console.log(user);

    if (user) {
      // Est-ce qu'il a rentré le bon mot de passe ?
      const testHash = SHA256(password + user.salt).toString(encBase64);
      if (testHash === user.hash) {
        res.status(200).json({
          _id: user._id,
          token: user.token,
          account: user.account,
        });
        // Le mot de passe n'est pas bon
      } else {
        res.status(401).json({
          message: "Unauthorized",
        });
      }
    } else {
      // Sinon => erreur
      res.status(400).json({
        message: "User not found",
      });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

//Export
module.exports = router;
