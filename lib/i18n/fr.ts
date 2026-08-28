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
      usernameLabel: "Nom d'utilisateur ou e-mail",
      usernamePlaceholder: 'amine.jendli',
      passwordLabel: 'Mot de passe',
      reveal: 'Afficher le mot de passe',
      hide: 'Masquer le mot de passe',
      logIn: 'Connexion',
      forgotPassword: 'Mot de passe oublié ? Appeler le dispatch',
      ticker: ['Assistance dispatch : {{phone}}', "Conditions d'utilisation", 'Politique de confidentialité'],
      errors: {
        invalidCredentials: "Nom d'utilisateur ou mot de passe incorrect.",
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
    toggleCurrent: 'En cours',
    toggleHistory: 'Historique',
    parcelsTitle: 'Colis ({{count}})',
    summary: { toDeliver: 'À livrer', toCollect: 'À encaisser' },
    inTransit: 'En transit',
    paidTag: 'Payé',
    call: 'Appeler',
    update: 'Maj',
    confirm: {
      title_one: '{{count}} colis à confirmer',
      title_other: '{{count}} colis à confirmer',
      recountTitle_one: 'Nombre modifié · {{count}} colis',
      recountTitle_other: 'Nombre modifié · {{count}} colis',
      dialogMessage_one: 'Vous avez bien ce colis en main ?',
      dialogMessage_other: 'Vous avez bien les {{count}} colis en main ?',
      action: 'Confirmer',
      recountAction: 'Reconfirmer',
      lockedTag: 'Verrouillé',
      blockedError: "Confirmez d'abord vos colis.",
      toast: 'Colis confirmés',
    },
    empty: {
      current: 'Tous les colis sont traités',
      history: 'Aucun historique',
    },
    filters: {
      label: 'Filtrer',
      all: 'Tout',
      delivered: 'Livrés',
      failed: 'Échoués',
    },
  },


  statusUpdate: {
    title: 'Mettre à jour le statut',
    delivered: 'Colis livré',
    failedSection: 'Tentative échouée',
    confirmFailed: "Confirmer l'échec",
    failedToast: 'Échec enregistré',
    callRequired: "Appelez d'abord le client - une livraison exige au moins un appel.",
    callHint: 'Appelez le client avant de marquer ce colis livré.',
    correctSection: 'Corriger une erreur',
    markPending: 'Remettre en attente',
    reopenedToast: 'Statut rouvert',
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
    backToRunsheet: 'Retour aux colis',
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
    call: 'Appeler',
    navigate: 'Naviguer',
    parcelsTitle: 'Colis',
    collected: 'Collecté',
    selectLabel: 'Marquer cette collecte comme effectuée',
    done: 'Terminer',
    doneWithCount: 'Terminer ({{count}})',
    doneHint: 'Cochez les collectes effectuées, puis appuyez sur Terminer.',
    doneSelectedNote_one: '{{count}} collecte prête à clôturer',
    doneSelectedNote_other: '{{count}} collectes prêtes à clôturer',
    doneConfirmTitle: 'Marquer les collectes',
    doneConfirmMessage_one:
      'Marquer {{count}} collecte comme collectée, avec tous ses colis ? ({{names}})',
    doneConfirmMessage_other:
      'Marquer {{count}} collectes comme collectées, avec tous leurs colis ? ({{names}})',
    doneConfirmAction: 'Marquer collecté',
    doneToast_one: '{{count}} collecte marquée',
    doneToast_other: '{{count}} collectes marquées',
    empty: {
      scheduled: 'Aucune collecte prévue',
      completed: 'Aucune collecte terminée',
    },
  },

  transfers: {
    headerTitle: 'Transferts',
    eyebrow: "D'agence à agence",
    status: { completed: 'Terminé', awaitingHandoff: 'En attente de remise' },
    movingLabel: 'En transit',
    from: 'Agence expéditrice',
    to: 'Agence destinataire',
    showQr: 'Afficher le QR de remise',
    hideQr: 'Masquer le QR',
    scanToConfirm: 'Scanner pour confirmer la remise',
    qrInfoNote:
      'Les deux agences scannent le même QR au dépôt pour transférer la garde du lot.',
    empty: 'Aucun transfert en cours',
    toggleCurrent: 'En cours',
    toggleHistory: 'Historique',
    emptyHistory: 'Aucun transfert passé',
  },

  returns: {
    headerTitle: 'Retours',
    eyebrow: 'Invendus qui reviennent',
    parcelsLabel: 'Colis',
    batchNumber: 'Lot #{{id}}',
    from: 'Retour de',
    to: 'Vers',
    relatedTransfer: 'Du transfert {{id}}',
    inverseNote:
      "Les retours sont l'inverse des transferts : ce que l'agence destinataire n'a pas pu livrer repart vers l'agence expéditrice.",
    scan: 'Scanner le lot',
    scanAllWithCount: 'Tout scanner ({{count}})',
    confirmOne: 'Confirmer',
    confirmAllWithCount: 'Tout confirmer ({{count}})',
    confirmTitle: 'Confirmer la réception des retours',
    confirmMessage_one: "Signer pour {{count}} lot — {{parcels}} colis de retour à l'agence ?",
    confirmMessage_other: "Signer pour {{count}} lots — {{parcels}} colis de retour à l'agence ?",
    confirmAction: 'Confirmer',
    confirmToast_one: '{{count}} lot confirmé',
    confirmToast_other: '{{count}} lots confirmés',
    scanNote: 'Les lots de retour doivent être scannés au dépôt avant la clôture de la journée.',
    empty: 'Aucun retour en attente',
    toggleCurrent: 'En cours',
    toggleHistory: 'Historique',
    emptyHistory: 'Aucun retour passé',
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
    stats: {
      lifetimeDeliveries: 'Livraisons',
      deliveryRate: 'Taux de livraison',
      weeklyCash: 'DT / semaine',
    },
    sectionAccount: 'Compte',
    sectionSupport: 'Assistance',
    rows: {
      personalInfo: 'Informations personnelles',
      vehicleDetails: 'Véhicule & chauffeur',
      helpCenter: "Centre d'aide",
      logOut: 'Déconnexion',
    },
  },



  personalInfo: {
    headerTitle: 'Informations personnelles',
    readOnlyNotice: 'Gérées par votre agence. Contactez le dispatch pour toute correction.',
    fullNameLabel: 'Nom complet',
    usernameLabel: "Nom d'utilisateur",
    emailLabel: 'E-mail',
    driverCodeLabel: 'Code chauffeur',
  },

  vehicleDetails: {
    headerTitle: 'Véhicule & chauffeur',
    readOnlyNotice: 'Gérées par votre agence. Contactez le dispatch pour toute correction.',
    types: { motorcycle: 'Moto', car: 'Voiture', van: 'Camionnette', bicycle: 'Vélo' },
    driverLabel: 'Chauffeur',
    driverCodeLabel: 'Code chauffeur',
    typeLabel: 'Type de véhicule',
    plateLabel: "Numéro d'immatriculation",
    modelLabel: 'Modèle',
    colorLabel: 'Couleur',
  },


  helpCenter: {
    headerTitle: "Centre d'aide",
    contactSupport: "Contacter l'assistance",
    faqSectionLabel: 'Questions fréquentes',
    faqs: [
      {
        question: 'Quand suis-je payé ?',
        answer:
          "Les espèces collectées à la livraison sont à remettre en fin de journée — voir Résumé de journée. Votre salaire de base hebdomadaire et vos primes sont déposés sur le compte bancaire enregistré chaque vendredi.",
      },
      {
        question: 'Que faire si un client refuse un colis ?',
        answer:
          'Ouvrez l\'arrêt, appuyez sur "Impossible de livrer", puis choisissez "Colis refusé". La répartition est notifiée automatiquement et l\'article est marqué pour retour.',
      },
      {
        question: "Comment changer l'ordre de mes colis ?",
        answer:
          "Dans Tournées, faites glisser un colis par la poignée sur sa carte pour le monter ou le descendre. Votre ordre est enregistré et ne bouge plus jusqu'à ce que vous le changiez.",
      },
      {
        question: 'Mon scanner ne lit pas un code-barres',
        answer:
          'Vérifiez que l\'accès à la caméra est activé et que le code-barres est bien éclairé. S\'il ne se scanne toujours pas, utilisez "Saisir le code manuellement" sur l\'écran du scanner.',
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
