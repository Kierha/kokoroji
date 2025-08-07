// navigation/types.ts

// Typage de la stack principale (app principale)
export type RootStackParamList = {
    Home: undefined;
    ProfileScreen: undefined;
    EditProfile: {
        family: {
            id: number;
            name: string;
            parentName: string;
        };
        children: {
            name: string;
            birthdate: string;
            avatar: string;
        }[];
    };
    SettingsScreen: undefined;
    // Ajoute ici d’autres écrans principaux si besoin
};

// Typage de la stack d’onboarding
export type OnboardingStackParamList = {
    OnboardingWelcome: undefined;
    OnboardingFamily: undefined;
    OnboardingChildren: { familyName: string; parentName: string };
};

// Typage de la stack profil
export type ProfileStackParamList = {
    Home: undefined;
    ProfileScreen: undefined;
    EditProfile: {
        family: {
            id: number;
            name: string;
            parentName: string;
        };
        children: {
            name: string;
            birthdate: string;
            avatar: string;
        }[];
    };
    SettingsScreen: undefined;

};