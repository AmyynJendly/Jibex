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
    callToast: 'Calling — coming soon',
    messageToast: 'Messaging — coming soon',
  },

  auth: {
    login: {
      tagline: 'Deliver more. Stress less.',
      phoneLabel: 'Phone Number',
      phonePlaceholder: '+216 XX XXX XXX',
      passwordLabel: 'Password',
      passwordPlaceholder: '••••••••••',
      logIn: 'Log In',
      or: 'OR',
      appleToast: 'Sign in with Apple — coming soon',
      googleToast: 'Sign in with Google — coming soon',
      newDriver: "New driver? ",
      createAccount: 'Create account',
      errors: {
        invalidCredentials: 'Incorrect phone number or password.',
      },
    },
    register: {
      stepLabel: 'Step 1 of 2',
      title: 'Create account',
      fullNameLabel: 'Full Name',
      fullNamePlaceholder: 'Marcus Alden',
      phoneLabel: 'Phone Number',
      phonePlaceholder: '+216 XX XXX XXX',
      emailLabel: 'Email',
      emailPlaceholder: 'marcus.alden@jibex.com',
      plateLabel: 'Vehicle Plate Number',
      platePlaceholder: 'TU-2847-KL',
      passwordLabel: 'Password',
      passwordPlaceholder: '••••••••••',
      retypePasswordLabel: 'Retype Password',
      continue: 'Continue',
      errors: {
        passwordMismatch: 'Passwords do not match.',
      },
    },
  },

  home: {
    greeting: {
      morning: 'Good Morning',
      afternoon: 'Good Afternoon',
      evening: 'Good Evening',
    },
    shift: {
      readyTitle: 'Ready to start?',
      readySubtitle: "Begin tracking today's deliveries",
      startShift: 'Start Shift',
      onShiftSince: 'On Shift · Since {{time}}',
      endShift: 'End Shift',
    },
    timeSensitive_one: '{{count}} time-sensitive stop left today',
    timeSensitive_other: '{{count}} time-sensitive stops left today',
    deliveriesCardTitle: "Today's Deliveries",
    completedOfTotal: '{{delivered}} of {{total}} completed',
    onPace: 'On pace to finish by {{time}}',
    stats: {
      delivered: 'Delivered',
      pending: 'Pending',
      failed: 'Failed',
      pickups: 'Pickups',
    },
    cashCollected: 'Cash Collected',
  },

  runsheets: {
    headerTitle: 'Runsheets',
    optimizedRoute: 'Route optimized for shortest distance',
    segments: { all: 'All', pending: 'Pending', delivered: 'Delivered' },
    nextStop: 'Next Stop',
    codChip: 'COD {{amount}}',
    empty: {
      all: 'No stops yet',
      pending: 'No pending stops',
      delivered: 'No delivered stops',
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

  jobDetail: {
    stopOf: 'Stop {{index}} of {{total}}',
    moreOptionsToast: 'More options — coming soon',
    mapBadge: '{{distance}} mi · ≈{{minutes}} min away',
    navigate: 'Navigate',
    codLabel: 'Collect on Delivery',
    codCash: '{{amount}} cash',
    packageInfo_one: '{{count}} package · {{weight}} lbs',
    packageInfo_other: '{{count}} packages · {{weight}} lbs',
    fragile: 'Fragile',
    startDelivery: 'Start Delivery',
    cantDeliver: "Can't Deliver",
  },

  otp: {
    title: 'Confirm Delivery',
    subtitle: 'Ask the customer for the 4-digit code sent to their phone via SMS',
    resend: 'Resend Code',
    verify: 'Verify & Complete',
    unreachable: 'Customer unreachable? Call',
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
    title: 'Delivery Confirmed',
    subtitle: 'Order #{{id}} completed',
    cashCollected: 'Cash Collected',
    todaysTotal: "Today's Total",
    totalChange: '{{before}} → {{after}}',
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

  scanner: {
    title: 'Scan Package',
    permissionTitle: 'Camera access needed',
    permissionBody: 'Jibex uses the camera to scan package barcodes and confirm pickups.',
    enableCamera: 'Enable Camera',
    hintAlign: 'Align barcode within frame to confirm pickup',
    hintChecking: 'Checking code…',
    manualPlaceholder: 'e.g. TRK-5DF3697E',
    enterManually: 'Enter Code Manually',
    useCamera: 'Use Camera Instead',
    confirmedToast: 'Confirmed — {{label}}',
    errors: {
      notRecognized: 'Code not recognized. Try again or enter it manually.',
    },
  },

  pickups: {
    headerTitle: 'Pickups',
    segments: { scheduled: 'Scheduled', completed: 'Completed' },
    nextPickup: 'Next Pickup',
    startPickup: 'Start Pickup',
    empty: {
      scheduled: 'No scheduled pickups',
      completed: 'No completed pickups',
    },
  },

  transfers: {
    headerTitle: 'Transfers',
    status: { completed: 'Completed', awaitingHandoff: 'Awaiting Handoff' },
    detailLine: '{{count}} · {{location}} · {{time}}',
    initiateTransfer: 'Initiate Transfer',
    empty: 'No transfers in progress',
  },

  returns: {
    headerTitle: 'Returns',
    orderNumber: 'Order #{{id}}',
    empty: 'No pending returns',
  },

  alerts: {
    headerTitle: 'Notifications',
    markAllRead: 'Mark all read',
    today: 'Today',
    earlier: 'Earlier',
    yesterday: 'Yesterday',
    empty: "You're all caught up",
  },

  profile: {
    headerTitle: 'Profile',
    editPhotoToast: 'Edit photo — coming soon',
    rating: '{{rating}} Rating',
    stats: { delivered: 'Delivered', completion: 'Completion', cashCollected: 'Cash Collected' },
    sectionAccount: 'Account',
    sectionSupport: 'Support',
    rows: {
      personalInfo: 'Personal Info',
      vehicleDetails: 'Vehicle Details',
      bankInfo: 'Bank & Payout Info',
      availability: 'Availability',
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
    fullNameLabel: 'Full Name',
    phoneLabel: 'Phone Number',
    emailLabel: 'Email',
    saveChanges: 'Save Changes',
    savedToast: 'Personal info saved',
  },

  vehicleDetails: {
    headerTitle: 'Vehicle Details',
    types: { motorcycle: 'Motorcycle', car: 'Car', van: 'Van', bicycle: 'Bicycle' },
    plateLabel: 'Plate Number',
    modelLabel: 'Model',
    colorLabel: 'Color',
    saveChanges: 'Save Changes',
    savedToast: 'Vehicle details saved',
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
    sectionNotifications: 'Notifications',
    newAssignmentAlerts: 'New assignment alerts',
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
      IN_PROGRESS: 'In Progress',
      CONFIRMED: 'Confirmed',
      WAITING: 'Waiting',
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
