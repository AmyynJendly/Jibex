/**
 * English strings — the source of truth for every user-facing string in the
 * app. `fr.ts` must mirror this shape exactly (checked via `satisfies` at
 * the `resources` assembly in `index.ts`).
 */
const en = {
  tabs: {
    home: 'Home',
    runsheets: 'Runsheets',
    alerts: 'Alerts',
    profile: 'Profile',
  },

  offlineBanner: {
    message: "You're offline — changes will sync when reconnected",
  },

  common: {
    close: 'Close',
    offlineAction: "You're offline — reconnect before recording this.",
    loadError: {
      title: "Couldn't load",
      body: 'Check your connection and try again.',
      retry: 'Try Again',
    },
    cancel: 'Cancel',
    undo: 'Undo',
    save: 'Save',
    back: 'Back',
    loading: 'Loading…',
    comingSoon: '{{feature}} — coming soon',
    genericError: 'Something went wrong. Please try again.',
    nav: {
      home: 'Home',
      runsheets: 'Runsheets',
      pickups: 'Pickups',
      transfers: 'Transfers',
      returns: 'Returns',
      notifications: 'Notifications',
      profile: 'Profile',
    },
    timeBlock: {
      morning: 'Morning',
      afternoon: 'Afternoon',
      evening: 'Evening',
    },
    package_one: '{{count}} package',
    package_other: '{{count}} packages',
    messageToast: 'Messaging — coming soon',
  },

  auth: {
    gate: {
      with: {
        face: 'Unlocking with Face ID',
        fingerprint: 'Unlocking with Touch ID',
        passcode: 'Unlocking with your passcode',
      },
      unlockPrompt: 'Unlock Jibex',
      lockedBody: 'Locked. Unlock to get back to your day.',
      unlock: 'Unlock',
      useAnotherAccount: 'Sign in as someone else',
    },
    login: {
      subtitle: 'Driver · Tunisia',
      usernameLabel: 'Username or Email',
      usernamePlaceholder: 'amine.jendli',
      passwordLabel: 'Password',
      // Icon-only eye toggle: these are its screen-reader labels, not visible text.
      reveal: 'Show password',
      hide: 'Hide password',
      logIn: 'Login',
      forgotPassword: 'Forgot password? Call Dispatch',
      ticker: ['Dispatch Support: {{phone}}', 'Terms of Service', 'Privacy Policy'],
      errors: {
        invalidCredentials: 'Incorrect username or password.',
      },
    },
  },

  home: {
    a11y: { search: 'Search a tracking number', scan: 'Scan a package' },
    greeting: {
      morning: 'Good Morning',
      afternoon: 'Good Afternoon',
      evening: 'Good Evening',
      /** 22:00-05:00. Not "Good Night" — that's a goodbye, and they're starting. */
      late: 'Late Shift',
    },
    deliveriesCardTitle: "Today's Deliveries",
    stopsCaption: '{{delivered}} / {{total}} STOPS',
    onPace: 'On pace to finish by {{time}}',
    stats: {
      delivered: 'Delivered',
      pending: 'In Queue',
      failed: 'Failed',
      pickups: 'Pickups',
    },
    cashCollected: 'Cash On Hand',
    toConfirmTitle: 'To Confirm ({{count}})',
    nextStop: {
      label: 'Next Stop',
      distanceEta: '{{distance}} km · {{minutes}} min',
      codLabel: 'To Collect',
      go: 'Go',
    },
  },

  runsheets: {
    headerTitle: 'Runsheets',
    toggleCurrent: 'Current',
    toggleHistory: 'History',
    parcelsTitle: 'Packages ({{count}})',
    summary: { toDeliver: 'To deliver', toCollect: 'To collect' },
    inTransit: 'In Transit',
    paidTag: 'Paid',
    call: 'Call',
    update: 'Update',
    reorderedToast: 'Order saved',
    nearestFirst: 'Nearest first',
    nearestFirstHint: 'Drag a stop to set your own order',
    // Deliberately terse: the driver reads this standing in a van with the
    // packages in front of them, not looking for an explanation.
    confirm: {
      title_one: '{{count}} package to confirm',
      title_other: '{{count}} packages to confirm',
      recountTitle_one: 'Count changed · {{count}} package',
      recountTitle_other: 'Count changed · {{count}} packages',
      dialogMessage_one: 'You have this package in hand?',
      dialogMessage_other: 'You have all {{count}} packages in hand?',
      action: 'Confirm',
      recountAction: 'Re-confirm',
      lockedTag: 'Locked',
      blockedError: 'Confirm your packages first.',
      toast: 'Packages confirmed',
    },
    empty: {
      current: 'All packages done - nothing left to deliver',
      history: 'No history yet',
    },
    filters: {
      label: 'Filter',
      all: 'All',
      delivered: 'Delivered',
      failed: 'Failed',
    },
  },


  statusUpdate: {
    title: 'Update Status',
    delivered: 'Package Delivered',
    failedSection: 'Failed Attempt',
    confirmFailed: 'Confirm Failure',
    failedToast: 'Failure recorded',
    callRequired: 'Call the customer first - a delivery needs at least one call attempt.',
    callHint: 'Call the customer before marking this delivered.',
    correctSection: 'Correct a mistake',
    markPending: 'Move back to pending',
    reopenedToast: 'Status reopened',
  },

  jobDetail: {
      markDelivered: 'Delivered',
      parcelCount: '{{count}} parcel',
      parcelCount_other: '{{count}} parcels',
      callDetail: 'Called {{count}}x · last at {{time}}',
    a11yMore: 'More options',
    stopOf: 'Stop {{index}} of {{total}}',
    stopChip: 'STOP {{index}} / {{total}}',
    etaLabel: 'ETA {{time}}',
    moreOptionsToast: 'More options — coming soon',
    mapBadge: '{{distance}} km · ≈{{minutes}} min away',
    navigate: 'Navigate',
    codLabel: 'Collect on Delivery',
    billLabel: 'Bill',
    parcelLabel: 'Parcel',
    careLabel: 'Care',
    packageInfo_one: '{{count}} package · {{weight}} lbs',
    packageInfo_other: '{{count}} packages · {{weight}} lbs',
    fragile: 'Fragile',
    standard: 'Standard',
    deliveryFailed: 'Delivery Failed',
    cantDeliver: "Can't Deliver",
  },

  otp: {
    title: 'Delivery Code',
    subtitle: "Ask {{name}} for the 4-digit code sent by SMS. This is your proof of delivery.",
    resend: 'Resend Code',
    resendIn: 'Resend in 00:{{seconds}}',
    call: 'Call',
    verify: 'Verify & Complete',
    takePhotoInstead: 'Take Photo Instead',
    errors: {
      incorrectCode: 'Incorrect code. Ask the customer to confirm and try again.',
    },
  },

  cantDeliver: {
    title: "Can't Deliver",
    subtitle: "Let dispatch know why this stop couldn't be completed",
    noteLabel: 'Note (optional)',
    notePlaceholder: 'Anything dispatch should know…',
    confirm: 'Confirm',
  },

  cashCollected: {
    title: 'Stop {{index}} Wrapped Up',
    subtitle: 'Code verified · {{time}} · {{place}}',
    cashCollected: 'Cash Received',
    todaysTotal: 'Bag Total',
    nextStopWithName: 'Next Stop · {{name}}',
    nextStop: 'Next Stop',
    backToRunsheet: 'Back to Runsheet',
  },

  photoProof: {
    captureFailed: "Couldn't take the photo. Try again.",
    title: 'Photo Proof',
    permissionBody: 'Camera access is needed to capture delivery proof.',
    enableCamera: 'Enable Camera',
    hintCapture: 'Take a clear photo of the package at the delivery location.',
    hintConfirm: 'Package left at the door? Confirm to complete this delivery.',
    confirmDelivery: 'Confirm Delivery',
    retake: 'Retake Photo',
  },


  scanner: {
    a11yTorch: 'Toggle flashlight',
    title: 'Scan Package',
    permissionTitle: 'Camera access needed',
    permissionBody: 'Jibex uses the camera to scan package barcodes and confirm pickups.',
    enableCamera: 'Enable Camera',
    hintTitle: 'Keep the label flat',
    hintSubtitle: 'Automatic capture in under a second',
    hintChecking: 'Checking code…',
    manualPlaceholder: 'e.g. TRK-5DF3697E',
    enterCode: 'Enter Code',
    burstScan: 'Burst Scan',
    scannedCount_one: '{{count}} package scanned at this stop',
    scannedCount_other: '{{count}} packages scanned at this stop',
    confirmedToast: 'Confirmed — {{label}}',
    transferConfirmedToast: 'Transfer completed — {{label}}',
    batchTitle: 'Scan Returns',
    batchProgress: '{{done}} of {{total}} scanned',
    batchCompleteTitle: 'All returns scanned',
    batchCompleteBody: 'Every return in this batch has been processed.',
    batchDoneButton: 'Back to Returns',
    errors: {
      notRecognized: 'Code not recognized. Try again or enter it manually.',
    },
  },

  search: {
    headerTitle: 'Search',
    label: 'Tracking Number',
    placeholder: 'TRK-XXXXXXXX',
    searching: 'Searching…',
    notFoundTitle: 'No parcel found',
    notFoundSubtitle: "{{code}} doesn't match any tracking number",
    instructions: 'Enter a tracking number to find a parcel',
  },

  pickups: {
    a11yExpand: 'Shows the parcels at this stop',
    a11yCollapse: 'Hides the parcels at this stop',
    headerTitle: 'Pickups',
    eyebrow: 'Merchant Pickups',
    parcelCountLabel: 'Packages',
    segments: { scheduled: 'Scheduled', completed: 'Completed' },
    call: 'Call',
    navigate: 'Navigate',
    parcelsTitle: 'Parcels',
    collected: 'Collected',
    selectLabel: 'Mark this stop collected',
    done: 'Done',
    doneWithCount: 'Done ({{count}})',
    doneHint: 'Tick the stops you have collected, then press Done.',
    doneSelectedNote_one: '{{count}} stop ready to close out',
    doneSelectedNote_other: '{{count}} stops ready to close out',
    doneConfirmTitle: 'Mark pickups collected',
    doneConfirmMessage_one:
      'Mark {{count}} pickup as collected, with every package in it? ({{names}})',
    doneConfirmMessage_other:
      'Mark {{count}} pickups as collected, with every package in them? ({{names}})',
    doneConfirmAction: 'Mark Collected',
    doneToast_one: '{{count}} pickup marked collected',
    doneToast_other: '{{count}} pickups marked collected',
    reorderedToast: 'Order saved',
    empty: {
      scheduled: 'No scheduled pickups',
      completed: 'No completed pickups',
    },
  },

  transfers: {
    headerTitle: 'Transfers',
    eyebrow: 'Agency to Agency',
    status: { completed: 'Completed', awaitingHandoff: 'Awaiting Handover' },
    movingLabel: 'Moving',
    from: 'Sending Agency',
    to: 'Receiving Agency',
    showQr: 'Show Handover QR',
    hideQr: 'Hide QR',
    scanToConfirm: 'Scan to Confirm Handover',
    qrInfoNote: 'Both agencies scan the same QR at the depot to transfer custody of the batch.',
    empty: 'No transfers in progress',
    toggleCurrent: 'Current',
    toggleHistory: 'History',
    emptyHistory: 'No past transfers',
    reorderedToast: 'Order saved',
  },

  returns: {
    headerTitle: 'Returns',
    eyebrow: 'Unsold Stock Coming Back',
    parcelsLabel: 'Packages',
    batchNumber: 'Batch #{{id}}',
    from: 'Returning From',
    to: 'Back To',
    relatedTransfer: 'From transfer {{id}}',
    inverseNote:
      'Returns are transfers in reverse: whatever the receiving agency could not deliver comes back to the agency that sent it.',
    scan: 'Scan Batch',
    scanAllWithCount: 'Scan All ({{count}})',
    // Signing for the lot is the normal hand-back; scanning proves a disputed count.
    confirmOne: 'Confirm',
    confirmAllWithCount: 'Confirm All ({{count}})',
    confirmTitle: 'Confirm returns received',
    confirmMessage_one: 'Sign for {{count}} batch — {{parcels}} packages back to the agency?',
    confirmMessage_other: 'Sign for {{count}} batches — {{parcels}} packages back to the agency?',
    confirmAction: 'Confirm',
    confirmToast_one: '{{count}} batch confirmed',
    confirmToast_other: '{{count}} batches confirmed',
    scanNote: 'Return batches must be scanned at the depot before you close out the day.',
    empty: 'No pending returns',
    toggleCurrent: 'Current',
    toggleHistory: 'History',
    emptyHistory: 'No past returns',
    reorderedToast: 'Order saved',
  },

  alerts: {
    deleteAll: 'Clear all',
    deleteOne: 'Delete notification',
    deletedToast: 'Notification deleted',
    deleteAllTitle: 'Clear all notifications?',
    deleteAllMessage: "They can't be brought back.",
    deleteAllConfirm: 'Clear all',
    a11yOpens: 'Opens the related screen',
    headerTitle: 'Alerts',
    eyebrow: 'Dispatch Feed',
    markAllRead: 'Read All',
    today: 'Today',
    earlier: 'Earlier',
    yesterday: 'Yesterday',
    empty: "You're all caught up",
  },

  profile: {
    headerTitle: 'Profile',
    hub: 'Hub Sousse',
    stats: { lifetimeDeliveries: 'Deliveries', deliveryRate: 'Delivery Rate', weeklyCash: 'DT / Week' },
    sectionAccount: 'Account',
    sectionSupport: 'Support',
    rows: {
      personalInfo: 'Personal Info',
      vehicleDetails: 'Vehicle & Driver Info',
      helpCenter: 'Help Center',
      logOut: 'Log Out',
    },
  },



  personalInfo: {
    headerTitle: 'Personal Info',
    readOnlyNotice: 'Managed by your agency. Contact dispatch to correct anything here.',
    fullNameLabel: 'Full Name',
    usernameLabel: 'Username',
    emailLabel: 'Email',
    driverCodeLabel: 'Driver Code',
  },

  vehicleDetails: {
    headerTitle: 'Vehicle & Driver Info',
    readOnlyNotice: 'Managed by your agency. Contact dispatch to correct anything here.',
    types: { motorcycle: 'Motorcycle', car: 'Car', van: 'Van', bicycle: 'Bicycle' },
    driverLabel: 'Driver',
    driverCodeLabel: 'Driver Code',
    typeLabel: 'Vehicle Type',
    plateLabel: 'Plate Number',
    modelLabel: 'Model',
    colorLabel: 'Color',
  },


  helpCenter: {
    headerTitle: 'Help Center',
    contactSupport: 'Contact Support',
    faqSectionLabel: 'Frequently Asked',
    faqs: [
      {
        question: 'When do I get paid?',
        answer:
          'Cash you collect on delivery is yours to hand off at shift end — see Shift Summary. Your weekly base pay and bonuses are deposited to the bank account on file every Friday.',
      },
      {
        question: 'What if a customer refuses a package?',
        answer:
          'Open the stop, tap "Can\'t Deliver", and choose "Parcel refused". Dispatch is notified automatically and the item is flagged for return.',
      },
      {
        question: "My scanner won't read a barcode",
        answer:
          'Make sure camera access is enabled and the barcode is well-lit. If it still won\'t scan, use "Enter Code Manually" on the scanner screen instead.',
      },
      {
        question: 'How do I change the order of my packages?',
        answer:
          'In Runsheets, drag a package by the handle on its card to move it up or down. This turns off "Nearest first" automatically — your order is saved and stays put until you change it again or switch nearest-first back on.',
      },
    ],
  },

  settings: {
    headerTitle: 'Settings',
    sectionLanguage: 'Language',
    sectionSecurity: 'Security',
    biometricLogin: 'Biometric Login',
    hapticFeedback: 'Haptic Feedback',
    nextStopBar: 'Next Stop Bar',
    sectionNotifications: 'Notifications',
    newJobAlerts: 'New job alerts',
    sectionAppearance: 'Appearance',
    theme: 'Theme',
    themeMatchesSystem: 'Matches System',
    sectionAbout: 'About',
    appVersion: 'App Version',
    languages: { en: 'English', fr: 'Français' },
  },

  enums: {
    jobStatus: {
      PENDING: 'Pending',
      IN_TRANSIT: 'In Transit',
      DELIVERED: 'Delivered',
      FAILED: 'Failed',
    },
    failureReason: {
      CUSTOMER_ABSENT: 'Customer absent',
      REFUSED: 'Parcel refused',
      INCORRECT_ADDRESS: 'Incorrect address',
      INCOMPLETE_ADDRESS: 'Incomplete address',
      PHONE_UNREACHABLE: 'Phone unreachable',
      NO_ANSWER: 'No answer',
      OTHER: 'Other',
    },
    pickupStatus: {
      SCHEDULED: 'Scheduled',
      COMPLETED: 'Completed',
    },
    transferStatus: {
      IN_PROGRESS: 'Awaiting Handoff',
      COMPLETED: 'Completed',
    },
    returnStatus: {
      PENDING_PICKUP: 'Pending Pickup',
      PROCESSED: 'Processed',
    },
    returnReason: {
      REFUSED: 'Refused',
      ADDRESS_ISSUE: 'Address Issue',
      DAMAGED: 'Damaged',
    },
    runsheetStatus: {
      EN_COURS: 'In Progress',
      VALIDE: 'Completed',
      A_CONFIRMER: 'To Confirm',
    },
    notificationType: {
      PICKUP: 'Pickup',
      DELIVERY: 'Delivery',
      CASH: 'Cash',
      RETURN: 'Return',
      TRANSFER: 'Transfer',
    },
  },
};

export default en;
export type TranslationResource = typeof en;
