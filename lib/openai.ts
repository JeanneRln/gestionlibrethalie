import OpenAI from "openai";
import type { ResponseInputContent } from "openai/resources/responses/responses";
import { decrireCles, CLES_GRAMMAGE } from "@/lib/gemrcn/tables";
import { estService, estTypePlat, SERVICES, TYPES_PLAT, type ServiceId, type TypePlat } from "@/lib/services";

const TYPES = TYPES_PLAT.map((type) => type.id);
const SERVICES_IDS = SERVICES.map((service) => service.id);

export type FichierIa = { nom: string; mediaType: string; base64: string };

export type MenuExtrait = {
  repas: {
    date: string;
    service: ServiceId;
    plats: { nom: string; type: TypePlat; ingredients: { nom: string; grammageCle: string }[] }[];
  }[];
};

export type CommandeExtraite = {
  dateCommande: string | null;
  lignes: { nomProduit: string; quantite: number | null; unite: string; confiance: number }[];
};

export async function extraireMenu(
  fichier: FichierIa,
  creneaux: { date: string; service: string }[],
): Promise<MenuExtrait> {
  const brut = await demanderJson(
    fichier,
    `Tu lis un menu de centre de vacances. Renvoie uniquement les repas qui correspondent à ces créneaux : ${creneaux
      .map((creneau) => `${creneau.date} ${creneau.service}`)
      .join(", ")}.
Pour chaque plat, liste les ingrédients alimentaires et rattache chacun à une seule clé de grammage.
Pour un fruit ou un légume, le nom est l'intitulé écrit sur le menu (pommes, carottes, salade verte), pas le libellé de la famille.
N'invente pas de grammage en grammes : la clé suffit.
Au petit-déjeuner et au goûter, utilise les clés du groupe petit-déjeuner (pain_pd, lait_petit_dejeuner, lait_gouter, etc.), pas les clés du repas principal.
Le lait du goûter est lait_gouter, celui du petit-déjeuner est lait_petit_dejeuner.
Clés autorisées :
${decrireCles()}`,
    schemaMenu(),
    "extraction_menu",
  );
  return validerMenu(brut);
}

export async function extraireCommande(fichier: FichierIa): Promise<CommandeExtraite> {
  const brut = await demanderJson(
    fichier,
    `Tu lis un bon de commande Transgourmet, Sysco ou Vivalya. Extrais chaque ligne produit avec la quantité commandée, l'unité (kg, g, L, ml, piece ou colis) et un score de confiance entre 0 et 1.
Si la quantité ou l'unité est illisible, mets quantite à null et une confiance basse.
N'invente pas de ligne absente du document.`,
    schemaCommande(),
    "extraction_commande",
  );
  return validerCommande(brut);
}

function contenuFichier(fichier: FichierIa): ResponseInputContent {
  const estImage = fichier.mediaType.startsWith("image/");
  if (estImage) {
    return {
      type: "input_image",
      image_url: `data:${fichier.mediaType};base64,${fichier.base64}`,
      detail: "high",
    };
  }
  const media = fichier.mediaType === "application/pdf" || fichier.nom.toLowerCase().endsWith(".pdf")
    ? "application/pdf"
    : fichier.mediaType || "application/octet-stream";
  const nom = fichier.nom.trim() || (media === "application/pdf" ? "document.pdf" : "document");
  return {
    type: "input_file",
    filename: nom,
    file_data: `data:${media};base64,${fichier.base64}`,
    detail: "high",
  };
}

async function demanderJson(fichier: FichierIa, prompt: string, schema: Record<string, unknown>, nom: string) {
  const cle = process.env.OPENAI_API_KEY;
  if (!cle) {
    throw new Error("Ajoutez OPENAI_API_KEY dans .env.local pour importer un fichier.");
  }
  const client = new OpenAI({ apiKey: cle, timeout: 120_000 });
  const modele = process.env.OPENAI_MODEL || "gpt-4.1";
  let reponse;
  try {
    reponse = await client.responses.create({
      model: modele,
      input: [{ role: "user", content: [contenuFichier(fichier), { type: "input_text", text: prompt }] }],
      text: { format: { type: "json_schema", name: nom, strict: true, schema } },
    });
  } catch (erreur) {
    const message = erreur instanceof Error ? erreur.message : "";
    if (message.includes("credit_balance") || message.includes("insufficient_quota") || message.includes("billing")) {
      throw new Error("Le crédit OpenAI est épuisé. Ajoutez-en sur platform.openai.com, rubrique Billing.");
    }
    throw new Error("La lecture du fichier a échoué. Réessayez avec un PDF ou une photo plus nette.");
  }
  if (!reponse.output_text) throw new Error("L'IA n'a rien renvoyé. Réessayez avec un fichier plus net.");
  try {
    return JSON.parse(reponse.output_text) as unknown;
  } catch {
    throw new Error("L'IA n'a pas renvoyé un résultat exploitable. Réessayez.");
  }
}

