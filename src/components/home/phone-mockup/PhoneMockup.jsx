import styles from "./PhoneMockup.module.css";
import {
  Home,
  CreditCard,
  PieChart,
  User,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
} from "lucide-react";

export default function PhoneMockup() {
  return (
    <div className={styles.frame}>
      <span className={styles.buttonVolumeUp} />
      <span className={styles.buttonVolumeDown} />
      <span className={styles.buttonPower} />

      <div className={styles.screen}>
        <div className={styles.statusBar}>
          <span>9:41</span>
          <div className={styles.island} />
          <div className={styles.statusIcons}>
            <span className={styles.signal} />
            <span className={styles.battery} />
          </div>
        </div>

        <div className={styles.appHeader}>
          <div>
            <p className={styles.greeting}>Good afternoon</p>
            <p className={styles.name}>Maya Chen</p>
          </div>
          <div className={styles.avatar}>MC</div>
        </div>

        <div className={styles.balanceCard}>
          <p className={styles.balanceLabel}>Total balance</p>
          <p className={styles.balanceValue}>$128,942.50</p>
          <div className={styles.balanceDelta}>
            <TrendingUp size={13} />
            <span>12.4% this month</span>
          </div>
          <svg
            className={styles.sparkline}
            viewBox="0 0 220 56"
            preserveAspectRatio="none"
          >
            <polyline
              points="0,42 20,38 40,40 60,30 80,33 100,22 120,26 140,16 160,20 180,10 200,14 220,4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className={styles.sectionHeader}>
          <span>Recent activity</span>
          <span className={styles.sectionLink}>See all</span>
        </div>

        <div className={styles.transactionList}>
          <Transaction
            icon={<ArrowUpRight size={15} />}
            name="Stripe payout"
            time="Today, 2:41 PM"
            amount="+$2,400.00"
            positive
          />
          <Transaction
            icon={<ArrowDownRight size={15} />}
            name="AWS"
            time="Today, 9:02 AM"
            amount="-$340.12"
          />
          <Transaction
            icon={<ArrowDownRight size={15} />}
            name="Payroll"
            time="Yesterday"
            amount="-$8,204.00"
          />
        </div>

        <div className={styles.tabBar}>
          <Tab icon={<Home size={19} />} label="Home" active />
          <Tab icon={<CreditCard size={19} />} label="Cards" />
          <Tab icon={<PieChart size={19} />} label="Insights" />
          <Tab icon={<User size={19} />} label="Profile" />
        </div>
      </div>
    </div>
  );
}

function Transaction({ icon, name, time, amount, positive }) {
  return (
    <div className={styles.transaction}>
      <div
        className={`${styles.transactionIcon} ${
          positive ? styles.positive : ""
        }`}
      >
        {icon}
      </div>
      <div className={styles.transactionInfo}>
        <p className={styles.transactionName}>{name}</p>
        <p className={styles.transactionTime}>{time}</p>
      </div>
      <p
        className={`${styles.transactionAmount} ${
          positive ? styles.positive : ""
        }`}
      >
        {amount}
      </p>
    </div>
  );
}

function Tab({ icon, label, active }) {
  return (
    <div className={`${styles.tab} ${active ? styles.tabActive : ""}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}
