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
    messageToast: 'Message — bientôt disponible',
  },

  auth: {
    login: {
      subtitle: 'Chauffeur · Tunisie',
      phoneLabel: 'Téléphone',
      phonePlaceholder: '+216 XX XXX XXX',
      pinLabel: 'Code PIN',
      reveal: 'Voir',
      hide: 'Masquer',
      startRoute: 'Commencer la tournée',
      forgotPin: 'PIN oublié ? Appeler le dispatch',
      ticker: ['Assistance dispatch : {{phone}}', "Conditions d'utilisation", 'Politique de confidentialité'],
      newDriver: 'Nouveau chauffeur ? ',
      createAccount: 'Créer un compte',
      errors: {
        invalidCredentials: 'Numéro de téléphone ou code PIN incorrect.',
      },
    },
    register: {
      step1: {
        stepLabel: 'Étape 1 sur 3',
        title: 'Vos informations',
        subtitle: 'Configurons votre compte.',
        fullNameLabel: 'Nom complet',
        fullNamePlaceholder: 'Marcus Alden',
        phoneLabel: 'Téléphone',
        phonePlaceholder: '+216 XX XXX XXX',
        pinLabel: 'Créer un code PIN',
        pinConfirmLabel: 'Confirmer le code PIN',
      },
      step2: {
        stepLabel: 'Étape 2 sur 3',
        title: 'Votre véhicule',
        subtitle: 'Le dispatch dimensionne votre tournée avec cette info. Modifiable plus tard.',
        vehicleTypeLabel: 'Type de véhicule',
        vehicleTypes: { scooter: 'Scooter', car: 'Voiture', van: 'Camionnette' },
        plateLabel: 'Matricule',
        platePlaceholder: '142 TN 4483',
        cinLabel: 'CIN',
        cinPlaceholder: '09 447 218',
        licenseTitle: 'Permis de conduire',
        licenseSubtitle: 'Recto & verso requis',
        add: 'Ajouter',
        added: 'Ajouté',
        agreement: "J'accepte le contrat coursier et confirme la validité de mes documents.",
      },
      step3: {
        stepLabel: 'Étape 3 sur 3',
        title: 'Vérification',
        subtitle: 'Vérifiez vos informations avant de prendre la route.',
        sectionAccount: 'Compte',
        sectionVehicle: 'Véhicule',
        submit: 'Créer mon compte',
      },
      continue: 'Continuer',
      errors: {
        pinMismatch: 'Les codes PIN ne correspondent pas.',
        pinLength: 'Le code PIN doit contenir 4 chiffres.',
        agreementRequired: 'Veuillez accepter le contrat pour continuer.',
      },
    },
  },

  home: {
    greeting: {
      morning: 'Ahla',
      evening: 'Ahla',
    },
    deliveriesCardTitle: 'Colis à livrer',
    stopsCaption: '{{delivered}} / {{total}} ARRÊTS',
    onPace: 'En bonne voie pour terminer à {{time}}',
    stats: {
      delivered: 'Livrés',
      pending: 'En file',
      failed: 'Échecs',
      pickups: 'Ramassages',
    },
    cashCollected: 'Espèces en sacoche',
    deposit: 'Déposer',
    depositing: 'Dépôt en cours…',
    depositedToast: 'Espèces déposées',
    depositConfirmTitle: 'Confirmer le dépôt',
    depositConfirmMessage:
      'Déposer {{amount}} ? Cela remet à zéro vos espèces en sacoche et ne peut pas être annulé.',
    toConfirmTitle: 'À confirmer ({{count}})',
    nextStop: {
      label: 'Prochain arrêt',
      distanceEta: '{{distance}} km · {{minutes}} min',
      codLabel: 'À encaisser',
      go: "Y'aller",
    },
  },

  runsheets: {
    headerTitle: 'Tournées',
    toggleCurrent: 'Tournée en cours',
    toggleHistory: 'Historique',
    currentLabel: 'Tournée en cours',
    othersLabel: 'Autres tournées',
    deliveredOf: '{{delivered}}/{{total}} livrés',
    onRoute: 'En route',
    codTag: 'COD',
    paidTag: 'Payé',
    empty: {
      current: 'Aucune tournée en cours',
      history: 'Aucun historique',
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

  runsheetDetail: {
    stats: { delivered: 'Livrés', failed: 'Échoués', remaining: 'Restants' },
    parcelsTitle: 'Colis à livrer ({{count}})',
    confirmReceipt: 'Confirmer la réception',
    confirmModalTitle: 'Confirmer la réception',
    confirmModalMessage_one:
      'Je confirme avoir reçu physiquement tous les colis de cette tournée ({{count}} colis)',
    confirmModalMessage_other:
      'Je confirme avoir reçu physiquement tous les colis de cette tournée ({{count}} colis)',
    confirmedToast: 'Réception confirmée',
    blockedNotice: 'Cette tournée doit être confirmée avant de pouvoir mettre à jour ses colis.',
    update: 'Maj',
    empty: 'Aucun colis dans cette tournée',
  },

  statusUpdate: {
    title: 'Mettre à jour le statut',
    delivered: 'Colis livré',
    failedSection: 'Tentative échouée',
    confirmFailed: "Confirmer l'échec",
    failedToast: 'Échec enregistré',
  },

  jobDetail: {
    stopOf: 'Arrêt {{index}} sur {{total}}',
    stopChip: 'ARRÊT {{index}} / {{total}}',
    etaLabel: 'ETA {{time}}',
    moreOptionsToast: "Plus d'options — bientôt disponible",
    mapBadge: '{{distance}} km · ≈{{minutes}} min',
    navigate: 'Itinéraire',
    codLabel: 'Encaissement à la livraison',
    codCash: '{{amount}} en espèces',
    billLabel: 'Bon',
    parcelLabel: 'Colis',
    careLabel: 'Soin',
    packageInfo_one: '{{count}} colis · {{weight}} lbs',
    packageInfo_other: '{{count}} colis · {{weight}} lbs',
    fragile: 'Fragile',
    standard: 'Standard',
    startDelivery: 'Sur place — scanner le colis',
    deliveryFailed: 'Échec de livraison',
    cantDeliver: 'Impossible de livrer',
  },

  otp: {
    title: 'Code de remise',
    subtitle: 'Demandez à {{name}} les 4 chiffres envoyés par SMS. C\'est votre preuve de remise.',
    resend: 'Renvoyer le code',
    resendIn: 'Renvoi dans 00:{{seconds}}',
    call: 'Appeler',
    verify: 'Vérifier et terminer',
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
    title: 'Arrêt {{index}} bouclé',
    subtitle: 'Code vérifié · {{time}} · {{place}}',
    cashCollected: 'Espèces reçues',
    todaysTotal: 'Total sacoche',
    nextStopWithName: 'Arrêt suivant · {{name}}',
    nextStop: 'Prochain arrêt',
    backToRunsheet: 'Retour à la feuille de route',
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

  returnPhoto: {
    title: 'Photo du dommage',
    permissionBody: "L'accès à la caméra est nécessaire pour documenter l'article endommagé.",
    enableCamera: 'Activer la caméra',
    hintCapture: 'Prenez une photo nette du dommage.',
    hintConfirm: 'Ça vous convient ? Joignez cette photo au retour.',
    attach: 'Joindre la photo',
    retake: 'Reprendre la photo',
  },

  scanner: {
    title: 'Scanner le colis',
    permissionTitle: 'Accès à la caméra requis',
    permissionBody: 'Jibex utilise la caméra pour scanner les codes-barres et confirmer les collectes.',
    enableCamera: 'Activer la caméra',
    hintTitle: "Gardez l'étiquette bien à plat",
    hintSubtitle: "Capture automatique en moins d'une seconde",
    hintChecking: 'Vérification du code…',
    manualPlaceholder: 'ex. TRK-5DF3697E',
    enterCode: 'Saisir le code',
    burstScan: 'Scan en série',
    scannedCount_one: '{{count}} colis scanné à cet arrêt',
    scannedCount_other: '{{count}} colis scannés à cet arrêt',
    confirmedToast: 'Confirmé — {{label}}',
    transferConfirmedToast: 'Transfert terminé — {{label}}',
    batchTitle: 'Scanner les retours',
    batchProgress: '{{done}} sur {{total}} scannés',
    batchCompleteTitle: 'Tous les retours ont été scannés',
    batchCompleteBody: 'Chaque retour de ce lot a été traité.',
    batchDoneButton: 'Retour aux retours',
    errors: {
      notRecognized: 'Code non reconnu. Réessayez ou saisissez-le manuellement.',
    },
  },

  search: {
    headerTitle: 'Recherche',
    label: 'Numéro de suivi',
    placeholder: 'TRK-XXXXXXXX',
    searching: 'Recherche…',
    notFoundTitle: 'Aucun colis trouvé',
    notFoundSubtitle: 'Aucune correspondance pour {{code}}',
    instructions: 'Saisissez un numéro de suivi pour trouver un colis',
  },

  pickups: {
    headerTitle: 'Ramassages',
    eyebrow: 'Collectes marchands',
    parcelCountLabel: 'Colis',
    segments: { scheduled: 'Programmés', completed: 'Collectés' },
    startPickup: 'Démarrer la collecte',
    navigate: 'Naviguer',
    parcelsTitle: 'Colis',
    empty: {
      scheduled: 'Aucune collecte prévue',
      completed: 'Aucune collecte terminée',
    },
  },

  transfers: {
    headerTitle: 'Transferts',
    eyebrow: 'Passations entre coursiers',
    status: { completed: 'Terminé', awaitingHandoff: 'En attente de remise' },
    detailLine: '{{count}} · {{location}} · {{time}}',
    from: 'De',
    to: 'Vers',
    you: 'Vous',
    showQr: 'Afficher le QR de remise',
    hideQr: 'Masquer le QR',
    scanToConfirm: 'Scanner pour confirmer la remise',
    qrInfoNote:
      'Les deux coursiers doivent scanner le même QR sous 5 minutes pour valider la garde.',
    empty: 'Aucun transfert en cours',
  },

  returns: {
    headerTitle: 'Retours',
    eyebrow: 'Retour expéditeur',
    inBagLabel: 'En sacoche',
    orderNumber: 'Commande #{{id}}',
    scan: 'Scanner',
    scanAll: 'Tout scanner',
    scanNote: 'Les retours doivent être scannés au dépôt avant la clôture de la tournée.',
    empty: 'Aucun retour en attente',
  },

  alerts: {
    headerTitle: 'Alertes',
    eyebrow: 'Fil du dispatch',
    markAllRead: 'Tout lire',
    now: 'Maintenant',
    today: "Aujourd'hui",
    earlier: 'Plus tôt',
    yesterday: 'Hier',
    empty: 'Vous êtes à jour',
  },

  profile: {
    headerTitle: 'Profil',
    hub: 'Hub Sousse',
    stats: { lifetimeDeliveries: 'Livraisons', onTimeRate: 'À l\'heure', weeklyCash: 'DT / semaine' },
    sectionAccount: 'Compte',
    sectionSupport: 'Assistance',
    rows: {
      personalInfo: 'Informations personnelles',
      vehicleDetails: 'Véhicule & documents',
      bankInfo: 'Espèces & versements',
      callDispatch: 'Appeler le dispatch',
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
    sectionSecurity: 'Sécurité',
    biometricLogin: 'Connexion biométrique',
    sectionNotifications: 'Notifications',
    newJobAlerts: 'Alertes nouvelle course',
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
      EN_COURS: 'En cours',
      VALIDE: 'Validé',
      A_CONFIRMER: 'À confirmer',
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
