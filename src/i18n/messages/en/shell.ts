// The dashboard's frame: the menu, the top bar and the banners
export const shell = {
  nav: {
    dashboard: "Dashboard",
    transactions: "Transactions",
    bills: "Bills",
    cards: "Cards",
    insights: "Insights",
    settings: "Settings",
    loggingOut: "Logging out",
  },
  topBar: {
    searchPlaceholder: "Search by description, notes, category, account or amount…",
    searchLabel: "Search transactions",
    notifications: "Notifications",
    notificationsUnread: "Notifications, {count} unread",
    markAllRead: "Mark all as read",
    nothing: "Nothing needs your attention right now.",
  },
  switcher: {
    label: "Company: {name}. Switch company",
    yourCompanies: "Your companies",
    newCompany: "New company",
  },
  demo: {
    exploring: "You're exploring a demo.",
    long: "Northpeak Studio and its money are made up, and only you can see this copy: change anything you like. It's deleted in {lifetime}.",
    short: "Made-up data, deleted in {lifetime}.",
    lessThanHour: "less than an hour",
    hours: { one: "1 hour", other: "{count} hours" },
    signUp: "Sign up for real",
    leaving: "Leaving the demo",
  },
  // The Ctrl+K window: jump to a page, a part of Settings, or an action
  palette: {
    title: "Go to",
    placeholder: "Type to find a page, a setting or an action…",
    noResults: "Nothing matches “{query}”.",
    hint: "↑ ↓ to choose, Enter to open, Esc to close",
    groups: { pages: "Pages", settings: "Settings", actions: "Actions" },
    settings: {
      details: "Company details",
      branches: "Branches",
      team: "Team and roles",
      accounts: "Bank accounts",
      categories: "Categories and budgets",
      rules: "Category rules",
      emails: "Email notifications",
      you: "Your account",
      activity: "Activity log",
    },
    actions: {
      addTransaction: "Add a transaction",
      importStatement: "Import a bank statement",
      addBill: "Add a bill",
      addCard: "Add a card",
    },
  },
  verify: {
    please: "Please verify your email address.",
    sentTo: "We sent a link to <b>{email}</b>.",
  },
};
