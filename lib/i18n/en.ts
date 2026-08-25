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
    cancel: 'Cancel',
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
    login: {
      subtitle: 'Driver · Tunisia',
      usernameLabel: 'Username or Email',
      usernamePlaceholder: 'amine.jendli',
      passwordLabel: 'Password',
      reveal: 'View',
      hide: 'Hide',
      logIn: 'Login',
      forgotPassword: 'Forgot password? Call Dispatch',
      ticker: ['Dispatch Support: {{phone}}', 'Terms of Service', 'Privacy Policy'],
      errors: {
        invalidCredentials: 'Incorrect username or password.',
      },
    },
    register: {
      step1: {
        stepLabel: 'Step 1 of 3',
        title: 'Your Info',
        subtitle: "Let's get your account set up.",
        fullNameLabel: 'Full Name',
        fullNamePlaceholder: 'Marcus Alden',
        phoneLabel: 'Phone Number',
        phonePlaceholder: '+216 XX XXX XXX',
        pinLabel: 'Create PIN Code',
        pinConfirmLabel: 'Confirm PIN Code',
      },
      step2: {
        stepLabel: 'Step 2 of 3',
        title: 'Your Vehicle',
        subtitle: 'Dispatch sizes your route using this info. Editable later.',
        vehicleTypeLabel: 'Vehicle Type',
        vehicleTypes: { scooter: 'Scooter', car: 'Car', van: 'Van' },
        plateLabel: 'Plate Number',
        platePlaceholder: '142 TN 4483',
        cinLabel: 'National ID (CIN)',
        cinPlaceholder: '09 447 218',
        licenseTitle: "Driver's License",
        licenseSubtitle: 'Front & back required',
        add: 'Add',
        added: 'Added',
        agreement: 'I accept the courier contract and confirm my documents are valid.',
      },
      step3: {
        stepLabel: 'Step 3 of 3',
        title: 'Review & Confirm',
        subtitle: 'Check your details before you hit the road.',
        sectionAccount: 'Account',
        sectionVehicle: 'Vehicle',
        submit: 'Create Account',
      },
      continue: 'Continue',
      errors: {
        pinMismatch: 'PIN codes do not match.',
        pinLength: 'PIN must be 4 digits.',
        agreementRequired: 'Please accept the agreement to continue.',
      },
    },
  },

  home: {
    greeting: {
      morning: 'Good Morning',
      evening: 'Good Evening',
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
    reorderHint: 'Hold the grip and drag to reorder your stops',
    reorderedToast: 'Order saved',
    onRoute: 'On Route',
    codTag: 'COD',
    paidTag: 'Paid',
    call: 'Call',
    callLogged_one: '{{count}} call attempt logged',
    callLogged_other: '{{count}} call attempts logged',
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

  runsheetSchedule: {
    headerTitle: 'Schedule',
    today: 'Today',
    viewingToday: "Viewing today's runsheet",
    viewingTodayBody: "Go back to see today's stops, in optimized route order.",
    backToRunsheet: 'Back to Runsheet',
    emptyTitle: 'No runsheet loaded for {{date}}',
    emptyBody: 'Other days will show up here once Jibex is connected to your dispatch system.',
  },

  runsheetDetail: {
    stats: { delivered: 'Delivered', failed: 'Failed', remaining: 'Remaining' },
    parcelsTitle: 'Packages to Deliver ({{count}})',
    confirmReceipt: 'Confirm Receipt',
    confirmModalTitle: 'Confirm Receipt',
    confirmModalMessage_one:
      'I confirm I have physically received all packages on this run ({{count}} package)',
    confirmModalMessage_other:
      'I confirm I have physically received all packages on this run ({{count}} packages)',
    confirmedToast: 'Receipt confirmed',
    blockedNotice: 'This run must be confirmed before its packages can be updated.',
    recountTitle: 'Package count changed',
    recountMessage: 'Your run now holds {{count}} packages - confirm the new count before continuing.',
    reconfirmReceipt: 'Re-confirm',
    update: 'Update',
    empty: 'No packages on this run',
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
    stopOf: 'Stop {{index}} of {{total}}',
    stopChip: 'STOP {{index}} / {{total}}',
    etaLabel: 'ETA {{time}}',
    moreOptionsToast: 'More options — coming soon',
    mapBadge: '{{distance}} km · ≈{{minutes}} min away',
    navigate: 'Navigate',
    codLabel: 'Collect on Delivery',
    codCash: '{{amount}} cash',
    billLabel: 'Bill',
    parcelLabel: 'Parcel',
    careLabel: 'Care',
    packageInfo_one: '{{count}} package · {{weight}} lbs',
    packageInfo_other: '{{count}} packages · {{weight}} lbs',
    fragile: 'Fragile',
    standard: 'Standard',
    startDelivery: 'On-Site — Scan Package',
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
    title: 'Photo Proof',
    permissionBody: 'Camera access is needed to capture delivery proof.',
    enableCamera: 'Enable Camera',
    hintCapture: 'Take a clear photo of the package at the delivery location.',
    hintConfirm: 'Package left at the door? Confirm to complete this delivery.',
    confirmDelivery: 'Confirm Delivery',
    retake: 'Retake Photo',
  },

  returnPhoto: {
    title: 'Damage Photo',
    permissionBody: 'Camera access is needed to document the damaged item.',
    enableCamera: 'Enable Camera',
    hintCapture: 'Take a clear photo of the damage.',
    hintConfirm: 'Looks good? Attach this photo to the return.',
    attach: 'Attach Photo',
    retake: 'Retake Photo',
  },

  scanner: {
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
    headerTitle: 'Pickups',
    eyebrow: 'Merchant Pickups',
    parcelCountLabel: 'Packages',
    segments: { scheduled: 'Scheduled', completed: 'Completed' },
    startPickup: 'Start Pickup',
    navigate: 'Navigate',
    parcelsTitle: 'Parcels',
    doneAll: 'Done All',
    doneAllConfirmTitle: 'Mark all pickups collected',
    doneAllConfirmMessage: 'Mark all {{count}} scheduled pickups as collected? This skips per-package scanning.',
    doneAllToast: 'All pickups marked collected',
    empty: {
      scheduled: 'No scheduled pickups',
      completed: 'No completed pickups',
    },
  },

  transfers: {
    headerTitle: 'Transfers',
    eyebrow: 'Agency to Agency',
    status: { completed: 'Completed', awaitingHandoff: 'Awaiting Handover' },
    detailLine: '{{count}} packages · {{location}} · {{time}}',
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
  },

  returns: {
    headerTitle: 'Returns',
    eyebrow: 'Unsold Stock Coming Back',
    parcelsLabel: 'Packages',
    batchNumber: 'Batch #{{id}}',
    from: 'Returning From',
    to: 'Back To',
    relatedTransfer: 'From transfer {{id}}',
    scan: 'Scan',
    scanAll: 'Scan All',
    scanNote: 'Return batches must be scanned at the depot before closing out the route.',
    empty: 'No pending returns',
    toggleCurrent: 'Current',
    toggleHistory: 'History',
    emptyHistory: 'No past returns',
  },

  alerts: {
    headerTitle: 'Alerts',
    eyebrow: 'Dispatch Feed',
    markAllRead: 'Read All',
    now: 'Now',
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

  availability: {
    headerTitle: 'Availability',
    intro:
      "Tap a date to mark the time blocks you're available to take routes. Dispatch uses this to plan upcoming assignments.",
    pastNote: "Can't set availability for a past date.",
    summary_one: '{{count}} day marked available this month',
    summary_other: '{{count}} days marked available this month',
  },

  shiftSummary: {
    wrappingUp: 'Wrapping up your shift…',
    title: 'Shift Complete',
    timeRange: '{{start}} – {{end}} · {{duration}}',
    stats: { delivered: 'Delivered', failed: 'Failed', miles: 'Miles' },
    cashToHandOff: 'Cash to hand off',
    handedOff: 'Handed Off',
    confirm: 'Confirm',
    done: 'Done',
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

  bankInfo: {
    headerTitle: 'Bank & Payout Info',
    note: 'Used only to deposit your cash-collection payouts.',
    bankNameLabel: 'Bank Name',
    accountHolderLabel: 'Account Holder',
    ibanLabel: 'IBAN',
    saveChanges: 'Save Changes',
    savedToast: 'Bank info saved',
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
        question: 'How does route order work?',
        answer:
          "Runsheets are automatically ordered by shortest total driving distance from your depot, recalculated every time you complete or fail a stop — you don't need to plan the order yourself.",
      },
      {
        question: "My scanner won't read a barcode",
        answer:
          'Make sure camera access is enabled and the barcode is well-lit. If it still won\'t scan, use "Enter Code Manually" on the scanner screen instead.',
      },
      {
        question: 'How do I change which days I work?',
        answer: "Go to Profile → Availability and mark the dates and time blocks you're free.",
      },
    ],
  },

  settings: {
    headerTitle: 'Settings',
    sectionLanguage: 'Language',
    sectionSecurity: 'Security',
    biometricLogin: 'Biometric Login',
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
