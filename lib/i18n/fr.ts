import type { TranslationResource } from './en';

/**
 * French strings, mirroring `en.ts` key-for-key. Where the real app's own
 * French wording is known (driver-facing terms already in production), it's
 * used verbatim instead of a fresh translation, so this matches what
 * drivers already know.
 */
const fr: TranslationResource = {
  tabs: {
    home: 'Accueil',
    runsheets: 'Tournées',
    alerts: 'Alertes',
    profile: 'Profil',
  },

  offlineBanner: {
    message: 'Vous êtes hors ligne — les modifications seront synchronisées une fois reconnecté',
  },

  common: {
    cancel: 'Annuler',
    save: 'Enregistrer',
    back: 'Retour',
    loading: 'Chargement…',
    comingSoon: '{{feature}} — bientôt disponible',
    genericError: "Une erreur s'est produite. Veuillez réessayer.",
    nav: {
      home: 'Accueil',
      runsheets: 'Tournées',
      pickups: 'Collectes',
      transfers: 'Transferts',
      returns: 'Retours',
      notifications: 'Notifications',
      profile: 'Profil',
    },
    timeBlock: {
      morning: 'Matin',
      afternoon: 'Après-midi',
      evening: 'Soir',
    },
    package_one: '{{count}} colis',
    package_other: '{{count}} colis',
    callToast: 'Appel — bientôt disponible',
    messageToast: 'Message — bientôt disponible',
  },

  auth: {
    login: {
      tagline: 'Livrez plus. Stressez moins.',
      phoneLabel: 'Numéro de téléphone',
      phonePlaceholder: '+216 XX XXX XXX',
      passwordLabel: 'Mot de passe',
      passwordPlaceholder: '••••••••••',
      logIn: 'Connexion',
      or: 'OU',
      appleToast: 'Connexion avec Apple — bientôt disponible',
      googleToast: 'Connexion avec Google — bientôt disponible',
      newDriver: 'Nouveau chauffeur ? ',
      createAccount: 'Créer un compte',
      errors: {
        invalidCredentials: 'Numéro de téléphone ou mot de passe incorrect.',
      },
    },
    register: {
      stepLabel: 'Étape 1 sur 2',
      title: 'Créer un compte',
      fullNameLabel: 'Nom complet',
      fullNamePlaceholder: 'Marcus Alden',
      phoneLabel: 'Numéro de téléphone',
      phonePlaceholder: '+216 XX XXX XXX',
      emailLabel: 'E-mail',
      emailPlaceholder: 'marcus.alden@jibex.com',
      plateLabel: "Numéro d'immatriculation",
      platePlaceholder: 'TU-2847-KL',
      passwordLabel: 'Mot de passe',
      passwordPlaceholder: '••••••••••',
      retypePasswordLabel: 'Confirmer le mot de passe',
      continue: 'Continuer',
      errors: {
        passwordMismatch: 'Les mots de passe ne correspondent pas.',
      },
    },
  },

  home: {
    greeting: {
      morning: 'Bonjour',
      afternoon: 'Bon après-midi',
      evening: 'Bonsoir',
    },
    shift: {
      readyTitle: 'Prêt à commencer ?',
      readySubtitle: "Commencez le suivi des livraisons d'aujourd'hui",
      startShift: 'Démarrer la tournée',
      onShiftSince: 'En tournée · Depuis {{time}}',
      endShift: 'Terminer la tournée',
    },
    timeSensitive_one: '{{count}} arrêt urgent restant aujourd\'hui',
    timeSensitive_other: "{{count}} arrêts urgents restants aujourd'hui",
    deliveriesCardTitle: 'Colis à livrer',
    completedOfTotal: '{{delivered}} sur {{total}} complétés',
    onPace: 'En bonne voie pour terminer à {{time}}',
    stats: {
      delivered: 'Livrés',
      pending: 'Restants',
      failed: 'Échoués',
      pickups: 'Collectes',
    },
    cashCollected: 'Espèces collectées',
  },

  runsheets: {
    headerTitle: 'Tournées',
    optimizedRoute: 'Itinéraire optimisé pour la distance la plus courte',
    segments: { all: 'Tous', pending: 'En attente', delivered: 'Livrés' },
    nextStop: 'Prochain arrêt',
    codChip: 'COD {{amount}}',
    empty: {
      all: 'Aucun arrêt pour le moment',
      pending: 'Aucun arrêt en attente',
      delivered: 'Aucun arrêt livré',
    },
  },

  runsheetSchedule: {
    headerTitle: 'Calendrier',
    today: "Aujourd'hui",
    viewingToday: "Affichage de la tournée d'aujourd'hui",
    viewingTodayBody:
      "Retournez pour voir les arrêts d'aujourd'hui, dans l'ordre d'itinéraire optimisé.",
    backToRunsheet: 'Retour à la tournée',
    emptyTitle: 'Aucune tournée chargée pour le {{date}}',
    emptyBody:
      'Les autres jours apparaîtront ici une fois Jibex connecté à votre système de répartition.',
  },

  jobDetail: {
    stopOf: 'Arrêt {{index}} sur {{total}}',
    moreOptionsToast: "Plus d'options — bientôt disponible",
    mapBadge: '{{distance}} mi · ≈{{minutes}} min',
    navigate: 'Itinéraire',
    codLabel: 'Encaissement à la livraison',
    codCash: '{{amount}} en espèces',
    packageInfo_one: '{{count}} colis · {{weight}} lbs',
    packageInfo_other: '{{count}} colis · {{weight}} lbs',
    fragile: 'Fragile',
    startDelivery: 'Commencer la livraison',
    cantDeliver: 'Impossible de livrer',
  },

  otp: {
    title: 'Confirmer la livraison',
    subtitle: 'Demandez au client le code à 4 chiffres envoyé par SMS',
    resend: 'Renvoyer le code',
    verify: 'Vérifier et terminer',
    unreachable: 'Client injoignable ? Appeler',
    takePhotoInstead: 'Prendre une photo à la place',
    errors: {
      incorrectCode: 'Code incorrect. Demandez au client de le confirmer et réessayez.',
    },
  },

  cantDeliver: {
    title: 'Impossible de livrer',
    subtitle: "Indiquez à la répartition pourquoi cet arrêt n'a pas pu être complété",
    noteLabel: 'Note (facultatif)',
    notePlaceholder: 'Toute information utile pour la répartition…',
    confirm: 'Mettre à jour le statut',
  },

  cashCollected: {
    title: 'Colis livré',
    subtitle: 'Commande #{{id}} complétée',
    cashCollected: 'Espèces collectées',
    todaysTotal: "Total d'aujourd'hui",
    totalChange: '{{before}} → {{after}}',
    nextStop: 'Prochain arrêt',
    backToRunsheet: 'Retour à la tournée',
  },

  photoProof: {
    title: 'Preuve photo',
    permissionBody: "L'accès à la caméra est nécessaire pour capturer la preuve de livraison.",
    enableCamera: 'Activer la caméra',
    hintCapture: 'Prenez une photo nette du colis à l\'adresse de livraison.',
    hintConfirm: 'Colis laissé à la porte ? Confirmez pour terminer cette livraison.',
    confirmDelivery: 'Confirmer la réception',
    retake: 'Reprendre la photo',
  },

  scanner: {
    title: 'Scanner le colis',
    permissionTitle: 'Accès à la caméra requis',
    permissionBody: 'Jibex utilise la caméra pour scanner les codes-barres et confirmer les collectes.',
    enableCamera: 'Activer la caméra',
    hintAlign: 'Alignez le code-barres dans le cadre pour confirmer la collecte',
    hintChecking: 'Vérification du code…',
    manualPlaceholder: 'ex. TRK-5DF3697E',
    enterManually: 'Saisir le code manuellement',
    useCamera: 'Utiliser la caméra',
    confirmedToast: 'Confirmé — {{label}}',
    errors: {
      notRecognized: 'Code non reconnu. Réessayez ou saisissez-le manuellement.',
    },
  },

  pickups: {
    headerTitle: 'Collectes',
    segments: { scheduled: 'Prévues', completed: 'Terminées' },
    nextPickup: 'Prochaine collecte',
    startPickup: 'Démarrer la collecte',
    empty: {
      scheduled: 'Aucune collecte prévue',
      completed: 'Aucune collecte terminée',
    },
  },

  transfers: {
    headerTitle: 'Transferts',
    status: { completed: 'Terminé', awaitingHandoff: 'En attente de remise' },
    detailLine: '{{count}} · {{location}} · {{time}}',
    initiateTransfer: 'Initier un transfert',
    empty: 'Aucun transfert en cours',
  },

  returns: {
    headerTitle: 'Retours',
    orderNumber: 'Commande #{{id}}',
    empty: 'Aucun retour en attente',
  },

  alerts: {
    headerTitle: 'Notifications',
    markAllRead: 'Tout marquer comme lu',
    today: "Aujourd'hui",
    earlier: 'Plus tôt',
    yesterday: 'Hier',
    empty: 'Vous êtes à jour',
  },

  profile: {
    headerTitle: 'Profil',
    editPhotoToast: 'Modifier la photo — bientôt disponible',
    rating: '{{rating}} note',
    stats: { delivered: 'Livrés', completion: 'Taux de livraison', cashCollected: 'Espèces collectées' },
    sectionAccount: 'Compte',
    sectionSupport: 'Assistance',
    rows: {
      personalInfo: 'Informations personnelles',
      vehicleDetails: 'Détails du véhicule',
      bankInfo: 'Coordonnées bancaires',
      availability: 'Disponibilité',
      helpCenter: "Centre d'aide",
      logOut: 'Déconnexion',
    },
  },

  availability: {
    headerTitle: 'Disponibilité',
    intro:
      'Sélectionnez une date pour marquer les créneaux où vous êtes disponible. La répartition utilise ceci pour planifier les prochaines tournées.',
    pastNote: 'Impossible de définir une disponibilité pour une date passée.',
    summary_one: '{{count}} jour marqué disponible ce mois-ci',
    summary_other: '{{count}} jours marqués disponibles ce mois-ci',
  },

  shiftSummary: {
    wrappingUp: 'Clôture de votre tournée…',
    title: 'Tournée terminée',
    timeRange: '{{start}} – {{end}} · {{duration}}',
    stats: { delivered: 'Livrés', failed: 'Échoués', miles: 'Miles' },
    cashToHandOff: 'Espèces à remettre',
    handedOff: 'Remis',
    confirm: 'Confirmer',
    done: 'Terminé',
  },

  personalInfo: {
    headerTitle: 'Informations personnelles',
    fullNameLabel: 'Nom complet',
    phoneLabel: 'Numéro de téléphone',
    emailLabel: 'E-mail',
    saveChanges: 'Enregistrer',
    savedToast: 'Informations personnelles enregistrées',
  },

  vehicleDetails: {
    headerTitle: 'Détails du véhicule',
    types: { motorcycle: 'Moto', car: 'Voiture', van: 'Camionnette', bicycle: 'Vélo' },
    plateLabel: "Numéro d'immatriculation",
    modelLabel: 'Modèle',
    colorLabel: 'Couleur',
    saveChanges: 'Enregistrer',
    savedToast: 'Détails du véhicule enregistrés',
  },

  bankInfo: {
    headerTitle: 'Coordonnées bancaires',
    note: 'Utilisées uniquement pour déposer vos versements en espèces.',
    bankNameLabel: 'Nom de la banque',
    accountHolderLabel: 'Titulaire du compte',
    ibanLabel: 'IBAN',
    saveChanges: 'Enregistrer',
    savedToast: 'Coordonnées bancaires enregistrées',
  },

  helpCenter: {
    headerTitle: "Centre d'aide",
    contactSupport: "Contacter l'assistance",
    faqSectionLabel: 'Questions fréquentes',
    faqs: [
      {
        question: 'Quand suis-je payé ?',
        answer:
          "Les espèces collectées à la livraison sont à remettre en fin de tournée — voir Résumé de tournée. Votre salaire de base hebdomadaire et vos primes sont déposés sur le compte bancaire enregistré chaque vendredi.",
      },
      {
        question: 'Que faire si un client refuse un colis ?',
        answer:
          'Ouvrez l\'arrêt, appuyez sur "Impossible de livrer", puis choisissez "Colis refusé". La répartition est notifiée automatiquement et l\'article est marqué pour retour.',
      },
      {
        question: "Comment fonctionne l'ordre des tournées ?",
        answer:
          "Les tournées sont automatiquement ordonnées par distance de conduite totale la plus courte depuis votre dépôt, recalculées à chaque arrêt complété ou échoué — vous n'avez pas besoin de planifier l'ordre vous-même.",
      },
      {
        question: 'Mon scanner ne lit pas un code-barres',
        answer:
          'Vérifiez que l\'accès à la caméra est activé et que le code-barres est bien éclairé. S\'il ne se scanne toujours pas, utilisez "Saisir le code manuellement" sur l\'écran du scanner.',
      },
      {
        question: 'Comment changer mes jours de travail ?',
        answer:
          'Allez dans Profil → Disponibilité et marquez les dates et créneaux où vous êtes libre.',
      },
    ],
  },

  settings: {
    headerTitle: 'Réglages',
    sectionLanguage: 'Langue',
    sectionNotifications: 'Notifications',
    newAssignmentAlerts: 'Alertes de nouvelles missions',
    sectionAppearance: 'Apparence',
    theme: 'Thème',
    themeMatchesSystem: 'Correspond au système',
    sectionAbout: 'À propos',
    appVersion: "Version de l'application",
    languages: { en: 'English', fr: 'Français' },
  },

  enums: {
    jobStatus: {
      PENDING: 'En attente',
      IN_TRANSIT: 'En transit',
      DELIVERED: 'Livré',
      FAILED: 'Échoué',
    },
    failureReason: {
      CUSTOMER_ABSENT: 'Client absent',
      REFUSED: 'Colis refusé',
      INCORRECT_ADDRESS: 'Adresse incorrecte',
      INCOMPLETE_ADDRESS: 'Adresse incomplète',
      PHONE_UNREACHABLE: 'Téléphone injoignable',
      NO_ANSWER: 'Ne répond pas',
      OTHER: 'Autre',
    },
    pickupStatus: {
      SCHEDULED: 'Prévue',
      COMPLETED: 'Terminée',
    },
    transferStatus: {
      IN_PROGRESS: 'En attente de remise',
      COMPLETED: 'Terminé',
    },
    returnStatus: {
      PENDING_PICKUP: 'En attente de collecte',
      PROCESSED: 'Traité',
    },
    returnReason: {
      REFUSED: 'Refusé',
      ADDRESS_ISSUE: "Problème d'adresse",
      DAMAGED: 'Endommagé',
    },
    runsheetStatus: {
      IN_PROGRESS: 'Tournée en cours',
      CONFIRMED: 'Confirmée',
      WAITING: 'En attente',
    },
    notificationType: {
      PICKUP: 'Collecte',
      DELIVERY: 'Livraison',
      CASH: 'Espèces',
      RETURN: 'Retour',
      TRANSFER: 'Transfert',
    },
  },
};

export default fr;
