const enUS = {
  common: {
    loading: "Loading...",
    cancel: "Cancel",
    confirm: "Confirm",
    create: "Create",
    creating: "Creating...",
    save: "Save",
    settings: "Settings",
    backToHome: "Back to Home",
  },
  nav: {
    workspace: "Workspace",
    library: "Library",
    settings: "Settings",
  },
  auth: {
    checkingAccess: "Checking access...",
    accessTitle: "LumenX Access",
    accessEnabled: "This instance is protected by an entry password",
    entryPassword: "Entry Password",
    entryPasswordPlaceholder: "Enter the access password",
    entryPasswordRequired: "Please enter the entry password",
    entryPasswordRetry: "Password validation did not take effect. Please try again.",
    entryPasswordFailed: "Password is incorrect or login failed",
    submitting: "Verifying...",
    submit: "Enter",
    statusFailed: "Failed to check entry authentication status",
  },
} as const;

export default enUS;
