var express = require("express");
var router = express.Router();
var { Dossier } = require("../module/dossier");
var { Client } = require("../module/client");
var { Fichier } = require("../module/fichier");
const { PreEvaluation } = require("../module/PreEvaluation");
const { Evaluation } = require("../module/Evaluation");
const { CRCoach } = require("../module/CRCoach");
const { Facturation } = require("../module/Facturation");
const { Provenance } = require("../module/provenance");
const { User } = require("../module/user");
const { Modification } = require("../module/modification");
const { JournalAppel } = require("../module/JournalAppel");
const nodemailer = require("nodemailer");
const { getMaxListeners } = require("../app");

async function getFactureAmount(id) {
  try {
    const Facture = await Facturation.findOne({ _id: id });
    return Facture.MontantFacture;
  } catch (e) {}
}

async function getVendeurName(id) {
  try {
    const user = await User.findOne({ _id: id });

    return user.name + " " + user.lastname;
  } catch (e) {}
}

async function getProvenanceName(id) {
  try {
    const provenance = await Provenance.findOne({ _id: id });
    return provenance.provenance;
  } catch (e) {}
}

router.get("/totalsByStatus", async function (req, res) {
  const status = req.body["status"];
  try {
    const results = await Dossier.find({ status: status }).populate(
      "facturation"
    );

    var total = 0.0;

    for (var i = 0; i < results.length; i++) {
      if (results[i].facturation) {
        try {
          total += results[i].facturation.MontantFacture;
        } catch (e) {
          res.status(408).send("erreur dans le dossier " + results[i]._id);
        }
      }
    }
    res.send({ total: total });
  } catch (e) {
    res.status(409).send("erreur dans le dossier" + e);
  }
});

router.get("/totalsByDateVendeur", async function (req, res) {
  const beginDate = req.body["beginDate"];
  const endDate = req.body["endDate"];

  try {
    // get all the folders created in  that periode
    const results = await Dossier.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(beginDate), $lte: new Date(endDate) },
        },
      },
      {
        $group: {
          _id: "$_id",
          vendeur: { $first: "$vendeur" },
          facture: { $first: "$facturation" },
        },
      },
    ]);

    var lt = {};
    var totalamount2 = 0.0;
    for (i = 0; i < results.length; i++) {
      const vendeur = results[i]["vendeur"];
      const ammount = await getFactureAmount(results[i]["facture"]);
      totalamount2 += ammount;
      if (lt[vendeur] != null) {
        lt[vendeur]["nbdossiers"]++;
        lt[vendeur]["totalamount"] += ammount;
      } else {
        lt[vendeur] = { vendeur: vendeur, nbdossiers: 1, totalamount: ammount };
      }
    }

    for (const j in lt) {
      //console.log(await getVendeurName(lt[j]["vendeur"]) ) ;
      lt[j]["vendeur"] = await getVendeurName(lt[j]["vendeur"]);
    }
    res.send({
      result: lt,
      finalnbdossier: results.length,
      finaltotalamount: totalamount2,
    });
  } catch (e) {
    res.send(e);
  }
});

router.get("/totalsByDateProvenance", async function (req, res) {
  const beginDate = req.body["beginDate"];
  const endDate = req.body["endDate"];

  try {
    // get all the folders created in  that periode
    const results = await Dossier.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(beginDate), $lte: new Date(endDate) },
        },
      },
      {
        $group: {
          _id: "$_id",
          provenance: { $first: "$provenance" },
          facture: { $first: "$facturation" },
        },
      },
    ]);

    var lt = {};
    var totalamount2 = 0.0;

    for (i = 0; i < results.length; i++) {
      const provenance = results[i]["provenance"];
      const ammount = await getFactureAmount(results[i]["facture"]);
      totalamount2 += ammount;
      if (lt[provenance] != null) {
        lt[provenance]["nbdossiers"]++;
        lt[provenance]["totalamount"] += ammount;
      } else {
        lt[provenance] = {
          provenance: provenance,
          nbdossiers: 1,
          totalamount: ammount,
        };
      }
    }

    for (const j in lt) {
      lt[j]["provenance"] = await getProvenanceName(lt[j]["provenance"]);
    }

    res.send({
      result: lt,
      finalnbdossier: results.length,
      finaltotalamount: totalamount2,
    });
  } catch (e) {
    res.send({
      result: lt,
      finalnbdossier: results.length,
      finaltotalamount: totalamount2,
    });
  }
});