function schemaMenu(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["repas"],
    properties: {
      repas: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["date", "service", "plats"],
          properties: {
            date: { type: "string" },
            service: { type: "string", enum: SERVICES_IDS },
            plats: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["nom", "type", "ingredients"],
                properties: {
                  nom: { type: "string" },
                  type: { type: "string", enum: TYPES },
                  ingredients: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["nom", "grammageCle"],
                      properties: {
                        nom: { type: "string" },
                        grammageCle: { type: "string", enum: CLES_GRAMMAGE },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
}

function schemaCommande(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["dateCommande", "lignes"],
    properties: {
      dateCommande: { type: ["string", "null"] },
      lignes: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["nomProduit", "quantite", "unite", "confiance"],
          properties: {
            nomProduit: { type: "string" },
            quantite: { type: ["number", "null"] },
            unite: { type: "string" },
            confiance: { type: "number" },
          },
        },
      },
    },
  };
}

function validerMenu(brut: unknown): MenuExtrait {
  if (!brut || typeof brut !== "object" || !("repas" in brut) || !Array.isArray(brut.repas)) {
    throw new Error("L'IA n'a pas renvoyé de menu exploitable.");
  }
  const repasExtraits: MenuExtrait["repas"] = [];
  for (const item of brut.repas) {
    if (!item || typeof item !== "object") continue;
    const date = lireTexte(item, "date");
    const service = lireTexte(item, "service");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !estService(service)) continue;
    const platsBruts = "plats" in item && Array.isArray(item.plats) ? item.plats : [];
    const platsExtraits = platsBruts.flatMap((plat: unknown) => {
      if (!plat || typeof plat !== "object") return [];
      const nom = lireTexte(plat, "nom").trim();
      const type = lireTexte(plat, "type");
      if (!nom) return [];
      const ingredientsBruts = "ingredients" in plat && Array.isArray(plat.ingredients) ? plat.ingredients : [];
      return [
        {
          nom,
          type: estTypePlat(type) ? type : "autre",
          ingredients: ingredientsBruts.flatMap((ingredient: unknown) => {
            if (!ingredient || typeof ingredient !== "object") return [];
            const nomIngredient = lireTexte(ingredient, "nom").trim();
            const cle = lireTexte(ingredient, "grammageCle");
            if (!nomIngredient || !CLES_GRAMMAGE.includes(cle)) return [];
            return [{ nom: nomIngredient, grammageCle: cle }];
          }),
        },
      ];
    });
    repasExtraits.push({ date, service, plats: platsExtraits });
  }
  return { repas: repasExtraits };
}

function validerCommande(brut: unknown): CommandeExtraite {
  if (!brut || typeof brut !== "object" || !("lignes" in brut) || !Array.isArray(brut.lignes)) {
    throw new Error("L'IA n'a pas renvoyé de commande exploitable.");
  }
  const dateBrute = "dateCommande" in brut && typeof brut.dateCommande === "string" ? brut.dateCommande : null;
  const dateCommande = dateBrute && /^\d{4}-\d{2}-\d{2}$/.test(dateBrute) ? dateBrute : null;
  const lignes = brut.lignes.flatMap((ligne) => {
    if (!ligne || typeof ligne !== "object") return [];
    const nomProduit = lireTexte(ligne, "nomProduit").trim();
    if (!nomProduit) return [];
    const quantiteBrute = "quantite" in ligne ? ligne.quantite : null;
    const quantite = typeof quantiteBrute === "number" && Number.isFinite(quantiteBrute) && quantiteBrute > 0 ? quantiteBrute : null;
    const confianceBrute = "confiance" in ligne && typeof ligne.confiance === "number" ? ligne.confiance : 0.4;
    return [
      {
        nomProduit,
        quantite,
        unite: lireTexte(ligne, "unite") || "piece",
        confiance: Math.min(1, Math.max(0, confianceBrute)),
      },
    ];
  });
  return { dateCommande, lignes };
}

function lireTexte(objet: object, cle: string) {
  const valeur = (objet as Record<string, unknown>)[cle];
  return typeof valeur === "string" ? valeur : "";
}
