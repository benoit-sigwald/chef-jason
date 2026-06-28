export interface Ingredient {
  nom: string;
  quantite: string;
}

export interface Recipe {
  titre: string;
  styleCuisine: string;
  accroche?: string;
  pourPersonnes?: number | null;
  difficulte?: string;
  tempsTotalMinutes?: number | null;
  prixEstime?: string;
  ingredients: Ingredient[];
  etapes: string[];
  astuceChef?: string;
  accordMets?: string;
  sourceInspiration?: string;
  image?: string;
}

export interface GenerateResult {
  introduction?: string;
  ingredientsDetectes?: string[];
  recettes: Recipe[];
}

export interface Criteria {
  demande?: string;
  personnes?: string;
  prix?: string;
  difficulte?: string;
  style?: string;
}

export interface InlineImage {
  mimeType: string;
  data: string; // base64 (sans préfixe dataURL)
}