router.get("/totalsByDateProFor", async function (req, res) {
  const beginDate = req.body["beginDate"];
  const endDate = req.body["endDate"];

  try {
    // get all the folders created in  that periode
    const results = await Dossier.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(beginDate), $lte: new Date(endDate) },
          status: "En Formation",
        },
      },
      {
        $group: {
          _id: "$_id",
          provenance: { $first: "$provenance" },
          facture: { $first: "$facturation" },
        },
      },
    ]);

    var lt = {};
    var totalamount2 = 0.0;

    for (i = 0; i < results.length; i++) {
      const provenance = results[i]["provenance"];
      const ammount = await getFactureAmount(results[i]["facture"]);
      totalamount2 += ammount;
      if (lt[provenance] != null) {
        lt[provenance]["nbdossiers"]++;
        lt[provenance]["totalamount"] += ammount;
      } else {
        lt[provenance] = {
          provenance: provenance,
          nbdossiers: 1,
          totalamount: ammount,
        };
      }
    }

    for (const j in lt) {
      lt[j]["provenance"] = await getProvenanceName(lt[j]["provenance"]);
    }

    res.send({
      result: lt,
      finalnbdossier: results.length,
      finaltotalamount: totalamount2,
    });
  } catch (e) {
    res.send(e);
  }
});

/* créer un nouveau dossier  */

