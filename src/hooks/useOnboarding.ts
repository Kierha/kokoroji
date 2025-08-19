
import { useState } from "react";
import { createFamily, addChild, setOnboardingDone } from "../services/onboardingService";
import { Child } from "../models/child";

/**
 * Hook pour piloter le flow d’onboarding, stocker les infos temporairement,
 * valider et sauvegarder en BDD à la fin du parcours.
 * UX : permet de gérer l’avancement, la validation et la persistance des données d’onboarding.
 * @returns Fonctions et états pour piloter l’onboarding
 */
export function useOnboarding() {
  // Étape courante du flow d'onboarding (0 = welcome, 1 = famille, 2 = enfants, 3 = confirmation)
  const [step, setStep] = useState<number>(0);

  // Données temporaires saisies par l'utilisateur
  const [familyName, setFamilyName] = useState("");
  const [parentName, setParentName] = useState("");
  const [children, setChildren] = useState<Omit<Child, "id" | "familyId" | "createdAt" | "updatedAt">[]>([]);

  /**
   * Ajoute un enfant dans la liste locale (avant validation BDD).
   * @param child Données de l'enfant à ajouter
   */
  const addChildLocal = (child: Omit<Child, "id" | "familyId" | "createdAt" | "updatedAt">) => {
    setChildren(prev => [...prev, child]);
  };

  /**
   * Supprime un enfant de la liste locale par son index.
   * @param index Index de l'enfant à supprimer
   */
  const removeChildLocal = (index: number) => {
    setChildren(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Valide et sauvegarde toutes les données d'onboarding en base.
   * Crée la famille, ajoute les enfants, puis marque l'onboarding comme terminé.
   * @returns L'identifiant de la famille créée
   */
  const finalizeOnboarding = async () => {
    const familyId = await createFamily(familyName, parentName);
    for (const c of children) {
      await addChild(familyId, c.name, c.birthdate, c.avatar);
    }
    await setOnboardingDone();
    return familyId;
  };

  /**
   * Vérifie si l'utilisateur peut passer à l'étape suivante selon les règles UX.
   * @returns true si la validation est OK
   */
  const canProceedToNext = () => {
    if (step === 1) {
      return familyName.trim().length > 0 && parentName.trim().length > 0;
    }
    if (step === 2) {
      return children.length > 0;
    }
    return true;
  };

  return {
    step,
    setStep,
    familyName,
    setFamilyName,
    parentName,
    setParentName,
    children,
    addChildLocal,
    removeChildLocal,
    finalizeOnboarding,
    canProceedToNext,
  };
}
