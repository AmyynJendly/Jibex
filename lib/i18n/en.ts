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
      title: 'No connection',
      body: 'Check your connection, then try again.',
      retry: 'Try Again',
    },
    cancel: 'Cancel',
    undo: 'Undo',
    back: 'Back',
    loading: 'Loading…',
    genericError: 'Something went wrong. Please try again.',
    backToTop: 'Back to top',
    // Real server, writes switched off: the action was refused on the phone.
    writesOff: 'Not connected to the server yet',
    networkError: 'No connection — try again.',
    serverRefused: 'The server refused this: {{reason}}',
    notAvailableYet: 'Not available yet',
    nav: {
      runsheets: 'Runsheets',
      pickups: 'Pickups',
      transfers: 'Transfers',
      returns: 'Returns',
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
        notDriver: 'This account isn’t a driver account. Sign in with the account your agency gave you.',
        inactive: 'This account has been deactivated. Contact your agency.',
        network: 'Can’t reach the server. Check your connection and try again.',
      },
    },
    sessionExpired: 'Your session has expired. Please sign in again.',
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
    toConfirmTitle_one: 'Run to confirm',
    toConfirmTitle_other: 'Runs to confirm ({{count}})',
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
    summary: { toDeliver: 'To deliver', toCollect: 'To collect' },
    inTransit: 'In Transit',
    parcelStatusLine: 'Parcel: {{status}}',
    paidTag: 'Paid',
    call: 'Call',
    update: 'Update',
    reorderedToast: 'Order saved',
    nearestFirst: 'Nearest first',
    // "Nearest first" couldn't sort: why, in one line.
    nearestFirstFallback: {
      denied: 'Location is off for Jibex, so this is dispatch’s order. Allow location to sort nearest first.',
      unavailable: 'Couldn’t get your position, so this is dispatch’s order.',
    },
    // Measured to the centre of the parcel's governorate, not the address.
    distanceApprox: '≈ {{km}} km',
    distanceExact: '{{km}} km',
    // Deliberately terse: the driver reads this standing in a van with the
    // packages in front of them, not looking for an explanation.
    confirm: {
      action: 'Confirm',
      recountAction: 'Re-confirm',
      lockedTag: 'Locked',
      blockedError: 'Confirm the run first.',
      toast: 'Run confirmed',
      // Confirmed, but the run didn't start — the retry.
      startAction: 'Start Run',
      startDialogMessage: 'Start this run now? Its packages open for delivery.',
      startedToast: 'Run started',
      startFailed: 'Run confirmed, but it didn’t start. Tap Start Run to try again.',
      nothingToConfirm: 'Nothing left to confirm on this run.',
    },
    refuse: {
      action: 'Refuse this run',
      newAction: 'Refuse the new packages',
      title: 'Refuse this run?',
      newTitle: 'Refuse the new packages?',
      message: 'Tell dispatch why. The run goes back to them.',
      newMessage: 'Tell dispatch why. The new packages go back to them.',
      confirm: 'Refuse',
      reasonRequired: 'Write a reason to refuse.',
      toast: 'Run refused',
      newToast: 'New packages refused',
    },
    // The run of the day, at the top of the Current tab.
    day: {
      today: 'Today’s run',
      other: 'Run of {{date}}',
      status: {
        toConfirm: 'Waiting for your confirmation',
        toStart: 'Confirmed — to start',
        inProgress: 'In progress',
        done: 'Finished',
        closed: 'Closed by the agency',
      },
      // Accepting a run: the driver confirms the RUN, not parcels.
      newTitle: 'New run to confirm',
      newBody: 'By confirming, you accept this run and become responsible for it.',
      confirm: 'Confirm the run',
      confirmDialogTitle: 'Confirm run {{code}}?',
      confirmDialogMessage_one:
        '{{count}} parcel. By confirming, you accept this run and become responsible for it.',
      confirmDialogMessage_other:
        '{{count}} parcels. By confirming, you accept this run and become responsible for it.',
      // The agency changed the run after the driver accepted it.
      modifiedTitle: 'Run changed',
      modified: 'The run was changed: {{change}} ({{before}} → {{after}})',
      modifiedUnknown: 'The run was changed.',
      added_one: '{{count}} parcel added',
      added_other: '{{count}} parcels added',
      removed_one: '{{count}} parcel removed',
      removed_other: '{{count}} parcels removed',
      confirmModified: 'Confirm the changed run',
      confirmModifiedDialogTitle: 'Confirm the changed run?',
      modifiedAccept: 'By confirming, you accept the changed run.',
      startTitle: 'Run confirmed — to start',
      startBody: 'Start the run to open its parcels for delivery.',
      start: 'Start the run',
      doneBody: 'Every parcel is handled. The agency will close the run.',
      preview: 'Preview — no action on the parcels before you confirm',
      newParcel: 'NEW',
      closedTitle: 'Run closed by the agency',
      closedBody: 'Nothing left to deliver on this run. Its parcels are in History.',
    },
    empty: {
      current: 'All packages done - nothing left to deliver',
      none: 'No run for now',
      history: 'No history yet',
    },
    history: {
      correctableNote:
        'Marked one wrong? Tap Update to fix it — possible until the agency closes the run. Parcels on closed runs are locked.',
      allClosedNote: 'These runs are closed by the agency, so these parcels can’t be changed.',
      closedTag: 'Run closed',
    },
    filters: {
      all: 'All',
      delivered: 'Delivered',
      failed: 'Failed',
    },
  },

  // Which delivery attempt a parcel is on (the agency allows three).
  attempts: {
    label: 'Attempt {{number}}/{{max}}',
    over: 'Attempt {{number}} — beyond the {{max}} allowed',
    last: 'Last attempt',
    lastHint: 'Last attempt: if it fails again, the parcel goes back to the agency for a decision.',
  },

  // An exchange parcel: deliver the new article, take the old one back.
  exchange: {
    badge: 'EXCHANGE',
    instruction: 'Collect the article to return to the sender',
    checkbox: 'I collected the article',
    required: 'Tick “I collected the article” before marking this parcel delivered.',
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
    runNotStarted: 'This run hasn’t started yet. Start it before updating its packages.',
    runClosed: 'This run is closed by the agency — it can’t be changed any more.',
    moreReasons: 'More reasons…',
  },

  jobDetail: {
      markDelivered: 'Delivered',
      parcelCount: '{{count}} parcel',
      parcelCount_other: '{{count}} parcels',
      callDetail: 'Called {{count}}x · last at {{time}}',
    a11yMore: 'More options',
    stopChip: 'STOP {{index}} / {{total}}',
    etaLabel: 'ETA {{time}}',
    moreOptionsToast: 'More options — coming soon',
    mapBadge: '{{distance}} km · ≈{{minutes}} min away',
    navigate: 'Navigate',
    byAddress: 'No map pin · tap for directions by address',
    codLabel: 'Collect on Delivery',
    fragile: 'Fragile',
    deliveryFailed: 'Delivery Failed',
    cantDeliver: "Can't Deliver",
  },

  // Only the OTP route's error is left: the OTP screen is gone, its mock
  // function is kept in case the step comes back.
  otp: {
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
    searchPlaceholder: 'Search reasons',
    noMatch: 'No reason matches “{{query}}”',
    noteRequiredLabel: 'Note (required for “Other reason”)',
    noteRequiredPlaceholder: 'What happened?',
    noteRequired: 'Write a short note to explain “Other reason”.',
  },

  // One line added to a failed delivery's notes, for the agency. The app
  // always sends the French version (see lib/failureProof); these are kept
  // so both languages have the same keys.
  failureProof: {
    called_one: 'Called once ({{times}}).',
    called_other: 'Called {{count}} times ({{times}}).',
    notCalled: 'Not called.',
    location: 'Location: {{latitude}}, {{longitude}}.',
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
    openCamera: 'Open camera',
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
    foundToast: 'Found — {{label}}',
    alreadyScanned: 'Already scanned',
    batchTitle: 'Scan Returns',
    batchProgress: '{{done}} of {{total}} scanned',
    batchCompleteTitle: 'All returns scanned',
    batchCompleteBody: 'Every return in this batch has been processed.',
    batchDoneButton: 'Back to Returns',
    // Checking a pickup's or a transfer's parcels one by one.
    check: {
      title: 'Check the parcels',
      progress: '{{done}}/{{total}} parcels',
      ok: 'Parcel checked — {{done}}/{{total}}',
      notInPickup: 'This parcel is not in this pickup',
      notInTransfer: 'This parcel is not in this transfer',
      completeTitle: 'All parcels scanned',
      completeBody: '{{total}}/{{total}} parcels checked. Go back to the previous screen to confirm.',
      done: 'Back',
    },
    errors: {
      notRecognized: 'Code not recognized. Try again or enter it manually.',
    },
  },

  search: {
    headerTitle: 'Search',
    label: 'Tracking number or name',
    placeholder: 'TRK-… or a customer name',
    loading: 'Loading your parcels…',
    notFoundTitle: 'Not found in your parcels',
    notFoundSubtitle: 'Nothing in your runsheets, history, pickups, transfers or returns matches “{{code}}”.',
    someNotLoaded: 'Some of your lists couldn’t load — pull to refresh them and try again.',
    instructions: 'Find one of your parcels',
    scope: 'By tracking number or customer name, across your runsheets, history, pickups, transfers and returns.',
    a11yOpens: 'Opens the screen that shows this parcel',
    recentTitle: 'Recent',
    removeRecent: 'Remove {{code}} from recent searches',
    recentGone: '{{code}} is no longer in your parcels',
    source: {
      runsheet: 'Runsheet',
      history: 'Runsheet history',
      pickup: 'Pickup',
      transfer: 'Transfer',
      return: 'Return',
    },
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
    doneWithCount: 'Done ({{count}})',
    doneHint: 'Close every stop at once, or tick only the ones you collected.',
    doneAllWithCount: 'Done All ({{count}})',
    doneAllConfirmTitle_one: 'Mark the {{count}} pickup as collected?',
    doneAllConfirmTitle_other: 'Mark all {{count}} pickups as collected?',
    doneAllConfirmMessage_one: 'With every package in it: {{names}}',
    doneAllConfirmMessage_other: 'With every package in them: {{names}}',
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
    donePartialToast: '{{done}} of {{total}} pickups collected — the rest didn’t go through. Try them again.',
    reorderedToast: 'Order saved',
    // Every scheduled pickup at once, behind a confirmation.
    finishAll: 'Finish all pickups',
    finishAllTitle_one: 'Finish {{count}} pickup ({{parcels}} parcels)?',
    finishAllTitle_other: 'Finish {{count}} pickups ({{parcels}} parcels)?',
    finishAllMessage: 'All their parcels will be marked as collected, without the parcel-by-parcel check.',
    finishAllConfirm: 'Confirm',
    // Checking each parcel before closing the pickup.
    check: {
      progress: '{{done}}/{{total}} parcels',
      scan: 'Scan',
      tickAll: 'Tick all',
      untickAll: 'Untick all',
      finish: 'Finish pickup',
      finishHint: 'Scan or tick every parcel to finish the pickup.',
      noList: 'No parcels listed for this pickup: check with the sender before finishing.',
      noListConfirmTitle: 'Finish this pickup?',
      noListConfirmMessage: 'The parcel list for {{name}} isn’t available. Confirm you collected every parcel.',
      doneToast: 'Pickup finished',
    },
    empty: {
      scheduled: 'No scheduled pickups',
      completed: 'No completed pickups',
    },
  },

  transfers: {
    headerTitle: 'Transfers',
    eyebrow: 'Agency to Agency',
    status: { completed: 'Completed', inTransit: 'In transit', readyForPickup: 'Ready to Load' },
    confirmPickupTitle: 'Confirm the pickup?',
    confirmPickupMessage_one:
      'I confirm I loaded the parcel of this transfer to {{to}}. The transfer goes in transit and can’t be changed afterwards.',
    confirmPickupMessage_other:
      'I confirm I loaded the {{count}} parcels of this transfer to {{to}}. The transfer goes in transit and can’t be changed afterwards.',
    confirmPickupToast: 'Pickup confirmed — transfer in transit',
    // Scanning every parcel of the batch before taking it.
    check: {
      progress: '{{done}}/{{total}} parcels',
      scan: 'Scan the parcels',
      hint: 'Scan every parcel of the transfer before confirming the pickup.',
      ready: 'Every parcel is scanned. You can confirm the pickup.',
      noList: 'The parcel list isn’t available: count them before confirming.',
      confirm: 'Confirm the pickup',
      withoutScan: 'Confirm without scanning',
      withoutScanTitle: 'Confirm without scanning every parcel?',
      withoutScanMessage:
        '{{done}}/{{total}} parcels scanned. Only for a damaged label: you become responsible for the whole transfer.',
      noListMessage_one: 'Do you confirm you loaded the parcel of this transfer? You become responsible for it.',
      noListMessage_other:
        'Do you confirm you loaded the {{count}} parcels of this transfer? You become responsible for them.',
    },
    movingLabel: 'Moving',
    from: 'Sending Agency',
    to: 'Receiving Agency',
    // After the driver confirmed: nothing left for them to do.
    onTheWay: {
      title: 'On the way to {{agency}} — your part is done.',
      body: 'The transfer will be closed when the {{agency}} agency scans the parcels.',
    },
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
    stage: { toLoad: 'To Load', toHandBack: 'Back to Sender' },
    loadHint: 'Loading is confirmed for all returns at once, with the button below.',
    confirmLoadedWithCount: 'Confirm Loaded ({{count}})',
    loadedTitle: 'Confirm returns loaded?',
    loadedMessage_one: 'You checked and loaded this return into your vehicle?',
    loadedMessage_other: 'You checked and loaded all {{count}} returns into your vehicle?',
    loadedToast_one: '{{count}} return loaded',
    loadedToast_other: '{{count}} returns loaded',
    handedBack: 'Handed to Sender',
    handedBackTitle: 'Handed back?',
    handedBackMessage: 'You handed {{id}} back to {{sender}}? The sender then confirms it on their side.',
    handedBackToast: 'Hand-back recorded — waiting for the sender to confirm',
    confirmTitle: 'Confirm returns received',
    confirmMessage_one: 'Sign for {{count}} batch — {{parcels}} packages back to the agency?',
    confirmMessage_other: 'Sign for {{count}} batches — {{parcels}} packages back to the agency?',
    confirmAction: 'Confirm',
    confirmToast_one: '{{count}} batch confirmed',
    confirmToast_other: '{{count}} batches confirmed',
    confirmPartialToast: '{{done}} of {{total}} confirmed — the rest didn’t go through. Try them again.',
    empty: 'No pending returns',
    toggleCurrent: 'Current',
    toggleHistory: 'History',
    emptyHistory: 'No past returns',
    reorderedToast: 'Order saved',
  },

  historyFilter: {
    all: 'All',
    today: 'Today',
    week: 'Last 7 days',
  },

  alerts: {
    deleteAll: 'Clear all',
    deleteOne: 'Delete notification',
    deletedToast: 'Notification deleted',
    swipeDelete: 'Delete',
    swipeRead: 'Read',
    swipeUnread: 'Unread',
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
    stats: { lifetimeDeliveries: 'Deliveries', deliveryRate: 'Delivery Rate', weeklyCash: 'DT / Week' },
    sectionSupport: 'Support',
    rows: {
      helpCenter: 'Help Center',
      logOut: 'Log Out',
    },
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
    sectionLanguage: 'Language',
    sectionSecurity: 'Security',
    biometricLogin: 'Biometric Login',
    hapticFeedback: 'Haptic Feedback',
    nextStopBar: 'Next Stop Bar',
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
    // The parcel's own status, in the words the agency's web app uses.
    parcelStatus: {
      CREATED: 'Created',
      PENDING: 'Pending',
      A_ENLEVER: 'To pick up',
      PICKUP: 'Pickup',
      PICKED_UP: 'Picked up',
      SCANNED: 'Scanned',
      A_VERIFIER: 'To verify (after-sales)',
      AU_DEPOT: 'At depot',
      AU_DEPOT_RELAIS: 'At relay depot',
      AU_DEPOT_DESTINATION: 'At destination depot',
      IN_WAREHOUSE: 'In warehouse',
      EN_TRANSIT_AGENCE: 'In transit (transfer)',
      IN_TRANSIT: 'In transit',
      EN_COURS: 'Out for delivery',
      OUT_FOR_DELIVERY: 'Out for delivery',
      DELAYED: 'Delayed',
      DELIVERED: 'Delivered',
      LIVRE_PAYE: 'Delivered & paid',
      RTN_DEPOT: 'Returned to depot',
      RETOUR_A_CHARGER: 'Return to load',
      EN_TRANSIT_RETOUR: 'Return in transit',
      RETOUR_CLIENT_AGENCE: 'Return to agency',
      RETOUR_EXPEDITEUR: 'Returned to sender',
      RETOUR_RECU: 'Return received',
      RETOUR_DEFINITIF: 'Final return',
      RETURNED: 'Returned',
      CANCELLED: 'Cancelled',
      LOST: 'Lost',
    },
    failureReason: {
      ABSENT: 'Recipient absent',
      REFUSED: 'Parcel refused',
      WRONG_ADDRESS: 'Wrong address',
      INCOMPLETE_ADDRESS: 'Incomplete address',
      PHONE_OFF: 'Phone switched off',
      NO_ANSWER: 'No answer',
      OTHER: 'Other reason',
      CANCELLED_BY_CLIENT: 'Cancelled by customer',
      NOT_INTERESTED_2ND_ATTEMPT: 'Customer no longer interested',
      WRONG_NUMBER_2ND_ATTEMPT: 'Wrong phone number',
      DUPLICATE_ORDER: 'Duplicate order',
      RETURN_CONFIRMED_BY_SENDER: 'Return confirmed by the sender',
      NON_COMPLIANT_ORDER: "Order doesn't match",
      INCORRECT_AMOUNT: 'Incorrect amount',
      NOT_AVAILABLE_RESCHEDULED: 'Customer unavailable (rescheduled)',
      UNRELIABLE_CLIENT: 'Unreliable customer',
      CALL_REFUSED: 'Customer declined the call',
      LINE_BUSY: 'Line always busy',
      WRONG_PAYMENT_MODE: 'Wrong payment method',
      PARCEL_POSTPONED: 'Parcel postponed',
      FORCE_MAJEURE: 'Force majeure',
    },
    failureReasonGroup: {
      common: 'Most common',
      reach: "Couldn't reach the customer",
      customer: 'The customer',
      address: 'The address',
      order: 'The order',
      other: 'Something else',
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
