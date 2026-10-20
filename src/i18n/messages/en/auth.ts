// Signing up, logging in, passwords, company setup and invitations
export const auth = {
  emailLabel: "Email",
  emailPlaceholder: "you@company.com",
  passwordLabel: "Password",
  atLeastCharacters: "At least {min} characters.",
  or: "or",
  login: {
    title: "Log in",
    heading: "Welcome back",
    subtitle: "Log in to your Finely account.",
    passwordChanged: "Your password was changed. Log in with your new password.",
    accountDeleted: "Your account was deleted. Thanks for trying Finely.",
    newToFinely: "New to Finely?",
    createAccount: "Create an account",
    forgotPassword: "Forgot password?",
    loggingIn: "Logging in",
    failed: "Could not log in. Please try again.",
    continueWithGoogle: "Continue with Google",
  },
  signup: {
    title: "Create your account",
    subtitle: "Get a clear view of your business finances in minutes.",
    haveAccount: "Already have an account?",
    agree:
      "By creating an account, you agree to our <terms>Terms of service</terms> and <privacy>Privacy policy</privacy>.",
    fullName: "Full name",
    workEmail: "Work email",
    namePlaceholder: "Maya Carter",
    create: "Create account",
    creating: "Creating account",
    failed: "Could not create your account. Please try again.",
    withGoogle: "Sign up with Google",
  },
  google: {
    redirecting: "Redirecting to Google",
    failed: "Could not connect to Google. Please try again.",
  },
  forgot: {
    title: "Reset your password",
    heading: "Forgot your password?",
    subtitle: "Enter your email and we'll send you a link to reset it.",
    remembered: "Remembered it?",
    backToLogin: "Back to log in",
    sent: "If an account exists for that email, we've sent a link to reset your password. It expires in one hour.",
    send: "Send reset link",
    sending: "Sending",
  },
  reset: {
    title: "Choose a new password",
    subtitle: "You'll use it to log in from now on.",
    expiredTitle: "Link expired",
    expiredText:
      "This password reset link is invalid or has expired. Reset links work once and expire after one hour.",
    requestNew: "Request a new link",
    newPassword: "New password",
    confirm: "Confirm new password",
    mismatch: "The passwords don't match.",
    invalid: "This reset link is invalid or has expired. Please request a new one.",
    set: "Set new password",
  },
  onboarding: {
    created: "{company} is set up. Welcome to Finely!",
    title: "Set up your company",
    addTitle: "Add a company",
    addSubtitle:
      "You'll be its owner. It starts empty, with its own team, accounts and transactions.",
    backTo: "Back to {name}",
    welcome: "Welcome, {name}! What's your company called?",
    joining: "Joining a company that already uses Finely? Ask someone there to invite {email}.",
    yourAccount: "Your name, your data and deleting your account",
    companyName: "Company name",
    companyHint: "You can invite your team once it's set up.",
    companyPlaceholder: "Northpeak Studio",
    continue: "Continue",
    settingUp: "Setting up",
    failed: "Could not create your company. Please try again.",
    opening: "Opening your company",
    openFailed: "We couldn't open your company. Please refresh the page to try again.",
  },
  invitation: {
    title: "Join your team",
    invited: "You're invited",
    invitedText:
      "Log in or create an account to join your team on Finely. Use the email address the invitation was sent to.",
    verifyTitle: "Verify your email to join your team",
    verifyText:
      "We sent a verification link to <b>{email}</b>. Click it, and you'll come right back here to accept the invitation.",
    didntGetIt: "Didn't get it?",
    unavailable: "Invitation not available",
    unavailableText:
      "This invitation has expired, was already used, or was sent to a different email address. You're logged in as <b>{email}</b>.",
    goToDashboard: "Go to dashboard",
    join: "Join {company}",
    joinText: "{inviter} invited you to join {company} on Finely as {role}.",
    accept: "Accept invitation",
    joining: "Joining",
    decline: "Decline",
    declining: "Declining",
    switchAccount: "Use a different account",
  },
  resend: {
    resend: "Resend email",
    sending: "Sending",
    sent: "Sent! Check your inbox.",
    failed: "Couldn't send. Try again",
  },
  /** "an admin" in "…invited you to join Acme as an admin" */
  roleWithArticle: {
    owner: "an owner",
    admin: "an admin",
    member: "a member",
  },
  /** What Better Auth's errors say, by their code */
  errors: {
    INVALID_EMAIL_OR_PASSWORD: "Invalid email or password.",
    INVALID_EMAIL: "Please enter a valid email address.",
    INVALID_PASSWORD: "That password isn't right.",
    PASSWORD_TOO_SHORT: "The password is too short.",
    PASSWORD_TOO_LONG: "The password is too long.",
    USER_ALREADY_EXISTS: "An account with this email already exists. Log in instead.",
    USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "An account with this email already exists. Use another email.",
    INVALID_TOKEN: "This link is invalid or has expired. Please request a new one.",
    TOKEN_EXPIRED: "This link has expired. Please request a new one.",
    EMAIL_NOT_VERIFIED: "Please verify your email address first.",
    SESSION_EXPIRED: "For your security, please log in again and retry.",
    EMAIL_CAN_NOT_BE_UPDATED: "This email address can't be changed.",
    USER_IS_ALREADY_A_MEMBER_OF_THIS_ORGANIZATION: "That person is already on the team.",
    USER_IS_ALREADY_INVITED_TO_THIS_ORGANIZATION: "That person has already been invited.",
    ORGANIZATION_MEMBERSHIP_LIMIT_REACHED:
      "The team is full on the company's current plan. Upgrade the plan to add more people.",
    INVITATION_NOT_FOUND: "This invitation is no longer available.",
    YOU_ARE_NOT_THE_RECIPIENT_OF_THE_INVITATION: "This invitation was sent to a different email address.",
    EMAIL_VERIFICATION_REQUIRED_BEFORE_ACCEPTING_OR_REJECTING_INVITATION:
      "Please verify your email address before answering the invitation.",
    YOU_CANNOT_LEAVE_THE_ORGANIZATION_AS_THE_ONLY_OWNER:
      "As the only owner, hand the company over to someone else before leaving.",
    YOU_ARE_NOT_ALLOWED_TO_INVITE_USERS_TO_THIS_ORGANIZATION:
      "Only owners and admins can invite people.",
    YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_ORGANIZATION: "Only owners and admins can change the company.",
    YOU_ARE_NOT_ALLOWED_TO_DELETE_THIS_MEMBER: "You can't remove this person.",
    YOU_ARE_NOT_ALLOWED_TO_UPDATE_THIS_MEMBER: "You can't change this person's role.",
    TOO_MANY_REQUESTS: "Too many requests. Please wait a minute and try again.",
  },
  demoBlocked: "This isn't available in the demo. Sign up to use it with your own company.",
};

// Each role's name: "Owner", and in a sentence "owner"
export const roles = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

export const rolesInSentence = {
  owner: "owner",
  admin: "admin",
  member: "member",
};