router.post("/", async (req, res) => {
  var clientId = "";
  var preEvaluationId = "";
  var evaluationId = "";
  var crCoachId = "";
  var facturationId = "";

  const {
    civility,
    firstName,
    lastName,
    dateOfBirth,
    email,
    mobile,
    fixe,
    adresse,
    codePostal,
    ville,
    budgetCPF,
    budgetDIF,
    autreBudget,
    difDisponibility,
    qualification,
    rechercheEmploi,
  } = req.body;
  try {
    const client = new Client({
      civility,
      firstName,
      lastName,
      dateOfBirth,
      email,
      mobile,
      fixe,
      adresse,
      codePostal,
      ville,
      budgetCPF,
      budgetDIF,
      autreBudget,
      difDisponibility,
      qualification,
      rechercheEmploi,
    });
    clientId = client["_id"];
    const results = await client.save();
    if (results) {
      const {
        langue,
        niveau,
        niveauEstimation,
        note,
        grammaire,
        vocabulaire,
        comprehensionOrale,
      } = req.body;
      try {
        const preEvaluation = new PreEvaluation({
          langue,
          niveau,
          niveauEstimation,
          note,
          grammaire,
          vocabulaire,
          comprehensionOrale,
        });
        const preEvaluationResults = await preEvaluation.save();
        preEvaluationId = preEvaluation["_id"];
        if (preEvaluationResults) {
          const {
            attentes,
            duree,
            prochainesAttentes,
            autorisation,
            estimation,
            questionsRestées,
            avisPasserelle,
            avisExplication,
            suggestions,
            pedagogieCoach,
            ecouteCoach,
            claireteCoach,
            adj1,
            adj2,
            adj3,
          } = req.body;

          try {
            const evaluation = new Evaluation({
              attentes,
              duree,
              prochainesAttentes,
              autorisation,
              estimation,
              questionsRestées,
              avisPasserelle,
              avisExplication,
              suggestions,
              pedagogieCoach,
              ecouteCoach,
              claireteCoach,
              adj1,
              adj2,
              adj3,
            });
            const evaluationResults = await evaluation.save();
            evaluationId = evaluationResults["_id"];
            if (evaluationResults) {
              const {
                connaissance,
                correspondanceFormation,
                implicationStagiaire,
                compteRenduFormation,
                programmeVu,
                progressionStagiaire,
              } = req.body;

              try {
                const crCoach = new CRCoach({
                  connaissance,
                  correspondanceFormation,
                  implicationStagiaire,
                  compteRenduFormation,
                  programmeVu,
                  progressionStagiaire,
                });
                const crCoachResults = await crCoach.save();
                crCoachId = crCoach["_id"];
                if (crCoachResults) {
                  const {
                    MontantFacture,
                    payePar,
                    CoutElearning,
                    DateReglementElearning,
                    CoutCertification,
                    DateReglementCertif,
                    ElearningPaye,
                    CertifPaye,
                    AutreCout1,
                    AutreCout2,
                    DateReglementCout1,
                    DateReglementCout2,
                    Cout1Paye,
                    Cout2Paye,
                    CoutCoach,
                    DateReglementCoach,
                    CoachPaye,
                    CoutVendeur,
                    DateReglementVendeur,
                    VendeurPaye,
                    Factor,
                  } = req.body;
                  try {
                    const facturation = new Facturation({
                      MontantFacture,
                      payePar,
                      CoutElearning,
                      DateReglementElearning,
                      CoutCertification,
                      DateReglementCertif,
                      ElearningPaye,
                      CertifPaye,
                      AutreCout1,
                      AutreCout2,
                      DateReglementCout1,
                      DateReglementCout2,
                      Cout1Paye,
                      Cout2Paye,
                      CoutCoach,
                      DateReglementCoach,
                      CoachPaye,
                      CoutVendeur,
                      DateReglementVendeur,
                      VendeurPaye,
                      Factor,
                    });

                    const facturationResults = await facturation.save();
                    facturationId = facturation["_id"];
                    if (facturationResults) {
                      const {
                        status,
                        type,
                        rappelGestionnaire,
                        dateRappel,
                        provenance,
                        statusCall,
                        vendeur,
                        categorie,
                        entreprise,
                        numeroEdOF,
                        confidentialObservation,
                        idWorkshop,
                        cpf,
                        opca,
                        financementPerso,
                        remise_cpf,
                        remmise_opca,
                        remmise_fp,
                        workshopBeginDate,
                        workshopEndDate,
                        workshopDescription,
                        coaching,
                        coach,
                        certification,
                        certificationId,
                        certificationPassword,
                        appointments,
                        performedAppointments,
                        appointmentsObservation,
                      } = req.body;
                      try {
                        const client = clientId;
                        const preEvaluation = preEvaluationId;
                        const evaluation = evaluationId;
                        const crCoach = crCoachId;
                        const facturation = facturationId;
                        const dossier = new Dossier({
                          status,
                          type,
                          rappelGestionnaire,
                          dateRappel,
                          provenance,
                          statusCall,
                          vendeur,
                          categorie,
                          client,
                          entreprise,
                          numeroEdOF,
                          confidentialObservation,
                          idWorkshop,
                          cpf,
                          opca,
                          financementPerso,
                          remise_cpf,
                          remmise_opca,
                          remmise_fp,
                          workshopBeginDate,
                          workshopEndDate,
                          workshopDescription,
                          coaching,
                          coach,
                          certification,
                          certificationId,
                          certificationPassword,
                          appointments,
                          performedAppointments,
                          appointmentsObservation,
                          preEvaluation,
                          evaluation,
                          crCoach,
                          facturation,
                        });
                         await dossier.save()
                         const results=await Dossier.findOne({}, {}, { sort: { 'createdAt' : -1 } }).populate("idWorkshop")
                                                                                                    .populate("client")
                                                                                                    .populate("crCoach")
                                                                                                    .populate("evaluation")
                                                                                                    .populate("facturation")
                                                                                                    .populate("preEvaluation")
                                                                                                    .populate("provenance")
                                                                                                    .populate("vendeur")
                                                                                                    .populate("journalAppel")
                                                                                                    .populate("signatures")
                                                                                                    .populate("coach")
                                                                                                    .populate("files")
                                                                                                    .populate("filledFiles");
                        res.status(200).send(results);
                        const operation = "Création";
                        const user = req.body.userId; //req.user._id; after adding jwt token
                        const newStatus = status;
                        const modif = new Modification({
                          client,
                          operation,
                          user,
                          newStatus,
                        });
                        const result2 = modif.save();
                        
                        console.log("done")
                      } catch (e) {
                        console.log(e);
                        res.status(201).send(e);
                      }
                    } else {
                      res.status(202).send("facturation not created ");
                    }
                  } catch (e) {
                    res.status(203).send(e);
                  }
                } else {
                  res.status(204).send("crCoach not created ");
                }
              } catch (e) {
                res.status(205).send(e);
              }
            } else {
              res.status(206).send("evaluation not created ");
            }
          } catch (e) {
            res.status(207).send(e);
          }
        } else {
          res.status(208).send("preEvaluation not created ");
        }
      } catch (e) {
        res.status(209).send(e);
      }
    } else {
      res.status(210).send("client not created");
    }
  } catch (e) {
    res.status(211).send(e);
  }
});

