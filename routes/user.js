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
const { post } = require("./offer");

//Authentification

const isAuthenticated = async (req, res, next) => {
  if (req.headers.authorization) {
    const token = req.headers.authorization.replace("Bearer ", "");
    //console.log(token); //vérification du token
    // Chercher dans la BDD s'il y a bien un User qui possède ce token
    const user = await User.findOne({
      token: token,
    });

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    } else {
      req.user = user;
      return next();
    }
  } else {
    return res.status(401).json({ error: "Unauthorized" });
  }
};

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
      const pictureToUpload = req.files.picture.path;
      const result = await cloudinary.uploader.upload(pictureToUpload);
      newuser.account.avatar = result;

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

//Rechercher un profil

router.get("/user/:id", isAuthenticated, async (req, res) => {
  if (req.params.id) {
    try {
      //trouver l'id dans la BD
      const user = await User.findById(req.params.id);
      const offers = await Offer.find({ owner: req.params.id });
      const password = await User.find(req.params.password);
      if (user) {
        res.json({
          id: user._id,
          email: user.email,
          password: password,
          username: user.account.username,
          numbOffer: offers.length,
        });
      } else {
        res.status(400).json({ error: "user not found" });
      }
    } catch (error) {
      res.status(400).json({ error: "Missing user id" });
    }
  }
});

// modifier le profile d'un utilisateur

router.post("/user/update", async (req, res) => {
  try {
    const userEmail = await User.findOne({ email: req.fields.email });
    const userUsername = await User.findOne({ username: req.fields.username });

    //vérifier si l'email et le username sont dans la DB

    if (userEmail && userEmail.email === req.fields.email) {
      return res.status(400).json({ error: "This email is already used" });
    } else if (
      userUsername &&
      userUsername.account.username === req.fields.username
    ) {
      return res.status(400).json({ error: "This username is already used" });
    } else if (req.fields.email || req.fields.username) {
      const userToUpdate = await User.findById(req.user._id);
      if (req.fields.email) {
        userToUpdate.email = req.fields.email;
      }
      if (req.fields.username) {
        userToUpdate.username = req.fields.username;
      }
      await userToUpdate.save();
      res.json({ email: userToUpdate.email, username: userToUpdate.username });
    } else {
      res.status(400).json({ error: "Missing informations" });
    }
  } catch (error) {
    res.status(400).json({ erro: error.message });
  }
});

//upload une photo
router.put(
  "/user/upload_picture",

  async (req, res) => {
    try {
      if (req.files.photo) {
        const user = req.user;

        if (user.account.photo === null) {
          await cloudinary.uploader.upload(
            req.files.photo.path,
            {
              folder: "",
            },
            async function (error, result) {
              if (error) {
                res.status(400).json({ error: "An error occurred" });
              } else {
                const userToUpdate = await User.findByIdAndUpdate(user._id, {
                  "account.avatar": [
                    {
                      url: result.secure_url,
                      id: result.public_id,
                      name: req.files.photo.name,
                      type: req.files.photo.type,
                    },
                  ],
                });
                await userToUpdate.save();

                const userUpdated = await User.findById(userToUpdate._id);
                res.json({
                  id: userUpdated._id,
                  email: userUpdated.email,
                  username: userUpdated.account.username,

                  photo: userUpdated.account.photo,
                  rooms: userUpdated.rooms,
                });
              }
            }
          );
        } else {
          await cloudinary.uploader.destroy(user.account.photo[0].id);
          await cloudinary.uploader.upload(
            req.files.photo.path,
            {
              folder: "airbnb/users",
            },
            async function (error, result) {
              if (error) {
                res.status(400).json({ error: "An error occurred" });
              } else {
                const userToUpdate = await User.findByIdAndUpdate(user._id, {
                  "account.avatar": [
                    {
                      url: result.secure_url,
                      id: result.public_id,
                      name: req.files.photo.name,
                      type: req.files.photo.type,
                    },
                  ],
                });
                await userToUpdate.save();

                const userUpdated = await User.findById(user._id);
                res.json({
                  id: userUpdated._id,
                  email: userUpdated.email,
                  username: userUpdated.account.username,
                  name: userUpdated.account.name,
                  description: userUpdated.account.description,
                  photo: userUpdated.account.photo,
                  rooms: userUpdated.rooms,
                });
              }
            }
          );
        }
      } else {
        res.status(400).json({ error: "Missing picture" });
      }
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
);

//Export
module.exports = router;
