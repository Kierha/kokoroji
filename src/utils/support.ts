import { Linking, Alert } from "react-native";

/**
 * Ouvre le client mail avec un template d'assistance prérempli
 * pour contacter le support Kokoroji.
 * 
 * Fournit un message structuré pour faciliter la description du problème.
 */
export function handleSupport() {
    const supportEmail = "support@kokoroji.com";
    const subject = encodeURIComponent(
        "Kokoroji — Demande d'assistance / signalement de bug"
    );
    const body = encodeURIComponent(
`Bonjour,

Je rencontre un souci ou souhaite poser une question concernant l'application Kokoroji.

-----------------
Merci de préciser :
• Sur quel écran ou fonctionnalité rencontrez-vous le problème ? (ex: Profil, Défis, Paramètres, ...)
• Sur quel appareil ? (modèle, version Android/iOS)
• Décrivez votre question, bug ou demande aussi précisément que possible :
   -

-----------------
Exemple de description : 
> “Je souhaite ajouter un enfant, mais le bouton de validation ne fonctionne pas sur la page Ajoutez vos enfants. J'utilise un Samsung Galaxy S20 sous Android 13.”

Vous pouvez également joindre une capture d'écran si besoin.

Merci d'avance pour votre aide,
[Votre prénom ou pseudo ici]`
    );

    const mailtoUrl = `mailto:${supportEmail}?subject=${subject}&body=${body}`;

    Linking.canOpenURL(mailtoUrl).then((supported) => {
        if (supported) {
            Linking.openURL(mailtoUrl);
        } else {
            Alert.alert(
                "Erreur",
                "Impossible d’ouvrir votre application d’email. Vérifiez que vous avez bien une app de messagerie configurée sur votre téléphone."
            );
        }
    });
}