router.get("/", async (req, res) => {
  try {
    const results = await Dossier.find({}).populate("idWorkshop")
                                          .populate("client")
                                          .populate("crCoach")
                                          .populate("evaluation")
                                          .populate("facturation")
                                          .populate("preEvaluation")
                                          .populate("provenance")
                                          .populate("vendeur")
                                          .populate("journalAppel")
                                          .populate("signatures")
                                          .populate("coach")
                                          .populate("files")
                                          .populate("filledFiles")
                                          
                                          ;
    res.send(results);
  } catch (ex) {
    res.send(ex);
  }
});

router.put("/coutElearning", async (req, res) => {
  const { _id, cout } = req.body;

  try {
    let dossier = await Dossier.findById(_id);
    let idfacture = dossier["facturation"];
    let a = await Facturation.findById(idfacture);

    var result = await Facturation.findByIdAndUpdate(
      { _id: idfacture },
      {
        CoutElearning: cout,
      },
      { new: true }
    );
    res.send(result);

  } catch (e) {
    res.send(e);
  }
});

router.put("/coutCertification", async (req, res) => {
  const { _id, cout } = req.body;

  try {
    let dossier = await Dossier.findById(_id);

    let idfacture = dossier["facturation"];
    var result = await Facturation.findByIdAndUpdate(
      { _id: idfacture },
      {
        CoutCertification: cout,
      },
      { new: true }
    );
    res.send(result);
  } catch (e) {
    res.send(e);
  }
});
router.put("/coutVendeur", async (req, res) => {
  const { _id, cout } = req.body;

  try {
    let dossier = await Dossier.findById(_id);
    let idfacture = dossier["facturation"];
    var result = await Facturation.findByIdAndUpdate(
      { _id: idfacture },
      {
        CoutVendeur: cout,
      },
      { new: true }
    );
    res.send(result);
  } catch (e) {
    res.send(e);
  }
});
router.put("/coutCoach", async (req, res) => {
  const { _id, cout } = req.body;

  try {
    let dossier = await Dossier.findById(_id);

    let idfacture = dossier["facturation"];

    var result = await Facturation.findByIdAndUpdate(
      { _id: idfacture },
      {
        CoutCoach: cout,
      },
      { new: true }
    );
    res.send(result);
  } catch (e) {
    res.send(e);
  }
});

router.put("/statutcall", async (req, res) => {
  const { _id, statut } = req.body;

  try {
    var result = await Dossier.findByIdAndUpdate(
      { _id: _id },
      {
        statusCall: statut,
      },
      { new: true }
    );
    res.send(result);
  } catch (e) {
    res.send(e);
  }
});

router.put("/statutdossier", async (req, res) => {
  const { _id, status } = req.body;
  try {
    var result = await Dossier.findByIdAndUpdate(
      { _id: _id },
      {
        status: status,
      },
      { new: false }
    ).populate("client");

    // creating modification
    if (status.localeCompare(result["status"])) {
      const operation = "Chgt statut";
      const user = req.body.userId; //req.user._id; after adding jwt token
      const newStatus = status;
      const previousStatus = result["status"];
      const client = result["client"]["_id"];

      result["status"] = status;
      const modif = new Modification({
        client,
        operation,
        user,
        newStatus,
        previousStatus,
      });
      const result2 = await modif.save();
    }
    res.send(result);
  } catch (e) {
    res.status(400).send(e);
  }
});

