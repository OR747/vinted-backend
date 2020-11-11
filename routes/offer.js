const { stringify } = require("crypto-js/enc-base64");
const express = require("express");
const router = express.Router();
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: "dxs9pzi5h",
  api_key: "129469558594812",
  api_secret: "eknrugUnuoKwt3yY0BSJHGrws34",
});

//importation du model
//const IsAuthenticated = require("../middleware/IsAuthenticated");
const Offer = require("../models/Offer");
const User = require("../models/User");

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

//Création d'une offre

router.post("/offer/publish", isAuthenticated, async (req, res) => {
  try {
    //Ajouter une photo
    const pictureToUpload = req.files.picture.path;
    const result = await cloudinary.uploader.upload(pictureToUpload);
    // console.log(req.user); verification du user
    //console.log (req.fields)
    //console.log (req.files.picture.path)
    const newoffer = new Offer({
      product_name: req.fields.title,
      product_description: req.fields.description,
      product_price: req.fields.price,
      product_details: [
        {
          MARQUE: req.fields.brand,
        },
        {
          TAILLE: req.fields.size,
        },
        {
          ÉTAT: req.fields.condition,
        },
        {
          COULEUR: req.fields.color,
        },
        {
          EMPLACEMENT: req.fields.city,
        },
      ],
      owner: req.user,
      product_image: result,
    });
    //console.log(newoffer) contrôler dans le terminal avant save
    newoffer.save();
    res.json(newoffer);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

//filtres

router.get("/offers", async (req, res) => {
  try {
    const filters = {};

    // filtrer par le titre
    if (req.query.title) {
      filters.product_name = req.query.title;
    }
    //filter par le prix

    if (req.query.priceMin) {
      filters.product_price = { $gte: req.query.priceMin };
    }

    if (req.query.priceMax) {
      if (filters.product_price) {
        filters.product_price.$lte = req.query.priceMax;
        //Si clé filters.product_price existe déjà
      } else {
        filters.product_price = { $lte: req.query.priceMax };
        //Si clé filters.product_price n'existe pas
      }
    }
    let sort = {};

    if (req.query.sort === "price-desc") {
      sort = { product_price: -1 };
    } else if (req.query.sort === "price-asc") {
      sort = { product_price: 1 };
    }

    let page;

    if (Number(req.query.page) < 1) {
      page = 1;
    } else {
      page = Number(req.query.page);
    }
    let limit = Number(req.query.limit);
    const offers = await Offer.find(filters)
      .sort(sort)
      .limit(limit)
      .skip((page - 1) * limit)
      .select("product_name product_price product_description");

    // cette ligne va nous retourner le nombre d'annonces trouvées en fonction des filtres
    const count = await Offer.countDocuments(filters);

    res.json(offers);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Route qui permmet de récupérer les informations d'une offre en fonction de son id
router.get("/offer/:id", async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate({
      path: "owner",
      select: "account.username account.phone account.avatar",
    });
    res.json(offer);
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ message: error.message });
  }
});

//Modifier une annonce

router.post("/offer/update", async (req, res) => {
  try {
    const offer = await Offer.findById(req.fields.id);
    if (req.fields.description) {
      offer.product_description = req.fields.description;
    }
    if (req.fields.price) {
      offer.product_price = req.fields.price;
    }
    if (req.fields.name) {
      offer.product_name = req.fields.title;
    }

    for (i = 0; i < offer.product_details.length; i++) {
      let tab = offer.product_details[i];
      if (tab.MARQUE) {
        tab.MARQUE = req.fields.brand;
      } else if (tab.MARQUE === null) {
        tab.MARQUE = req.fields.brand;
      }
      if (tab.TAILLE) {
        tab.TAILLE = req.fields.size;
      } else if (tab.TAILLE === null) {
        tab.TAILLE = req.fields.size;
      }
      if (tab.ÉTAT) {
        tab.ÉTAT = req.fields.condition;
      } else if (tab.ÉTAT === null) {
        tab.ÉTAT = req.fields.condition;
      }
      if (tab.COULEUR) {
        tab.COULEUR = req.fields.color;
      } else if (tab.COULEUR === null) {
        tab.COULEUR = req.fields.color;
      }

      if (tab.EMPLACEMENT) {
        tab.EMPLACEMENT = req.fields.city;
      } else if (tab.EMPLACEMENT === null) {
        tab.EMPLACEMENT = req.fields.city;
      }

      offer.markModified("product_details");
      await offer.save();
    }
    res.json(offer);
  } catch (error) {
    console.log(error.message);
  }
});

//Supprimer une annonce

router.post("/offer/delete", async (req, res) => {
  try {
    const offer = await Offer.findById(req.fields.id);
    await offer.remove();
    //console.log(offer); //de contrôle
    res.status(200).json({ message: "offer successfully delete" });
  } catch (error) {
    console.log(error.message);
  }
});

//Export
module.exports = router;
