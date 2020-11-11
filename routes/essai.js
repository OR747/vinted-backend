//la route delete
router.put("/offer/update/:id", isAuthenticated, async (req, res) => {
  const offerToModify = await Offer.findById(req.params.id);
  try {
    if (req.fields.title) {
      offerToModify.product_name = req.fields.title;
    }
    if (req.fields.description) {
      offerToModify.product_description = req.fields.description;
    }
    if (req.fields.price) {
      offerToModify.product_price = req.fields.price;
    }

    const details = offerToModify.product_details;
    for (i = 0; i < details.length; i++) {
      if (details[i].MARQUE) {
        if (req.fields.brand) {
          details[i].MARQUE = req.fields.brand;
        }
      }
      if (details[i].TAILLE) {
        if (req.fields.size) {
          details[i].TAILLE = req.fields.size;
        }
      }
      if (details[i].ÉTAT) {
        if (req.fields.condition) {
          details[i].ÉTAT = req.fields.condition;
        }
      }
      if (details[i].COULEUR) {
        if (req.fields.color) {
          details[i].COULEUR = req.fields.color;
        }
      }
      if (details[i].EMPLACEMENT) {
        if (req.fields.location) {
          details[i].EMPLACEMENT = req.fields.location;
        }
      }
    }

    // Notifie Mongoose que l'on a modifié le tableau product_details
    offerToModify.markModified("product_details");

    if (req.files.picture) {
      const result = await cloudinary.uploader.upload(req.files.picture.path, {
        public_id: `api/vinted/offers/${offerToModify._id}/preview`,
      });
      offerToModify.product_image = result;
    }

    await offerToModify.save();

    res.status(200).json("Offer modified succesfully !");
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ error: error.message });
  }
});

//suprimer une annonce

router.delete("/offer/delete/:id", isAuthenticated, async (req, res) => {
  try {
    //Je supprime ce qui il y a dans le dossier
    await cloudinary.api.delete_resources_by_prefix(
      `api/vinted/offers/${req.params.id}`
    );
    //Une fois le dossier vide, je peux le supprimer !
    await cloudinary.api.delete_folder(`api/vinted/offers/${req.params.id}`);

    offerToDelete = await Offer.findById(req.params.id);

    await offerToDelete.delete();

    res.status(200).json("Offer deleted succesfully !");
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ error: error.message });
  }
});

// CETTE ROUTE SERT AU RESET DE LA BDD ENTRE 2 SESSIONS DE FORMATION. CELA NE FAIT PAS PARTIE DE L'EXERCICE.
// RESET ET INITIALISATION BDD
router.get("/reset-offers", async (req, res) => {
  const allUserId = await User.find().select("_id");
  // console.log(allUserId);
  if (allUserId.length === 0) {
    return res.send(
      "Il faut d'abord reset la BDD de users. Voir la route /reset-users"
    );
  } else {
    // Vider la collection Offer
    await Offer.deleteMany({});

    // Supprimer le dossier "api/vinted/offers" sur cloudinary
    // Pour cela, il faut supprimer les images, cloudinary ne permettant pas de supprimer des dossiers qui ne sont pas vides
    try {
      const deleteResources = await cloudinary.api.delete_resources_by_prefix(
        "api/vinted/offers"
      );
    } catch (error) {
      console.log("deleteResources ===>  ", error.message);
    }

    // Maintenant les dossiers vides, on peut les supprimer
    try {
      const deleteFolder = await cloudinary.api.delete_folder(
        "api/vinted/offers"
      );
    } catch (error) {
      console.log("deleteFolder error ===> ", error.message);
    }

    // // Créer les annonces
    for (let i = 0; i < products.length; i++) {
      try {
        // Création de la nouvelle annonce
        const newOffer = new Offer({
          product_name: products[i].product_name,
          product_description: products[i].product_description,
          product_price: products[i].product_price,
          product_details: products[i].product_details,
          // créer des ref aléatoires
          owner: allUserId[Math.floor(Math.random() * allUserId.length + 1)],
        });

        // Uploader l'image principale du produit
        const resultImage = await cloudinary.uploader.upload(
          products[i].product_image,
          {
            folder: `api/vinted/offers/${newOffer._id}`,
            public_id: "preview",
          }
        );

        // Uploader les images de chaque produit
        newProduct_pictures = [];
        for (let j = 0; j < products[i].product_pictures.length; j++) {
          try {
            const resultPictures = await cloudinary.uploader.upload(
              products[i].product_pictures[j],
              {
                folder: `api/vinted/offers/${newOffer._id}`,
              }
            );

            newProduct_pictures.push(resultPictures);
          } catch (error) {
            console.log("uploadCloudinaryError ===> ", error.message);
          }
        }

        newOffer.product_image = resultImage;
        newOffer.product_pictures = newProduct_pictures;

        await newOffer.save();
        console.log(`✅ offer saved : ${i + 1} / ${products.length}`);
      } catch (error) {
        console.log("newOffer error ===> ", error.message);
      }
    }
    res.send("Done !");
    console.log(`🍺 All offers saved !`);
  }
});

module.exports = router;