router.put("/vendeur", async (req, res) => {
  const { _id, vendeur } = req.body;

  try {
    var result = await Dossier.findByIdAndUpdate(
      { _id: _id },
      {
        vendeur: vendeur,
      },
      { new: true }
    );
    res.send(result);
  } catch (e) {
    res.send(e);
  }
});
router.put("/provenance", async (req, res) => {
  const { _id, provenance } = req.body;

  try {
    var result = await Dossier.findByIdAndUpdate(
      { _id: _id },
      {
        provenance: provenance,
      },
      { new: true }
    );
    res.send(result);
  } catch (e) {
    res.send(e);
  }
});

router.get("/search/:search", async (req, res) => {
  const { search } = req.params;

  var dossiers = [];
  if (search) {
    Client.aggregate([
      { $project: { name: { $concat: ["$firstName", " ", "$lastName"] } } },
      { $match: { name: { $regex: search, $options: "i" } } },
    ]).exec(async function (err, results) {
      for (i = 0; i < results.length; i++) {
        const clientid = results[i]["_id"];
        const dossier = await Dossier.find({ client: clientid });
        for (k = 0; k < dossier.length; k++) {
          dossiers.push(dossier[k]);
        }
      }
      res.send(dossiers);
    });
  } else {
    res.send("no search");
  }
});

router.delete("/:id", async (req, res) => {
  const dossier = await Dossier.findOne({ _id: req.params.id });
  if (dossier != null) {
    const clientid = dossier["client"];
    const facturationid = dossier["facturation"];
    const evaluationid = dossier["evaluation"];
    const preevaluationid = dossier["preEvaluation"];
    const crcoachid = dossier["crCoach"];
    try {
      const dossiers = await Dossier.findByIdAndDelete(req.params.id).exec();
      const clients = await Client.findByIdAndDelete(clientid).exec();
      const facturations = await Facturation.findByIdAndDelete(
        facturationid
      ).exec();
      const evaluations = await Evaluation.findByIdAndDelete(
        evaluationid
      ).exec();
      const preevaluations = await PreEvaluation.findByIdAndDelete(
        preevaluationid
      ).exec();
      const crcoachs = await CRCoach.findByIdAndDelete(crcoachid).exec();
      res.send("success");
    } catch (e) {
      res.send(e);
    }
  } else {
    res.send("dossier n'existe pas ");
  }
});

