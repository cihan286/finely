import styles from "./DashboardHome.module.css";
import CashFlowChart from "./CashFlowChart";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Plus,
  Laptop,
  Megaphone,
  Users,
  Building2,
  MoreHorizontal,
  Clock,
} from "lucide-react";
import {
  currentUser,
  metrics,
  expenseCategories,
  transactions,
  upcomingBills,
  EXPENSES_30D,
} from "@/data/mockData";
import {
  formatCurrency,
  formatNumber,
  formatRelativeDate,
  formatDueLabel,
  getMetricChange,
} from "@/utils/format";

const metricIcons = {
  dollar: DollarSign,
  income: TrendingUp,
  expenses: TrendingDown,
  card: CreditCard,
};

const categoryIcons = {
  laptop: Laptop,
  megaphone: Megaphone,
  users: Users,
  building: Building2,
  more: MoreHorizontal,
};

const recentTransactions = transactions.slice(0, 5);

export default function DashboardHome() {
  return (
    <main className={styles.contentArea}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard Overview</h1>
          <p className={styles.subtitle}>
            Welcome back, {currentUser.firstName}. Here is what is happening
            today.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={`${styles.btn} ${styles.btnSecondary}`}>
            <Download size={16} /> Export
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`}>
            <Plus size={16} /> New Transfer
          </button>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        {metrics.map((metric) => {
          const Icon = metricIcons[metric.iconKey];
          const change = getMetricChange(metric);
          return (
            <div key={metric.id} className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={styles.metricTitle}>{metric.title}</span>
                <div className={styles.iconContainer}>
                  <Icon size={18} />
                </div>
              </div>
              <div className={styles.metricBody}>
                <span className={styles.metricValue}>
                  {metric.format === "currency"
                    ? formatCurrency(metric.value)
                    : formatNumber(metric.value)}
                </span>
                <span
                  className={`${styles.metricChange} ${change.isPositive ? styles.positive : styles.negative}`}
                >
                  {change.text}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.dashboardGrid}>
        <CashFlowChart />

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Expense Breakdown</h2>
          </div>
          <div className={styles.expenseList}>
            {expenseCategories.map((expense) => {
              const Icon = categoryIcons[expense.iconKey];
              const share = (expense.amount / EXPENSES_30D) * 100;
              return (
                <div key={expense.id} className={styles.expenseItem}>
                  <div className={styles.expenseHeader}>
                    <div className={styles.expenseCategory}>
                      <div
                        className={styles.expenseIcon}
                        style={{
                          backgroundColor: `${expense.color}15`,
                          color: expense.color,
                        }}
                      >
                        <Icon size={14} />
                      </div>
                      <span className={styles.expenseName}>
                        {expense.category}
                      </span>
                    </div>
                    <span className={styles.expenseAmount}>
                      {formatCurrency(expense.amount)}
                    </span>
                  </div>
                  <div className={styles.progressBarBg}>
                    <div
                      className={styles.progressBarFill}
                      style={{
                        width: `${share}%`,
                        backgroundColor: expense.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.dashboardGrid}>
        <div className={`${styles.card} ${styles.transactionsCard}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Recent Activity</h2>
            <button className={styles.viewAllBtn}>View all</button>
          </div>
          <div className={styles.transactionList}>
            {recentTransactions.map((tx) => {
              const isIncome = tx.amount > 0;
              return (
                <div key={tx.id} className={styles.transactionItem}>
                  <div className={styles.transactionLeft}>
                    <div
                      className={`${styles.txIcon} ${isIncome ? styles.txIconIncome : styles.txIconExpense}`}
                    >
                      {isIncome ? (
                        <ArrowUpRight size={16} />
                      ) : (
                        <ArrowDownRight size={16} />
                      )}
                    </div>
                    <div className={styles.txDetails}>
                      <span className={styles.txName}>{tx.name}</span>
                      <span className={styles.txDate}>
                        {formatRelativeDate(tx.date)}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`${styles.txAmount} ${isIncome ? styles.positiveAmount : ""}`}
                  >
                    {formatCurrency(tx.amount, { signed: true })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Upcoming Bills</h2>
          </div>
          <div className={styles.billList}>
            {upcomingBills.slice(0, 3).map((bill) => (
              <div key={bill.id} className={styles.billItem}>
                <div className={styles.billLeft}>
                  <div className={styles.billIcon}>
                    <Clock size={16} />
                  </div>
                  <div className={styles.billDetails}>
                    <span className={styles.billName}>{bill.name}</span>
                    <span className={styles.billDue}>
                      Due {formatDueLabel(bill.dueDate)}
                    </span>
                  </div>
                </div>
                <button className={styles.payBtn}>
                  Pay {formatCurrency(bill.amount)}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
