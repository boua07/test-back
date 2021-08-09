var express = require("express");
const { Dossier } = require("../module/dossier");
var router = express.Router();

/**
 * Filters an array of objects using custom predicates.
 *
 * @param  {Array}  array: the array to filter
 * @param  {Object} filters: an object with the filter criteria
 * @return {Array}
 */
function filterArray(array, filters) {
  console.log("//////////////////////////");
  console.log(array);
  console.log("//////////////////////////");
  console.log(filters);
  console.log("//////////////////////////");
  const filterKeys = Object.keys(filters);
  return array.filter((item) => {
    // validates all filter criteria
    return filterKeys.every((key) => {
      // ignores non-function predicates
      if (typeof filters[key] !== "function") return true;
      return filters[key](item[key]);
    });
  });
}

router.post("/", async (req, res) => {
  try {
    const dossiers = await Dossier.find({})
      .populate("facturation")
      .populate("idWorkshop")
      .populate("vendeur")
      .populate("provenance")
      .populate("client");

    const {
      CreationDateMin,
      CreationDateMax,
      workshopBeginDateMin,
      workshopBeginDateMax,
      workshopEndDateMin,
      workshopEndDateMax,
      dateFacturationMax,
      dateFacturationMin,
      payementVendeur,
      payementCoach,
      Tarifs,
      types,
      call,
      vendeurs,
      workshops,
      provenances,
      coachs,
      statusDossier,
    } = req.body;
    console.log(req.body);
    const filters = {
      //size: (size) => size === 50 || size === 70,
      //color: (color) => ['blue', 'black'].includes(color.toLowerCase()),
      createdAt: (createdAt) => {
        if (CreationDateMin == null) {
          if (CreationDateMax == null) {
            return true;
          }
          if (createdAt <= new Date(CreationDateMax)) {
            return true;
          }
          return false;
        } else {
          if (CreationDateMax == null) {
            if (createdAt >= new Date(CreationDateMin)) {
              return true;
            }
          }
          if (
            createdAt >= new Date(CreationDateMin) &&
            createdAt <= new Date(CreationDateMax)
          )
            return true;
          return false;
        }
      },
      workshopBeginDate: (workshopBeginDate) => {
        if (workshopBeginDateMin == null) {
          if (workshopBeginDateMax == null) {
            return true;
          }
          if (workshopBeginDate <= new Date(workshopBeginDateMax)) {
            return true;
          }
          return false;
        } else {
          if (workshopBeginDateMax == null) {
            if (workshopBeginDate >= new Date(workshopBeginDateMin)) {
              return true;
            }
          }
          if (
            workshopBeginDate >= new Date(workshopBeginDateMin) &&
            workshopBeginDate <= new Date(workshopBeginDateMax)
          )
            return true;
          return false;
        }
      },

      workshopEndDate: (workshopEndDate) => {
        if (workshopEndDateMin == null) {
          if (workshopEndDateMax == null) {
            return true;
          }
          if (workshopEndDate <= new Date(workshopEndDateMax)) {
            return true;
          }
          return false;
        } else {
          if (workshopEndDateMax == null) {
            if (workshopEndDate >= new Date(workshopEndDateMin)) {
              return true;
            }
          }
          if (
            workshopEndDate >= new Date(workshopEndDateMin) &&
            workshopEndDate <= new Date(workshopEndDateMax)
          )
            return true;
          return false;
        }
      },
      facturation: (facturation) => {
        if (dateFacturationMin == null) {
          if (dateFacturationMax == null) {
            return true;
          }
          if (facturation.DateFacturation <= new Date(dateFacturationMax)) {
            return true;
          }
          return false;
        } else {
          if (dateFacturationMax == null) {
            if (facturation.DateFacturation >= new Date(dateFacturationMin)) {
              return true;
            }
          }
          if (
            facturation.DateFacturation >= new Date(dateFacturationMin) &&
            facturation.DateFacturation <= new Date(dateFacturationMax)
          )
            return true;
          return false;
        }
      },
      idWorkshop: (workshop) => {
        if (Tarifs == null) {
          return true;
        } else {
          if (Tarifs.includes(workshop.code_tarif)) {
            return true;
          }
        }
        return false;
      },

      type: (type) => {
        if (types == null) {
          return true;
        } else if (types.includes(type)) {
          return true;
        }
        return false;
      },
      coach: (coach) => {
        if (coachs == null) {
          return true;
        } else if (coachs.includes(coach)) {
          return true;
        }
        return false;
      },
      statusCall: (statusCall) => {
        if (call == null) {
          return true;
        } else if (call.includes(statusCall)) return true;
        return false;
      },
      status: (status) => {
        if (statusDossier == null) {
          return true;
        } else if (statusDossier.includes(status)) {
          return true;
        }
        return false;
      },
      provenance: (provenance) => {
        if (provenances == null) {
          return true;
        } else if (provenances.includes(provenance.provenance)) {
          
          return true;
        }
        
        return false;
      },
      vendeur: (vendeur) => {
        if (vendeurs == null) {
          return true;
        } else {
          if (vendeurs.includes(vendeur.name)) {
            return true;
          }
        }
        return false;
      },
    };

    const filters2 = {
      idWorkshop: (workshop) => {
        if (workshops == null) {
          return true;
        } else {
          if (workshops.includes(workshop.intitule)) return true;
        }
        return false;
      },
      facturation: (facturation) => {
        if (payementVendeur == null) {
          if (payementCoach == null) {
            return true;
          }
          if (facturation.CoachPaye == payementCoach) {
            return true;
          }
          return false;
        } else {
          if (payementCoach == null) {
            if (facturation.VendeurPaye == payementVendeur) {
              return true;
            }
          }
          if (
            facturation.VendeurPaye == payementVendeur &&
            facturation.CoachPaye == payementCoach
          )
            return true;
          return false;
        }
      },
    };

    try {
      console.log(filters)
      const filterKeys = Object.keys(filters);
      const result = dossiers.filter((item) => {
        // validates all filter criteria
        return filterKeys.every((key) => {
          // ignores non-function predicates
          if (typeof filters[key] !== "function") return true;
          return filters[key](item[key]);
        });
      });

      const filterKeys2 = Object.keys(filters2);

      const result2 = result.filter((item) => {
        // validates all filter criteria
        return filterKeys2.every((key) => {
          // ignores non-function predicates
          if (typeof filters2[key] !== "function") return true;
          return filters2[key](item[key]);
        });
      });
      res.send(result2);
    } catch (er) {
      res.status(400).send(er);
    }
  } catch (e) {
    res.status(404).send(e);
  }
});

/*router.get("/test", async (req, res) => {
  try {
    const dossiers = await Dossier.findOne({})
      .populate("facturation")
      .populate("idWorkshop")
      .populate("client");
    res.status(200).send(dossiers);
  } catch (er) {
    res.send(er);
  }
});*/

module.exports = router;