router.put("/", async (req, res) => {
  try {
    const {
      civility,
      firstName,
      lastName,
      dateOfBirth,
      email,
      mobile,
      fixe,
      adresse,
      codePostal,
      ville,
      budgetCPF,
      budgetDIF,
      autreBudget,
      difDisponibility,
      qualification,
      rechercheEmploi,
      _id,
    } = req.body;
    let dossier = await Dossier.findById(_id);

    let idclient = dossier["client"];
    const update = {
      civility,
      firstName,
      lastName,
      dateOfBirth,
      email,
      mobile,
      fixe,
      adresse,
      codePostal,
      ville,
      budgetCPF,
      budgetDIF,
      autreBudget,
      difDisponibility,
      qualification,
      rechercheEmploi,
    };
    filter = { _id: idclient };

    let clients = await Client.findByIdAndUpdate(filter, update, {
      new: true,
    });
    if (clients) {
      const {
        langue,
        niveau,
        niveauEstimation,
        note,
        grammaire,
        vocabulaire,
        comprehensionOrale,
      } = req.body;
      try {
        updatepre = {
          langue,
          niveau,
          niveauEstimation,
          note,
          grammaire,
          vocabulaire,
          comprehensionOrale,
        };
        preevaluationid = dossier["preEvaluation"];
        filterpreEvaluation = { _id: preevaluationid };
        let preEvaluations = await PreEvaluation.findByIdAndUpdate(
          filterpreEvaluation,
          updatepre,
          {
            new: true,
          }
        );

        if (preEvaluations) {
          const {
            attentes,
            duree,
            prochainesAttentes,
            autorisation,
            estimation,
            questionsRestées,
            avisPasserelle,
            avisExplication,
            suggestions,
            pedagogieCoach,
            ecouteCoach,
            claireteCoach,
            adj1,
            adj2,
            adj3,
          } = req.body;
          try {
            updateev = {
              attentes,
              duree,
              prochainesAttentes,
              autorisation,
              estimation,
              questionsRestées,
              avisPasserelle,
              avisExplication,
              suggestions,
              pedagogieCoach,
              ecouteCoach,
              claireteCoach,
              adj1,
              adj2,
              adj3,
            };
            
            evaluationid = dossier["evaluation"];
            filterEvaluation = { _id: evaluationid };
            let Evaluations = await Evaluation.findByIdAndUpdate(
              filterEvaluation,
              updateev,
              {
                new: true,
              }
            );
            if (Evaluations) {
              const {
                connaissance,
                correspondanceFormation,
                implicationStagiaire,
                compteRenduFormation,
                programmeVu,
                progressionStagiaire,
              } = req.body;
              try {
                updateCRCoach = {
                  connaissance,
                  correspondanceFormation,
                  implicationStagiaire,
                  compteRenduFormation,
                  programmeVu,
                  progressionStagiaire,
                };
                CRCoachid = dossier["crCoach"];
                filtercrCoach = { _id: CRCoachid };
                let crCoachs = await CRCoach.findByIdAndUpdate(
                  filtercrCoach,
                  updateCRCoach,
                  {
                    new: true,
                  }
                );


                if (crCoachs) {
                  const {
                    MontantFacture,
                    payePar,
                    CoutElearning,
                    DateReglementElearning,
                    CoutCertification,
                    DateReglementCertif,
                    ElearningPaye,
                    CertifPaye,
                    AutreCout1,
                    AutreCout2,
                    DateReglementCout1,
                    DateReglementCout2,
                    Cout1Paye,
                    Cout2Paye,
                    CoutCoach,
                    DateReglementCoach,
                    CoachPaye,
                    CoutVendeur,
                    DateReglementVendeur,
                    VendeurPaye,
                    Factor,
                    NFacturation,
                    DateFacturation,
                    NAvoir,
                    DateAvoir,
                  } = req.body;
                  try {
                    updateFacturation = {
                      MontantFacture,
                      payePar,
                      CoutElearning,
                      DateReglementElearning,
                      CoutCertification,
                      DateReglementCertif,
                      ElearningPaye,
                      CertifPaye,
                      AutreCout1,
                      AutreCout2,
                      DateReglementCout1,
                      DateReglementCout2,
                      Cout1Paye,
                      Cout2Paye,
                      CoutCoach,
                      DateReglementCoach,
                      CoachPaye,
                      CoutVendeur,
                      DateReglementVendeur,
                      VendeurPaye,
                      Factor,
                      NFacturation,
                      DateFacturation,
                      NAvoir,
                      DateAvoir,
                    };

                    factureid = dossier["facturation"];
                    filterfacture = { _id: factureid };
                    let facturations = await Facturation.findByIdAndUpdate(
                      filterfacture,
                      updateFacturation,
                      {
                        new: true,
                      }
                    );
       

                    if (facturations) {
                      const {
                        status,
                        type,
                        rappelGestionnaire,
                        dateRappel,
                        provenance,
                        statusCall,
                        vendeur,
                        categorie,
                        entreprise,
                        numeroEdOF,
                        confidentialObservation,
                        idWorkshop,
                        cpf,
                        opca,
                        financementPerso,
                        remise_cpf,
                        remmise_opca,
                        remmise_fp,
                        workshopBeginDate,
                        workshopEndDate,
                        workshopDescription,
                        coaching,
                        coach,
                        certification,
                        certificationId,
                        certificationPassword,
                        appointments,
                        performedAppointments,
                        appointmentsObservation,
                      } = req.body;
                      try {
                        client = idclient;
                        preEvaluation = preevaluationid;
                        evaluation = evaluationid;
                        crCoach = CRCoachid;
                        facturation = factureid;
                        updatedossier = {
                          client,
                          preEvaluation,
                          evaluation,
                          crCoach,
                          facturation,
                          status,
                          type,
                          rappelGestionnaire,
                          dateRappel,
                          provenance,
                          statusCall,
                          vendeur,
                          categorie,
                          entreprise,
                          numeroEdOF,
                          confidentialObservation,
                          idWorkshop,
                          cpf,
                          opca,
                          financementPerso,
                          remise_cpf,
                          remmise_opca,
                          remmise_fp,
                          workshopBeginDate,
                          workshopEndDate,
                          workshopDescription,
                          coaching,
                          coach,
                          certification,
                          certificationId,
                          certificationPassword,
                          appointments,
                          performedAppointments,
                          appointmentsObservation,
                        };

                        filterdossier = { _id: req.body._id };
                        let dossiers = await Dossier.findByIdAndUpdate(
                          filterdossier,
                          updatedossier,
                          {
                            new: true,
                          }
                        ).populate("idWorkshop")
                        .populate("client")
                        .populate("crCoach")
                        .populate("evaluation")
                        .populate("facturation")
                        .populate("preEvaluation")
                        .populate("provenance")
                        .populate("vendeur")
                        .populate("journalAppel")
                        .populate("signatures")
                        .populate("coach")
                        .populate("files")
                        .populate("filledFiles");

                        if (status.localeCompare(dossier["status"])) {
                          const operation = "Chgt statut";
                          const user = req.body.userId; //req.user._id; after adding jwt token
                          const newStatus = status;
                          const previousStatus = dossier["status"];
                          const modif = new Modification({
                            client,
                            operation,
                            user,
                            newStatus,
                            previousStatus,
                          });
                          const result2 = await modif.save();
                        }

                        res.send(dossiers);
                        console.log("done");
                      } catch (e) {
                        res.status(201).send(e);
                      }
                    } else {
                      res.status(202).send("facturation not updated ");
                    }
                  } catch (e) {
                    res.status(203).send(e);
                  }
                } else {
                  res.status(204).send("crCoach not updated ");
                }
              } catch (e) {
                res.status(205).send(e);
              }
            } else {
              res.status(206).send("evaluation not updated ");
            }
          } catch (e) {
            res.status(207).send(e);
          }
        } else {
          res.status(208).send("preEvaluation not updated ");
        }
      } catch (e) {
        res.status(209).send(e);
      }
    } else {
      res.status(210).send("client not updated");
    }
  } catch (e) {
    res.status(211).send(e);
  }
});

