//Création de l'autorisation

const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
  if (req.headers.authorization) {
    const token = req.headers.authorization.replace("Bearer ", "");
    console.log(token); //vérification du token
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
module.exports = isAuthenticated;