router.get("/uploads/:id", async (req, res) => {
  try {
    var dossier = await Dossier.findOne({ _id: req.params.id });
    var resultArray = await Fichier.find({ _id: { $in: dossier.files } });

    //console.log(resultArray);
    res.send(resultArray);
  } catch (ex) {
    res.send(ex);
  }
});
router.get("/filledFiles/:id", async (req, res) => {
  try {
    var dossier = await Dossier.findOne({ _id: req.params.id });
    var resultArray = await Fichier.find({ _id: { $in: dossier.filledFiles } });

    //console.log(resultArray);
    res.send(resultArray);
  } catch (ex) {
    res.send(ex);
  }
});
//delete a file from the uploads
router.post("/uploads", async (req, res) => {
  const { file_id, _id } = req.body;

  try {
    const fichs = await Fichier.findByIdAndDelete(file_id).exec();
    const results = await Dossier.updateOne(
      {
        _id,
      },
      { $pull: { files: file_id } }
    );
    res.send(results);
    console.log("deleted");
  } catch (ex) {
    res.send(ex);
  }
});
router.get("/client/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const results = await Client.find({ _id: id });
    res.send(results);
  } catch (ex) {
    res.send(ex);
  }
});
router.get("/preval/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const results = await PreEvaluation.find({ _id: id });
    res.send(results);
  } catch (ex) {
    res.send(ex);
  }
});
router.get("/eval/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const results = await Evaluation.find({ _id: id });
    res.send(results);
  } catch (ex) {
    res.send(ex);
  }
});
router.get("/crcoach/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const results = await CRCoach.find({ _id: id });
    res.send(results);
  } catch (ex) {
    res.send(ex);
  }
});
router.get("/facturation/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const results = await Facturation.find({ _id: id });
    res.send(results);
  } catch (ex) {
    res.send(ex);
  }
});
router.get("/journalAppel/:id", async (req, res) => {
  try {
    var dossier = await Dossier.findOne({ _id: req.params.id });
    var resultArray = await JournalAppel.find({ _id: { $in: dossier.journalAppel} });

    //console.log(resultArray);
    res.send(resultArray);
  } catch (ex) {
    res.send(ex);
  }
});

module.exports = router;
